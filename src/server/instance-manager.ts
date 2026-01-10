import type { ClaudeInstance, ClaudeState, StatusUpdate, StatusMetadata, InstanceSource } from "./types.js";

/**
 * Manages tracking of Claude Code instances and their states
 */
export class InstanceManager {
  private instances: Map<string, ClaudeInstance> = new Map();
  private readonly TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Tab-to-session mapping for tab binding mode
  private tabToSessions: Map<number, Set<string>> = new Map();
  private sessionToTab: Map<string, number> = new Map();

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
      name: existing?.name,
      source: update.source ?? "claude" // default to claude for backward compatibility
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
   * Get instances filtered by source (claude or gemini)
   */
  getInstancesBySource(source: InstanceSource): ClaudeInstance[] {
    return this.getAllInstances().filter(i => i.source === source);
  }

  /**
   * Get available instances filtered by source
   */
  getAvailableInstancesBySource(source: InstanceSource): ClaudeInstance[] {
    return this.getAvailableInstances().filter(i => i.source === source);
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
   * Force cleanup of stale instances with a shorter threshold
   * Used when explicitly refreshing the instance list
   * @param thresholdMs - Time threshold in ms (default 30 seconds)
   * @returns Number of instances removed
   */
  forceCleanupStale(thresholdMs: number = 30000): number {
    const now = Date.now();
    let removed = 0;
    for (const [sessionId, instance] of this.instances) {
      if (now - instance.lastUpdate > thresholdMs) {
        this.instances.delete(sessionId);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Deduplicate instances by CWD, keeping only the most recently updated one
   * This handles cases where multiple sessions exist for the same project folder
   * @returns Number of duplicates removed
   */
  deduplicateByCwd(): number {
    const byCwd = new Map<string, { sessionId: string; lastUpdate: number }>();
    const toRemove: string[] = [];

    // Find the most recent instance for each CWD
    for (const [sessionId, instance] of this.instances) {
      const cwd = instance.metadata?.cwd;
      if (!cwd) continue;

      const existing = byCwd.get(cwd);
      if (!existing || instance.lastUpdate > existing.lastUpdate) {
        if (existing) {
          toRemove.push(existing.sessionId);
        }
        byCwd.set(cwd, { sessionId, lastUpdate: instance.lastUpdate });
      } else {
        toRemove.push(sessionId);
      }
    }

    // Remove duplicates
    for (const sessionId of toRemove) {
      this.instances.delete(sessionId);
    }

    return toRemove.length;
  }

  // ============================================================================
  // Tab Binding Mode Methods
  // ============================================================================

  /**
   * Associate a session with a Kitty tab
   * This is called when we discover which tab a session is running in
   */
  setSessionTab(sessionId: string, tabId: number): void {
    // Remove from old tab if exists
    const oldTabId = this.sessionToTab.get(sessionId);
    if (oldTabId !== undefined && oldTabId !== tabId) {
      const oldSessions = this.tabToSessions.get(oldTabId);
      if (oldSessions) {
        oldSessions.delete(sessionId);
        if (oldSessions.size === 0) {
          this.tabToSessions.delete(oldTabId);
        }
      }
    }

    // Add to new tab
    this.sessionToTab.set(sessionId, tabId);
    if (!this.tabToSessions.has(tabId)) {
      this.tabToSessions.set(tabId, new Set());
    }
    this.tabToSessions.get(tabId)!.add(sessionId);
  }

  /**
   * Get the tab ID for a session
   */
  getTabForSession(sessionId: string): number | undefined {
    return this.sessionToTab.get(sessionId);
  }

  /**
   * Get all session IDs in a specific tab
   */
  getSessionIdsInTab(tabId: number): string[] {
    const sessions = this.tabToSessions.get(tabId);
    return sessions ? Array.from(sessions) : [];
  }

  /**
   * Get all instances in a specific tab
   */
  getSessionsInTab(tabId: number): ClaudeInstance[] {
    const sessionIds = this.getSessionIdsInTab(tabId);
    return sessionIds
      .map(id => this.instances.get(id))
      .filter((i): i is ClaudeInstance => i !== undefined);
  }

  /**
   * Priority order for state aggregation
   * Higher priority states should surface first (user-attention-required states)
   */
  private static readonly STATE_PRIORITY: ClaudeState[] = [
    "permission",   // Needs immediate user action
    "question",     // Needs user input
    "error",        // Something went wrong
    "running",      // Active processing
    "tool_use",     // Using a tool
    "editing",      // Editing files
    "idle",         // Ready for input
    "disconnected"  // Not connected
  ];

  /**
   * Compute aggregated state for a tab containing multiple sessions
   * Returns the highest-priority state among all sessions in the tab
   */
  getAggregatedTabState(tabId: number): ClaudeState {
    const sessions = this.getSessionsInTab(tabId);
    if (sessions.length === 0) {
      return "disconnected";
    }

    // Find the highest-priority state among all sessions
    for (const state of InstanceManager.STATE_PRIORITY) {
      if (sessions.some(s => s.state === state)) {
        return state;
      }
    }

    return "disconnected";
  }

  /**
   * Get all tracked tabs (tabs that have at least one session)
   */
  getTrackedTabs(): number[] {
    return Array.from(this.tabToSessions.keys());
  }

  /**
   * Clear tab mapping for a session (when session disconnects)
   */
  clearSessionTab(sessionId: string): void {
    const tabId = this.sessionToTab.get(sessionId);
    if (tabId !== undefined) {
      const sessions = this.tabToSessions.get(tabId);
      if (sessions) {
        sessions.delete(sessionId);
        if (sessions.size === 0) {
          this.tabToSessions.delete(tabId);
        }
      }
      this.sessionToTab.delete(sessionId);
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
