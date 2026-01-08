import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { InstanceManager } from "./instance-manager.js";
import { UsageTracker } from "./usage-tracker.js";
import { GeminiUsageTracker } from "./gemini-usage-tracker.js";
import { isKittyAvailable, getKittySocketPath, findWorkingSocket, getSocketCandidates, clearSocketCache } from "../utils/kitty-remote.js";
import { pickFolder } from "../utils/folder-picker.js";
import type {
  StatusUpdate,
  WebSocketMessage,
  CommandMessage,
  ClaudeState,
  CommandType,
  UsageStats,
  InstanceSource
} from "./types.js";

const STATUS_PORT = 19847;

export type StatusChangeCallback = (
  sessionId: string,
  state: ClaudeState,
  metadata: StatusUpdate["metadata"]
) => void;

/**
 * HTTP + WebSocket server for Claude Code status tracking
 *
 * - HTTP POST /status: Receives status updates from Claude Code hooks
 * - WebSocket: Real-time communication with Stream Deck plugin
 */
export class StatusServer {
  private httpServer: http.Server;
  private wss: WebSocketServer;
  private instanceManager: InstanceManager;
  private usageTracker: UsageTracker;
  private geminiUsageTracker: GeminiUsageTracker;
  private clients: Set<WebSocket> = new Set();
  private statusChangeCallbacks: Set<StatusChangeCallback> = new Set();
  private isRunning = false;
  private trackedSessions: Set<string> = new Set();
  private trackedGeminiSessions: Set<string> = new Set();

  constructor() {
    this.instanceManager = new InstanceManager();
    this.usageTracker = new UsageTracker();
    this.geminiUsageTracker = new GeminiUsageTracker();

    // Listen for usage updates and broadcast to clients
    this.usageTracker.on("update", (sessionId: string, usage: UsageStats) => {
      this.broadcastUsageUpdate(sessionId, usage, "claude");
    });

    // Listen for Gemini usage updates
    this.geminiUsageTracker.on("update", (sessionId: string, usage: UsageStats) => {
      this.broadcastUsageUpdate(sessionId, usage, "gemini");
    });

    // HTTP server for receiving hook POST requests
    this.httpServer = http.createServer((req, res) => {
      // CORS headers for local development
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === "POST" && req.url === "/status") {
        this.handleStatusPost(req, res);
      } else if (req.method === "GET" && (req.url === "/instances" || req.url?.startsWith("/instances?"))) {
        this.handleGetInstances(req, res);
      } else if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", instances: this.instanceManager.getAllInstances().length }));
      } else if (req.method === "GET" && req.url === "/kitty-status") {
        this.handleKittyStatus(res);
      } else if (req.method === "POST" && req.url === "/pick-folder") {
        this.handlePickFolder(res);
      } else if (req.method === "GET" && req.url?.startsWith("/usage/")) {
        this.handleGetUsage(req, res);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    // WebSocket server for Stream Deck plugin
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (ws) => {
      this.handleWebSocketConnection(ws);
    });
  }

  private handleStatusPost(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const update: StatusUpdate = JSON.parse(body);

        if (!update.session_id || !update.state) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing session_id or state" }));
          return;
        }

        this.handleStatusUpdate(update);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });

    req.on("error", () => {
      res.writeHead(500);
      res.end("Server Error");
    });
  }

  private handleGetInstances(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Parse query parameters
    const url = new URL(req.url || "/instances", "http://127.0.0.1");
    const cleanup = url.searchParams.get("cleanup") === "true";
    const dedupe = url.searchParams.get("dedupe") === "true";
    const source = url.searchParams.get("source") as InstanceSource | null;

    // Run cleanup if requested (removes instances inactive for 30+ seconds)
    if (cleanup) {
      this.instanceManager.forceCleanupStale(30000);
    }

    // Deduplicate by CWD if requested (keeps only the most recent per folder)
    if (dedupe) {
      this.instanceManager.deduplicateByCwd();
    }

    // Get instances, optionally filtered by source
    const instances = source
      ? this.instanceManager.getAvailableInstancesBySource(source)
      : this.instanceManager.getAvailableInstances();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(instances));
  }

  private async handleKittyStatus(res: http.ServerResponse): Promise<void> {
    try {
      // Clear cache to force re-detection
      clearSocketCache();

      // Find a working socket by testing each candidate
      const workingSocket = await findWorkingSocket();
      const candidates = getSocketCandidates();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        available: workingSocket !== null,
        socketPath: workingSocket || getKittySocketPath(),
        candidates
      }));
    } catch (error) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ available: false, error: String(error) }));
    }
  }

  private async handlePickFolder(res: http.ServerResponse): Promise<void> {
    try {
      const folderPath = await pickFolder();
      res.writeHead(200, { "Content-Type": "application/json" });
      if (folderPath) {
        res.end(JSON.stringify({ success: true, path: folderPath }));
      } else {
        res.end(JSON.stringify({ success: false, cancelled: true }));
      }
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: String(error) }));
    }
  }

  private handleGetUsage(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url || "/usage/", "http://127.0.0.1");
    const pathParts = url.pathname.split("/").filter(Boolean);
    const sessionId = pathParts[1] || "";
    const source = url.searchParams.get("source") as InstanceSource | null;

    if (!sessionId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing session ID" }));
      return;
    }

    // Try the specified source first, then fall back to the other
    let usage: UsageStats | undefined;
    if (source === "gemini") {
      usage = this.geminiUsageTracker.getUsage(sessionId);
    } else if (source === "claude") {
      usage = this.usageTracker.getUsage(sessionId);
    } else {
      // Try both if source not specified
      usage = this.usageTracker.getUsage(sessionId) || this.geminiUsageTracker.getUsage(sessionId);
    }

    if (usage) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(usage));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No usage data for session" }));
    }
  }

  private broadcastUsageUpdate(sessionId: string, usage: UsageStats, source: InstanceSource = "claude"): void {
    const message: WebSocketMessage = {
      type: "usage_update",
      sessionId,
      usage,
      source
    };
    this.broadcastToClients(message);
  }

  private handleWebSocketConnection(ws: WebSocket): void {
    this.clients.add(ws);

    // Send current state of all instances on connect
    const initMessage: WebSocketMessage = {
      type: "init",
      instances: this.instanceManager.getAllInstances()
    };
    ws.send(JSON.stringify(initMessage));

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString()) as CommandMessage;
        if (message.type === "command") {
          this.handleCommand(ws, message);
        }
      } catch (e) {
        // Ignore invalid messages
      }
    });

    ws.on("close", () => {
      this.clients.delete(ws);
    });

    ws.on("error", () => {
      this.clients.delete(ws);
    });
  }

  private handleStatusUpdate(update: StatusUpdate): void {
    const instance = this.instanceManager.updateInstance(update);
    const source = update.source ?? "claude";

    // Start usage tracking if we have CWD and haven't started yet
    if (update.metadata.cwd) {
      if (source === "claude" && !this.trackedSessions.has(update.session_id)) {
        this.trackedSessions.add(update.session_id);
        this.usageTracker.startTracking(update.session_id, update.metadata.cwd);
      } else if (source === "gemini" && !this.trackedGeminiSessions.has(update.session_id)) {
        this.trackedGeminiSessions.add(update.session_id);
        this.geminiUsageTracker.startTracking(update.session_id, update.metadata.cwd);
      }
    }

    // Broadcast the effective state to all connected clients
    // The instance manager may have kept a sticky state instead of the incoming state
    const message: WebSocketMessage = {
      type: "update",
      sessionId: update.session_id,
      state: instance.state,
      metadata: update.metadata,
      source: instance.source
    };

    this.broadcastToClients(message);

    // Notify registered callbacks with the effective state
    this.statusChangeCallbacks.forEach((callback) => {
      try {
        callback(update.session_id, instance.state, update.metadata);
      } catch (e) {
        // Ignore callback errors
      }
    });
  }

  private handleCommand(ws: WebSocket, message: CommandMessage): void {
    const { sessionId, command } = message;

    // For now, we'll just acknowledge the command
    // The actual implementation would depend on how we communicate with Claude Code
    const response: WebSocketMessage = {
      type: "command_response",
      sessionId,
      command,
      success: true
    };

    ws.send(JSON.stringify(response));

    // TODO: Implement actual command execution
    // - focus: Use AppleScript/PowerShell to focus terminal
    // - cancel: Send SIGINT to Claude Code process
    // - approve: Interact with Claude Code permission system
  }

  private broadcastToClients(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Register a callback for status changes
   */
  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusChangeCallbacks.add(callback);
    return () => this.statusChangeCallbacks.delete(callback);
  }

  /**
   * Get the instance manager
   */
  getInstanceManager(): InstanceManager {
    return this.instanceManager;
  }

  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        resolve();
        return;
      }

      this.httpServer.listen(STATUS_PORT, "127.0.0.1", () => {
        this.isRunning = true;
        console.log(`AgentDeck status server running on http://127.0.0.1:${STATUS_PORT}`);
        resolve();
      });

      this.httpServer.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          console.log(`Port ${STATUS_PORT} already in use, assuming server is already running`);
          this.isRunning = true;
          resolve();
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.isRunning = false;

      // Stop usage tracking
      this.usageTracker.stopAll();
      this.geminiUsageTracker.stopAll();
      this.trackedSessions.clear();
      this.trackedGeminiSessions.clear();

      // Close all WebSocket connections
      this.clients.forEach((client) => {
        client.close();
      });
      this.clients.clear();

      this.wss.close(() => {
        this.httpServer.close(() => {
          this.instanceManager.destroy();
          resolve();
        });
      });
    });
  }

  /**
   * Get the usage tracker (Claude)
   */
  getUsageTracker(): UsageTracker {
    return this.usageTracker;
  }

  /**
   * Get the Gemini usage tracker
   */
  getGeminiUsageTracker(): GeminiUsageTracker {
    return this.geminiUsageTracker;
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let serverInstance: StatusServer | null = null;

export function getStatusServer(): StatusServer {
  if (!serverInstance) {
    serverInstance = new StatusServer();
  }
  return serverInstance;
}
