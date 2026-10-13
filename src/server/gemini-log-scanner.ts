import * as crypto from "node:crypto";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

import type { UsageStats } from "./types";

interface ScanState {
  filePath: string;
  lastSize: number;
  lastParsedMessageCount: number;
}

interface ParsedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  model: string;
}

interface GeminiTokensSummary {
  input: number;
  output: number;
  cached?: number;
  thoughts?: number;
  tool?: number;
  total: number;
}

interface GeminiMessage {
  id: string;
  timestamp: string;
  type: "user" | "gemini" | "info" | "error" | "warning";
  content: unknown;
  tokens?: GeminiTokensSummary;
  model?: string;
}

interface GeminiConversationRecord {
  sessionId: string;
  projectHash: string;
  startTime: string;
  lastUpdated: string;
  messages: GeminiMessage[];
  summary?: string;
}

/**
 * Scans Gemini CLI session logs for token usage data
 * Session files are stored at: ~/.gemini/tmp/<project_hash>/chats/session-*.json
 */
export class GeminiLogScanner extends EventEmitter {
  private scanStates = new Map<string, ScanState>();
  private watchers = new Map<string, fs.FSWatcher>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private geminiDir: string;

  constructor() {
    super();
    this.geminiDir = path.join(homedir(), ".gemini", "tmp");
  }

  /**
   * Compute project hash for a given cwd (same as Gemini CLI)
   */
  private computeProjectHash(cwd: string): string {
    return crypto.createHash("sha256").update(cwd).digest("hex");
  }

  /**
   * Start watching a session's log file for changes
   */
  startWatching(sessionId: string, cwd: string): void {
    const filePath = this.getLogFilePath(sessionId, cwd);
    if (!filePath || this.watchers.has(sessionId)) {
      return;
    }

    try {
      if (!fs.existsSync(filePath)) {
        return;
      }

      // Initialize scan state
      const stats = fs.statSync(filePath);
      this.scanStates.set(sessionId, {
        filePath,
        lastParsedMessageCount: 0,
        lastSize: stats.size,
      });

      // Do initial scan
      this.scanFile(sessionId);

      // Watch for changes
      const watcher = fs.watch(filePath, (eventType) => {
        if (eventType === "change") {
          this.debouncedScan(sessionId);
        }
      });

      watcher.on("error", () => {
        this.stopWatching(sessionId);
      });

      this.watchers.set(sessionId, watcher);
    } catch {
      // File doesn't exist or can't be watched
    }
  }

  /**
   * Stop watching a session's log file
   */
  stopWatching(sessionId: string): void {
    const watcher = this.watchers.get(sessionId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(sessionId);
    }

    const timer = this.debounceTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(sessionId);
    }

    this.scanStates.delete(sessionId);
  }

  /**
   * Stop all watchers
   */
  stopAll(): void {
    for (const sessionId of this.watchers.keys()) {
      this.stopWatching(sessionId);
    }
  }

  /**
   * Get the log file path for a session
   */
  private getLogFilePath(sessionId: string, cwd: string): string | null {
    // Try with computed project hash
    const projectHash = this.computeProjectHash(cwd);
    const chatsDir = path.join(this.geminiDir, projectHash, "chats");

    // Look for session file by sessionId prefix in filename
    const sessionPrefix = sessionId.slice(0, 8);

    try {
      if (fs.existsSync(chatsDir)) {
        const files = fs.readdirSync(chatsDir);
        for (const file of files) {
          // Match session-YYYY-MM-DDTHH-MM-<session_id_first_8_chars>.json
          if (
            file.startsWith("session-") &&
            file.includes(sessionPrefix) &&
            file.endsWith(".json")
          ) {
            return path.join(chatsDir, file);
          }
        }

        // Also try exact sessionId match in the file content
        for (const file of files) {
          if (file.startsWith("session-") && file.endsWith(".json")) {
            const filePath = path.join(chatsDir, file);
            try {
              const content = fs.readFileSync(filePath, "utf-8");
              const record = JSON.parse(content) as GeminiConversationRecord;
              if (record.sessionId === sessionId) {
                return filePath;
              }
            } catch {
              // Skip malformed files
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist
    }

    // Scan all project directories as fallback
    try {
      if (fs.existsSync(this.geminiDir)) {
        const projectDirs = fs.readdirSync(this.geminiDir);
        for (const projectDir of projectDirs) {
          const chatsPath = path.join(this.geminiDir, projectDir, "chats");
          if (fs.existsSync(chatsPath)) {
            const files = fs.readdirSync(chatsPath);
            for (const file of files) {
              if (file.startsWith("session-") && file.endsWith(".json")) {
                const filePath = path.join(chatsPath, file);
                try {
                  const content = fs.readFileSync(filePath, "utf-8");
                  const record = JSON.parse(
                    content
                  ) as GeminiConversationRecord;
                  if (record.sessionId === sessionId) {
                    return filePath;
                  }
                } catch {
                  // Skip malformed files
                }
              }
            }
          }
        }
      }
    } catch {
      // gemini dir doesn't exist
    }

    return null;
  }

  /**
   * Debounce file scans to avoid excessive parsing
   */
  private debouncedScan(sessionId: string): void {
    const existing = this.debounceTimers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(sessionId);
      this.scanFile(sessionId);
    }, 1000); // 1 second debounce

    this.debounceTimers.set(sessionId, timer);
  }

  /**
   * Scan a session's log file for new usage data
   */
  private scanFile(sessionId: string): void {
    const state = this.scanStates.get(sessionId);
    if (!state) {
      return;
    }

    try {
      const stats = fs.statSync(state.filePath);

      // Check if file has changed
      if (stats.size === state.lastSize) {
        return;
      }

      // Parse the JSON file
      const content = fs.readFileSync(state.filePath, "utf-8");
      const record = JSON.parse(content) as GeminiConversationRecord;

      // Only process new messages
      const newMessages = record.messages.slice(state.lastParsedMessageCount);

      const totalUsage: ParsedUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        model: "",
      };

      for (const message of newMessages) {
        const usage = this.extractUsage(message);
        if (usage) {
          totalUsage.inputTokens += usage.inputTokens;
          totalUsage.outputTokens += usage.outputTokens;
          totalUsage.cacheReadTokens += usage.cacheReadTokens;
          if (usage.model) {
            totalUsage.model = usage.model;
          }
        }
      }

      // Update state
      state.lastSize = stats.size;
      state.lastParsedMessageCount = record.messages.length;

      // Emit if we found usage data
      if (
        totalUsage.inputTokens > 0 ||
        totalUsage.outputTokens > 0 ||
        totalUsage.cacheReadTokens > 0
      ) {
        this.emit("usage", sessionId, totalUsage);
      }
    } catch {
      // File error, ignore
    }
  }

  /**
   * Extract usage data from a Gemini message
   */
  private extractUsage(message: GeminiMessage): ParsedUsage | null {
    // Only process gemini (assistant) messages with tokens
    if (message.type !== "gemini" || !message.tokens) {
      return null;
    }

    return {
      cacheReadTokens: message.tokens.cached || 0,
      inputTokens: message.tokens.input || 0,
      model: message.model || "",
      outputTokens: message.tokens.output || 0,
    };
  }

  /**
   * Scan the entire file from the beginning
   * Use for initial load when tracking a new session
   */
  scanFullFile(sessionId: string, cwd: string): UsageStats | null {
    const filePath = this.getLogFilePath(sessionId, cwd);
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const record = JSON.parse(content) as GeminiConversationRecord;

      const totalUsage: UsageStats = {
        cacheReadTokens: 0,
        cacheWriteTokens: 0, // Gemini doesn't track cache write separately
        inputTokens: 0,
        lastUpdate: Date.now(),
        model: "",
        outputTokens: 0,
        totalCost: 0,
      };

      for (const message of record.messages) {
        const usage = this.extractUsage(message);
        if (usage) {
          totalUsage.inputTokens += usage.inputTokens;
          totalUsage.outputTokens += usage.outputTokens;
          totalUsage.cacheReadTokens += usage.cacheReadTokens;
          if (usage.model) {
            totalUsage.model = usage.model;
          }
        }
      }

      return totalUsage;
    } catch {
      return null;
    }
  }
}
