import type { ClaudeInstance, ClaudeState, StatusUpdate, StatusMetadata } from "./types.js";

/**
 * Manages tracking of Claude Code instances and their states
 */
export class InstanceManager {
  private instances: Map<string, ClaudeInstance> = new Map();
  private readonly TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically clean up stale instances
    this.cleanupInterval = setInterval(() => this.cleanupStaleInstances(), 60000);
  }

  /**
   * States that require user action and should not be overwritten by idle/running states
   * These are "sticky" states that persist until explicitly cleared by user action
   */
  private static readonly STICKY_STATES: Set<ClaudeState> = new Set([
    "permission",
    "question"
  ]);

  /**
   * States that should NOT override sticky states
   * These typically fire when Claude finishes output but user hasn't responded yet
   */
  private static readonly NON_OVERRIDING_STATES: Set<ClaudeState> = new Set([
    "idle",
    "running"
  ]);

  /**
   * Hook events that indicate actual progress and should clear sticky states
   * These mean Claude has moved on past the permission/question state
   */
  private static readonly PROGRESS_HOOK_EVENTS: Set<string> = new Set([
    "PreToolUse",    // Claude is starting a new tool (after approval)
    "PostToolUse",   // A tool finished executing
    "Stop",          // Claude finished processing
    "SessionEnd"     // Session ended
  ]);

  /**
   * Update or create an instance based on a status update
   */
  updateInstance(update: StatusUpdate): ClaudeInstance {
    const existing = this.instances.get(update.session_id);

    // Prevent non-overriding states from clearing sticky states
    // This ensures permission/question states persist until user actually responds
    // HOWEVER: if the hook event indicates actual progress, clear sticky states
    let effectiveState = update.state;
    if (existing) {
      const currentIsSticky = InstanceManager.STICKY_STATES.has(existing.state);
      const newIsNonOverriding = InstanceManager.NON_OVERRIDING_STATES.has(update.state);
      const isProgressEvent = InstanceManager.PROGRESS_HOOK_EVENTS.has(update.hook_event);

      if (currentIsSticky && newIsNonOverriding && !isProgressEvent) {
        // Keep the sticky state, but still update metadata and timestamp
        // Only if this is NOT a progress event (which would indicate Claude moved on)
        effectiveState = existing.state;
      }
    }

    const instance: ClaudeInstance = {
      sessionId: update.session_id,
      state: effectiveState,
      metadata: update.metadata,
      lastUpdate: Date.now(),
      name: existing?.name
    };

    this.instances.set(update.session_id, instance);

    // Remove disconnected instances after a short delay
    if (update.state === "disconnected") {
      setTimeout(() => {
        const current = this.instances.get(update.session_id);
        if (current?.state === "disconnected") {
          this.instances.delete(update.session_id);
        }
      }, 10000); // 10 seconds grace period
    }

    return instance;
  }

  /**
   * Get all tracked instances
   */
  getAllInstances(): ClaudeInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get a specific instance by session ID
   */
  getInstance(sessionId: string): ClaudeInstance | undefined {
    return this.instances.get(sessionId);
  }

  /**
   * Get the state of a specific instance
   */
  getState(sessionId: string): ClaudeState {
    return this.instances.get(sessionId)?.state ?? "disconnected";
  }

  /**
   * Set a custom name for an instance
   */
  setInstanceName(sessionId: string, name: string): void {
    const instance = this.instances.get(sessionId);
    if (instance) {
      instance.name = name;
    }
  }

  /**
   * Remove an instance
   */
  removeInstance(sessionId: string): void {
    this.instances.delete(sessionId);
  }

  /**
   * Check if an instance exists
   */
  hasInstance(sessionId: string): boolean {
    return this.instances.has(sessionId);
  }

  /**
   * Get available (unassigned) instances
   */
  getAvailableInstances(): ClaudeInstance[] {
    return this.getAllInstances().filter(i => i.state !== "disconnected");
  }

  /**
   * Clean up instances that haven't been updated recently
   */
  private cleanupStaleInstances(): void {
    const now = Date.now();
    for (const [sessionId, instance] of this.instances) {
      if (now - instance.lastUpdate > this.TIMEOUT_MS) {
        // Mark as disconnected before removing
        instance.state = "disconnected";
        this.instances.delete(sessionId);
      }
    }
  }

  /**
   * Stop the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
