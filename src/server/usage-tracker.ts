import { EventEmitter } from "events";
import type { UsageStats } from "./types";
import { LogScanner } from "./log-scanner";

/**
 * Model pricing in USD per million tokens
 */
interface ModelPricing {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  "claude-sonnet-4": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "claude-haiku-4": { input: 0.25, output: 1.25, cacheRead: 0.025, cacheWrite: 0.3125 },
  // Legacy/default pricing (Sonnet rates)
  default: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
};

/**
 * Get pricing for a model by matching prefix
 */
function getModelPricing(modelId: string): ModelPricing {
  for (const [prefix, pricing] of Object.entries(MODEL_PRICING)) {
    if (prefix !== "default" && modelId.startsWith(prefix)) {
      return pricing;
    }
  }
  return MODEL_PRICING.default;
}

/**
 * Calculate cost from token counts and model
 */
function calculateCost(usage: UsageStats): number {
  const pricing = getModelPricing(usage.model);

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;
  const cacheReadCost = (usage.cacheReadTokens / 1_000_000) * pricing.cacheRead;
  const cacheWriteCost = (usage.cacheWriteTokens / 1_000_000) * pricing.cacheWrite;

  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

/**
 * Tracks token usage and costs per session
 */
export class UsageTracker extends EventEmitter {
  private usageBySession: Map<string, UsageStats> = new Map();
  private logScanner: LogScanner;
  private cwdBySession: Map<string, string> = new Map();

  constructor() {
    super();
    this.logScanner = new LogScanner();

    // Listen for incremental usage updates from log scanner
    this.logScanner.on(
      "usage",
      (sessionId: string, usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; model: string }) => {
        this.addUsage(sessionId, usage);
      }
    );
  }

  /**
   * Start tracking a session
   */
  startTracking(sessionId: string, cwd: string): void {
    this.cwdBySession.set(sessionId, cwd);

    // Do initial full scan to get existing usage
    const initialUsage = this.logScanner.scanFullFile(sessionId, cwd);
    if (initialUsage) {
      initialUsage.totalCost = calculateCost(initialUsage);
      this.usageBySession.set(sessionId, initialUsage);
      this.emit("update", sessionId, initialUsage);
    } else {
      // Initialize empty usage
      this.usageBySession.set(sessionId, {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        model: "",
        lastUpdate: Date.now(),
      });
    }

    // Start watching for changes
    this.logScanner.startWatching(sessionId, cwd);
  }

  /**
   * Stop tracking a session
   */
  stopTracking(sessionId: string): void {
    this.logScanner.stopWatching(sessionId);
    this.cwdBySession.delete(sessionId);
    // Keep usage data in case user wants to see it later
  }

  /**
   * Add incremental usage to a session
   */
  private addUsage(
    sessionId: string,
    usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; model: string }
  ): void {
    const current = this.usageBySession.get(sessionId) || {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalCost: 0,
      model: "",
      lastUpdate: Date.now(),
    };

    current.inputTokens += usage.inputTokens;
    current.outputTokens += usage.outputTokens;
    current.cacheReadTokens += usage.cacheReadTokens;
    current.cacheWriteTokens += usage.cacheWriteTokens;
    if (usage.model) {
      current.model = usage.model;
    }
    current.totalCost = calculateCost(current);
    current.lastUpdate = Date.now();

    this.usageBySession.set(sessionId, current);
    this.emit("update", sessionId, current);
  }

  /**
   * Get usage for a session
   */
  getUsage(sessionId: string): UsageStats | undefined {
    return this.usageBySession.get(sessionId);
  }

  /**
   * Get all sessions with usage data
   */
  getAllUsage(): Map<string, UsageStats> {
    return new Map(this.usageBySession);
  }

  /**
   * Clear usage data for a session
   */
  clearUsage(sessionId: string): void {
    this.usageBySession.delete(sessionId);
  }

  /**
   * Stop all tracking
   */
  stopAll(): void {
    this.logScanner.stopAll();
  }
}

/**
 * Format token count for display (e.g., 12500 -> "12.5k")
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k`;
  }
  return tokens.toString();
}

/**
 * Format cost for display (e.g., 2.5 -> "$2.50")
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}
