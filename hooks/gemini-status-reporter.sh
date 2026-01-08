#!/bin/bash
# ClaudeDeck Status Reporter Hook for Gemini CLI
# Sends status updates to the local ClaudeDeck server
#
# This script is called by Gemini CLI hooks and receives JSON input via stdin.
# It determines the current state based on the hook event and tool name,
# then POSTs the status to the ClaudeDeck server.

set -e

CLAUDEDECK_PORT="${CLAUDEDECK_PORT:-19847}"
CLAUDEDECK_URL="http://127.0.0.1:${CLAUDEDECK_PORT}/status"

# VT sequence control - set to "false" to disable terminal integration
CLAUDEDECK_VT_ENABLED="${CLAUDEDECK_VT_ENABLED:-true}"

# Read hook input from stdin
input=$(cat)

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Warning: jq not found, ClaudeDeck status reporting disabled" >&2
    exit 0
fi

# Extract common fields from the hook input
session_id=$(echo "$input" | jq -r '.session_id // empty')
hook_event=$(echo "$input" | jq -r '.hook_event_name // empty')
cwd=$(echo "$input" | jq -r '.cwd // empty')
tool_name=$(echo "$input" | jq -r '.tool_name // empty')

# Exit if no session_id (required field)
if [[ -z "$session_id" ]]; then
    exit 0
fi

# Determine state based on hook event and tool name
# Gemini CLI hook events and tool names
case "$hook_event" in
    "SessionStart")
        state="idle"
        ;;
    "SessionEnd")
        state="disconnected"
        ;;
    "BeforeAgent")
        state="running"
        ;;
    "AfterAgent")
        state="idle"
        ;;
    "BeforeTool")
        # Map Gemini tool names to states
        case "$tool_name" in
            "write_file"|"replace")
                state="editing"
                ;;
            "run_shell_command"|"read_file"|"read_many_files"|"glob"|"list_directory"|"search_file_content"|"google_web_search"|"web_fetch"|"write_todos"|"save_memory"|"get_internal_docs")
                state="tool_use"
                ;;
            "delegate_to_agent"|"activate_skill")
                state="question"
                ;;
            *)
                # MCP tools or unknown tools
                state="tool_use"
                ;;
        esac
        ;;
    "AfterTool")
        state="running"
        ;;
    "Notification")
        notification_type=$(echo "$input" | jq -r '.notification_type // empty')
        case "$notification_type" in
            "ToolPermission")
                state="permission"
                ;;
            *)
                state="idle"
                ;;
        esac
        ;;
    "PreCompress")
        state="running"
        ;;
    "BeforeModel"|"AfterModel"|"BeforeToolSelection")
        state="running"
        ;;
    *)
        state="running"
        ;;
esac

# =============================================================================
# VT Sequence Output (Terminal Integration)
# =============================================================================
# These escape sequences provide native terminal integration:
# - OSC 2: Window title (for reliable window matching)
# - OSC 9;4: Progress state (shows in tab/taskbar)
# - OSC 9: Desktop notifications (for permission/question states)
#
# Reference: https://ghostty.org/docs/vt
# =============================================================================

if [[ "$CLAUDEDECK_VT_ENABLED" == "true" ]] && [[ -t 0 || -e /dev/tty ]]; then
    # Determine the TTY to write to
    TTY_DEVICE="/dev/tty"

    # Extract project name from cwd for window title
    project_name="${cwd##*/}"
    if [[ -z "$project_name" ]]; then
        project_name="Gemini"
    fi

    # OSC 2: Set window title with structured format for reliable matching
    # Format: "Gemini:[session_id]:project_name - state"
    # Using short session ID (first 8 chars) for readability
    short_session="${session_id:0:8}"
    window_title="Gemini:${short_session}:${project_name}"

    # OSC 9;4: Progress state indicator
    # States: 0=remove, 1=indeterminate, 2=normal (with %), 3=error, 4=warning
    case "$state" in
        "running")
            progress_state="1"  # Indeterminate (spinning)
            window_title="${window_title} - Processing"
            ;;
        "tool_use")
            progress_state="1"  # Indeterminate
            window_title="${window_title} - Tool: ${tool_name}"
            ;;
        "editing")
            progress_state="1"  # Indeterminate
            window_title="${window_title} - Editing"
            ;;
        "question")
            progress_state="4"  # Warning (needs attention)
            window_title="${window_title} - Waiting for Input"
            ;;
        "permission")
            progress_state="4"  # Warning (needs attention)
            window_title="${window_title} - Permission Required"
            ;;
        "error")
            progress_state="3"  # Error
            window_title="${window_title} - Error"
            ;;
        "idle")
            progress_state="0"  # Remove progress indicator
            window_title="${window_title} - Ready"
            ;;
        "disconnected")
            progress_state="0"  # Remove progress indicator
            window_title="${window_title} - Disconnected"
            ;;
        *)
            progress_state="1"  # Default to indeterminate
            ;;
    esac

    # Write VT sequences to terminal
    {
        # OSC 2: Set window title
        # Format: ESC ] 2 ; <title> ST (where ST = ESC \)
        printf '\e]2;%s\e\\' "$window_title"

        # OSC 9;4: Set progress state
        # Format: ESC ] 9 ; 4 ; <state> ; <progress> ST
        # For indeterminate (state=1), progress is ignored
        # For normal (state=2), progress is 0-100
        printf '\e]9;4;%s;0\e\\' "$progress_state"

        # OSC 9: Desktop notification for states requiring user attention
        # Only show for permission and question states, and only on state entry
        if [[ "$state" == "permission" && "$hook_event" == "Notification" ]]; then
            printf '\e]9;Gemini CLI needs permission\e\\'
        elif [[ "$state" == "question" && "$hook_event" == "BeforeTool" ]]; then
            printf '\e]9;Gemini CLI has a question\e\\'
        fi
    } > "$TTY_DEVICE" 2>/dev/null || true
fi

# =============================================================================
# HTTP Status Reporting (Stream Deck Integration)
# =============================================================================

# Build the JSON payload with source="gemini"
timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
payload=$(jq -n \
    --arg session_id "$session_id" \
    --arg state "$state" \
    --arg hook_event "$hook_event" \
    --arg cwd "$cwd" \
    --arg tool_name "$tool_name" \
    --arg timestamp "$timestamp" \
    --arg source "gemini" \
    '{
        session_id: $session_id,
        state: $state,
        hook_event: $hook_event,
        source: $source,
        metadata: {
            cwd: $cwd,
            tool_name: $tool_name,
            timestamp: $timestamp
        }
    }')

# Send to ClaudeDeck server (fire and forget, don't block Gemini CLI)
# Use timeout to prevent blocking if server is unresponsive
curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$CLAUDEDECK_URL" \
    --connect-timeout 1 \
    --max-time 2 \
    > /dev/null 2>&1 &

exit 0
