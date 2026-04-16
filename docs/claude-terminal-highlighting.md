# Claude Terminal Highlighting

Accordion can highlight a terminal's border when Claude Code is waiting for your input. This works by combining Claude Code's **hooks** system with a lightweight HTTP server built into Accordion.

## How It Works

1. Accordion runs a local HTTP server on `127.0.0.1:19222`
2. Claude Code hooks fire when Claude finishes responding (`Stop`) and when you submit a prompt (`UserPromptSubmit`)
3. The hook sends a request to Accordion's server with the working directory, which Accordion uses to identify the correct terminal
4. The terminal's border and header turn the theme's warning color (yellow/gold) when Claude is waiting
5. Focusing the terminal dismisses the highlight

## Setup

Add the following to your Claude Code settings file (`~/.claude/settings.json`), merging with any existing configuration:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -G --data-urlencode \"state=waiting\" --data-urlencode \"cwd=$PWD\" http://localhost:19222/claude-state"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -G --data-urlencode \"state=busy\" --data-urlencode \"cwd=$PWD\" http://localhost:19222/claude-state"
          }
        ]
      }
    ]
  }
}
```

### Requirements

- **curl** must be available in the shell that Claude Code uses for hooks (pre-installed on Windows 10+ and most Linux/macOS systems)
- Hooks run in **bash**, so the `$PWD` variable is used to pass the working directory
- The Accordion app must be running (the HTTP server starts automatically with the app)

## Architecture

```
Claude Code (in terminal)              Accordion
--------------------------              ---------

Claude finishes responding
  |
  v
Stop hook fires                  -->   HTTP server receives GET
  curl ...state=waiting&cwd=...        (main process, port 19222)
                                         |
                                       Resolves CWD -> terminal ptyId
                                         |
                                       IPC -> renderer
                                         |
                                       Terminal border turns yellow

User submits prompt
  |
  v
UserPromptSubmit hook fires      -->   HTTP server receives GET
  curl ...state=busy&cwd=...           (main process, port 19222)
                                         |
                                       Terminal border returns to normal
```

### Key files

| File | Purpose |
|------|---------|
| `src/main/claude-state-server.ts` | HTTP server that receives state updates and forwards via IPC |
| `src/main/pty-manager.ts` | Maintains CWD-to-ptyId mapping for terminal identification |
| `src/main.ts` | Starts/stops the state server with app lifecycle |
| `src/preload.ts` | Exposes `onClaudeState` IPC listener to renderer |
| `src/components/TerminalPanel.tsx` | Listens for state changes, toggles CSS classes |
| `src/components/App.css` | `.terminal-panel-waiting` / `.terminal-header-waiting` styles |

## Troubleshooting

**Hooks not firing:** Verify your `~/.claude/settings.json` has the `hooks` section and restart the Claude Code session (not just the terminal).

**All terminals highlight:** The `cwd` parameter may not be reaching the server. Test manually:
```bash
curl "http://localhost:19222/claude-state?state=waiting&cwd=$(pwd)"
```

**Server not reachable:** Confirm port 19222 is free. If another process uses it, Accordion logs a warning and the feature is disabled.
