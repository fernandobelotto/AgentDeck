import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";
import type { UsageStats } from "./types";

interface ScanState {
  filePath: string;
  lastPosition: number;
  lastSize: number;
}

interface ParsedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  model: string;
}

/**
 * Scans Claude Code JSONL session logs for token usage data
 * Uses incremental parsing to avoid re-reading entire files
 */
export class LogScanner extends EventEmitter {
  private scanStates: Map<string, ScanState> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private projectsDir: string;

  constructor() {
    super();
    this.projectsDir = path.join(homedir(), ".claude", "projects");
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
        lastPosition: 0,
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
    // Try encoded cwd path (e.g., /Users/foo/bar -> -Users-foo-bar)
    const encodedCwd = cwd.replace(/\//g, "-").replace(/^-/, "-");
    const projectDir = path.join(this.projectsDir, encodedCwd);
    const sessionFile = path.join(projectDir, `${sessionId}.jsonl`);

    if (fs.existsSync(sessionFile)) {
      return sessionFile;
    }

    // Try scanning for the session file in the projects directory
    try {
      const dirs = fs.readdirSync(this.projectsDir);
      for (const dir of dirs) {
        const candidatePath = path.join(this.projectsDir, dir, `${sessionId}.jsonl`);
        if (fs.existsSync(candidatePath)) {
          return candidatePath;
        }
      }
    } catch {
      // Projects dir doesn't exist
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
    if (!state) return;

    try {
      const stats = fs.statSync(state.filePath);

      // Check if file has grown
      if (stats.size <= state.lastPosition) {
        // File was truncated or unchanged, reset
        if (stats.size < state.lastSize) {
          state.lastPosition = 0;
        } else {
          return;
        }
      }

      // Read only the new content
      const fd = fs.openSync(state.filePath, "r");
      const newSize = stats.size - state.lastPosition;
      const buffer = Buffer.alloc(newSize);

      fs.readSync(fd, buffer, 0, newSize, state.lastPosition);
      fs.closeSync(fd);

      const newContent = buffer.toString("utf8");
      const lines = newContent.split("\n").filter((line) => line.trim());

      let totalUsage: ParsedUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        model: "",
      };

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const usage = this.extractUsage(entry);
          if (usage) {
            totalUsage.inputTokens += usage.inputTokens;
            totalUsage.outputTokens += usage.outputTokens;
            totalUsage.cacheReadTokens += usage.cacheReadTokens;
            totalUsage.cacheWriteTokens += usage.cacheWriteTokens;
            if (usage.model) {
              totalUsage.model = usage.model;
            }
          }
        } catch {
          // Skip malformed lines
        }
      }

      // Update state
      state.lastPosition = stats.size;
      state.lastSize = stats.size;

      // Emit if we found usage data
      if (
        totalUsage.inputTokens > 0 ||
        totalUsage.outputTokens > 0 ||
        totalUsage.cacheReadTokens > 0 ||
        totalUsage.cacheWriteTokens > 0
      ) {
        this.emit("usage", sessionId, totalUsage);
      }
    } catch {
      // File error, ignore
    }
  }

  /**
   * Extract usage data from a JSONL entry
   */
  private extractUsage(entry: Record<string, unknown>): ParsedUsage | null {
    // Only process assistant messages
    if (entry.type !== "assistant") {
      return null;
    }

    const message = entry.message as Record<string, unknown> | undefined;
    if (!message) {
      return null;
    }

    const usage = message.usage as Record<string, unknown> | undefined;
    if (!usage) {
      return null;
    }

    return {
      inputTokens: (usage.input_tokens as number) || 0,
      outputTokens: (usage.output_tokens as number) || 0,
      cacheReadTokens: (usage.cache_read_input_tokens as number) || 0,
      cacheWriteTokens: (usage.cache_creation_input_tokens as number) || 0,
      model: (message.model as string) || "",
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
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n").filter((line) => line.trim());

      let totalUsage: UsageStats = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        model: "",
        lastUpdate: Date.now(),
      };

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const usage = this.extractUsage(entry);
          if (usage) {
            totalUsage.inputTokens += usage.inputTokens;
            totalUsage.outputTokens += usage.outputTokens;
            totalUsage.cacheReadTokens += usage.cacheReadTokens;
            totalUsage.cacheWriteTokens += usage.cacheWriteTokens;
            if (usage.model) {
              totalUsage.model = usage.model;
            }
          }
        } catch {
          // Skip malformed lines
        }
      }

      return totalUsage;
    } catch {
      return null;
    }
  }
}
