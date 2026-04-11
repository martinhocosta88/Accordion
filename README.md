# Accordion

A multi-terminal desktop app for managing Claude Code sessions across multiple repositories simultaneously.

Accordion opens a terminal grid where each pane runs Claude Code in a different repo. You can see what Claude is changing in real time, review diffs, and send inline feedback — all without leaving the app.

```
 >>>>>>>   Accordion
```

## Features

**Multi-Terminal Grid** — Open up to 6 terminals in an auto-arranged grid (1-3 per row). Each terminal runs Claude Code automatically on launch.

**Repository Browser** — Side pane lists configured repos with git branch names. Navigate two levels deep into subdirectories to open terminals in specific folders.

**Git Diff Viewer** — Click the delta button on any terminal header to see unstaged changes in a split view. Files are listed with +/- counts and expand to show colored diffs.

**Inline Diff Comments** — Click any changed line in the diff view to leave feedback. Comments are sent directly to the Claude session with file path and line context, so Claude can act on your review.

**Four Color Themes** — Switch between Accordion (signature indigo), Carbon (neutral dark), Midnight (deep navy), and Light from the settings dialog. Themes apply instantly to the full UI and terminal colors.

**Collapsible Side Pane** — Collapse the repository browser to a narrow icon strip to maximize terminal space.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- Git
- Windows (primary target, uses node-pty for native terminal emulation)

### Install and Run

```bash
git clone <repo-url>
cd Accordion
npm install
npm start
```

On first launch, the settings dialog opens automatically. Add one or more repository paths, then click a repo name in the side pane to open a terminal.

### Build

```bash
npm run make
```

Produces a Windows installer via Electron Forge + Squirrel.

## Architecture

```
src/
  main.ts                  # Electron main process, IPC handlers
  preload.ts               # Context bridge (renderer <-> main)
  types.ts                 # Shared TypeScript interfaces
  renderer.tsx             # React entry point

  main/
    config-manager.ts      # Config CRUD (repos, theme)
    pty-manager.ts         # node-pty process lifecycle

  components/
    App.tsx                # Root layout, state orchestration
    SidePane.tsx           # Collapsible repo browser
    RepoItem.tsx           # Expandable repo with subdirs and branch
    TerminalGrid.tsx       # Auto-layout grid with diff mode
    TerminalPanel.tsx      # xterm.js terminal with PTY bridge
    DiffPanel.tsx          # Git diff viewer with inline comments
    SettingsDialog.tsx     # Theme picker + repo management

  hooks/
    useTerminals.ts        # Terminal state management

  lib/
    grid-layout.ts         # Row distribution calculator
    themes.ts              # Four theme definitions + xterm colors
```

**Stack:** Electron 34, React 19, TypeScript, xterm.js, node-pty, Vite, Electron Forge

**IPC boundary:** All system access (filesystem, git, PTY, config) goes through typed IPC handlers in the main process. The renderer has no node integration — everything is exposed via a typed `contextBridge` API.

## Usage

| Action | How |
|--------|-----|
| Open terminal | Click a repo or subdirectory in the side pane |
| Focus terminal | Click anywhere in a terminal |
| Maximize terminal | Click the square button in the terminal header |
| View diff | Click the delta button in the terminal header |
| Comment on diff | Click a +/- line, type feedback, press Enter |
| Change theme | Settings > Theme section |
| Collapse sidebar | Click the arrow in the side pane header |
| Add repos | Settings > + Add Repository |

## Tests

```bash
npm test
```

Runs unit tests for the config manager and grid layout calculator via Vitest.

## License

MIT
