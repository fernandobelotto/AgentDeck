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

import { InteractionHandler } from "../utils/interaction-handler.js";
import { AnimationController } from "../icons/animation-controller.js";
import { focusTerminal, sendCancelSignal, sendApproveSignal, openTerminalWithClaude } from "../utils/terminal-focus.js";
import type {
  ClaudeInstanceSettings,
  ClaudeState,
  WebSocketMessage,
  ClaudeInstance,
  CommandMessage
} from "../server/types.js";

const WS_URL = "ws://127.0.0.1:19847";
const WS_RECONNECT_DELAY = 5000;

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

    // Close WebSocket if no more actions
    if (this.animationControllers.size === 0) {
      this.closeWebSocket();
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
   * Handle single press - focus terminal or launch new Claude instance
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
    logger.info(`Session ID: ${sessionId || "none"}, Project folder: ${projectFolder || "none"}`);

    // If project folder is configured, always launch new Claude instance there
    if (projectFolder) {
      logger.info(`Launching Claude in project folder: ${projectFolder}`);
      const result = await openTerminalWithClaude(projectFolder);
      if (result.success) {
        logger.info(`Launched Claude in ${projectFolder}, windowId: ${result.windowId}`);
      } else {
        logger.error(`Failed to launch Claude in ${projectFolder}: ${result.error}`);
      }
      return;
    }

    // Otherwise use existing behavior
    if (sessionId) {
      // Focus existing terminal window using Kitty remote control
      const instance = this.knownInstances.get(sessionId);
      const cwd = instance?.metadata?.cwd;
      logger.info(`Focusing terminal for session: ${sessionId}, cwd: ${cwd}`);
      focusTerminal(sessionId, cwd);
    } else {
      // No instance attached - open a new Kitty window with Claude
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
    const action = this.actionContexts.get(contextId);
    if (!action) return;

    const settings = await action.getSettings<ClaudeInstanceSettings>();
    const sessionId = settings.sessionId as string | undefined;
    if (sessionId) {
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
    const action = this.actionContexts.get(contextId);
    if (!action) return;

    const settings = await action.getSettings<ClaudeInstanceSettings>();
    const sessionId = settings.sessionId as string | undefined;
    const state = sessionId ? this.instanceStates.get(sessionId) : undefined;

    // Only approve if in permission state
    if (sessionId && state === "permission") {
      const instance = this.knownInstances.get(sessionId);
      const cwd = instance?.metadata?.cwd;
      this.sendCommand(sessionId, "approve");
      sendApproveSignal(sessionId, cwd);
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
    } else if (message.type === "update") {
      // Update specific instance state
      this.instanceStates.set(message.sessionId, message.state);

      // Update actions bound to this session
      this.updateBoundActions(message.sessionId, message.state);
    }
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
   * Get list of known instances for Property Inspector
   */
  getKnownInstances(): ClaudeInstance[] {
    return Array.from(this.knownInstances.values());
  }
}
