#!/bin/bash
# AgentDeck Status Reporter Hook
# Sends status updates to the local AgentDeck server
#
# This script is called by Claude Code hooks and receives JSON input via stdin.
# It determines the current state based on the hook event and tool name,
# then POSTs the status to the AgentDeck server.
#
# Additionally, it outputs VT escape sequences to the terminal for native
# integration with terminals like Ghostty (progress indicators, window titles).

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
session_id=$(echo "$input" | jq -r '.session_id // empty')
hook_event=$(echo "$input" | jq -r '.hook_event_name // empty')
cwd=$(echo "$input" | jq -r '.cwd // empty')
tool_name=$(echo "$input" | jq -r '.tool_name // empty')

# Exit if no session_id (required field)
if [[ -z "$session_id" ]]; then
    exit 0
fi

# Determine state based on hook event and tool name
case "$hook_event" in
    "SessionStart")
        state="idle"
        ;;
    "SessionEnd")
        state="disconnected"
        ;;
    "PreToolUse")
        case "$tool_name" in
            "Edit"|"Write"|"MultiEdit"|"NotebookEdit")
                state="editing"
                ;;
            "Bash"|"Read"|"Glob"|"Grep"|"LS"|"WebFetch"|"WebSearch")
                state="tool_use"
                ;;
            "Task"|"AskUserQuestion")
                state="question"
                ;;
            *)
                state="running"
                ;;
        esac
        ;;
    "PostToolUse")
        state="running"
        ;;
    "Notification")
        notification_type=$(echo "$input" | jq -r '.notification_type // empty')
        case "$notification_type" in
            "question"|"input_required")
                state="question"
                ;;
            *)
                state="idle"
                ;;
        esac
        ;;
    "PermissionRequest")
        state="permission"
        ;;
    "Stop")
        state="idle"
        ;;
    "SubagentStop")
        state="running"
        ;;
    "PreCompact")
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

if [[ "$AGENTDECK_VT_ENABLED" == "true" ]] && [[ -t 0 || -e /dev/tty ]]; then
    # Determine the TTY to write to
    TTY_DEVICE="/dev/tty"

    # Extract project name from cwd for window title
    project_name="${cwd##*/}"
    if [[ -z "$project_name" ]]; then
        project_name="Claude"
    fi

    # OSC 2: Set window title with structured format for reliable matching
    # Format: "Claude:[session_id]:project_name - state"
    # Using short session ID (first 8 chars) for readability
    short_session="${session_id:0:8}"
    window_title="Claude:${short_session}:${project_name}"

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
        if [[ "$state" == "permission" && "$hook_event" == "PermissionRequest" ]]; then
            printf '\e]9;Claude Code needs permission\e\\'
        elif [[ "$state" == "question" && "$hook_event" == "PreToolUse" && "$tool_name" == "AskUserQuestion" ]]; then
            printf '\e]9;Claude Code has a question\e\\'
        fi
    } > "$TTY_DEVICE" 2>/dev/null || true
fi

# =============================================================================
# HTTP Status Reporting (Stream Deck Integration)
# =============================================================================

# Build the JSON payload
timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
payload=$(jq -n \
    --arg session_id "$session_id" \
    --arg state "$state" \
    --arg hook_event "$hook_event" \
    --arg cwd "$cwd" \
    --arg tool_name "$tool_name" \
    --arg timestamp "$timestamp" \
    '{
        session_id: $session_id,
        state: $state,
        hook_event: $hook_event,
        metadata: {
            cwd: $cwd,
            tool_name: $tool_name,
            timestamp: $timestamp
        }
    }')

# Send to AgentDeck server (fire and forget, don't block Claude Code)
# Use timeout to prevent blocking if server is unresponsive
curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$AGENTDECK_URL" \
    --connect-timeout 1 \
    --max-time 2 \
    > /dev/null 2>&1 &

exit 0
