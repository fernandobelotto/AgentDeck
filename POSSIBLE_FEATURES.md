# Possible Features for AgentDeck

This document outlines potential features that could be implemented in AgentDeck, organized by priority and effort level.

---

## High Priority Features

### 1. Command Execution (TODO exists in code)

The WebSocket command handler acknowledges commands but doesn't execute them. Implement:

- **Focus terminal** - Use AppleScript/PowerShell to focus terminal window
- **Cancel operations** - Send SIGINT to Claude Code process
- **Approve permissions** - Interact with Claude Code permission system

**Key file:** `src/server/status-server.ts` (line 316)

### 2. Multi-Terminal Support

Currently locked to Kitty-only. Create an adapter framework for:

- iTerm2 (AppleScript on macOS)
- WezTerm (socket-based remote control)
- Alacritty
- Ghostty
- Windows Terminal / PowerShell

**Implementation:** Create `src/utils/terminal-adapters/` directory with abstract interface and per-terminal implementations.

### 3. Windows/Linux Platform Support

- **Windows:** PowerShell remoting, UI Automation, SendKeys
- **Linux:** xdotool (X11), ydotool (Wayland), XDG Base Directory support

### 4. Session History & Persistence

- Persist instance metadata to SQLite or JSON database
- Save instance-to-button mappings across plugin restarts
- Usage history export (CSV/PDF)
- Session replay showing state transitions

### 5. Cost Alerts & Budgets

- Configurable per-session and global cost thresholds
- Stream Deck notifications when limits exceeded
- Daily/monthly/hourly budget tracking
- Visual budget remaining indicator on icons

---

## Medium Priority Features

### 6. Instance Grouping & Organization

- Group instances by project/workspace
- Favorite/pin frequently used instances
- Search/filter instances by name, state, path
- Tags and custom labels
- LRU (Least Recently Used) sorting

### 7. Customizable Gesture Mapping

- State-aware gestures (hold in "permission" approves, hold in "running" cancels)
- Triple-click support for additional actions
- Tiered hold durations (500ms quick action vs 1000ms+ destructive action)
- User-configurable gesture bindings in Property Inspector

**Key file:** `src/utils/interaction-handler.ts`

### 8. tmux/zellij Integration

- Detect multiplexer sessions automatically from environment variables
- Route focus/signals to correct pane
- Support project-folder-based session affinity

### 9. Slack/Discord Webhooks

- Notifications for permission requests, errors, state changes
- Formatted messages with session name, state, token usage
- Configurable event filters

### 10. OpenAI/ChatGPT CLI Integration

- Monitor ChatGPT CLI instances alongside Claude and Gemini
- Unified state tracking and gesture control
- Extend `InstanceSource` type to include "openai"

### 11. Git Branch Context Display

- Show current git branch name on Stream Deck
- Color-coded branch indicators (blue=main, yellow=feature, red=hotfix)
- Filter instances by repository

### 12. Per-Instance Statistics Dashboard

- Token usage trends over time
- Cost per instance charts
- State distribution pie chart
- Tool usage frequency

---

## UX/UI Improvements

### 13. Hold Progress Ring

- Visual indicator showing hold duration before action triggers
- Ring fills as user holds button
- Different colors for different hold thresholds

### 14. Display Mode Quick-Switch

- Cycle through Status/Tokens/Cost/Activity without opening Property Inspector
- Gesture-based mode switching

### 15. State Transition Animations

- Smooth crossfade between states (300-500ms)
- Shake/wobble for error states
- Breathing/pulsing animation for idle and disconnected
- Color interpolation during transitions

### 16. Help Tooltips & Onboarding

- Explain auto-assign behavior in Property Inspector
- Display mode preview thumbnails
- Gesture timing documentation
- State legend showing all possible states
- Setup wizard for first-time configuration

### 17. Accessibility Improvements

- Color blindness-friendly state indicators (unique patterns/icons per state)
- Better contrast ratios (WCAG AA compliance)
- Keyboard navigation support in Property Inspector
- Focus indicators for all interactive elements

### 18. Action Confirmation Feedback

- Brief visual flash on successful action
- Color flash (green=success, red=failure)
- Temporary checkmark animation for approvals

---

## Quick Wins (Low Effort, High Impact)

| Feature | Effort | Description |
|---------|--------|-------------|
| Error state wobble animation | 5 min | Add subtle shake to error state icon |
| Disconnected state breathing | 5 min | Pulsing opacity for disconnected state |
| Success flash | 10 min | Brief highlight on action completion |
| Health status tooltips | 10 min | Hover for detailed server/Kitty status |
| Help text clarifications | 5 min | Clarify auto-assign behavior in UI |
| Stuck state detection | 15 min | Alert when same state persists too long |
| Last-updated timestamp | 5 min | Show "Last updated: Xs ago" in Property Inspector |
| Hold progress indicator | 15 min | Visual ring during hold gesture |

---

## Architecture Improvements

### Refactor Duplicate Code

`ClaudeInstanceAction` and `GeminiInstanceAction` are 99% identical (~1400 lines combined). Extract shared base class or use composition pattern.

### Add Testing Framework

- No unit tests or integration tests currently exist
- Add Jest or Vitest configuration
- Test core modules: InstanceManager, UsageTracker, InteractionHandler

### Structured Logging

- Replace scattered `console.log` calls with structured logging
- Add log levels, timestamps, context fields
- Support log rotation

### Exponential Backoff

- WebSocket reconnection currently uses fixed 5s delay
- Implement exponential backoff with max retry limits

### Configuration Centralization

- Hard-coded values scattered throughout (port 19847, timeouts, FPS)
- Create centralized config system
- Support environment variable overrides

### State Machine Implementation

- Replace implicit state management with explicit state machine
- Validate state transitions
- Track state change history for debugging

---

## Implementation Roadmap

### Phase 1: Foundation
1. Implement command execution (focus, cancel, approve)
2. Add session persistence layer
3. Refactor duplicate action code

### Phase 2: Platform Expansion
1. Multi-terminal adapter framework
2. Windows support
3. Linux support

### Phase 3: Enhanced Monitoring
1. Per-instance statistics dashboard
2. Cost alerts and budgets
3. Structured logging

### Phase 4: Integrations & Polish
1. OpenAI/ChatGPT CLI integration
2. Slack/Discord webhooks
3. Customizable gesture mapping
4. Icon themes and accessibility

---

## Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/server/status-server.ts` | 432 | HTTP+WebSocket server |
| `src/server/instance-manager.ts` | 231 | Instance state tracking |
| `src/actions/claude-instance-action.ts` | 714 | Claude Stream Deck action |
| `src/actions/gemini-instance-action.ts` | 731 | Gemini Stream Deck action |
| `src/icons/icon-generator.ts` | 709 | SVG icon generation |
| `src/utils/kitty-remote.ts` | 778 | Kitty terminal control |
| `src/utils/interaction-handler.ts` | 163 | Gesture detection |
| `hooks/status-reporter.sh` | ~200 | Claude Code hook script |
