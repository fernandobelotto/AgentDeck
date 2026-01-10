#!/bin/bash
# AgentDeck Status Reporter Hook for Cursor Agent CLI
# Sends status updates to the local AgentDeck server
#
# This script is called by Cursor Agent hooks and receives JSON input via stdin.
# It determines the current state based on the hook event,
# then POSTs the status to the AgentDeck server.
#
# Key differences from Claude/Gemini:
# - Uses conversation_id instead of session_id
# - Uses workspace_roots instead of cwd
# - Different hook event names (beforeShellExecution, afterFileEdit, etc.)

set -e

AGENTDECK_PORT="${AGENTDECK_PORT:-19847}"
AGENTDECK_URL="http://127.0.0.1:${AGENTDECK_PORT}/status"

# VT sequence control - set to "false" to disable terminal integration
AGENTDECK_VT_ENABLED="${AGENTDECK_VT_ENABLED:-true}"

# Read hook input from stdin
input=$(cat)

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Warning: jq not found, AgentDeck status reporting disabled" >&2
    exit 0
fi

# Extract common fields from the hook input
# Cursor uses conversation_id instead of session_id
conversation_id=$(echo "$input" | jq -r '.conversation_id // empty')
hook_event=$(echo "$input" | jq -r '.hook_event_name // empty')

# Cursor uses workspace_roots array instead of cwd
# Take the first workspace root as the primary working directory
cwd=$(echo "$input" | jq -r '.workspace_roots[0] // empty')

# Extract tool/command specific info based on hook type
tool_name=""
command_text=""
file_path=""
status=""

case "$hook_event" in
    "beforeShellExecution"|"afterShellExecution")
        command_text=$(echo "$input" | jq -r '.command // empty')
        tool_name="shell"
        ;;
    "beforeMCPExecution"|"afterMCPExecution")
        tool_name=$(echo "$input" | jq -r '.tool_name // empty')
        ;;
    "afterFileEdit"|"beforeReadFile")
        file_path=$(echo "$input" | jq -r '.file_path // empty')
        tool_name="file"
        ;;
    "stop")
        status=$(echo "$input" | jq -r '.status // empty')
        ;;
esac

# Exit if no conversation_id (required field)
if [[ -z "$conversation_id" ]]; then
    exit 0
fi

# Use conversation_id as session_id for consistency with AgentDeck
session_id="$conversation_id"

# Determine state based on Cursor hook events
# Reference: Cursor Agent CLI hook documentation
case "$hook_event" in
    "beforeShellExecution")
        state="tool_use"
        ;;
    "afterShellExecution")
        state="running"
        ;;
    "beforeMCPExecution")
        state="tool_use"
        ;;
    "afterMCPExecution")
        state="running"
        ;;
    "beforeReadFile")
        state="tool_use"
        ;;
    "afterFileEdit")
        state="editing"
        ;;
    "beforeSubmitPrompt")
        state="running"
        ;;
    "afterAgentResponse")
        state="idle"
        ;;
    "afterAgentThought")
        state="running"
        ;;
    "stop")
        # Map stop status to state
        case "$status" in
            "completed")
                state="idle"
                ;;
            "error"|"aborted")
                state="error"
                ;;
            *)
                state="idle"
                ;;
        esac
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

if [[ "$AGENTDECK_VT_ENABLED" == "true" ]] && [[ -t 0 || -e /dev/tty ]]; then
    # Determine the TTY to write to
    TTY_DEVICE="/dev/tty"

    # Extract project name from cwd for window title
    project_name="${cwd##*/}"
    if [[ -z "$project_name" ]]; then
        project_name="Cursor"
    fi

    # OSC 2: Set window title with structured format for reliable matching
    # Format: "Cursor:[session_id]:project_name - state"
    # Using short session ID (first 8 chars) for readability
    short_session="${session_id:0:8}"
    window_title="Cursor:${short_session}:${project_name}"

    # OSC 9;4: Progress state indicator
    # States: 0=remove, 1=indeterminate, 2=normal (with %), 3=error, 4=warning
    case "$state" in
        "running")
            progress_state="1"  # Indeterminate (spinning)
            window_title="${window_title} - Processing"
            ;;
        "tool_use")
            progress_state="1"  # Indeterminate
            if [[ -n "$tool_name" && "$tool_name" != "shell" && "$tool_name" != "file" ]]; then
                window_title="${window_title} - Tool: ${tool_name}"
            elif [[ -n "$command_text" ]]; then
                # Truncate command for display
                short_cmd="${command_text:0:30}"
                window_title="${window_title} - Running: ${short_cmd}"
            else
                window_title="${window_title} - Tool Use"
            fi
            ;;
        "editing")
            progress_state="1"  # Indeterminate
            if [[ -n "$file_path" ]]; then
                # Show just the filename
                filename="${file_path##*/}"
                window_title="${window_title} - Editing: ${filename}"
            else
                window_title="${window_title} - Editing"
            fi
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
    } > "$TTY_DEVICE" 2>/dev/null || true
fi

# =============================================================================
# HTTP Status Reporting (Stream Deck Integration)
# =============================================================================

# Build the JSON payload with source="cursor"
timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
payload=$(jq -n \
    --arg session_id "$session_id" \
    --arg state "$state" \
    --arg hook_event "$hook_event" \
    --arg cwd "$cwd" \
    --arg tool_name "$tool_name" \
    --arg timestamp "$timestamp" \
    --arg source "cursor" \
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

# Send to AgentDeck server (fire and forget, don't block Cursor Agent)
# Use timeout to prevent blocking if server is unresponsive
curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$AGENTDECK_URL" \
    --connect-timeout 1 \
    --max-time 2 \
    > /dev/null 2>&1 &

exit 0
