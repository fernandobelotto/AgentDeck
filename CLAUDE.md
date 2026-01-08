# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm install          # Install dependencies
npm run build        # Build plugin with Rollup
npm run watch        # Watch mode with auto-rebuild
npm run preview      # Open icon preview tool in browser
```

Stream Deck CLI commands:
```bash
streamdeck link com.agentdeck.plugin.sdPlugin      # Link plugin to Stream Deck
streamdeck restart com.agentdeck.plugin            # Restart plugin after changes
streamdeck validate com.agentdeck.plugin.sdPlugin  # Validate manifest.json
```

## Architecture

AgentDeck is a Stream Deck plugin that monitors and controls Claude Code instances. The data flow is:

```
Claude Code ──(hooks)──> Status Server ──(WebSocket)──> Stream Deck Plugin
                         localhost:19847
```

### Key Components

**Plugin Entry** (`src/plugin.ts`): Initializes the Stream Deck SDK, starts the status server, and registers the ClaudeInstanceAction.

**Status Server** (`src/server/status-server.ts`): HTTP+WebSocket server running on port 19847.
- `POST /status` - Receives status updates from Claude Code hooks
- `GET /instances` - Returns all tracked instances
- `GET /health` - Health check endpoint
- WebSocket - Real-time bidirectional communication with Stream Deck

**Instance Manager** (`src/server/instance-manager.ts`): Tracks state of all Claude Code sessions.

**Claude Instance Action** (`src/actions/claude-instance-action.ts`): Main Stream Deck action implementing:
- WebSocket client connecting to status server
- Interaction handling (single press, double press, hold)
- Animation controller integration

**Icon System** (`src/icons/`):
- `icon-generator.ts` - Generates SVG icons for each state
- `animation-controller.ts` - Controls frame-based animations at 10 FPS

**Terminal Utilities** (`src/utils/`):
- `terminal-focus.ts` - AppleScript/PowerShell commands for focusing terminals
- `kitty-remote.ts` - Kitty terminal remote control via `kitten @` commands
- `interaction-handler.ts` - Gesture detection (single press, double press, hold)

### State Types

Defined in `src/server/types.ts`:
- `idle` - Ready for input (green checkmark)
- `running` - Processing request (blue spinner)
- `tool_use` - Executing tool (orange gear)
- `editing` - Modifying files (purple pencil)
- `question` - Waiting for input (cyan ?)
- `permission` - Pending approval (red shield)
- `error` - Error occurred (red !)
- `disconnected` - Session not connected (gray X)

### Hook Integration

The `hooks/status-reporter.sh` script reports Claude Code state to the status server. It maps hook events to states:
- Edit/Write tools → `editing`
- Bash/Read/Glob/Grep tools → `tool_use`
- Task/AskUserQuestion → `question`
- PermissionRequest → `permission`

## Plugin Package Structure

`com.agentdeck.plugin.sdPlugin/` is the deployable Stream Deck plugin:
- `manifest.json` - Plugin metadata and action definitions
- `bin/plugin.js` - Rollup-bundled JavaScript output
- `ui/claude-instance.html` - Property Inspector UI
- `imgs/` - SVG icons for the plugin and action

## Configuration

Users must add hooks to `~/.claude/settings.json` pointing to `~/.agentdeck/hooks/status-reporter.sh`. See README.md for the full hooks JSON template.

## Testing

Test hook script manually:
```bash
echo '{"session_id":"test","hook_event_name":"Stop"}' | ~/.agentdeck/hooks/status-reporter.sh
```

Check server health:
```bash
curl http://127.0.0.1:19847/health
curl http://127.0.0.1:19847/instances
```

Test Kitty remote control:
```bash
kitten @ ls  # Should return JSON with window info
```
