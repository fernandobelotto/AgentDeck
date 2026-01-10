import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readdirSync, statSync, existsSync } from "node:fs";

const execAsync = promisify(exec);

// Full paths to Kitty binaries (macOS app bundle)
const KITTY_PATHS = {
  kitty: "/Applications/kitty.app/Contents/MacOS/kitty",
  kitten: "/Applications/kitty.app/Contents/MacOS/kitten"
};

/**
 * Get the path to a Kitty binary, preferring full path on macOS
 */
function getKittyBinary(name: "kitty" | "kitten"): string {
  const fullPath = KITTY_PATHS[name];
  if (existsSync(fullPath)) {
    return fullPath;
  }
  // Fallback to command name (relies on PATH)
  return name;
}

/**
 * Kitty Remote Control Module
 * Wraps kitten @ commands for terminal control via Kitty's remote control API
 */

// ============================================================================
// Types
// ============================================================================

export interface KittyWindow {
  id: number;
  title: string;
  cwd: string;
  is_focused: boolean;
  is_active: boolean;
  cmdline: string[];
  pid: number;
  env: Record<string, string>;
}

export interface KittyTab {
  id: number;
  is_active: boolean;
  is_focused: boolean;
  title: string;
  windows: KittyWindow[];
}

export interface KittyOSWindow {
  id: number;
  is_focused: boolean;
  is_active: boolean;
  tabs: KittyTab[];
}

export type KittyLsResponse = KittyOSWindow[];

export interface KittyWindowMatch {
  cwd?: string;
  title?: string;
  id?: number;
  cmdline?: string;
}

export interface KittyRemoteOptions {
  socketPath?: string;
  timeout?: number;
}

/**
 * Extended tab information with agent session tracking
 */
export interface KittyTabInfo {
  tabId: number;
  osWindowId: number;
  title: string;
  isActive: boolean;
  isFocused: boolean;
  windows: KittyWindow[]; // panes in this tab
  agentSessions: string[]; // session IDs extracted from pane titles
}

// ============================================================================
// Socket Path Detection
// ============================================================================

/** Cache for working socket path (cleared on failed connections) */
let cachedSocketPath: string | null = null;

/**
 * Find all Kitty socket candidates in /tmp directory
 */
function findKittySocketCandidates(): string[] {
  const candidates: string[] = [];

  try {
    // First check for exact /tmp/kitty socket
    try {
      const stat = statSync("/tmp/kitty");
      if (stat.isSocket()) {
        candidates.push("unix:/tmp/kitty");
      }
    } catch {
      // Not found, continue searching
    }

    // Look for /tmp/kitty-* sockets (PID-suffixed)
    const files = readdirSync("/tmp");
    const kittySockets = files
      .filter(f => f.startsWith("kitty-"))
      .map(f => `/tmp/${f}`)
      .filter(path => {
        try {
          return statSync(path).isSocket();
        } catch {
          return false;
        }
      });

    // Sort by modification time (most recent first)
    kittySockets.sort((a, b) => {
      try {
        return statSync(b).mtimeMs - statSync(a).mtimeMs;
      } catch {
        return 0;
      }
    });

    candidates.push(...kittySockets.map(s => `unix:${s}`));
  } catch {
    // Ignore errors
  }

  return candidates;
}

/**
 * Clear the cached socket path (call when connection fails)
 */
export function clearSocketCache(): void {
  cachedSocketPath = null;
}

/**
 * Get all detected socket candidates (for debugging)
 */
export function getSocketCandidates(): string[] {
  return findKittySocketCandidates();
}

/**
 * Get the Kitty socket path for remote control
 * Priority:
 * 1. Cached working socket path
 * 2. KITTY_LISTEN_ON environment variable
 * 3. Auto-detect /tmp/kitty or /tmp/kitty-* sockets
 * 4. Default: unix:/tmp/kitty
 */
export function getKittySocketPath(): string {
  // Return cached path if available
  if (cachedSocketPath) {
    return cachedSocketPath;
  }

  if (process.env.KITTY_LISTEN_ON) {
    return process.env.KITTY_LISTEN_ON;
  }

  const candidates = findKittySocketCandidates();
  if (candidates.length > 0) {
    return candidates[0];
  }

  return "unix:/tmp/kitty";
}

/**
 * Find a working Kitty socket by testing each candidate
 * Returns the first socket that responds to `ls` command
 */
export async function findWorkingSocket(): Promise<string | null> {
  // Check environment variable first
  if (process.env.KITTY_LISTEN_ON) {
    const envSocket = process.env.KITTY_LISTEN_ON;
    try {
      await execKittenCommand("ls", [], { socketPath: envSocket, timeout: 2000 });
      cachedSocketPath = envSocket;
      return envSocket;
    } catch {
      // Continue to other candidates
    }
  }

  const candidates = findKittySocketCandidates();

  for (const socketPath of candidates) {
    try {
      await execKittenCommand("ls", [], { socketPath, timeout: 2000 });
      cachedSocketPath = socketPath;
      return socketPath;
    } catch {
      // Try next candidate
    }
  }

  return null;
}

// ============================================================================
// Core Command Execution
// ============================================================================

/**
 * Execute a kitten @ command and return the result
 */
async function execKittenCommand(
  command: string,
  args: string[] = [],
  options: KittyRemoteOptions = {}
): Promise<string> {
  const socketPath = options.socketPath || getKittySocketPath();
  const timeout = options.timeout || 5000;

  const kittenBin = getKittyBinary("kitten");
  const fullArgs = ["@", "--to", socketPath, command, ...args];
  const cmd = `"${kittenBin}" ${fullArgs.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(" ")}`;

  try {
    const { stdout } = await execAsync(cmd, { timeout });
    return stdout.trim();
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "ETIMEDOUT") {
      throw new Error(`Kitty command timed out: ${command}`);
    }
    throw new Error(`Kitty command failed: ${command} - ${err.message || error}`);
  }
}

// ============================================================================
// Core API Functions
// ============================================================================

/**
 * Check if Kitty remote control is available
 */
export async function isKittyAvailable(options?: KittyRemoteOptions): Promise<boolean> {
  try {
    await execKittenCommand("ls", [], { ...options, timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * List all Kitty windows with their metadata
 * Uses: kitten @ --to <socket> ls
 */
export async function listWindows(options?: KittyRemoteOptions): Promise<KittyLsResponse> {
  const output = await execKittenCommand("ls", [], options);
  try {
    return JSON.parse(output) as KittyLsResponse;
  } catch {
    throw new Error("Failed to parse Kitty window list");
  }
}

/**
 * Focus a window by matching criteria
 * Uses: kitten @ --to <socket> focus-window --match <match>
 */
export async function focusWindow(
  match: KittyWindowMatch,
  options?: KittyRemoteOptions
): Promise<boolean> {
  const matchString = buildMatchString(match);
  if (!matchString) {
    return false;
  }

  try {
    await execKittenCommand("focus-window", ["--match", matchString], options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Send text to a window
 * Uses: kitten @ --to <socket> send-text --match <match> <text>
 */
export async function sendText(
  text: string,
  match?: KittyWindowMatch,
  options?: KittyRemoteOptions
): Promise<boolean> {
  const args: string[] = [];

  if (match) {
    const matchString = buildMatchString(match);
    if (matchString) {
      args.push("--match", matchString);
    }
  }

  args.push("--", text);

  try {
    await execKittenCommand("send-text", args, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scroll a window to the bottom of scrollback
 * Uses: kitten @ --to <socket> scroll-window --match <match> end
 */
export async function scrollWindowToBottom(
  match?: KittyWindowMatch,
  options?: KittyRemoteOptions
): Promise<boolean> {
  const args: string[] = [];

  if (match) {
    const matchString = buildMatchString(match);
    if (matchString) {
      args.push("--match", matchString);
    }
  }

  args.push("end");

  try {
    await execKittenCommand("scroll-window", args, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a key press to a window
 * Uses: kitten @ --to <socket> send-key --match <match> <key>
 * This is better for TUI apps that need actual key events, not text input
 */
export async function sendKey(
  key: string,
  match?: KittyWindowMatch,
  options?: KittyRemoteOptions
): Promise<boolean> {
  const args: string[] = [];

  if (match) {
    const matchString = buildMatchString(match);
    if (matchString) {
      args.push("--match", matchString);
    }
  }

  args.push(key);

  try {
    await execKittenCommand("send-key", args, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Launch a new Kitty OS window with optional command
 * Uses: kitten @ --to <socket> launch --type=os-window --cwd=<cwd> <command>
 * Commands are wrapped in a login shell to ensure aliases and PATH are available
 */
export async function launchWindow(
  command?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  const args: string[] = ["--type=os-window"];

  if (cwd) {
    args.push(`--cwd=${cwd}`);
  }

  if (command) {
    // Use interactive shell to ensure aliases are available
    const shell = process.env.SHELL || "/bin/zsh";
    args.push(shell, "-i", "-c", command);
  }

  try {
    const output = await execKittenCommand("launch", args, options);
    // The launch command returns the window ID
    const windowId = parseInt(output, 10);
    return isNaN(windowId) ? null : windowId;
  } catch {
    return null;
  }
}

// ============================================================================
// Match String Builder
// ============================================================================

/**
 * Build a kitten @ match string from options
 * See: https://sw.kovidgoyal.net/kitty/remote-control/#matching-windows-and-tabs
 */
function buildMatchString(match: KittyWindowMatch): string | null {
  const parts: string[] = [];

  if (match.id !== undefined) {
    parts.push(`id:${match.id}`);
  }

  if (match.cwd) {
    parts.push(`cwd:${match.cwd}`);
  }

  if (match.title) {
    parts.push(`title:${match.title}`);
  }

  if (match.cmdline) {
    parts.push(`cmdline:${match.cmdline}`);
  }

  if (parts.length === 0) {
    return null;
  }

  // Join with "and" for multiple conditions
  return parts.join(" and ");
}

// ============================================================================
// Tab Management Functions
// ============================================================================

/**
 * Extract session ID from a window title
 * Matches format: "[Agent]:[sessionId]:project - state"
 * Returns the full session ID prefix (first 8 characters used in titles)
 */
function extractSessionFromTitle(title: string): string | null {
  // Match Claude:abc12345:project, Gemini:abc12345:project, Cursor:abc12345:project
  const match = title.match(/^(?:Claude|Gemini|Cursor):([a-f0-9]+):/i);
  return match ? match[1] : null;
}

/**
 * List all Kitty tabs with their metadata and detected agent sessions
 * Provides the full OS Window → Tab → Window (pane) hierarchy
 */
export async function listTabs(options?: KittyRemoteOptions): Promise<KittyTabInfo[]> {
  let osWindows: KittyLsResponse;

  try {
    osWindows = await listWindows(options);
  } catch {
    return [];
  }

  const tabs: KittyTabInfo[] = [];

  for (const osWindow of osWindows) {
    for (const tab of osWindow.tabs) {
      // Extract session IDs from all window titles in this tab
      const agentSessions = tab.windows
        .map(w => extractSessionFromTitle(w.title))
        .filter((s): s is string => s !== null);

      tabs.push({
        tabId: tab.id,
        osWindowId: osWindow.id,
        title: tab.title,
        isActive: tab.is_active,
        isFocused: tab.is_focused && osWindow.is_focused,
        windows: tab.windows,
        agentSessions
      });
    }
  }

  return tabs;
}

/**
 * Focus a Kitty tab by its ID
 * Uses: kitten @ focus-tab --match id:<tabId>
 */
export async function focusTab(
  tabId: number,
  options?: KittyRemoteOptions
): Promise<boolean> {
  try {
    await execKittenCommand("focus-tab", ["--match", `id:${tabId}`], options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Launch a command in a new Kitty tab
 * Uses: kitten @ launch --type=tab
 * Returns the window ID of the new window, or null on failure
 */
export async function launchInNewTab(
  command?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  const args: string[] = ["--type=tab"];

  if (cwd) {
    args.push(`--cwd=${cwd}`);
  }

  if (command) {
    // Use interactive shell to ensure aliases are available
    const shell = process.env.SHELL || "/bin/zsh";
    args.push(shell, "-i", "-c", command);
  }

  try {
    const output = await execKittenCommand("launch", args, options);
    const windowId = parseInt(output, 10);
    return isNaN(windowId) ? null : windowId;
  } catch {
    return null;
  }
}

/**
 * Launch a command as a new pane (split) in the current tab
 * Uses: kitten @ launch --type=window
 * Returns the window ID of the new window, or null on failure
 */
export async function launchInCurrentTab(
  command?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  const args: string[] = ["--type=window"];

  if (cwd) {
    args.push(`--cwd=${cwd}`);
  }

  if (command) {
    // Use interactive shell to ensure aliases are available
    const shell = process.env.SHELL || "/bin/zsh";
    args.push(shell, "-i", "-c", command);
  }

  try {
    const output = await execKittenCommand("launch", args, options);
    const windowId = parseInt(output, 10);
    return isNaN(windowId) ? null : windowId;
  } catch {
    return null;
  }
}

/**
 * Find the Kitty tab containing a specific session
 * Matches by session ID prefix in window titles
 */
export async function findTabContainingSession(
  sessionId: string,
  options?: KittyRemoteOptions
): Promise<KittyTabInfo | null> {
  const tabs = await listTabs(options);
  const shortSession = sessionId.substring(0, 8);

  for (const tab of tabs) {
    // Check if any window in this tab has a matching session
    for (const window of tab.windows) {
      const extracted = extractSessionFromTitle(window.title);
      if (extracted && extracted.startsWith(shortSession)) {
        return tab;
      }
    }
  }

  return null;
}

/**
 * Find the Kitty tab matching a title pattern
 */
export async function findTabByTitle(
  titlePattern: string,
  options?: KittyRemoteOptions
): Promise<KittyTabInfo | null> {
  const tabs = await listTabs(options);
  const pattern = new RegExp(titlePattern, "i");

  for (const tab of tabs) {
    if (pattern.test(tab.title)) {
      return tab;
    }
  }

  return null;
}

/**
 * Get all agent session IDs in a specific tab
 */
export async function getAgentSessionsInTab(
  tabId: number,
  options?: KittyRemoteOptions
): Promise<string[]> {
  const tabs = await listTabs(options);
  const tab = tabs.find(t => t.tabId === tabId);
  return tab ? tab.agentSessions : [];
}

/**
 * Launch Claude in a new Kitty tab
 */
export async function launchClaudeInNewTab(
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  return launchInNewTab("claude", cwd, options);
}

/**
 * Launch Gemini in a new Kitty tab
 */
export async function launchGeminiInNewTab(
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  return launchInNewTab("gemini", cwd, options);
}

/**
 * Launch Cursor Agent in a new Kitty tab
 */
export async function launchCursorInNewTab(
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  return launchInNewTab("agent", cwd, options);
}

/**
 * Launch Claude as a split pane in the current tab
 */
export async function launchClaudeInCurrentTab(
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  return launchInCurrentTab("claude", cwd, options);
}

/**
 * Launch Gemini as a split pane in the current tab
 */
export async function launchGeminiInCurrentTab(
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  return launchInCurrentTab("gemini", cwd, options);
}

/**
 * Launch Cursor Agent as a split pane in the current tab
 */
export async function launchCursorInCurrentTab(
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  return launchInCurrentTab("agent", cwd, options);
}

// ============================================================================
// AgentDeck-specific Helper Functions
// ============================================================================

/**
 * Agent type for window matching and launching
 */
export type AgentType = "Claude" | "Gemini" | "Cursor";

/**
 * Find a Kitty window that matches a CLI agent instance
 * Matching priority:
 * 1. Title containing "[Agent]:[sessionId]" (most reliable - set by hooks)
 * 2. CWD match (fallback)
 * 3. Cmdline containing agent name (last resort)
 */
export async function findAgentWindow(
  agentType: AgentType,
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<KittyWindow | null> {
  let osWindows: KittyLsResponse;

  try {
    osWindows = await listWindows(options);
  } catch {
    return null;
  }

  // Flatten all windows from all OS windows and tabs
  const allWindows: KittyWindow[] = [];
  for (const osWindow of osWindows) {
    for (const tab of osWindow.tabs) {
      for (const window of tab.windows) {
        allWindows.push(window);
      }
    }
  }

  if (allWindows.length === 0) {
    return null;
  }

  // Priority 1: Match by title containing "[Agent]:[sessionId]" (most reliable)
  // The hooks set window titles with format "[Agent]:[session]:project - state"
  if (sessionId) {
    const shortSession = sessionId.substring(0, 8);
    const titleMatch = allWindows.find(w =>
      w.title.includes(`${agentType}:${shortSession}`)
    );
    if (titleMatch) {
      return titleMatch;
    }
  }

  // Priority 2: Match by CWD (fallback when title doesn't match)
  if (cwd) {
    const normalizedCwd = cwd.replace(/\/+$/, ""); // Remove trailing slash
    const cwdMatch = allWindows.find(w => {
      const windowCwd = w.cwd.replace(/\/+$/, "");
      return windowCwd === normalizedCwd;
    });
    if (cwdMatch) {
      return cwdMatch;
    }
  }

  // Priority 3: Match by cmdline containing agent name (last resort)
  // For Cursor, the CLI command is "agent", not "cursor"
  const agentCmd = agentType === "Cursor" ? "agent" : agentType.toLowerCase();
  const cmdlineMatch = allWindows.find(w =>
    w.cmdline.some(arg => arg.toLowerCase().includes(agentCmd))
  );
  if (cmdlineMatch) {
    return cmdlineMatch;
  }

  return null;
}

/**
 * Find a Kitty window that matches a Claude Code instance
 * Matching priority:
 * 1. Title containing "Claude:[sessionId]" (most reliable - set by hooks)
 * 2. CWD match (fallback)
 * 3. Cmdline containing "claude" (last resort)
 */
export async function findClaudeWindow(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<KittyWindow | null> {
  return findAgentWindow("Claude", sessionId, cwd, options);
}

/**
 * Find a Kitty window that matches a Gemini CLI instance
 */
export async function findGeminiWindow(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<KittyWindow | null> {
  return findAgentWindow("Gemini", sessionId, cwd, options);
}

/**
 * Find a Kitty window that matches a Cursor Agent instance
 */
export async function findCursorWindow(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<KittyWindow | null> {
  return findAgentWindow("Cursor", sessionId, cwd, options);
}

/**
 * Focus the terminal window running a CLI agent and scroll to bottom
 */
export async function focusAgentWindow(
  agentType: AgentType,
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  const window = await findAgentWindow(agentType, sessionId, cwd, options);
  if (!window) {
    console.warn(`Could not find ${agentType} window in Kitty`);
    return false;
  }
  const focused = await focusWindow({ id: window.id }, options);
  if (focused) {
    // Scroll to bottom after focusing so user sees latest output
    await scrollWindowToBottom({ id: window.id }, options);
  }
  return focused;
}

/**
 * Focus the terminal window running Claude Code and scroll to bottom
 */
export async function focusClaudeWindow(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  return focusAgentWindow("Claude", sessionId, cwd, options);
}

/**
 * Focus the terminal window running Gemini CLI and scroll to bottom
 */
export async function focusGeminiWindow(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  return focusAgentWindow("Gemini", sessionId, cwd, options);
}

/**
 * Focus the terminal window running Cursor Agent and scroll to bottom
 */
export async function focusCursorWindow(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  return focusAgentWindow("Cursor", sessionId, cwd, options);
}

/**
 * Send Enter key (approve signal) to an agent
 * Uses send-key for better TUI app compatibility
 */
export async function sendAgentApproveSignal(
  agentType: AgentType,
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  const window = await findAgentWindow(agentType, sessionId, cwd, options);
  if (!window) {
    return false;
  }
  // Use send-key instead of send-text for TUI apps
  return sendKey("enter", { id: window.id }, options);
}

/**
 * Send Enter key (approve signal) - defaults to Claude for backward compatibility
 */
export async function sendApproveSignal(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  return sendAgentApproveSignal("Claude", sessionId, cwd, options);
}

/**
 * Send Ctrl+C (cancel signal) to an agent
 * Uses send-key for better TUI app compatibility
 */
export async function sendAgentCancelSignal(
  agentType: AgentType,
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  const window = await findAgentWindow(agentType, sessionId, cwd, options);
  if (!window) {
    return false;
  }
  // Use send-key ctrl+c for TUI apps
  return sendKey("ctrl+c", { id: window.id }, options);
}

/**
 * Send Ctrl+C (cancel signal) - defaults to Claude for backward compatibility
 */
export async function sendCancelSignal(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  return sendAgentCancelSignal("Claude", sessionId, cwd, options);
}

/** Last error from launchClaudeWindow for debugging */
export let lastLaunchError: string | null = null;

/** Default socket path for launching Kitty with remote control */
const DEFAULT_KITTY_SOCKET = "unix:/tmp/kitty";

/**
 * Launch Kitty terminal with remote control enabled
 * This starts Kitty itself (not a window in an existing instance)
 * with --listen-on flag for remote control
 */
export async function launchKittyWithRemoteControl(
  cwd?: string
): Promise<{ success: boolean; error?: string }> {
  const kittyBin = getKittyBinary("kitty");

  // Check if the binary exists
  if (!existsSync(kittyBin)) {
    return {
      success: false,
      error: `Kitty binary not found at ${kittyBin}`
    };
  }

  try {
    const args: string[] = [
      "--listen-on", DEFAULT_KITTY_SOCKET,  // Full unix:/tmp/kitty format required
      "--single-instance"
    ];

    if (cwd) {
      args.push("--directory", cwd);
    }

    const cmd = `"${kittyBin}" ${args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(" ")} &`;

    await execAsync(cmd, { timeout: 5000 });

    // Give Kitty more time to start and create the socket
    // 500ms was often not enough for Kitty to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clear socket cache so we discover the new socket
    clearSocketCache();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to launch Kitty: ${error}`
    };
  }
}

/**
 * Launch a new Claude Code instance in Kitty
 * First tries remote control, falls back to launching Kitty directly
 */
export async function launchClaudeWindow(
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  lastLaunchError = null;
  const socketPath = getKittySocketPath();

  // Try remote control first (if Kitty is already running)
  try {
    const windowId = await launchWindow("claude", cwd, options);
    if (windowId !== null) {
      return windowId;
    }
    lastLaunchError = `Remote launch returned null, socket: ${socketPath}`;
  } catch (err) {
    lastLaunchError = `Remote launch failed: ${err}, socket: ${socketPath}`;
  }

  // Fallback: Launch Kitty directly if remote control failed
  try {
    const kittyBin = getKittyBinary("kitty");
    const shell = process.env.SHELL || "/bin/zsh";
    const args: string[] = [];
    if (cwd) {
      args.push("--directory", cwd);
    }
    // Use interactive shell to ensure aliases are available
    args.push("--", shell, "-i", "-c", "claude");

    const cmd = `"${kittyBin}" ${args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(" ")}`;
    await execAsync(cmd, { timeout: 5000 });
    // Return -1 to indicate success via direct launch (no window ID available)
    return -1;
  } catch (error) {
    lastLaunchError = `Both remote and direct launch failed. Remote: ${lastLaunchError}. Direct: ${error}`;
    return null;
  }
}

/**
 * Launch a new Gemini CLI instance in Kitty
 * First tries remote control, falls back to launching Kitty directly
 */
export async function launchGeminiWindow(
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  lastLaunchError = null;
  const socketPath = getKittySocketPath();

  // Try remote control first (if Kitty is already running)
  try {
    const windowId = await launchWindow("gemini", cwd, options);
    if (windowId !== null) {
      return windowId;
    }
    lastLaunchError = `Remote launch returned null, socket: ${socketPath}`;
  } catch (err) {
    lastLaunchError = `Remote launch failed: ${err}, socket: ${socketPath}`;
  }

  // Fallback: Launch Kitty directly if remote control failed
  try {
    const kittyBin = getKittyBinary("kitty");
    const shell = process.env.SHELL || "/bin/zsh";
    const args: string[] = [];
    if (cwd) {
      args.push("--directory", cwd);
    }
    // Use interactive shell to ensure aliases are available
    args.push("--", shell, "-i", "-c", "gemini");

    const cmd = `"${kittyBin}" ${args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(" ")}`;
    await execAsync(cmd, { timeout: 5000 });
    // Return -1 to indicate success via direct launch (no window ID available)
    return -1;
  } catch (error) {
    lastLaunchError = `Both remote and direct launch failed. Remote: ${lastLaunchError}. Direct: ${error}`;
    return null;
  }
}

/**
 * Launch a new Cursor Agent instance in Kitty
 * First tries remote control, falls back to launching Kitty directly
 */
export async function launchCursorWindow(
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<number | null> {
  lastLaunchError = null;
  const socketPath = getKittySocketPath();

  // Try remote control first (if Kitty is already running)
  try {
    const windowId = await launchWindow("agent", cwd, options);
    if (windowId !== null) {
      return windowId;
    }
    lastLaunchError = `Remote launch returned null, socket: ${socketPath}`;
  } catch (err) {
    lastLaunchError = `Remote launch failed: ${err}, socket: ${socketPath}`;
  }

  // Fallback: Launch Kitty directly if remote control failed
  try {
    const kittyBin = getKittyBinary("kitty");
    const shell = process.env.SHELL || "/bin/zsh";
    const args: string[] = [];
    if (cwd) {
      args.push("--directory", cwd);
    }
    // Use interactive shell to ensure aliases are available
    args.push("--", shell, "-i", "-c", "agent");

    const cmd = `"${kittyBin}" ${args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(" ")}`;
    await execAsync(cmd, { timeout: 5000 });
    // Return -1 to indicate success via direct launch (no window ID available)
    return -1;
  } catch (error) {
    lastLaunchError = `Both remote and direct launch failed. Remote: ${lastLaunchError}. Direct: ${error}`;
    return null;
  }
}
