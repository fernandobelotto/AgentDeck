# ClaudeDeck Feature & UX Improvement Ideas

This document contains feature suggestions and UX improvements identified through comprehensive codebase analysis.

---

## High Priority Features

### Interactions

#### Context-Aware Gestures
Single/double press behavior should vary by current state:
- `idle` + single press → Launch new Claude instance
- `running` + single press → Focus terminal (current)
- `permission` + double press → Deny/reject (inverse of hold=approve)
- `question` + double press → Send empty/default response
- `error` + single press → Show error details or retry
- `disconnected` + single press → Launch new instance

#### Hold Gesture Progress Ring
Add visual indicator showing hold duration before action triggers:
- Ring fills as user holds button
- Different colors for different hold durations
- Clear feedback on when action will execute

### Property Inspector UI

#### Gesture Customization
Allow users to configure what each gesture does:
- Dropdown for single press action
- Dropdown for double press action
- Dropdown for hold action
- Configurable timing thresholds (double-click: 300ms, hold: 500ms)

#### Instance Filtering & Search
- Search field to filter instances by name or path
- Filter dropdown by state (idle, running, error, etc.)
- Sort options (name, state, last-active)
- Favorite/pin frequently used instances

### Icon System

#### Progress Indicators
Ring animation showing operation progress (0-100%) for long-running tasks:
- Extend `StatusMetadata` with `progress` field
- Render concentric progress ring around icon
- Show estimated completion for multi-step operations

### Server & Instance Management

#### Session Statistics
Track metrics per instance:
- Total session duration
- Time spent in each state
- Most frequently used tools
- Error count and types
- Expose via `/instances/{sessionId}/stats` endpoint

### Terminal Support

#### iTerm2 Support
AppleScript-based terminal control for macOS users:
- Focus window by title/session
- Send key events
- Launch new windows
- Fallback when Kitty unavailable

---

## Medium Priority Features

### Interactions

#### Triple Press Detection
Add third gesture type for power users:
- Triple press → Toggle debug/recording mode
- Triple press in error state → View full error log
- Triple press in running state → Force kill and restart
- Implementation: Extend `InteractionHandler` with `TRIPLE_CLICK_THRESHOLD_MS` (600ms)

#### Tiered Hold Durations
Different actions based on hold length:
- 500-750ms → Quick approve/cancel
- 750-1000ms → Deep action (restart session, view logs)
- 1000ms+ → Destructive action with confirmation
- Visual feedback showing which tier user is in

#### Gesture Lockout
Prevent accidental double-triggers:
- 200ms lockout after action execution
- State change debouncing to prevent flicker
- Visual "locked" indicator during lockout

### Property Inspector UI

#### Advanced Settings Panel
Collapsible section with:
- WebSocket URL override (default: localhost:19847)
- Health check interval (default: 3s)
- Icon animation speed (default: 12 FPS)
- Instance timeout (auto-disconnect after X minutes)
- Debug logging toggle
- Reset to defaults button

#### Configuration Presets
Save and load preset configurations:
- "Focus-only" (single press only, others disabled)
- "Full control" (all gestures enabled)
- "Read-only" (status display only, no actions)
- Import/export as JSON

#### Real-Time Path Validation
For project folder input:
- Green checkmark when path exists
- Red X for invalid paths
- Recent folders dropdown
- Path auto-completion

#### Terminal Selector
Dropdown to choose terminal application:
- Kitty (full remote control)
- iTerm2 (AppleScript)
- Terminal.app (AppleScript)
- Auto-detect (try in order)

### Icon System

#### State Transitions
Smooth crossfade animations between states:
- 300-500ms transition duration
- Color interpolation during transition
- Icon morphing for related states
- Bounce/shake for critical changes (error, permission)

#### Subtle Idle Animations
Add movement to static states:
- `idle` → Very slow checkmark rotation (barely perceptible)
- `error` → Gentle wobble/shake (1-2 pixel movement)
- `disconnected` → Pulsing opacity ("sleeping" effect)

#### Interactive Visual Feedback
- Press feedback → Dim/highlight icon on key press
- Success flash → Brief white flash on action completion
- Error pulse → Faster pulsing on error states

### Server & Instance Management

#### Event History Tracking
Store event log per instance:
- Last 10-20 state transitions
- Timestamps and state changes
- Tool names used
- New endpoint: `/instances/{sessionId}/history`

#### Filtered Instance Queries
New API endpoints:
- `/instances?state=running` - Filter by state
- `/instances?cwd=/path/to/project` - Filter by directory
- `/instances?tool=Bash` - Filter by active tool
- `/instances?tag=production` - Filter by tags

#### Smart Auto-Assignment
Rules-based instance assignment:
- Assign by project folder pattern
- Assign by tool type preference
- Priority-based (pinned instances first)
- Least-recently-used algorithm

---

## Quick Wins (Low Effort, High Impact)

### 1. Error Wobble Animation
Add subtle shake to error state icon (5 min implementation):
```typescript
// New animation type in STATE_CONFIGS
error: { animationType: 'wobble', ... }
```

### 2. Disconnected Breathing
Pulsing opacity for disconnected state (5 min):
```typescript
disconnected: { animationType: 'dim-pulse', ... }
```

### 3. Hold Progress Indicator
Visual ring during hold gesture (15 min):
- Start ring on keyDown
- Fill proportional to hold duration
- Cancel on keyUp before threshold

### 4. Success Flash
Brief highlight on action completion (10 min):
- Temporary white overlay
- 200ms fade out
- Triggers on command acknowledgment

### 5. Help Text Expansion
Clarify auto-assign behavior in UI (5 min):
```
"When enabled, button automatically switches to the
next available instance when current one disconnects"
```

### 6. Health Tooltips
Hover for detailed server/Kitty status (10 min):
- Server: "Connected to localhost:19847"
- Kitty: "Socket: /tmp/kitty-12345"

### 7. Stuck State Detection
Alert when same state persists too long (15 min):
- Configurable threshold (default: 5 minutes)
- Visual indicator (pulsing border)
- Optional notification

---

## Architecture Improvements

### Terminal Abstraction Interface

Create clean interface for multi-terminal support:

```typescript
interface TerminalAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  findWindow(sessionId: string, cwd?: string): Promise<TerminalWindow | null>;
  focusWindow(windowId: string): Promise<boolean>;
  sendKey(key: string, windowId: string): Promise<boolean>;
  sendText(text: string, windowId: string): Promise<boolean>;
  launchWindow(command: string, cwd?: string): Promise<string | null>;
}
```

**Fallback Chain:**
```
Kitty (full remote control)
  → iTerm2 (AppleScript)
  → Terminal.app (AppleScript)
  → Default terminal (open command)
```

### State-Specific Action Mapping

Map gestures to states dynamically:

```typescript
const ACTION_MAP: Record<ClaudeState, GestureActions> = {
  idle: {
    singlePress: 'launch',
    doublePress: 'switchPrevious',
    hold: 'showMenu'
  },
  running: {
    singlePress: 'focus',
    doublePress: 'cancel',
    hold: 'viewProgress'
  },
  permission: {
    singlePress: 'focus',
    doublePress: 'deny',
    hold: 'approve'
  },
  // ... etc
};
```

### Enhanced Metadata

Extend `StatusMetadata` with additional fields:

```typescript
interface StatusMetadata {
  cwd?: string;
  tool_name?: string;
  timestamp?: string;
  error_message?: string;
  // New fields:
  progress?: number;        // 0-100 for progress ring
  branch_name?: string;     // Git branch
  file_path?: string;       // File being edited
  token_count?: number;     // Approximate tokens used
  estimated_cost?: number;  // Token cost estimate
  task_name?: string;       // User-provided description
}
```

---

## UX Pain Points Identified

| Pain Point | Current State | Suggested Fix |
|------------|---------------|---------------|
| Gestures not configurable | Hard-coded timing thresholds | Add settings in Property Inspector |
| Terminal lock-in | Only Kitty supported | Multi-terminal abstraction layer |
| Limited filtering | Can't search many instances | Add search/filter in instance list |
| No progress visibility | Don't know operation progress | Progress ring animation |
| Instant transitions | State changes feel abrupt | Smooth crossfade animations |
| Auto-assign unclear | Users don't understand behavior | Better help text and visual feedback |
| No undo capability | Can't reverse approved/cancelled | Action history with undo |

---

## Implementation Roadmap

### Phase 1: Foundation
**Focus: Core UX improvements**

1. Add gesture customization in Property Inspector
2. Implement hold progress indicator
3. Add instance search/filter
4. Improve help text and tooltips
5. Add subtle animations to static states

### Phase 2: Polish
**Focus: Visual and interaction refinements**

1. State transition animations (crossfade)
2. Progress ring for long operations
3. Interactive visual feedback (press, success, error)
4. Configuration presets system
5. Advanced settings panel

### Phase 3: Platform Expansion
**Focus: Multi-terminal and advanced features**

1. Terminal abstraction interface
2. iTerm2 support via AppleScript
3. Windows Terminal support
4. Session statistics dashboard
5. Event history tracking
6. Webhook forwarding for external integrations

---

## Additional Terminal Support Details

### iTerm2 (macOS)
```applescript
tell application "iTerm2"
  tell current session of current window
    write text "claude"
  end tell
end tell
```

### Terminal.app (macOS)
```applescript
tell application "Terminal"
  activate
  do script "claude" in front window
end tell
```

### Windows Terminal
```powershell
Start-Process wt -ArgumentList "new-tab", "claude"
```

### Ghostty
- Native VT sequence compatibility (already sending correct OSC codes)
- Remote control API similar to Kitty (when available)

### WezTerm
- Unix socket remote control API
- Cross-platform (macOS, Linux, Windows)
- Growing developer adoption

---

## Stream Deck Hardware Considerations

### Stream Deck+ (Rotary Encoders)
- Rotate encoder → Cycle through instances
- Press encoder → Focus selected instance
- Hold + rotate → Adjust animation speed

### Stream Deck XL (Touch Screen)
- Touch display mini control panel
- Swipe gestures for instance switching
- Long press for context menu

### Haptic Feedback Patterns
(Future hardware consideration)
- Single press success → Short pulse
- Double press confirmed → Double pulse
- Hold detected → Building rumble
- Action denied → Error buzz

---

## Notes

- All enhancements should be backward compatible
- Use feature flags for experimental features
- Maintain current gesture defaults as fallback
- Test on both macOS and Windows
- Consider Stream Deck SDK limitations
