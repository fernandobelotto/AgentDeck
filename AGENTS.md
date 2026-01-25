# AGENTS.md

Guide for AI coding agents working on the AgentDeck codebase.

## Quick Context

**AgentDeck** = Stream Deck plugin monitoring AI coding agents (Claude Code, Gemini CLI, Cursor Agent) via hooks → HTTP → WebSocket → animated icons.

```
AI Agent (hooks) ──POST──> Status Server :19847 ──WebSocket──> Stream Deck
```

## Project Structure

```
src/
├── plugin.ts                 # Entry point, starts server, registers actions
├── server/
│   ├── types.ts              # Core types (ClaudeState, InstanceSource, etc.)
│   ├── status-server.ts      # HTTP+WS server on port 19847
│   ├── instance-manager.ts   # Instance state tracking + sticky state logic
│   ├── usage-tracker.ts      # Claude token/cost tracking from session.jsonl
│   └── gemini-*.ts           # Gemini-specific variants
├── actions/
│   ├── claude-instance-action.ts  # Main action (reference implementation)
│   ├── gemini-instance-action.ts  # Gemini variant
│   └── cursor-instance-action.ts  # Cursor variant
├── icons/
│   ├── icon-generator.ts     # SVG generation per state (colors, animations)
│   └── animation-controller.ts # 12 FPS frame-based animations
└── utils/
    ├── terminal-focus.ts     # Public terminal control API
    ├── kitty-remote.ts       # Kitty terminal kitten @ wrapper
    ├── interaction-handler.ts # Gesture detection (click/double/hold)
    └── folder-picker.ts      # macOS folder dialog

hooks/
├── status-reporter.sh        # Claude Code hook → POST /status
├── gemini-status-reporter.sh # Gemini hook
└── cursor-status-reporter.sh # Cursor hook

com.agentdeck.plugin.sdPlugin/
├── manifest.json             # Plugin metadata + action definitions
├── bin/plugin.js             # Rollup bundle output
└── ui/                       # Property Inspector HTML
```

## States

| State | Color | Animation | Trigger |
|-------|-------|-----------|---------|
| `idle` | Green | breathing | SessionStart, Stop |
| `running` | Blue | orbit | PreToolUse (non-tool) |
| `tool_use` | Orange | ripple | Bash, Read, Glob, Grep, Task |
| `editing` | Purple | float | Edit, Write, NotebookEdit |
| `question` | Cyan | pulse | AskUserQuestion, Task |
| `plan_prompt` | Cyan | pulse | EnterPlanMode |
| `permission` | Red | wave | PermissionRequest |
| `error` | Red | shake | Error notification |
| `disconnected` | Gray | none | No connection |

**Sticky states**: `permission` and `question` persist until a progress event (PreToolUse, PostToolUse, Stop) clears them.

## Key Files to Understand

| When modifying... | Read these first |
|-------------------|------------------|
| State handling | `src/server/instance-manager.ts`, `src/server/types.ts` |
| Visual appearance | `src/icons/icon-generator.ts` (STATE_CONFIGS) |
| Animations | `src/icons/animation-controller.ts` |
| Gestures | `src/utils/interaction-handler.ts` |
| Terminal control | `src/utils/kitty-remote.ts`, `src/utils/terminal-focus.ts` |
| Server endpoints | `src/server/status-server.ts` |
| Hook event mapping | `hooks/status-reporter.sh` |
| Token tracking | `src/server/usage-tracker.ts`, `src/server/log-scanner.ts` |

## Common Tasks

### Add new state
1. Add to `ClaudeState` in `src/server/types.ts`
2. Add STATE_CONFIG entry in `src/icons/icon-generator.ts`
3. Map hook event in `hooks/status-reporter.sh`
4. Handle in `instance-manager.ts` if sticky logic needed

### Add new AI agent type
1. Create action: `src/actions/agent-instance-action.ts`
2. Add colors in `src/icons/icon-generator.ts`
3. Create hook: `hooks/agent-status-reporter.sh`
4. Register in `src/plugin.ts`
5. Add manifest action in `manifest.json`

### Modify animations
- Frame count/type: `src/icons/icon-generator.ts` AnimationType
- FPS/transitions: `src/icons/animation-controller.ts` (FRAME_INTERVAL_MS = 83)

### Modify gestures
- Thresholds in `src/utils/interaction-handler.ts`:
  - DOUBLE_CLICK_THRESHOLD_MS = 300
  - HOLD_THRESHOLD_MS = 500

## Server Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/status` | POST | Receive hook updates |
| `/instances` | GET | List instances (?cleanup, ?dedupe, ?source) |
| `/health` | GET | Health check |
| `/kitty-status` | GET | Kitty availability |
| `/usage/{sessionId}` | GET | Token usage data |

## WebSocket Protocol

```typescript
// Server → Plugin
{ type: "init", instances: [...] }
{ type: "update", sessionId, state, metadata, source }
{ type: "usage_update", sessionId, usage: { inputTokens, outputTokens, totalCost }, source }

// Plugin → Server
{ type: "command", sessionId, command: "cancel" | "approve" | "focus" }
```

## Build Commands

```bash
npm run build      # Build with Rollup
npm run watch      # Watch mode
npm run preview    # Open icon preview
streamdeck restart com.agentdeck.plugin  # Reload in Stream Deck
```

## Testing

```bash
# Test hook
echo '{"session_id":"test","hook_event_name":"Stop","cwd":"/tmp"}' | ~/.agentdeck/hooks/status-reporter.sh

# Check server
curl http://127.0.0.1:19847/health
curl http://127.0.0.1:19847/instances

# Test Kitty
kitten @ ls
```

## Important Constants

| Constant | Location | Value | Purpose |
|----------|----------|-------|---------|
| STATUS_PORT | status-server.ts | 19847 | Server port |
| FRAME_INTERVAL_MS | animation-controller.ts | 83 | ~12 FPS |
| STALE_INSTANCE_THRESHOLD | instance-manager.ts | 300000 | 5 min timeout |
| DOUBLE_CLICK_THRESHOLD_MS | interaction-handler.ts | 300 | Gesture timing |
| HOLD_THRESHOLD_MS | interaction-handler.ts | 500 | Hold detection |

## Gotchas

- **Sticky state logic** in instance-manager is subtle; permission/question states ignore idle/running updates until progress events
- **Kitty socket** auto-detected at `/tmp/kitty` or `/tmp/kitty-{pid}`; needs `allow_remote_control yes` in kitty.conf
- **Token pricing** in usage-tracker.ts needs manual updates when Claude model prices change
- **Auto-assignment** is priority-based: folder-match actions bind first, then any autoAssign-enabled action
- **Hold progress** updates every 50ms - smooth but CPU-intensive
- **WebSocket reconnect** has 5s delay after disconnect

## Dependencies

- `@elgato/streamdeck` v1.2.0 - Stream Deck SDK
- `ws` v8.18.0 - WebSocket server
- Node.js 20+ required (set in manifest.json)
