# Terminal Support Implementation Plan

This document outlines the implementation plan for adding support for popular macOS terminals to AgentDeck. Terminals are ordered from most popular to least popular.

---

## Table of Contents

1. [iTerm2](#1-iterm2) - Most Popular
2. [Terminal.app](#2-terminalapp) - Built-in Default
3. [Warp](#3-warp) - Rising Popularity
4. [Kitty](#4-kitty) - Already Supported
5. [Alacritty](#5-alacritty) - Minimal/Fast
6. [WezTerm](#6-wezterm) - Kitty Alternative
7. [Hyper](#7-hyper) - Electron-based

---

## 1. iTerm2

**Popularity:** #1 third-party terminal on macOS **Estimated Effort:** Medium (4-6 hours) **API Type:** Python API (`it2api`) + AppleScript **Documentation:** https://iterm2.com/documentation-scripting.html

### 1.1 Overview

iTerm2 is the dominant terminal emulator on macOS. It offers two programmatic interfaces:

- **Python API** - Full-featured but requires enabling and Python installation
- **AppleScript** - More universally available, sufficient for our needs

### 1.2 Required Features Mapping

| AgentDeck Feature | iTerm2 Implementation |
| --- | --- |
| List windows/sessions | AppleScript: `tell application "iTerm2" to get windows` |
| Get session metadata (cwd, pid) | AppleScript: `tty`, `name`; Python API for cwd |
| Focus window/session | AppleScript: `select` session/window |
| Send text | AppleScript: `write text "..."` |
| Send keystrokes | AppleScript: `write text (ASCII character 13)` for Enter |
| Launch new window | AppleScript: `create window with default profile` |
| Launch with command | AppleScript: `create window with default profile command "claude"` |

### 1.3 Implementation Details

#### 1.3.1 AppleScript Commands

```applescript
-- List all windows and sessions
tell application "iTerm2"
    set windowList to {}
    repeat with w in windows
        set tabList to {}
        repeat with t in tabs of w
            set sessionList to {}
            repeat with s in sessions of t
                set sessionInfo to {id:id of s, name:name of s, tty:tty of s, isProcessing:is processing of s}
                set end of sessionList to sessionInfo
            end repeat
            set end of tabList to {sessions:sessionList}
        end repeat
        set end of windowList to {id:id of w, tabs:tabList}
    end repeat
    return windowList
end tell

-- Focus a specific session
tell application "iTerm2"
    activate
    tell session id "session-id-here"
        select
    end tell
end tell

-- Send text to session
tell application "iTerm2"
    tell current session of current window
        write text "your-command-here"
    end tell
end tell

-- Send Enter key (approve)
tell application "iTerm2"
    tell session id "session-id-here"
        write text ""  -- Empty string + implicit newline
    end tell
end tell

-- Send Ctrl+C (cancel)
tell application "iTerm2"
    tell session id "session-id-here"
        write text (ASCII character 3)  -- ETX = Ctrl+C
    end tell
end tell

-- Launch new window with command
tell application "iTerm2"
    create window with default profile command "claude"
end tell

-- Launch in specific directory
tell application "iTerm2"
    create window with default profile
    tell current session of current window
        write text "cd /path/to/directory && claude"
    end tell
end tell
```

#### 1.3.2 Limitations

- **No direct CWD access via AppleScript** - Must use Python API or parse `lsof -p <pid>`
- **Session matching less precise** - No cmdline access, must match by name/tty
- **Window title setting** - Requires escape sequences, not direct API

#### 1.3.3 Files to Create/Modify

| File | Action | Description |
| --- | --- | --- |
| `src/utils/iterm2-remote.ts` | Create | ~400-500 lines - AppleScript wrapper functions |
| `src/utils/applescript-runner.ts` | Create | ~50 lines - Generic AppleScript execution helper |
| `src/utils/terminal-focus.ts` | Modify | Add iTerm2 detection and routing |
| `src/utils/terminal-detector.ts` | Create | ~100 lines - Detect which terminal is running |

#### 1.3.4 Implementation Steps

1. **Create AppleScript runner utility**
   - Async wrapper for `osascript` command
   - Handle escaping and error parsing

2. **Implement iTerm2 remote module**
   - `isITerm2Available()` - Check if iTerm2 is running
   - `listSessions()` - Get all sessions with metadata
   - `findAgentSession()` - Match session by name pattern or tty
   - `focusSession()` - Activate window and select session
   - `sendText()` - Write text to session
   - `sendKey()` - Send control characters
   - `launchWindow()` - Create new window with command

3. **Add CWD detection workaround**
   - Use `lsof -p <pid> | grep cwd` to get working directory
   - Cache results to avoid repeated calls

4. **Integrate with terminal-focus.ts**
   - Add terminal type detection
   - Route calls to appropriate module

#### 1.3.5 User Configuration

Users will need to:

- No special configuration required (AppleScript works out of the box)
- Optional: Enable Python API for advanced features

---

## 2. Terminal.app

**Popularity:** Built-in default, used by many casual users **Estimated Effort:** Medium (3-4 hours) **API Type:** AppleScript only **Documentation:** https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/

### 2.1 Overview

Terminal.app is macOS's built-in terminal. It has basic AppleScript support but lacks the advanced features of iTerm2.

### 2.2 Required Features Mapping

| AgentDeck Feature | Terminal.app Implementation                      |
| ----------------- | ------------------------------------------------ |
| List windows/tabs | AppleScript: `get windows`, `get tabs of window` |
| Get tab metadata  | Limited: `name`, `tty`, `busy`                   |
| Focus window/tab  | AppleScript: `set selected of tab to true`       |
| Send text         | AppleScript: `do script "..." in tab`            |
| Send keystrokes   | System Events keystroke injection                |
| Launch new window | AppleScript: `do script "claude"`                |

### 2.3 Implementation Details

#### 2.3.1 AppleScript Commands

```applescript
-- List all windows and tabs
tell application "Terminal"
    set windowList to {}
    repeat with w in windows
        set tabList to {}
        repeat with t in tabs of w
            set tabInfo to {tty:tty of t, busy:busy of t, processes:processes of t, selected:selected of t}
            set end of tabList to tabInfo
        end repeat
        set end of windowList to {id:id of w, tabs:tabList}
    end repeat
    return windowList
end tell

-- Focus a tab
tell application "Terminal"
    activate
    set frontmost of window 1 to true
    set selected of tab 2 of window 1 to true
end tell

-- Send command to specific tab
tell application "Terminal"
    do script "echo hello" in tab 1 of window 1
end tell

-- Launch new window with command
tell application "Terminal"
    do script "cd /path && claude"
end tell

-- Send Ctrl+C using System Events
tell application "System Events"
    tell process "Terminal"
        keystroke "c" using control down
    end tell
end tell
```

#### 2.3.2 Limitations

- **No session IDs** - Must match by tty or tab index
- **Limited metadata** - No direct cwd access
- **`do script` creates new tab** - Can't send to existing tab without workarounds
- **Keystroke injection requires accessibility permissions**

#### 2.3.3 Files to Create/Modify

| File | Action | Description |
| --- | --- | --- |
| `src/utils/terminal-app-remote.ts` | Create | ~300 lines - AppleScript wrapper |
| `src/utils/terminal-focus.ts` | Modify | Add Terminal.app routing |
| `src/utils/terminal-detector.ts` | Modify | Add Terminal.app detection |

#### 2.3.4 Implementation Steps

1. **Implement Terminal.app remote module**
   - `isTerminalAppAvailable()` - Check if Terminal is running
   - `listTabs()` - Get all tabs with tty and process info
   - `findAgentTab()` - Match by tty or process name
   - `focusTab()` - Bring window to front, select tab
   - `sendKeystroke()` - Use System Events for Ctrl+C/Enter
   - `launchWindow()` - Create new window with command

2. **Handle accessibility permissions**
   - Detect if System Events access is granted
   - Provide user guidance if not

3. **Integrate with terminal-focus.ts**

#### 2.3.5 User Configuration

Users will need to:

- Grant accessibility permissions for keystroke injection (System Preferences > Privacy > Accessibility)

---

## 3. Warp

**Popularity:** Rapidly growing, modern terminal with AI features **Estimated Effort:** High (6-8 hours) or Limited Support **API Type:** Limited CLI, Proprietary **Documentation:** https://docs.warp.dev/

### 3.1 Overview

Warp is a modern, Rust-based terminal with AI features. It has limited external API support as it focuses on its own ecosystem.

### 3.2 Required Features Mapping

| AgentDeck Feature    | Warp Implementation          |
| -------------------- | ---------------------------- |
| List windows         | AppleScript (basic)          |
| Get session metadata | Very limited                 |
| Focus window         | AppleScript: `activate`      |
| Send text            | **Not supported externally** |
| Send keystrokes      | System Events (limited)      |
| Launch new window    | `warp` CLI or `open -a Warp` |

### 3.3 Implementation Details

#### 3.3.1 Available Methods

```bash
# Launch Warp
open -a Warp

# Launch Warp in directory
open -a Warp /path/to/directory

# Warp CLI (limited)
warp --help  # Check available commands
```

```applescript
-- Focus Warp
tell application "Warp"
    activate
end tell

-- Get window count (limited info)
tell application "Warp"
    count windows
end tell
```

#### 3.3.2 Limitations

- **No remote control API** - Cannot send text or commands to existing sessions
- **No session introspection** - Cannot list sessions or get metadata
- **Proprietary blocks** - Warp's "blocks" are internal only
- **Focus only** - Can only activate the application, not specific panes

#### 3.3.3 Feasible Features

| Feature              | Feasibility                         |
| -------------------- | ----------------------------------- |
| Focus Warp window    | Yes (AppleScript activate)          |
| Launch new instance  | Yes (open -a Warp)                  |
| Send text to session | No                                  |
| Send keystrokes      | Partial (System Events, unreliable) |
| Get session state    | No                                  |

#### 3.3.4 Files to Create/Modify

| File | Action | Description |
| --- | --- | --- |
| `src/utils/warp-remote.ts` | Create | ~100 lines - Basic focus/launch only |
| `src/utils/terminal-focus.ts` | Modify | Add Warp routing (limited) |

#### 3.3.5 Implementation Steps

1. **Implement basic Warp support**
   - `isWarpAvailable()` - Check if Warp is installed
   - `focusWarp()` - Bring Warp to foreground
   - `launchWarp()` - Open new Warp window

2. **Document limitations** - Users need to understand Warp has reduced functionality

#### 3.3.6 User Configuration

- No configuration needed
- Users should be informed of feature limitations

#### 3.3.7 Recommendation

**Implement basic support only** - Focus and launch features. Full integration is not possible without Warp adding an API.

---

## 4. Kitty

**Popularity:** Popular among power users **Estimated Effort:** Already Implemented **API Type:** `kitten @` remote control protocol **Documentation:** https://sw.kovidgoyal.net/kitty/remote-control/

### 4.1 Overview

Kitty is already fully supported in AgentDeck. This section documents the current implementation for reference.

### 4.2 Current Implementation

Located in `src/utils/kitty-remote.ts` (~845 lines)

| Feature       | Command                              |
| ------------- | ------------------------------------ |
| List windows  | `kitten @ ls`                        |
| Focus window  | `kitten @ focus-window --match id:X` |
| Send text     | `kitten @ send-text`                 |
| Send key      | `kitten @ send-key`                  |
| Scroll window | `kitten @ scroll-window`             |
| Launch window | `kitten @ launch`                    |

### 4.3 User Configuration

Users must enable remote control in `~/.config/kitty/kitty.conf`:

```
allow_remote_control yes
listen_on unix:/tmp/kitty
```

---

## 5. Alacritty

**Popularity:** Popular for minimalism and speed **Estimated Effort:** Very Limited Support **API Type:** None (by design) **Documentation:** https://alacritty.org/

### 5.1 Overview

Alacritty is intentionally minimal and does not include any remote control API. The developers explicitly avoid adding such features to keep the terminal simple and fast.

### 5.2 Required Features Mapping

| AgentDeck Feature    | Alacritty Implementation     |
| -------------------- | ---------------------------- |
| List windows         | Not possible                 |
| Get session metadata | Not possible                 |
| Focus window         | AppleScript `activate` only  |
| Send text            | **Not supported**            |
| Send keystrokes      | System Events (very limited) |
| Launch new window    | `alacritty` CLI              |

### 5.3 Implementation Details

#### 5.3.1 Available Methods

```bash
# Launch Alacritty
alacritty

# Launch in directory
alacritty --working-directory /path/to/dir

# Launch with command
alacritty -e claude
```

```applescript
-- Focus Alacritty
tell application "Alacritty"
    activate
end tell
```

#### 5.3.2 Limitations

- **No API whatsoever** - This is by design
- **Single instance only** - Cannot target specific windows
- **No IPC** - Cannot communicate with running instances

#### 5.3.3 Feasible Features

| Feature              | Feasibility                   |
| -------------------- | ----------------------------- |
| Focus Alacritty      | Yes (AppleScript activate)    |
| Launch new instance  | Yes (alacritty CLI)           |
| Send text to session | No                            |
| Send keystrokes      | No (System Events unreliable) |
| Get session state    | No                            |

#### 5.3.4 Files to Create/Modify

| File                            | Action | Description                   |
| ------------------------------- | ------ | ----------------------------- |
| `src/utils/alacritty-remote.ts` | Create | ~60 lines - Launch/focus only |
| `src/utils/terminal-focus.ts`   | Modify | Add Alacritty routing         |

#### 5.3.5 Implementation Steps

1. **Implement minimal Alacritty support**
   - `isAlacrittyAvailable()` - Check if alacritty binary exists
   - `focusAlacritty()` - AppleScript activate
   - `launchAlacritty()` - Launch with optional directory and command

2. **Clearly document limitations**

#### 5.3.6 Recommendation

**Implement launch/focus only** - Alacritty users understand they chose minimalism over features.

---

## 6. WezTerm

**Popularity:** Growing, attracts Kitty users **Estimated Effort:** Low (2-3 hours) **API Type:** `wezterm cli` commands **Documentation:** https://wezfurlong.org/wezterm/cli/cli.html

### 6.1 Overview

WezTerm has a CLI almost identical to Kitty's remote control. This makes it the easiest terminal to add support for.

### 6.2 Required Features Mapping

| AgentDeck Feature  | WezTerm Implementation                                 |
| ------------------ | ------------------------------------------------------ |
| List windows/panes | `wezterm cli list --format json`                       |
| Get pane metadata  | Included in list output (cwd, title, pid)              |
| Focus pane         | `wezterm cli activate-pane --pane-id X`                |
| Send text          | `wezterm cli send-text --pane-id X "text"`             |
| Send keystrokes    | `wezterm cli send-text --pane-id X --no-paste $'\x03'` |
| Launch new pane    | `wezterm cli spawn`                                    |
| Launch new window  | `wezterm cli spawn --new-window`                       |

### 6.3 Implementation Details

#### 6.3.1 CLI Commands

```bash
# List all panes (JSON output)
wezterm cli list --format json
# Output: [{"pane_id":0,"tab_id":0,"window_id":0,"workspace":"default","cwd":"file:///Users/...","title":"zsh",...}]

# Activate/focus a pane
wezterm cli activate-pane --pane-id 0

# Send text to pane
wezterm cli send-text --pane-id 0 "hello"

# Send Ctrl+C (cancel)
wezterm cli send-text --pane-id 0 --no-paste $'\x03'

# Send Enter (approve)
wezterm cli send-text --pane-id 0 --no-paste $'\r'

# Spawn new window with command
wezterm cli spawn --new-window -- claude

# Spawn in directory
wezterm cli spawn --new-window --cwd /path/to/dir -- claude
```

#### 6.3.2 JSON Output Structure

```json
[
  {
    "window_id": 0,
    "tab_id": 0,
    "pane_id": 0,
    "workspace": "default",
    "size": { "rows": 24, "cols": 80 },
    "title": "claude",
    "cwd": "file:///Users/user/project",
    "cursor_x": 0,
    "cursor_y": 23,
    "cursor_shape": "Default",
    "cursor_visibility": "Visible",
    "left_col": 0,
    "top_row": 0,
    "is_active": true,
    "is_zoomed": false,
    "tty_name": "/dev/ttys001"
  }
]
```

#### 6.3.3 Files to Create/Modify

| File | Action | Description |
| --- | --- | --- |
| `src/utils/wezterm-remote.ts` | Create | ~300 lines - Direct port from kitty-remote.ts |
| `src/utils/terminal-focus.ts` | Modify | Add WezTerm routing |
| `src/utils/terminal-detector.ts` | Modify | Add WezTerm detection |

#### 6.3.4 Implementation Steps

1. **Create WezTerm remote module** (copy structure from kitty-remote.ts)
   - `isWezTermAvailable()` - Run `wezterm cli list` to check
   - `listPanes()` - Parse JSON output from `wezterm cli list`
   - `findAgentPane()` - Match by cwd, title, or process
   - `focusPane()` - `wezterm cli activate-pane`
   - `sendText()` - `wezterm cli send-text`
   - `sendKey()` - `wezterm cli send-text --no-paste` with escape codes
   - `launchWindow()` - `wezterm cli spawn --new-window`

2. **Handle cwd URL format**
   - WezTerm returns cwd as `file:///path` URL
   - Need to parse and normalize

3. **Integrate with terminal-focus.ts**

#### 6.3.5 User Configuration

Users need WezTerm installed. The CLI works out of the box with the default multiplexer domain.

For remote domains, users may need to specify `--pane-id` from the correct domain.

---

## 7. Hyper

**Popularity:** Declining, still has users **Estimated Effort:** Medium-High (5-7 hours) **API Type:** JavaScript plugin API, limited external control **Documentation:** https://hyper.is/

### 7.1 Overview

Hyper is an Electron-based terminal. While highly extensible via plugins, it lacks external remote control capabilities.

### 7.2 Required Features Mapping

| AgentDeck Feature    | Hyper Implementation           |
| -------------------- | ------------------------------ |
| List windows         | Not directly available         |
| Get session metadata | Requires custom plugin         |
| Focus window         | AppleScript `activate`         |
| Send text            | **Requires custom plugin**     |
| Send keystrokes      | System Events or custom plugin |
| Launch new window    | `hyper` CLI or `open -a Hyper` |

### 7.3 Implementation Details

#### 7.3.1 Available Methods

```bash
# Launch Hyper
hyper

# Open Hyper
open -a Hyper

# Hyper plugins (installed by user)
hyper install hyper-custom-plugin
```

```applescript
-- Focus Hyper
tell application "Hyper"
    activate
end tell
```

#### 7.3.2 Plugin Approach

To fully support Hyper, we would need to:

1. Create a Hyper plugin that exposes an IPC server
2. The plugin would handle commands from AgentDeck
3. Communicate via local HTTP or Unix socket

This is complex and requires users to install our plugin.

#### 7.3.3 Feasible Features (Without Plugin)

| Feature              | Feasibility                |
| -------------------- | -------------------------- |
| Focus Hyper          | Yes (AppleScript activate) |
| Launch new instance  | Yes (hyper CLI or open -a) |
| Send text to session | No                         |
| Send keystrokes      | Limited (System Events)    |
| Get session state    | No                         |

#### 7.3.4 Files to Create/Modify

**Basic support (no plugin):**

| File                          | Action | Description                   |
| ----------------------------- | ------ | ----------------------------- |
| `src/utils/hyper-remote.ts`   | Create | ~80 lines - Launch/focus only |
| `src/utils/terminal-focus.ts` | Modify | Add Hyper routing             |

**Full support (with plugin):**

| File                        | Action | Description             |
| --------------------------- | ------ | ----------------------- |
| `hyper-agentdeck-plugin/`   | Create | Separate npm package    |
| `src/utils/hyper-remote.ts` | Create | ~250 lines - IPC client |

#### 7.3.5 Implementation Steps

**Phase 1: Basic support**

1. Implement launch and focus only
2. Document that full features require the plugin

**Phase 2: Full support (optional)**

1. Create Hyper plugin with IPC server
2. Plugin exposes: listSessions, sendText, getMetadata
3. AgentDeck connects as IPC client

#### 7.3.6 Recommendation

**Implement basic support only** - The plugin approach is too complex for the declining Hyper user base. Users who want full features should use iTerm2, Kitty, or WezTerm.

---

## Implementation Priority

Based on popularity and effort, here's the recommended implementation order:

| Priority | Terminal | Effort | User Impact | Recommendation |
| --- | --- | --- | --- | --- |
| 1 | **iTerm2** | Medium | Very High | Full support via AppleScript |
| 2 | **WezTerm** | Low | Medium | Full support (Kitty-like API) |
| 3 | **Terminal.app** | Medium | Medium | Full support with permissions |
| 4 | **Warp** | Low | Medium | Basic support (focus/launch) |
| 5 | **Alacritty** | Very Low | Low | Basic support (focus/launch) |
| 6 | **Hyper** | Low | Low | Basic support (focus/launch) |

### Total Estimated Effort

- **Full-featured terminals:** 8-12 hours (iTerm2 + WezTerm + Terminal.app)
- **Basic support terminals:** 2-3 hours (Warp + Alacritty + Hyper)
- **Total:** 10-15 hours

---

## Architecture Changes

### Terminal Abstraction Layer

Create a common interface that all terminal modules implement:

```typescript
// src/utils/terminal-interface.ts

export interface TerminalWindow {
  id: string;
  title: string;
  cwd?: string;
  pid?: number;
  isActive: boolean;
}

export interface TerminalRemote {
  name: string;
  isAvailable(): Promise<boolean>;
  listWindows(): Promise<TerminalWindow[]>;
  findAgentWindow(
    agentType: AgentType,
    sessionId?: string,
    cwd?: string
  ): Promise<TerminalWindow | null>;
  focusWindow(windowId: string): Promise<boolean>;
  sendText(windowId: string, text: string): Promise<boolean>;
  sendKey(windowId: string, key: "enter" | "ctrl+c"): Promise<boolean>;
  launchWindow(command: string, cwd?: string): Promise<string | null>;
}
```

### Terminal Detector

```typescript
// src/utils/terminal-detector.ts

export type TerminalType =
  "kitty" | "wezterm" | "iterm2" | "terminal" | "warp" | "alacritty" | "hyper";

export async function detectActiveTerminal(): Promise<TerminalType | null>;
export async function detectAvailableTerminals(): Promise<TerminalType[]>;
export async function getTerminalRemote(
  type: TerminalType
): Promise<TerminalRemote>;
```

### Configuration

Add terminal preference to settings:

```typescript
// In Property Inspector settings
{
  "preferredTerminal": "auto" | "kitty" | "wezterm" | "iterm2" | "terminal" | "warp" | "alacritty" | "hyper"
}
```

---

## Testing Plan

### Manual Testing Checklist

For each terminal:

- [ ] Detection works correctly
- [ ] Launch new window works
- [ ] Launch with directory works
- [ ] Focus existing window works
- [ ] Send text/Enter works (if supported)
- [ ] Send Ctrl+C works (if supported)
- [ ] Agent matching by session ID works
- [ ] Agent matching by CWD works
- [ ] Multiple instances handled correctly

### Test Commands

```bash
# Test terminal detection
curl http://127.0.0.1:19847/terminals

# Test launch
curl -X POST http://127.0.0.1:19847/launch -d '{"terminal":"iterm2","command":"claude"}'

# Test focus
curl -X POST http://127.0.0.1:19847/focus -d '{"terminal":"iterm2","sessionId":"abc123"}'
```
