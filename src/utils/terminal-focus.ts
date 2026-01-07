/**
 * Terminal Focus Utilities
 * Kitty-only implementation using kitten @ remote control API
 */

import {
  focusClaudeWindow,
  sendCancelSignal as kittySendCancel,
  sendApproveSignal as kittySendApprove,
  launchClaudeWindow,
  isKittyAvailable,
  lastLaunchError
} from "./kitty-remote.js";

/**
 * Focus a terminal window running Claude Code
 * Uses Kitty's remote control API to find and focus the window
 *
 * @param sessionId - Claude Code session ID for precise matching
 * @param cwd - Working directory for CWD-based matching
 */
export async function focusTerminal(
  sessionId?: string,
  cwd?: string
): Promise<void> {
  const success = await focusClaudeWindow(sessionId, cwd);
  if (!success) {
    console.warn("Could not find or focus Claude Code window in Kitty");
  }
}

/**
 * Send cancel signal (Ctrl+C) to Claude Code
 * This interrupts the current operation
 *
 * @param sessionId - Claude Code session ID
 * @param cwd - Working directory for matching
 */
export async function sendCancelSignal(
  sessionId: string,
  cwd?: string
): Promise<void> {
  const success = await kittySendCancel(sessionId, cwd);
  if (!success) {
    console.warn(`Cancel signal failed for session: ${sessionId}`);
  }
}

/**
 * Send approve signal (Enter) to Claude Code
 * This approves a pending permission request
 *
 * @param sessionId - Claude Code session ID
 * @param cwd - Working directory for matching
 */
export async function sendApproveSignal(
  sessionId: string,
  cwd?: string
): Promise<void> {
  const success = await kittySendApprove(sessionId, cwd);
  if (!success) {
    console.warn(`Approve signal failed for session: ${sessionId}`);
  }
}

/**
 * Open a new terminal with Claude Code
 * Launches a new Kitty window with the claude command
 *
 * @param workingDirectory - Optional directory to start in
 * @returns Result object with success status and details
 */
export async function openTerminalWithClaude(
  workingDirectory?: string
): Promise<{ success: boolean; windowId: number | null; error?: string }> {
  try {
    const windowId = await launchClaudeWindow(workingDirectory);
    if (windowId !== null) {
      return { success: true, windowId };
    }
    // Include detailed error from lastLaunchError
    const detailedError = lastLaunchError || "unknown error";
    return { success: false, windowId: null, error: detailedError };
  } catch (err) {
    return { success: false, windowId: null, error: String(err) };
  }
}

/**
 * Check if Kitty is available and configured for remote control
 * Returns true if Kitty is running with allow_remote_control enabled
 */
export async function checkTerminalAvailability(): Promise<boolean> {
  return isKittyAvailable();
}
