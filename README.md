# AgentDeck

Stream Deck plugin to monitor and control your Claude Code instances with animated status icons and gesture controls.

## Features

- **Real-time Status Display**: Animated icons showing Claude Code state (idle, running, tool use, editing, question, permission, error)
- **Gesture Controls**:
  - **Single Press**: Focus the terminal window
  - **Double Press**: Cancel the current operation
  - **Hold (500ms)**: Approve pending permission requests
- **Multi-instance Support**: Assign each Stream Deck key to a different Claude Code session

## Prerequisites

- Node.js 20+
- Stream Deck software 6.6+
- Claude Code with hooks support
- `jq` and `curl` (for hook scripts)
- **Kitty Terminal** (for terminal integration features)

## Kitty Terminal Configuration

AgentDeck uses Kitty's remote control API for terminal integration features like focusing windows, sending signals, and launching new Claude instances.

### Required Settings

Add these lines to your `~/.config/kitty/kitty.conf`:

```conf
allow_remote_control yes
listen_on unix:/tmp/kitty
```

After changing the config, **restart Kitty** for the settings to take effect.

### How It Works

1. **Socket Detection**: AgentDeck automatically detects Kitty sockets at `/tmp/kitty` or `/tmp/kitty-*` (PID-suffixed)
2. **Full Binary Paths**: On macOS, the plugin uses full paths to Kitty binaries (`/Applications/kitty.app/Contents/MacOS/kitten`) since Stream Deck plugins run in a sandboxed environment without access to shell PATH
3. **Interactive Shell**: When launching new Claude instances, the plugin uses an interactive shell (`zsh -i -c claude`) to ensure shell aliases are available

### Troubleshooting Kitty Integration

**"Remote Control Not Available" in Property Inspector**

- Ensure `allow_remote_control yes` is in your `kitty.conf`
- Restart Kitty after changing the config
- Verify the socket exists: `ls /tmp/kitty*`

**Button press doesn't open new Claude window**

- Test remote control manually: `kitten @ ls`
- Check plugin logs in `com.agentdeck.plugin.sdPlugin/logs/`
- Verify Kitty is installed at `/Applications/kitty.app` (macOS)

**Claude command not found when launching**

- The `claude` command may be an alias in your shell config
- AgentDeck launches with `-i` flag to load interactive shell config (`.zshrc`)
- Ensure your Claude alias is defined in `~/.zshrc` (not just `~/.zprofile`)

### Technical Notes

- **Socket Path Priority**:
  1. `KITTY_LISTEN_ON` environment variable
  2. Auto-detected `/tmp/kitty` or `/tmp/kitty-*` sockets
  3. Default fallback to `unix:/tmp/kitty`

- **Launch Fallback**: If remote control fails, AgentDeck falls back to launching Kitty directly via the binary path

## Installation

### 1. Install Dependencies

```bash
cd AgentDeck
pnpm install
```

### 2. Build the Plugin

```bash
pnpm build
```

### 3. Link the Plugin to Stream Deck

```bash
streamdeck link com.agentdeck.plugin.sdPlugin
```

Or manually copy the `com.agentdeck.plugin.sdPlugin` folder to:

- **macOS**: `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`
- **Windows**: `%appdata%\Elgato\StreamDeck\Plugins\`

### 4. Install Hook Script

The hook script reports Claude Code status to the AgentDeck server.

```bash
# Copy the hook script to ~/.agentdeck/hooks/
mkdir -p ~/.agentdeck/hooks
cp hooks/status-reporter.sh ~/.agentdeck/hooks/
chmod +x ~/.agentdeck/hooks/status-reporter.sh
```

### 5. Configure Claude Code Hooks

**IMPORTANT**: You must manually add the hooks to your Claude Code configuration. The installation does NOT modify your settings automatically.

Edit `~/.claude/settings.json` and add the hooks configuration. If you have existing hooks, merge them carefully:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.agentdeck/hooks/status-reporter.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.agentdeck/hooks/status-reporter.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.agentdeck/hooks/status-reporter.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.agentdeck/hooks/status-reporter.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.agentdeck/hooks/status-reporter.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.agentdeck/hooks/status-reporter.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "PermissionRequest": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.agentdeck/hooks/status-reporter.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

See `hooks/hooks.json` for the complete configuration template.

### 6. Restart Claude Code

Restart any running Claude Code instances to pick up the new hook configuration.

## Usage

1. Add a "Claude Instance" action to your Stream Deck
2. In the Property Inspector, select which Claude Code session to monitor
3. Optionally set a custom display name and terminal app

### Status Icons

| Icon            | State        | Description                         |
| --------------- | ------------ | ----------------------------------- |
| Green checkmark | Idle         | Claude Code is ready for input      |
| Blue spinner    | Running      | Processing a request                |
| Orange gear     | Tool Use     | Executing a tool (Bash, Read, etc.) |
| Purple pencil   | Editing      | Modifying files                     |
| Cyan ?          | Question     | Waiting for user input              |
| Red shield      | Permission   | Pending permission approval         |
| Red !           | Error        | An error occurred                   |
| Gray X          | Disconnected | Session not connected               |

### Gesture Controls

| Gesture      | Threshold | Action                     |
| ------------ | --------- | -------------------------- |
| Single Press | -         | Focus the terminal window  |
| Double Press | 300ms     | Cancel current operation   |
| Hold         | 500ms     | Approve pending permission |

## Architecture

```
Claude Code ──(hooks)──> Status Server ──(WebSocket)──> Stream Deck Plugin
                         localhost:19847
```

- **Hook Scripts**: Report status changes to the local server
- **Status Server**: HTTP+WebSocket server tracking all instances
- **Plugin**: Connects via WebSocket, displays animated icons

## Development

```bash
# Watch mode (auto-rebuild)
pnpm watch

# One-time build
pnpm build
```

## Troubleshooting

### Plugin not showing in Stream Deck

1. Ensure the plugin is in the correct Plugins directory
2. Restart the Stream Deck application
3. Check plugin logs in `com.agentdeck.plugin.sdPlugin/logs/`

### Status not updating

1. Verify hooks are configured in `~/.claude/settings.json`
2. Check that `jq` and `curl` are installed
3. Test the hook script: `echo '{"session_id":"test","hook_event_name":"Stop"}' | ~/.agentdeck/hooks/status-reporter.sh`
4. Check server is running: `curl http://127.0.0.1:19847/health`

### Server port already in use

If port 19847 is in use, the plugin will assume the server is already running. Kill any existing processes on that port.

## License

MIT
