import streamDeck, {
  KeyDownEvent,
  KeyUpEvent,
  WillAppearEvent,
  WillDisappearEvent,
  DidReceiveSettingsEvent,
  SingletonAction,
  Action
} from "@elgato/streamdeck";

const logger = streamDeck.logger;
import { WebSocket } from "ws";

import { InteractionHandler, setInteractionLogger } from "../utils/interaction-handler.js";
import { AnimationController } from "../icons/animation-controller.js";
import { focusTerminal, sendCancelSignal, sendApproveSignal, openTerminalWithClaude } from "../utils/terminal-focus.js";
import { isKittyAvailable, launchKittyWithRemoteControl } from "../utils/kitty-remote.js";
import type {
  ClaudeInstanceSettings,
  ClaudeState,
  WebSocketMessage,
  ClaudeInstance,
  CommandMessage
} from "../server/types.js";

const WS_URL = "ws://127.0.0.1:19847";
const WS_RECONNECT_DELAY = 5000;
const KITTY_POLL_INTERVAL = 5000; // Poll Kitty status every 5 seconds

// Set up interaction handler logging to use Stream Deck logger
setInteractionLogger((msg) => logger.info(`[Interaction] ${msg}`));

/**
 * Stream Deck action for monitoring and controlling Claude Code instances
 *
 * Features:
 * - Animated status icons showing current Claude Code state
 * - Single press: Focus terminal window
 * - Double press: Cancel current operation
 * - Hold: Approve pending permission request
 */
export class ClaudeInstanceAction extends SingletonAction<ClaudeInstanceSettings> {
  /** Action UUID from manifest */
  override readonly manifestId = "com.claudedeck.plugin.claude-instance";

  /** WebSocket connection to status server */
  private wsConnection: WebSocket | null = null;

  /** Whether we're actively trying to connect */
  private isConnecting = false;

  /** Reconnection timer */
  private reconnectTimer: NodeJS.Timeout | null = null;

  /** Interaction handlers for each action context */
  private interactionHandlers: Map<string, InteractionHandler> = new Map();

  /** Animation controllers for each action context */
  private animationControllers: Map<string, AnimationController> = new Map();

  /** Current state of each Claude Code instance */
  private instanceStates: Map<string, ClaudeState> = new Map();

  /** All known instances */
  private knownInstances: Map<string, ClaudeInstance> = new Map();

  /** Action references by context ID for fetching fresh settings */
  private actionContexts: Map<string, Action<ClaudeInstanceSettings>> = new Map();

  /** Kitty status polling timer */
  private kittyPollTimer: NodeJS.Timeout | null = null;

  /** Current Kitty availability status */
  private kittyAvailable: boolean = false;

  /**
   * Called when an action instance appears on the Stream Deck
   */
  override async onWillAppear(ev: WillAppearEvent<ClaudeInstanceSettings>): Promise<void> {
    const contextId = ev.action.id;
    const settings = ev.payload.settings;

    // Store action reference for fetching fresh settings
    this.actionContexts.set(contextId, ev.action);

    // Initialize interaction handler for this action instance
    // Note: callbacks fetch fresh settings on each press to handle config changes
    this.interactionHandlers.set(
      contextId,
      new InteractionHandler({
        onSinglePress: () => this.handleSinglePress(contextId),
        onDoublePress: () => this.handleDoublePress(contextId),
        onHold: () => this.handleHold(contextId)
      })
    );

    // Initialize animation controller
    const animController = new AnimationController((dataUrl) => {
      if (ev.action.isKey()) {
        ev.action.setImage(dataUrl);
      }
    });
    this.animationControllers.set(contextId, animController);

    // Connect to status server if not connected
    this.ensureWebSocketConnection();

    // Start Kitty status polling if not already running
    this.startKittyPolling();

    // Set initial display
    const sessionId = settings.sessionId as string | undefined;
    if (sessionId && this.instanceStates.has(sessionId)) {
      this.updateDisplay(ev.action, this.instanceStates.get(sessionId)!, settings);
    } else {
      this.updateDisplay(ev.action, "disconnected", settings);
    }
  }

  /**
   * Called when an action instance disappears from the Stream Deck
   */
  override async onWillDisappear(ev: WillDisappearEvent<ClaudeInstanceSettings>): Promise<void> {
    const contextId = ev.action.id;

    // Clean up interaction handler
    const interactionHandler = this.interactionHandlers.get(contextId);
    if (interactionHandler) {
      interactionHandler.destroy();
      this.interactionHandlers.delete(contextId);
    }

    // Clean up action reference
    this.actionContexts.delete(contextId);

    // Clean up animation controller
    const animController = this.animationControllers.get(contextId);
    if (animController) {
      animController.stop();
      this.animationControllers.delete(contextId);
    }

    // Close WebSocket and stop polling if no more actions
    if (this.animationControllers.size === 0) {
      this.closeWebSocket();
      this.stopKittyPolling();
    }
  }

  /**
   * Called when a key is pressed down
   */
  override async onKeyDown(ev: KeyDownEvent<ClaudeInstanceSettings>): Promise<void> {
    const handler = this.interactionHandlers.get(ev.action.id);
    handler?.handleKeyDown();
  }

  /**
   * Called when a key is released
   */
  override async onKeyUp(ev: KeyUpEvent<ClaudeInstanceSettings>): Promise<void> {
    const handler = this.interactionHandlers.get(ev.action.id);
    handler?.handleKeyUp();
  }

  /**
   * Called when settings are changed via Property Inspector
   */
  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ClaudeInstanceSettings>): Promise<void> {
    const settings = ev.payload.settings;
    const sessionId = settings.sessionId as string | undefined;

    // Update display with new settings
    if (sessionId && this.instanceStates.has(sessionId)) {
      this.updateDisplay(ev.action, this.instanceStates.get(sessionId)!, settings);
    } else {
      this.updateDisplay(ev.action, "disconnected", settings);
    }
  }

  /**
   * Handle single press - focus terminal, launch Kitty, or launch new Claude instance
   */
  private async handleSinglePress(contextId: string): Promise<void> {
    logger.info(`Single press on context: ${contextId}`);
    const action = this.actionContexts.get(contextId);
    if (!action) {
      logger.warn(`No action found for context: ${contextId}`);
      return;
    }

    const settings = await action.getSettings<ClaudeInstanceSettings>();
    const sessionId = settings.sessionId as string | undefined;
    const projectFolder = settings.projectFolder as string | undefined;
    logger.info(`Session ID: ${sessionId || "none"}, Project folder: ${projectFolder || "none"}, Kitty available: ${this.kittyAvailable}`);

    // If session is attached, focus that terminal window
    if (sessionId) {
      const instance = this.knownInstances.get(sessionId);
      const cwd = instance?.metadata?.cwd;
      logger.info(`Focusing terminal for session: ${sessionId}, cwd: ${cwd}`);
      focusTerminal(sessionId, cwd);
      return;
    }

    // No session attached - check if Kitty is available first
    if (!this.kittyAvailable) {
      // Launch Kitty with remote control enabled
      logger.info(`Kitty not available - launching Kitty with remote control`);
      const result = await launchKittyWithRemoteControl(projectFolder);
      if (result.success) {
        logger.info(`Launched Kitty with remote control enabled`);
        // Poll immediately to update the status, with retry
        await this.pollKittyStatus();
        // If still not available, try again after a short delay
        if (!this.kittyAvailable) {
          logger.info(`Kitty not detected yet, retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          await this.pollKittyStatus();
        }
      } else {
        logger.error(`Failed to launch Kitty: ${result.error}`);
      }
      return;
    }

    // Kitty is available - launch new Claude instance
    // Use project folder if configured, otherwise launch without a specific directory
    if (projectFolder) {
      logger.info(`Launching Claude in project folder: ${projectFolder}`);
      const result = await openTerminalWithClaude(projectFolder);
      if (result.success) {
        logger.info(`Launched Claude in ${projectFolder}, windowId: ${result.windowId}`);
      } else {
        logger.error(`Failed to launch Claude in ${projectFolder}: ${result.error}`);
      }
    } else {
      logger.info(`No session - launching new Claude window`);
      const result = await openTerminalWithClaude();
      if (result.success) {
        logger.info(`Launched Claude window, windowId: ${result.windowId}`);
      } else {
        logger.error(`Failed to launch Claude window: ${result.error}`);
      }
    }
  }

  /**
   * Handle double press - cancel operation
   */
  private async handleDoublePress(contextId: string): Promise<void> {
    logger.info(`[Action] handleDoublePress called for context: ${contextId}`);
    const action = this.actionContexts.get(contextId);
    if (!action) return;

    const settings = await action.getSettings<ClaudeInstanceSettings>();
    const sessionId = settings.sessionId as string | undefined;
    if (sessionId) {
      logger.info(`[Action] Sending cancel signal for session: ${sessionId}`);
      const instance = this.knownInstances.get(sessionId);
      const cwd = instance?.metadata?.cwd;
      this.sendCommand(sessionId, "cancel");
      sendCancelSignal(sessionId, cwd);
    }
  }

  /**
   * Handle hold - approve permission
   */
  private async handleHold(contextId: string): Promise<void> {
    logger.info(`[Action] handleHold called for context: ${contextId}`);
    const action = this.actionContexts.get(contextId);
    if (!action) return;

    const settings = await action.getSettings<ClaudeInstanceSettings>();
    const sessionId = settings.sessionId as string | undefined;
    const state = sessionId ? this.instanceStates.get(sessionId) : undefined;

    logger.info(`[Action] Hold - sessionId: ${sessionId}, state: ${state}`);

    // Only approve if in permission state
    if (sessionId && state === "permission") {
      logger.info(`[Action] Sending approve signal for session: ${sessionId}`);
      const instance = this.knownInstances.get(sessionId);
      const cwd = instance?.metadata?.cwd;
      logger.info(`[Action] Instance cwd: ${cwd}`);
      this.sendCommand(sessionId, "approve");
      try {
        await sendApproveSignal(sessionId, cwd);
        logger.info(`[Action] sendApproveSignal completed`);
      } catch (err) {
        logger.error(`[Action] sendApproveSignal failed: ${err}`);
      }
    } else {
      logger.info(`[Action] Hold ignored - not in permission state`);
    }
  }

  /**
   * Update the display for an action
   */
  private updateDisplay(
    action: Action<ClaudeInstanceSettings>,
    state: ClaudeState,
    settings: ClaudeInstanceSettings
  ): void {
    const contextId = action.id;
    const animController = this.animationControllers.get(contextId);

    if (animController) {
      animController.setState(state);
    }

    // Update title with instance name or session ID prefix
    const instanceName = settings.instanceName as string | undefined;
    const sessionId = settings.sessionId as string | undefined;
    const title = instanceName || (sessionId ? sessionId.substring(0, 6) : "---");

    if (action.isKey()) {
      action.setTitle(title);
    }
  }

  /**
   * Ensure WebSocket connection to status server
   */
  private ensureWebSocketConnection(): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.wsConnection = new WebSocket(WS_URL);

      this.wsConnection.on("open", () => {
        this.isConnecting = false;
        console.log("Connected to ClaudeDeck status server");
      });

      this.wsConnection.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleWebSocketMessage(message);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      });

      this.wsConnection.on("close", () => {
        this.isConnecting = false;
        this.wsConnection = null;
        this.scheduleReconnect();
      });

      this.wsConnection.on("error", (err) => {
        console.error("WebSocket error:", err);
        this.isConnecting = false;
      });
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    // Only reconnect if we still have active actions
    if (this.animationControllers.size > 0) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.ensureWebSocketConnection();
      }, WS_RECONNECT_DELAY);
    }
  }

  /**
   * Close WebSocket connection
   */
  private closeWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleWebSocketMessage(message: WebSocketMessage): void {
    if (message.type === "init") {
      // Initialize all instance states
      this.instanceStates.clear();
      this.knownInstances.clear();

      for (const instance of message.instances) {
        this.instanceStates.set(instance.sessionId, instance.state);
        this.knownInstances.set(instance.sessionId, instance);
      }

      // Update all actions
      this.updateAllActions();

      // Try auto-assign for each existing instance on init
      for (const instance of message.instances) {
        this.tryAutoAssign(instance.sessionId, instance.metadata?.cwd);
      }
    } else if (message.type === "update") {
      // Check if this is a NEW instance (not previously tracked)
      const isNewInstance = !this.knownInstances.has(message.sessionId);

      // Update specific instance state
      this.instanceStates.set(message.sessionId, message.state);

      // Update or create the known instance with metadata
      const existing = this.knownInstances.get(message.sessionId);
      this.knownInstances.set(message.sessionId, {
        sessionId: message.sessionId,
        state: message.state,
        metadata: message.metadata,
        lastUpdate: Date.now(),
        name: existing?.name
      });

      // Update actions bound to this session
      this.updateBoundActions(message.sessionId, message.state);

      // Try auto-assign only for NEW instances
      if (isNewInstance) {
        this.tryAutoAssign(message.sessionId, message.metadata?.cwd);
      }
    }
  }

  /**
   * Try to auto-assign a new instance to an unbound action with autoAssign enabled.
   * Priority: actions with matching projectFolder first, then actions without projectFolder.
   */
  private async tryAutoAssign(sessionId: string, instanceCwd?: string): Promise<void> {
    logger.info(`[AutoAssign] Checking auto-assign for session: ${sessionId}, cwd: ${instanceCwd}`);

    // Collect all actions with autoAssign enabled and no sessionId
    const eligibleActions: { action: Action<ClaudeInstanceSettings>; settings: ClaudeInstanceSettings; hasFolder: boolean }[] = [];

    for (const action of this.actions) {
      const settings = await action.getSettings<ClaudeInstanceSettings>();

      // Skip if autoAssign is not enabled or already has a session
      if (!settings.autoAssign || settings.sessionId) {
        continue;
      }

      eligibleActions.push({
        action,
        settings,
        hasFolder: !!settings.projectFolder
      });
    }

    if (eligibleActions.length === 0) {
      logger.info(`[AutoAssign] No eligible actions found`);
      return;
    }

    // Normalize paths for comparison (remove trailing slashes)
    const normalizePath = (p: string) => p.replace(/\/+$/, "");
    const normalizedInstanceCwd = instanceCwd ? normalizePath(instanceCwd) : undefined;

    // First pass: find action with matching projectFolder
    for (const { action, settings } of eligibleActions) {
      if (!settings.projectFolder) continue;

      const normalizedProjectFolder = normalizePath(settings.projectFolder);
      if (normalizedInstanceCwd && normalizedProjectFolder === normalizedInstanceCwd) {
        logger.info(`[AutoAssign] Matched by projectFolder: ${normalizedProjectFolder}`);
        await this.assignInstanceToAction(action, sessionId, settings, instanceCwd);
        return;
      }
    }

    // Second pass: find action without projectFolder (takes any instance)
    for (const { action, settings } of eligibleActions) {
      if (settings.projectFolder) continue;

      logger.info(`[AutoAssign] Assigning to action without projectFolder restriction`);
      await this.assignInstanceToAction(action, sessionId, settings, instanceCwd);
      return;
    }

    logger.info(`[AutoAssign] No matching action found for session ${sessionId}`);
  }

  /**
   * Assign an instance to an action and update its settings
   */
  private async assignInstanceToAction(
    action: Action<ClaudeInstanceSettings>,
    sessionId: string,
    currentSettings: ClaudeInstanceSettings,
    instanceCwd?: string
  ): Promise<void> {
    const newSettings: ClaudeInstanceSettings = {
      ...currentSettings,
      sessionId: sessionId
    };

    // Auto-fill instance name from cwd if not already set
    if (!newSettings.instanceName && instanceCwd) {
      const folderName = instanceCwd.split("/").pop();
      if (folderName) {
        newSettings.instanceName = folderName;
      }
    }

    logger.info(`[AutoAssign] Assigning session ${sessionId} to action ${action.id}`);
    await action.setSettings(newSettings);

    // Update display with the new state
    const state = this.instanceStates.get(sessionId) ?? "idle";
    this.updateDisplay(action, state, newSettings);
  }

  /**
   * Update all action instances
   */
  private updateAllActions(): void {
    for (const action of this.actions) {
      action.getSettings<ClaudeInstanceSettings>().then((settings) => {
        const sessionId = settings.sessionId as string | undefined;
        const state = sessionId ? this.instanceStates.get(sessionId) ?? "disconnected" : "disconnected";
        this.updateDisplay(action, state, settings);
      });
    }
  }

  /**
   * Update actions bound to a specific session
   */
  private updateBoundActions(sessionId: string, state: ClaudeState): void {
    for (const action of this.actions) {
      action.getSettings<ClaudeInstanceSettings>().then((settings) => {
        if (settings.sessionId === sessionId) {
          this.updateDisplay(action, state, settings);
        }
      });
    }
  }

  /**
   * Send a command to the status server
   */
  private sendCommand(sessionId: string, command: "cancel" | "approve" | "focus"): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      const message: CommandMessage = {
        type: "command",
        sessionId,
        command
      };
      this.wsConnection.send(JSON.stringify(message));
    }
  }

  /**
   * Start polling Kitty availability status
   */
  private startKittyPolling(): void {
    if (this.kittyPollTimer) {
      return; // Already polling
    }

    // Poll immediately on start
    this.pollKittyStatus();

    // Set up periodic polling
    this.kittyPollTimer = setInterval(() => {
      this.pollKittyStatus();
    }, KITTY_POLL_INTERVAL);
  }

  /**
   * Stop polling Kitty availability status
   */
  private stopKittyPolling(): void {
    if (this.kittyPollTimer) {
      clearInterval(this.kittyPollTimer);
      this.kittyPollTimer = null;
    }
  }

  /**
   * Poll Kitty availability and update all animation controllers
   */
  private async pollKittyStatus(): Promise<void> {
    const available = await isKittyAvailable();

    if (this.kittyAvailable !== available) {
      logger.info(`Kitty availability changed: ${this.kittyAvailable} -> ${available}`);
      this.kittyAvailable = available;

      // Update all animation controllers with new Kitty status
      for (const animController of this.animationControllers.values()) {
        animController.setKittyAvailable(available);
      }
    }
  }

  /**
   * Get list of known instances for Property Inspector
   */
  getKnownInstances(): ClaudeInstance[] {
    return Array.from(this.knownInstances.values());
  }
}
