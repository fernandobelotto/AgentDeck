/**
 * Claude Code instance states that can be visualized on the Stream Deck
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
 * Tracked Claude Code instance
 */
export interface ClaudeInstance {
  sessionId: string;
  state: ClaudeState;
  metadata: StatusMetadata;
  lastUpdate: number;
  name?: string;
}

/**
 * WebSocket message sent to Stream Deck plugin
 */
export type WebSocketMessage =
  | InitMessage
  | UpdateMessage
  | CommandResponseMessage;

export interface InitMessage {
  type: "init";
  instances: ClaudeInstance[];
}

export interface UpdateMessage {
  type: "update";
  sessionId: string;
  state: ClaudeState;
  metadata: StatusMetadata;
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
 * Settings stored for each Stream Deck action instance
 * Uses index signature compatible with JsonObject
 */
export interface ClaudeInstanceSettings {
  sessionId?: string;
  instanceName?: string;
  autoAssign?: boolean;
  projectFolder?: string;
  [key: string]: string | boolean | number | null | undefined;
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
