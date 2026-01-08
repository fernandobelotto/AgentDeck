/**
 * Source of the AI agent instance (which CLI tool)
 */
export type InstanceSource = "claude" | "gemini";

/**
 * Claude Code instance states that can be visualized on the Stream Deck
 * Also used by Gemini CLI instances
 */
export type ClaudeState =
  | "idle"
  | "running"
  | "tool_use"
  | "editing"
  | "question"
  | "permission"
  | "error"
  | "disconnected";

/**
 * Status update received from Claude Code hooks
 */
export interface StatusUpdate {
  session_id: string;
  state: ClaudeState;
  hook_event: string;
  metadata: StatusMetadata;
  source?: InstanceSource; // defaults to "claude" for backward compatibility
}

/**
 * Metadata associated with a status update
 */
export interface StatusMetadata {
  cwd?: string;
  tool_name?: string;
  timestamp: string;
  error_message?: string;
}

/**
 * Tracked Claude Code instance (also used for Gemini CLI)
 */
export interface ClaudeInstance {
  sessionId: string;
  state: ClaudeState;
  metadata: StatusMetadata;
  lastUpdate: number;
  name?: string;
  source: InstanceSource;
}

/**
 * WebSocket message sent to Stream Deck plugin
 */
export type WebSocketMessage =
  | InitMessage
  | UpdateMessage
  | CommandResponseMessage
  | UsageUpdateMessage;

export interface InitMessage {
  type: "init";
  instances: ClaudeInstance[];
}

export interface UpdateMessage {
  type: "update";
  sessionId: string;
  state: ClaudeState;
  metadata: StatusMetadata;
  source: InstanceSource;
}

export interface CommandResponseMessage {
  type: "command_response";
  sessionId: string;
  command: CommandType;
  success: boolean;
  error?: string;
}

/**
 * Commands that can be sent to Claude Code instances
 */
export type CommandType = "cancel" | "approve" | "focus";

/**
 * Command message from Stream Deck to server
 */
export interface CommandMessage {
  type: "command";
  sessionId: string;
  command: CommandType;
}

/**
 * Display modes for the Claude Instance action
 */
export type DisplayMode = "status" | "tokens" | "cost" | "activity";

/**
 * Settings stored for each Stream Deck action instance
 * Uses index signature compatible with JsonObject
 */
export interface ClaudeInstanceSettings {
  sessionId?: string;
  instanceName?: string;
  autoAssign?: boolean;
  projectFolder?: string;
  displayMode?: DisplayMode;
  [key: string]: string | boolean | number | null | undefined;
}

/**
 * Settings stored for each Gemini Stream Deck action instance
 * Uses index signature compatible with JsonObject
 */
export interface GeminiInstanceSettings {
  sessionId?: string;
  instanceName?: string;
  autoAssign?: boolean;
  projectFolder?: string;
  displayMode?: DisplayMode;
  [key: string]: string | boolean | number | null | undefined;
}

/**
 * Token usage statistics for a session
 */
export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalCost: number; // in USD
  model: string;
  lastUpdate: number; // Unix timestamp
}

/**
 * WebSocket message for usage updates
 */
export interface UsageUpdateMessage {
  type: "usage_update";
  sessionId: string;
  usage: UsageStats;
  source?: InstanceSource;
}

/**
 * Hook event names from Claude Code
 */
export type HookEventName =
  | "SessionStart"
  | "SessionEnd"
  | "PreToolUse"
  | "PostToolUse"
  | "Notification"
  | "Stop"
  | "PermissionRequest"
  | "SubagentStop"
  | "PreCompact";

/**
 * Raw hook input from Claude Code
 */
export interface HookInput {
  session_id?: string;
  hook_event_name?: HookEventName;
  cwd?: string;
  tool_name?: string;
  notification_type?: string;
  error?: string;
}
