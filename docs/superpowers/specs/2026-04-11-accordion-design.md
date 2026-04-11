# Accordion — Design Spec

A Windows desktop app for viewing multiple terminals in a single window, organized in a responsive grid layout with a side pane for browsing and opening repo directories.

## Tech Stack

- **Electron** — desktop shell, native window management, IPC
- **React** — renderer UI (side pane, grid, settings, panel headers)
- **xterm.js** — terminal emulation in the renderer
- **node-pty** — pseudo-terminal process spawning in the main process
- **TypeScript** — all application code
- **Target OS:** Windows only

## Architecture

Four layers:

### 1. Electron Main Process

Responsibilities:
- Manage the BrowserWindow (single window app)
- Spawn and manage node-pty shell processes
- Read/write the config file
- Handle IPC between renderer and OS-level operations (pty I/O, file system, native dialogs)

### 2. Electron Renderer (React)

Responsibilities:
- Render the full UI: side pane, terminal grid, settings dialog, terminal panel headers
- Host xterm.js instances
- Communicate with the main process exclusively over Electron IPC

### 3. Terminal Engine (xterm.js + node-pty)

Data flow per terminal:
1. Keystrokes captured by xterm.js in the renderer
2. Sent to main process via IPC
3. Main process writes to node-pty
4. Shell process produces stdout/stderr
5. node-pty reads output, sends to renderer via IPC
6. xterm.js renders the output

Each terminal has its own dedicated node-pty instance and IPC channel.

### 4. Config/State Layer

- Config file: `%APPDATA%/Accordion/config.json`
- Read on startup, written on every settings change
- Structure:

```json
{
  "repos": [
    "C:\\Repos\\my-api",
    "C:\\Repos\\frontend-app",
    "C:\\Repos\\infra-config"
  ]
}
```

- If the file does not exist on first launch, the app creates it with `{"repos": []}` and opens the settings dialog automatically.

## Terminal Grid Layout

Fixed progression based on terminal count:

| Count | Row 1 | Row 2 |
|-------|-------|-------|
| 1     | 1     | —     |
| 2     | 2     | —     |
| 3     | 3     | —     |
| 4     | 2     | 2     |
| 5     | 3     | 2     |
| 6     | 3     | 3     |

### Layout Rules

- All terminals in a row share equal width
- Both rows share equal height when 2 rows exist
- Terminals fill slots left-to-right, top-to-bottom based on creation order
- Maximum of 6 terminals

### Reflow on Close

When a terminal is closed:
1. Remove it from the ordered list (ordered by creation time)
2. Remaining terminals fill slots left-to-right, top-to-bottom
3. Grid re-renders with the new count's layout

Example: 5 terminals (3+2), close terminal 2 → becomes 4 terminals (2+2). Terminals 1, 3, 4, 5 reflow into the 2+2 grid.

## Side Pane

Fixed-width panel on the left side of the app. Always visible (not collapsible in v1).

### Repo List

- Displays all configured repo root folders as expandable tree items
- Each repo shows its folder name with a collapse/expand toggle arrow
- Expanding a repo reveals its immediate child directories (1 level deep only) — intended for worktrees or sub-codebases
- Only directories are shown, no files
- Clicking a repo name or subfolder opens a new terminal with `cwd` set to that path

### Visual States

- **Default** — clickable, folder icon + name
- **Active** — highlighted with accent indicator when a terminal is open for that path
- **Disabled** — greyed out when 6 terminals are already open

### Constraints

- No drag and drop
- No nesting beyond 1 level deep
- No file browsing
- No search or filter

### Settings Button

Positioned at the bottom of the side pane. Opens the settings dialog.

## Terminal Panel

Each terminal panel has two parts:

### Header Bar

- **Left:** label showing the repo/folder name (e.g., "my-api" or "my-api / worktree-feat-1" for subfolders)
- **Right:** two icon buttons:
  - **Maximize/Restore** — expands the terminal to fill the entire grid area; other terminals remain alive but hidden. Click restore to return to the grid view.
  - **Close** — kills the shell process and removes the panel; grid reflows.

### Terminal Body

- Hosts an xterm.js instance
- Connected to a node-pty process via IPC
- Shell: user's default system shell, detected via the `COMSPEC` environment variable (typically `cmd.exe` or PowerShell if configured)
- Scrollback buffer: 1000 lines
- Supports: ANSI colors, cursor movement, copy/paste
- Clicking the terminal body gives it keyboard focus

### Terminal Lifecycle

1. User clicks a repo or subfolder in the side pane
2. Renderer sends IPC request to main process with the target directory path
3. Main process spawns a node-pty instance with `cwd` set to that path, using the default shell
4. Main process returns a terminal ID to the renderer
5. Renderer creates a new xterm.js instance, attaches to the IPC channel for that terminal ID
6. On close: renderer sends close IPC, main process kills the pty process, renderer disposes xterm.js, grid reflows

## Settings Dialog

Modal overlay triggered by the Settings button in the side pane.

### Repository Paths (v1 only section)

- List of configured repo root folder paths
- Each entry shows the full path with a **Remove** button
- **Add Repository** button opens a native Windows folder picker (`dialog.showOpenDialog` with `openDirectory`)
- Changes take effect immediately in the side pane
- Changes are persisted to the config file on every add/remove

### Not Included in v1

- Shell selection (uses system default)
- Theme customization
- Keybinding configuration
- Terminal font/size options

## Visual Style

- Modern and polished: rounded corners, subtle gradients, contemporary desktop app feel
- Dark color scheme
- Clean typography using system fonts (Segoe UI for UI, Cascadia Code / monospace for terminals)
- Accent color for active states and highlights

## Error Handling

- **Shell fails to spawn:** Show an error message in the terminal panel body (not a dialog). User can close the panel.
- **Config file corrupted:** Reset to default `{"repos": []}` and log a warning. Open settings dialog.
- **Repo path no longer exists:** Show the path as greyed out in the side pane with a warning indicator. Clicking it shows a tooltip explaining the path is missing.
- **Max terminals reached:** Disable clicking in the side pane. No error dialog needed — the greyed-out state communicates the constraint.

## Testing Strategy

- **Unit tests:** Config manager, grid layout logic (given N terminals, assert correct row distribution), reflow logic
- **Integration tests:** Electron main/renderer IPC communication, pty spawn and data flow
- **Manual testing:** Full app launch, open/close/reflow terminals, settings add/remove repos, maximize/restore
