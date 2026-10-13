# Troubleshooting: Gesture Detection & Kitty Remote Control

## Date: 2026-01-07

## Problem Summary

The Stream Deck button gestures (single press, double press, hold) were partially working, but the **hold gesture to approve permissions** was not functioning correctly.

---

## Issue 1: Metadata Not Being Updated

### Symptom

Logs showed `Instance cwd: undefined` even though the server had the correct `cwd` data.

### Root Cause

In `claude-instance-action.ts`, the `handleWebSocketMessage` function was only updating `knownInstances` on `"init"` messages, not on `"update"` messages:

```typescript
// BUG: Only updates instanceStates, not knownInstances
} else if (message.type === "update") {
  this.instanceStates.set(message.sessionId, message.state);
  // knownInstances NOT updated here!
}
```

### Fix

Update `knownInstances` on every `"update"` message to preserve metadata:

```typescript
} else if (message.type === "update") {
  this.instanceStates.set(message.sessionId, message.state);

  // Update or create the known instance with metadata
  const existing = this.knownInstances.get(message.sessionId);
  this.knownInstances.set(message.sessionId, {
    sessionId: message.sessionId,
    state: message.state,
    metadata: message.metadata,
    lastUpdate: Date.now(),
    name: existing?.name
  });
}
```

---

## Issue 2: Wrong Window Matching Priority

### Symptom

`kittySendApprove` returned `true` but the Enter key was sent to the wrong window.

### Root Cause

In `kitty-remote.ts`, `findClaudeWindow` matched by `cwd` first, then by session ID in title. However:

- The Kitty window's `cwd` reflects the **shell's current directory**
- The Claude hook reports the **project directory**
- These can differ if the shell has `cd`'d elsewhere

Example from `kitten @ ls`:

```
Window id: 38  title: "Claude:b84172df:ClaudeDeck - Permission Required"  cwd: "/Users/.../MacHue"  <-- Different!
Window id: 41  title: "Claude:c918d1b6:MacHue"  cwd: "/Users/.../ClaudeDeck"
```

### Fix

Changed matching priority to use session ID in title first (set by hooks):

```typescript
// Priority 1: Match by title containing "Claude:[sessionId]" (most reliable)
if (sessionId) {
  const shortSession = sessionId.substring(0, 8);
  const titleMatch = allWindows.find((w) =>
    w.title.includes(`Claude:${shortSession}`)
  );
  if (titleMatch) return titleMatch;
}

// Priority 2: Match by CWD (fallback)
// Priority 3: Match by cmdline (last resort)
```

---

## Issue 3: Wrong Key Sending Method

### Symptom

Window was found correctly, command succeeded, but permission wasn't approved.

### Root Cause

Used `send-text "\n"` which sends a newline character. TUI applications like Claude Code need actual **key events**, not text input.

### Fix

Use `send-key` command instead of `send-text`:

```typescript
// Before (broken for TUI apps)
return sendText("\n", { id: window.id }, options);

// After (works for TUI apps)
return sendKey("enter", { id: window.id }, options);
```

Also updated cancel signal:

```typescript
// Before
return sendText("\x03", { id: window.id }, options);

// After
return sendKey("ctrl+c", { id: window.id }, options);
```

---

## Issue 4: Single Press Always Launching New Window

### Symptom

Single press launched a new Claude window instead of focusing the existing one.

### Root Cause

When `projectFolder` was configured, it always launched a new window, ignoring the attached session:

```typescript
// BUG: Checks projectFolder before sessionId
if (projectFolder) {
  // Always launches new window!
  return;
}
if (sessionId) {
  // Never reached when projectFolder is set
}
```

### Fix

Check for attached session first:

```typescript
// If session is attached, focus that terminal window
if (sessionId) {
  focusTerminal(sessionId, cwd);
  return;
}

// No session attached - launch new Claude instance
if (projectFolder) {
  openTerminalWithClaude(projectFolder);
} else {
  openTerminalWithClaude();
}
```

---

## Debugging Tips

### View Plugin Logs

```bash
cat ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/com.agentdeck.plugin.sdPlugin/logs/com.agentdeck.plugin.0.log | tail -50
```

### Check Server Data

```bash
curl -s http://127.0.0.1:19847/instances | jq '.'
```

### List Kitty Windows

```bash
# Find socket first
ls /tmp/kitty*

# Then list windows
kitten @ --to unix:/tmp/kitty-XXXXX ls | jq '[.[] | .tabs[] | .windows[] | {id, title, cwd, is_focused}]'
```

### Test Key Sending Manually

```bash
# Send Enter to specific window
kitten @ --to unix:/tmp/kitty-XXXXX send-key --match id:38 enter

# Send Ctrl+C
kitten @ --to unix:/tmp/kitty-XXXXX send-key --match id:38 ctrl+c
```

---

## Key Learnings

1. **WebSocket updates need full state** - Don't just update partial state; preserve all metadata on updates.

2. **Window title is more reliable than cwd** - The shell's cwd can change, but the window title (set by hooks) contains the session ID.

3. **TUI apps need key events, not text** - Use `send-key` for interactive terminal apps, `send-text` for typing into shells.

4. **Check priority of conditionals** - When multiple settings can be configured, ensure the logic handles all combinations correctly.

5. **Kitty remote control** - The `kitten @` commands are powerful but have nuances:
   - `send-text` - Sends characters as if typed
   - `send-key` - Sends key press/release events (better for TUI)
   - `--match id:N` - Target specific window by ID
