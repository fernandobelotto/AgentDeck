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

// ============================================================================
// Socket Path Detection
// ============================================================================

/**
 * Find Kitty socket in /tmp directory
 * Looks for /tmp/kitty or /tmp/kitty-* sockets
 */
function findKittySocket(): string | null {
  try {
    // First check for exact /tmp/kitty socket
    try {
      const stat = statSync("/tmp/kitty");
      if (stat.isSocket()) {
        return "unix:/tmp/kitty";
      }
    } catch {
      // Not found, continue searching
    }

    // Look for /tmp/kitty-* sockets (PID-suffixed)
    const files = readdirSync("/tmp");
    const kittySockets = files
      .filter(f => f.startsWith("kitty-") || f === "kitty")
      .map(f => `/tmp/${f}`)
      .filter(path => {
        try {
          return statSync(path).isSocket();
        } catch {
          return false;
        }
      });

    if (kittySockets.length > 0) {
      // Return the most recently modified socket
      kittySockets.sort((a, b) => {
        try {
          return statSync(b).mtimeMs - statSync(a).mtimeMs;
        } catch {
          return 0;
        }
      });
      return `unix:${kittySockets[0]}`;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Get the Kitty socket path for remote control
 * Priority:
 * 1. KITTY_LISTEN_ON environment variable
 * 2. Auto-detect /tmp/kitty or /tmp/kitty-* sockets
 * 3. Default: unix:/tmp/kitty
 */
export function getKittySocketPath(): string {
  if (process.env.KITTY_LISTEN_ON) {
    return process.env.KITTY_LISTEN_ON;
  }

  const detected = findKittySocket();
  if (detected) {
    return detected;
  }

  return "unix:/tmp/kitty";
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
 * Send text/keys to a window
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
// ClaudeDeck-specific Helper Functions
// ============================================================================

/**
 * Find a Kitty window that matches a Claude Code instance
 * Matching priority:
 * 1. CWD match (most reliable)
 * 2. Title containing "Claude:[sessionId]"
 * 3. Cmdline containing "claude"
 */
export async function findClaudeWindow(
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

  // Priority 1: Match by CWD (most reliable)
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

  // Priority 2: Match by title containing "Claude:[sessionId]"
  if (sessionId) {
    const shortSession = sessionId.substring(0, 8);
    const titleMatch = allWindows.find(w =>
      w.title.includes(`Claude:${shortSession}`)
    );
    if (titleMatch) {
      return titleMatch;
    }
  }

  // Priority 3: Match by cmdline containing "claude"
  const cmdlineMatch = allWindows.find(w =>
    w.cmdline.some(arg => arg.toLowerCase().includes("claude"))
  );
  if (cmdlineMatch) {
    return cmdlineMatch;
  }

  return null;
}

/**
 * Focus the terminal window running Claude Code
 */
export async function focusClaudeWindow(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  const window = await findClaudeWindow(sessionId, cwd, options);
  if (!window) {
    console.warn("Could not find Claude Code window in Kitty");
    return false;
  }
  return focusWindow({ id: window.id }, options);
}

/**
 * Send Enter key (approve signal)
 */
export async function sendApproveSignal(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  const window = await findClaudeWindow(sessionId, cwd, options);
  if (!window) {
    console.warn(`Approve signal failed: Could not find window for session ${sessionId}`);
    return false;
  }
  return sendText("\n", { id: window.id }, options);
}

/**
 * Send Ctrl+C (cancel signal)
 * Note: \x03 is the ASCII code for Ctrl+C (ETX - End of Text)
 */
export async function sendCancelSignal(
  sessionId?: string,
  cwd?: string,
  options?: KittyRemoteOptions
): Promise<boolean> {
  const window = await findClaudeWindow(sessionId, cwd, options);
  if (!window) {
    console.warn(`Cancel signal failed: Could not find window for session ${sessionId}`);
    return false;
  }
  return sendText("\x03", { id: window.id }, options);
}

/** Last error from launchClaudeWindow for debugging */
export let lastLaunchError: string | null = null;

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
