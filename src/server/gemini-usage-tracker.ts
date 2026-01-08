import { EventEmitter } from "events";
import type { UsageStats } from "./types";
import { GeminiLogScanner } from "./gemini-log-scanner";

/**
 * Gemini model pricing in USD per million tokens
 * Pricing as of January 2025: https://ai.google.dev/pricing
 */
interface ModelPricing {
  input: number;
  output: number;
  cacheRead: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini 2.0 Flash
  "gemini-2.0-flash": { input: 0.10, output: 0.40, cacheRead: 0.025 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.30, cacheRead: 0.01875 },
  // Gemini 2.0 Pro (experimental, may not have pricing yet)
  "gemini-2.0-pro": { input: 1.25, output: 5.0, cacheRead: 0.3125 },
  // Gemini 1.5 models
  "gemini-1.5-flash": { input: 0.075, output: 0.30, cacheRead: 0.01875 },
  "gemini-1.5-flash-8b": { input: 0.0375, output: 0.15, cacheRead: 0.01 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0, cacheRead: 0.3125 },
  // Default pricing (Flash rates)
  default: { input: 0.10, output: 0.40, cacheRead: 0.025 },
};

/**
 * Get pricing for a model by matching prefix
 */
function getModelPricing(modelId: string): ModelPricing {
  // Normalize model ID (remove version suffixes like -001, -002, etc.)
  const normalizedId = modelId.toLowerCase().replace(/-\d{3}$/, "");

  for (const [prefix, pricing] of Object.entries(MODEL_PRICING)) {
    if (prefix !== "default" && normalizedId.startsWith(prefix)) {
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

  return inputCost + outputCost + cacheReadCost;
}

/**
 * Tracks token usage and costs per Gemini session
 */
export class GeminiUsageTracker extends EventEmitter {
  private usageBySession: Map<string, UsageStats> = new Map();
  private logScanner: GeminiLogScanner;
  private cwdBySession: Map<string, string> = new Map();

  constructor() {
    super();
    this.logScanner = new GeminiLogScanner();

    // Listen for incremental usage updates from log scanner
    this.logScanner.on(
      "usage",
      (sessionId: string, usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; model: string }) => {
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
    usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; model: string }
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
