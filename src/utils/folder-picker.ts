/**
 * Folder Picker Utility
 * Uses AppleScript to show native macOS folder picker dialog
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Open a native macOS folder picker dialog
 * Returns the selected folder path or null if cancelled
 */
export async function pickFolder(): Promise<string | null> {
  try {
    // Note: choose folder is a Standard Additions command, not a System Events command
    // We activate Finder to bring the dialog to the front
    const appleScript = `
      tell application "Finder"
        activate
      end tell
      set selectedFolder to choose folder with prompt "Select project folder for Claude Code"
      return POSIX path of selectedFolder
    `;

    const { stdout } = await execAsync(`osascript -e '${appleScript}'`);
    const folderPath = stdout.trim();

    // Remove trailing slash if present for consistency
    return folderPath.endsWith("/") ? folderPath.slice(0, -1) : folderPath;
  } catch (err) {
    // User cancelled or error occurred
    const errorMessage = err instanceof Error ? err.message : String(err);

    // AppleScript returns error code -128 when user cancels
    if (errorMessage.includes("-128") || errorMessage.includes("User canceled")) {
      return null;
    }

    console.error("Folder picker error:", errorMessage);
    return null;
  }
}

/**
 * Validate that a folder path exists and is a directory
 */
export async function validateFolder(folderPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`test -d "${folderPath}" && echo "valid"`);
    return stdout.trim() === "valid";
  } catch {
    return false;
  }
}
