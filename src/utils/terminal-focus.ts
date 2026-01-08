/**
 * Terminal Focus Utilities
 * Kitty-only implementation using kitten @ remote control API
 */

import streamDeck from "@elgato/streamdeck";
const logger = streamDeck.logger;

import {
  focusClaudeWindow,
  focusGeminiWindow,
  focusAgentWindow,
  sendAgentCancelSignal,
  sendAgentApproveSignal,
  launchClaudeWindow,
  launchGeminiWindow,
  isKittyAvailable,
  lastLaunchError,
  type AgentType
} from "./kitty-remote.js";

/**
 * Focus a terminal window running a CLI agent
 * Uses Kitty's remote control API to find and focus the window
 *
 * @param sessionId - Session ID for precise matching
 * @param cwd - Working directory for CWD-based matching
 * @param agentType - Agent type ("Claude" or "Gemini"), defaults to "Claude"
 */
export async function focusTerminal(
  sessionId?: string,
  cwd?: string,
  agentType: AgentType = "Claude"
): Promise<void> {
  const success = await focusAgentWindow(agentType, sessionId, cwd);
  if (!success) {
    console.warn(`Could not find or focus ${agentType} window in Kitty`);
  }
}

/**
 * Send cancel signal (Ctrl+C) to a CLI agent
 * This interrupts the current operation
 *
 * @param sessionId - Session ID
 * @param cwd - Working directory for matching
 * @param agentType - Agent type ("Claude" or "Gemini"), defaults to "Claude"
 */
export async function sendCancelSignal(
  sessionId: string,
  cwd?: string,
  agentType: AgentType = "Claude"
): Promise<void> {
  const success = await sendAgentCancelSignal(agentType, sessionId, cwd);
  if (!success) {
    console.warn(`Cancel signal failed for ${agentType} session: ${sessionId}`);
  }
}

/**
 * Send approve signal (Enter) to a CLI agent
 * This approves a pending permission request
 *
 * @param sessionId - Session ID
 * @param cwd - Working directory for matching
 * @param agentType - Agent type ("Claude" or "Gemini"), defaults to "Claude"
 */
export async function sendApproveSignal(
  sessionId: string,
  cwd?: string,
  agentType: AgentType = "Claude"
): Promise<void> {
  logger.info(`[TerminalFocus] sendApproveSignal called - sessionId: ${sessionId}, cwd: ${cwd}, agent: ${agentType}`);
  const success = await sendAgentApproveSignal(agentType, sessionId, cwd);
  logger.info(`[TerminalFocus] sendApproveSignal result: ${success}`);
  if (!success) {
    logger.warn(`[TerminalFocus] Approve signal failed for ${agentType} session: ${sessionId}`);
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
 * Open a new terminal with Gemini CLI
 * Launches a new Kitty window with the gemini command
 *
 * @param workingDirectory - Optional directory to start in
 * @returns Result object with success status and details
 */
export async function openTerminalWithGemini(
  workingDirectory?: string
): Promise<{ success: boolean; windowId: number | null; error?: string }> {
  try {
    const windowId = await launchGeminiWindow(workingDirectory);
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
