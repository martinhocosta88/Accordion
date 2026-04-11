# Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows desktop app that displays up to 6 terminals in an auto-reflowing grid, with a side pane for browsing configured repo directories.

**Architecture:** Electron main process manages native windows, shell processes (node-pty), and config file I/O. React renderer hosts xterm.js terminal emulators in a responsive grid. Communication flows through Electron IPC with a typed preload bridge.

**Tech Stack:** Electron + Electron Forge (Vite plugin), React 19, TypeScript, xterm.js, node-pty, Vitest

**Prerequisites:** Node.js 20+, npm 10+, Python 3 and Visual Studio Build Tools (for node-pty native compilation on Windows).

---

## File Structure

```
accordion/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── forge.config.ts
├── vite.main.config.ts
├── vite.renderer.config.ts
├── vite.preload.config.ts
├── index.html                    # Renderer HTML entry
├── src/
│   ├── main.ts                   # Electron main process entry
│   ├── preload.ts                # Preload script (contextBridge)
│   ├── renderer.tsx              # React mount point
│   ├── vite-env.d.ts             # Vite/Forge global type declarations
│   ├── types.ts                  # Shared types (config, IPC API, terminal)
│   ├── main/
│   │   ├── config-manager.ts     # Config file CRUD operations
│   │   └── pty-manager.ts        # node-pty process lifecycle
│   ├── lib/
│   │   └── grid-layout.ts        # Pure grid calculation function
│   ├── components/
│   │   ├── App.tsx               # Root layout component
│   │   ├── App.css               # All application styles
│   │   ├── SidePane.tsx          # Side pane with repo list + settings button
│   │   ├── RepoItem.tsx          # Expandable repo tree item
│   │   ├── TerminalGrid.tsx      # Grid layout container
│   │   ├── TerminalPanel.tsx     # Single terminal (xterm.js + header)
│   │   └── SettingsDialog.tsx    # Settings modal overlay
│   └── hooks/
│       └── useTerminals.ts       # Terminal state management hook
├── tests/
│   ├── config-manager.test.ts
│   └── grid-layout.test.ts
├── .gitignore
└── docs/                         # (already exists)
```

**Responsibilities by file:**

| File | Does | Depends on |
|------|------|-----------|
| `types.ts` | Defines `AppConfig`, `SubDirectory`, `ElectronAPI`, declares `window.electronAPI` | Nothing |
| `config-manager.ts` | Read/write/add/remove repos in `%APPDATA%/Accordion/config.json` | `types.ts` |
| `grid-layout.ts` | Given terminal count, returns `{ row1Count, row2Count }` | Nothing |
| `pty-manager.ts` | Spawn/write/resize/kill node-pty processes, push data to renderer | `types.ts` |
| `preload.ts` | Expose typed IPC API on `window.electronAPI` via `contextBridge` | `types.ts` |
| `main.ts` | Create window, register all IPC handlers, app lifecycle | `config-manager.ts`, `pty-manager.ts` |
| `renderer.tsx` | Mount React app into `#root` | `App.tsx` |
| `useTerminals.ts` | Manage terminal state array, add/close/maximize operations | `types.ts` (via `window.electronAPI`) |
| `App.tsx` | Compose SidePane + TerminalGrid + SettingsDialog, load config | All components, `useTerminals.ts` |
| `TerminalGrid.tsx` | Render terminals in grid rows using `computeGridLayout` | `grid-layout.ts`, `TerminalPanel.tsx` |
| `TerminalPanel.tsx` | xterm.js instance + header bar with controls | xterm.js, `window.electronAPI.pty` |
| `SidePane.tsx` | List repos, settings button | `RepoItem.tsx` |
| `RepoItem.tsx` | Expandable repo with 1-level subdirectory listing | `window.electronAPI.fs` |
| `SettingsDialog.tsx` | Modal for add/remove repo paths | `window.electronAPI.config`, `window.electronAPI.dialog` |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `forge.config.ts`
- Create: `vite.main.config.ts`
- Create: `vite.renderer.config.ts`
- Create: `vite.preload.config.ts`
- Create: `index.html`
- Create: `src/vite-env.d.ts`
- Create: `src/main.ts` (placeholder)
- Create: `src/preload.ts` (placeholder)
- Create: `src/renderer.tsx` (placeholder)
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "accordion",
  "productName": "Accordion",
  "version": "1.0.0",
  "description": "Multi-terminal viewer desktop app",
  "main": ".vite/build/main.js",
  "scripts": {
    "start": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "test": "vitest run"
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.6.0",
    "@electron-forge/maker-squirrel": "^7.6.0",
    "@electron-forge/plugin-auto-unpack-natives": "^7.6.0",
    "@electron-forge/plugin-vite": "^7.6.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^34.0.0",
    "typescript": "~5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  },
  "dependencies": {
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/xterm": "^5.5.0",
    "node-pty": "^1.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create `forge.config.ts`**

```ts
import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
```

- [ ] **Step 5: Create Vite config files**

`vite.main.config.ts`:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['node-pty'],
    },
  },
});
```

`vite.renderer.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

`vite.preload.config.ts`:
```ts
import { defineConfig } from 'vite';

export default defineConfig({});
```

- [ ] **Step 6: Create `index.html`**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Accordion</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
```

- [ ] **Step 8: Create placeholder entry files**

`src/main.ts`:
```ts
import { app, BrowserWindow } from 'electron';
import path from 'path';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
```

`src/preload.ts`:
```ts
// Preload script — will be expanded in Task 5
```

`src/renderer.tsx`:
```tsx
const root = document.getElementById('root')!;
root.innerHTML = '<h1 style="color:white;font-family:sans-serif;padding:40px;">Accordion is running.</h1>';
```

- [ ] **Step 9: Create `.gitignore`**

```
node_modules/
dist/
out/
.vite/
.superpowers/
*.log
```

- [ ] **Step 10: Create source directories**

Run:
```bash
mkdir -p src/main src/lib src/components src/hooks tests
```

- [ ] **Step 11: Install dependencies**

Run:
```bash
cd C:/Repos/Accordion && npm install
```

Expected: All packages install, including `node-pty` native compilation. If node-pty fails, install Windows Build Tools: `npm install --global windows-build-tools` or install Visual Studio Build Tools manually.

- [ ] **Step 12: Verify the app launches**

Run:
```bash
cd C:/Repos/Accordion && npm start
```

Expected: An Electron window opens showing "Accordion is running." in white text. Close the window to exit.

- [ ] **Step 13: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts forge.config.ts vite.main.config.ts vite.renderer.config.ts vite.preload.config.ts index.html .gitignore src/main.ts src/preload.ts src/renderer.tsx src/vite-env.d.ts
git commit -m "chore: scaffold Electron Forge project with React, xterm.js, node-pty"
```

---

### Task 2: Shared Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
export interface AppConfig {
  repos: string[];
}

export interface SubDirectory {
  name: string;
  path: string;
}

export interface ElectronAPI {
  config: {
    get(): Promise<AppConfig>;
    addRepo(path: string): Promise<AppConfig>;
    removeRepo(path: string): Promise<AppConfig>;
  };
  dialog: {
    selectDirectory(): Promise<string | null>;
  };
  fs: {
    listSubdirectories(dirPath: string): Promise<SubDirectory[]>;
    directoryExists(dirPath: string): Promise<boolean>;
  };
  pty: {
    create(cwd: string): Promise<string>;
    write(id: string, data: string): void;
    resize(id: string, cols: number, rows: number): void;
    close(id: string): void;
    onData(callback: (id: string, data: string) => void): () => void;
    onExit(callback: (id: string) => void): () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared type definitions for config, IPC API, and terminals"
```

---

### Task 3: Config Manager (TDD)

**Files:**
- Create: `tests/config-manager.test.ts`
- Create: `src/main/config-manager.ts`

- [ ] **Step 1: Write failing tests**

`tests/config-manager.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readConfig, writeConfig, addRepo, removeRepo } from '../src/main/config-manager';

describe('config-manager', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'accordion-test-'));
    configPath = path.join(tempDir, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('readConfig', () => {
    it('returns default config when file does not exist', () => {
      const config = readConfig(configPath);
      expect(config).toEqual({ repos: [] });
    });

    it('creates config file when it does not exist', () => {
      readConfig(configPath);
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('reads existing config file', () => {
      const expected = { repos: ['C:\\Repos\\test'] };
      fs.writeFileSync(configPath, JSON.stringify(expected));
      const config = readConfig(configPath);
      expect(config).toEqual(expected);
    });

    it('returns default config when file is corrupted JSON', () => {
      fs.writeFileSync(configPath, 'not json');
      const config = readConfig(configPath);
      expect(config).toEqual({ repos: [] });
    });

    it('returns default config when repos is not an array', () => {
      fs.writeFileSync(configPath, JSON.stringify({ repos: 'bad' }));
      const config = readConfig(configPath);
      expect(config).toEqual({ repos: [] });
    });
  });

  describe('writeConfig', () => {
    it('writes config to file', () => {
      const config = { repos: ['C:\\Repos\\test'] };
      writeConfig(configPath, config);
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(data).toEqual(config);
    });

    it('creates parent directories if they do not exist', () => {
      const nestedPath = path.join(tempDir, 'a', 'b', 'config.json');
      writeConfig(nestedPath, { repos: [] });
      expect(fs.existsSync(nestedPath)).toBe(true);
    });
  });

  describe('addRepo', () => {
    it('adds a new repo path', () => {
      const config = addRepo(configPath, 'C:\\Repos\\new');
      expect(config.repos).toEqual(['C:\\Repos\\new']);
    });

    it('does not add a duplicate repo path', () => {
      addRepo(configPath, 'C:\\Repos\\new');
      const config = addRepo(configPath, 'C:\\Repos\\new');
      expect(config.repos).toEqual(['C:\\Repos\\new']);
    });

    it('preserves existing repos when adding', () => {
      addRepo(configPath, 'C:\\Repos\\a');
      const config = addRepo(configPath, 'C:\\Repos\\b');
      expect(config.repos).toEqual(['C:\\Repos\\a', 'C:\\Repos\\b']);
    });
  });

  describe('removeRepo', () => {
    it('removes a repo path', () => {
      addRepo(configPath, 'C:\\Repos\\a');
      addRepo(configPath, 'C:\\Repos\\b');
      const config = removeRepo(configPath, 'C:\\Repos\\a');
      expect(config.repos).toEqual(['C:\\Repos\\b']);
    });

    it('handles removing a path that does not exist', () => {
      const config = removeRepo(configPath, 'C:\\Repos\\nonexistent');
      expect(config).toEqual({ repos: [] });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd C:/Repos/Accordion && npx vitest run tests/config-manager.test.ts
```

Expected: FAIL — cannot find module `../src/main/config-manager`.

- [ ] **Step 3: Implement `src/main/config-manager.ts`**

```ts
import * as fs from 'fs';
import * as path from 'path';
import type { AppConfig } from '../types';

const DEFAULT_CONFIG: AppConfig = { repos: [] };

export function readConfig(configPath: string): AppConfig {
  try {
    if (!fs.existsSync(configPath)) {
      writeConfig(configPath, DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }
    const data = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(data) as AppConfig;
    if (!Array.isArray(config.repos)) {
      writeConfig(configPath, DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }
    return config;
  } catch {
    writeConfig(configPath, DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(configPath: string, config: AppConfig): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function addRepo(configPath: string, repoPath: string): AppConfig {
  const config = readConfig(configPath);
  if (!config.repos.includes(repoPath)) {
    config.repos.push(repoPath);
    writeConfig(configPath, config);
  }
  return config;
}

export function removeRepo(configPath: string, repoPath: string): AppConfig {
  const config = readConfig(configPath);
  config.repos = config.repos.filter((r) => r !== repoPath);
  writeConfig(configPath, config);
  return config;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd C:/Repos/Accordion && npx vitest run tests/config-manager.test.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/config-manager.ts tests/config-manager.test.ts
git commit -m "feat: add config manager with read/write/add/remove repo operations"
```

---

### Task 4: Grid Layout Logic (TDD)

**Files:**
- Create: `tests/grid-layout.test.ts`
- Create: `src/lib/grid-layout.ts`

- [ ] **Step 1: Write failing tests**

`tests/grid-layout.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeGridLayout } from '../src/lib/grid-layout';

describe('computeGridLayout', () => {
  it('returns empty layout for 0 terminals', () => {
    expect(computeGridLayout(0)).toEqual({ row1Count: 0, row2Count: 0 });
  });

  it('returns 1 in row 1 for 1 terminal', () => {
    expect(computeGridLayout(1)).toEqual({ row1Count: 1, row2Count: 0 });
  });

  it('returns 2 in row 1 for 2 terminals', () => {
    expect(computeGridLayout(2)).toEqual({ row1Count: 2, row2Count: 0 });
  });

  it('returns 3 in row 1 for 3 terminals', () => {
    expect(computeGridLayout(3)).toEqual({ row1Count: 3, row2Count: 0 });
  });

  it('returns 2+2 for 4 terminals', () => {
    expect(computeGridLayout(4)).toEqual({ row1Count: 2, row2Count: 2 });
  });

  it('returns 3+2 for 5 terminals', () => {
    expect(computeGridLayout(5)).toEqual({ row1Count: 3, row2Count: 2 });
  });

  it('returns 3+3 for 6 terminals', () => {
    expect(computeGridLayout(6)).toEqual({ row1Count: 3, row2Count: 3 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd C:/Repos/Accordion && npx vitest run tests/grid-layout.test.ts
```

Expected: FAIL — cannot find module `../src/lib/grid-layout`.

- [ ] **Step 3: Implement `src/lib/grid-layout.ts`**

```ts
export interface GridConfig {
  row1Count: number;
  row2Count: number;
}

export function computeGridLayout(terminalCount: number): GridConfig {
  if (terminalCount <= 0) return { row1Count: 0, row2Count: 0 };
  if (terminalCount <= 3) return { row1Count: terminalCount, row2Count: 0 };
  if (terminalCount === 4) return { row1Count: 2, row2Count: 2 };
  if (terminalCount === 5) return { row1Count: 3, row2Count: 2 };
  return { row1Count: 3, row2Count: 3 };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd C:/Repos/Accordion && npx vitest run tests/grid-layout.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/grid-layout.ts tests/grid-layout.test.ts
git commit -m "feat: add grid layout calculator for terminal row distribution"
```

---

### Task 5: Main Process, Preload & PTY Manager

**Files:**
- Create: `src/main/pty-manager.ts`
- Modify: `src/preload.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create `src/main/pty-manager.ts`**

```ts
import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';

const processes = new Map<string, pty.IPty>();
let nextId = 1;

export function createPty(cwd: string, window: BrowserWindow): string {
  const shell = process.env.COMSPEC || 'cmd.exe';
  const id = `terminal-${nextId++}`;

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cwd,
    env: process.env as Record<string, string>,
  });

  ptyProcess.onData((data) => {
    if (!window.isDestroyed()) {
      window.webContents.send('pty:data', id, data);
    }
  });

  ptyProcess.onExit(() => {
    processes.delete(id);
    if (!window.isDestroyed()) {
      window.webContents.send('pty:exit', id);
    }
  });

  processes.set(id, ptyProcess);
  return id;
}

export function writePty(id: string, data: string): void {
  processes.get(id)?.write(data);
}

export function resizePty(id: string, cols: number, rows: number): void {
  try {
    processes.get(id)?.resize(cols, rows);
  } catch {
    // Ignore resize errors on dead processes
  }
}

export function closePty(id: string): void {
  const p = processes.get(id);
  if (p) {
    p.kill();
    processes.delete(id);
  }
}

export function closeAllPtys(): void {
  for (const [id] of processes) {
    closePty(id);
  }
}
```

- [ ] **Step 2: Write `src/preload.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './types';

const api: ElectronAPI = {
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    addRepo: (path: string) => ipcRenderer.invoke('config:add-repo', path),
    removeRepo: (path: string) => ipcRenderer.invoke('config:remove-repo', path),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  },
  fs: {
    listSubdirectories: (dirPath: string) =>
      ipcRenderer.invoke('fs:list-subdirectories', dirPath),
    directoryExists: (dirPath: string) =>
      ipcRenderer.invoke('fs:directory-exists', dirPath),
  },
  pty: {
    create: (cwd: string) => ipcRenderer.invoke('pty:create', cwd),
    write: (id: string, data: string) => ipcRenderer.send('pty:write', id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.send('pty:resize', id, cols, rows),
    close: (id: string) => ipcRenderer.send('pty:close', id),
    onData: (callback: (id: string, data: string) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        id: string,
        data: string
      ) => callback(id, data);
      ipcRenderer.on('pty:data', handler);
      return () => {
        ipcRenderer.removeListener('pty:data', handler);
      };
    },
    onExit: (callback: (id: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string) =>
        callback(id);
      ipcRenderer.on('pty:exit', handler);
      return () => {
        ipcRenderer.removeListener('pty:exit', handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
```

- [ ] **Step 3: Write `src/main.ts` with all IPC handlers**

```ts
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { readConfig, addRepo, removeRepo } from './main/config-manager';
import {
  createPty,
  writePty,
  resizePty,
  closePty,
  closeAllPtys,
} from './main/pty-manager';

const CONFIG_PATH = path.join(
  app.getPath('appData'),
  'Accordion',
  'config.json'
);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Accordion',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
}

// Config IPC handlers
ipcMain.handle('config:get', () => readConfig(CONFIG_PATH));
ipcMain.handle('config:add-repo', (_event, repoPath: string) =>
  addRepo(CONFIG_PATH, repoPath)
);
ipcMain.handle('config:remove-repo', (_event, repoPath: string) =>
  removeRepo(CONFIG_PATH, repoPath)
);

// Dialog IPC handler
ipcMain.handle('dialog:select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Filesystem IPC handlers
ipcMain.handle('fs:list-subdirectories', async (_event, dirPath: string) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => ({ name: e.name, path: path.join(dirPath, e.name) }));
  } catch {
    return [];
  }
});

ipcMain.handle('fs:directory-exists', async (_event, dirPath: string) => {
  try {
    const stat = await fs.promises.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
});

// PTY IPC handlers
ipcMain.handle('pty:create', (_event, cwd: string) => {
  if (!mainWindow) throw new Error('No window available');
  return createPty(cwd, mainWindow);
});

ipcMain.on('pty:write', (_event, id: string, data: string) =>
  writePty(id, data)
);
ipcMain.on('pty:resize', (_event, id: string, cols: number, rows: number) =>
  resizePty(id, cols, rows)
);
ipcMain.on('pty:close', (_event, id: string) => closePty(id));

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  closeAllPtys();
  app.quit();
});
```

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/preload.ts src/main/pty-manager.ts
git commit -m "feat: add main process with IPC handlers, preload bridge, and PTY manager"
```

---

### Task 6: React App Shell & Styles

**Files:**
- Modify: `src/renderer.tsx`
- Create: `src/components/App.tsx`
- Create: `src/components/App.css`

- [ ] **Step 1: Write `src/renderer.tsx`**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './components/App.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Write `src/components/App.tsx` (placeholder layout)**

```tsx
import React from 'react';

export default function App() {
  return (
    <div className="app">
      <div className="side-pane">
        <div className="side-pane-header">Repositories</div>
        <div className="side-pane-list">
          <div className="side-pane-empty">
            No repositories configured. Click Settings to add one.
          </div>
        </div>
        <button className="side-pane-settings">⚙ Settings</button>
      </div>
      <div className="terminal-grid empty">
        <p>Select a repository from the side pane to open a terminal.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/App.css`**

```css
/* Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#root {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #1a1a2e;
  color: #e0e0f0;
}

/* === App Layout === */
.app {
  display: flex;
  height: 100vh;
}

/* === Side Pane === */
.side-pane {
  width: 220px;
  background: #16162a;
  border-right: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.side-pane-header {
  padding: 12px 16px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #8888cc;
}

.side-pane-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.side-pane-empty {
  padding: 16px 8px;
  color: #666;
  font-size: 13px;
  text-align: center;
}

.side-pane-settings {
  padding: 10px;
  margin: 8px;
  background: #1e1e3a;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  color: #8888cc;
  font-size: 13px;
  cursor: pointer;
  text-align: center;
  transition: background 0.2s;
}

.side-pane-settings:hover {
  background: #2a2a50;
}

/* === Repo Item === */
.repo-item-container {
  margin-bottom: 2px;
}

.repo-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: #1e1e3a;
  border-radius: 8px;
  font-size: 13px;
  color: #c0c0e0;
}

.repo-item-active {
  border-left: 3px solid #7c9cff;
}

.repo-item-disabled {
  opacity: 0.5;
}

.repo-item-missing {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: #1e1e3a;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
}

.repo-toggle {
  background: none;
  border: none;
  color: #6c6caa;
  cursor: pointer;
  font-size: 10px;
  padding: 2px;
  width: 16px;
  text-align: center;
}

.repo-icon {
  font-size: 14px;
}

.repo-name {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  padding: 0;
  flex: 1;
  font-family: inherit;
}

.repo-name:hover:not(:disabled) {
  color: #7c9cff;
}

.repo-name:disabled {
  cursor: not-allowed;
}

.repo-warning {
  color: #ffcc33;
  font-size: 12px;
}

.repo-subdirs {
  padding: 4px 0 4px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.repo-subdir {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: #2a2a50;
  border: none;
  border-radius: 6px;
  color: #a0a0d0;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.2s;
}

.repo-subdir:hover:not(:disabled) {
  background: #3a3a60;
  color: #c0c0f0;
}

.repo-subdir-active {
  border-left: 2px solid #7c9cff;
}

.repo-subdir:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* === Terminal Grid === */
.terminal-grid {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.terminal-grid.empty {
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 15px;
}

.grid-row {
  flex: 1;
  display: flex;
  gap: 8px;
  min-height: 0;
}

/* === Terminal Panel === */
.terminal-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0d0d1a;
  border-radius: 10px;
  border: 1px solid #2a2a4a;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #1a1a30;
  border-bottom: 1px solid #2a2a4a;
  flex-shrink: 0;
}

.terminal-label {
  color: #7c9cff;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.terminal-controls {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.terminal-btn {
  background: none;
  border: none;
  color: #555;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}

.terminal-btn:hover {
  color: #aaa;
  background: #2a2a4a;
}

.terminal-btn-close:hover {
  color: #ff5555;
  background: #3a1a1a;
}

.terminal-body {
  flex: 1;
  padding: 4px;
  min-height: 0;
  overflow: hidden;
}

.terminal-body .xterm {
  height: 100%;
}

.terminal-error {
  padding: 16px;
  color: #ff5555;
  font-size: 13px;
}

/* === Settings Dialog === */
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.settings-dialog {
  background: #1e1e3a;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a4a;
}

.settings-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #e0e0f0;
}

.settings-close {
  background: none;
  border: none;
  color: #666;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.settings-close:hover {
  color: #aaa;
  background: #2a2a4a;
}

.settings-body {
  padding: 20px;
  overflow-y: auto;
}

.settings-body h3 {
  font-size: 14px;
  color: #8888cc;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.settings-repos {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.settings-empty {
  color: #666;
  font-size: 13px;
  padding: 12px 0;
}

.settings-repo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #16162a;
  border-radius: 8px;
  border: 1px solid #2a2a4a;
}

.settings-repo-path {
  font-size: 13px;
  color: #c0c0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 12px;
}

.settings-repo-remove {
  background: none;
  border: 1px solid #3a2a2a;
  color: #ff5555;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.settings-repo-remove:hover {
  background: #3a1a1a;
}

.settings-add-btn {
  width: 100%;
  padding: 10px;
  background: #2a2a50;
  border: 1px dashed #4a4a7a;
  border-radius: 8px;
  color: #7c9cff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.settings-add-btn:hover {
  background: #3a3a60;
}

/* === Scrollbar === */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #2a2a4a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3a3a5a;
}
```

- [ ] **Step 4: Verify the app renders the shell layout**

Run:
```bash
cd C:/Repos/Accordion && npm start
```

Expected: Electron window opens showing the dark side pane on the left with "Repositories" header, "No repositories configured" message, and Settings button. The right area shows "Select a repository from the side pane to open a terminal." Close the window.

- [ ] **Step 5: Commit**

```bash
git add src/renderer.tsx src/components/App.tsx src/components/App.css
git commit -m "feat: add React app shell with dark theme and layout structure"
```

---

### Task 7: Terminal Panel Component

**Files:**
- Create: `src/components/TerminalPanel.tsx`

- [ ] **Step 1: Write `src/components/TerminalPanel.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  ptyId: string;
  label: string;
  isMaximized: boolean;
  onClose: () => void;
  onToggleMaximize: () => void;
}

export function TerminalPanel({
  ptyId,
  label,
  isMaximized,
  onClose,
  onToggleMaximize,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Initialize xterm.js and connect to pty
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      scrollback: 1000,
      fontFamily: "'Cascadia Code', 'Consolas', monospace",
      fontSize: 14,
      theme: {
        background: '#0d0d1a',
        foreground: '#e0e0f0',
        cursor: '#7c9cff',
        selectionBackground: '#3a3a6a',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Fit after a brief delay to let the container size settle
    requestAnimationFrame(() => {
      fitAddon.fit();
      window.electronAPI.pty.resize(ptyId, terminal.cols, terminal.rows);
    });

    // Send keystrokes to pty
    const dataDisposable = terminal.onData((data) => {
      window.electronAPI.pty.write(ptyId, data);
    });

    // Receive pty output
    const unsubData = window.electronAPI.pty.onData((id, data) => {
      if (id === ptyId) {
        terminal.write(data);
      }
    });

    return () => {
      dataDisposable.dispose();
      unsubData();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [ptyId]);

  // Re-fit on maximize/restore and window resize
  useEffect(() => {
    const refit = () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit();
        window.electronAPI.pty.resize(
          ptyId,
          terminalRef.current.cols,
          terminalRef.current.rows
        );
      }
    };

    // Delay to let CSS layout update after maximize/restore
    const timeout = setTimeout(refit, 50);
    window.addEventListener('resize', refit);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', refit);
    };
  }, [ptyId, isMaximized]);

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <span className="terminal-label">{label}</span>
        <div className="terminal-controls">
          <button
            className="terminal-btn"
            onClick={onToggleMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? '\u29C9' : '\u25A1'}
          </button>
          <button
            className="terminal-btn terminal-btn-close"
            onClick={onClose}
            title="Close"
          >
            \u2715
          </button>
        </div>
      </div>
      <div className="terminal-body" ref={containerRef} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TerminalPanel.tsx
git commit -m "feat: add TerminalPanel component with xterm.js integration"
```

---

### Task 8: Terminal Grid & State Management

**Files:**
- Create: `src/hooks/useTerminals.ts`
- Create: `src/components/TerminalGrid.tsx`

- [ ] **Step 1: Write `src/hooks/useTerminals.ts`**

```ts
import { useState, useEffect, useCallback, useRef } from 'react';

export interface TerminalState {
  id: string;
  ptyId: string;
  cwd: string;
  label: string;
  createdAt: number;
}

const MAX_TERMINALS = 6;

export function useTerminals() {
  const [terminals, setTerminals] = useState<TerminalState[]>([]);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const nextIdRef = useRef(1);

  // Listen for pty exit events (shell process died)
  useEffect(() => {
    const unsubExit = window.electronAPI.pty.onExit((ptyId) => {
      setTerminals((prev) => {
        const terminal = prev.find((t) => t.ptyId === ptyId);
        if (terminal) {
          setMaximizedId((maxId) =>
            maxId === terminal.id ? null : maxId
          );
        }
        return prev.filter((t) => t.ptyId !== ptyId);
      });
    });
    return unsubExit;
  }, []);

  const addTerminal = useCallback(
    async (cwd: string, label: string) => {
      const ptyId = await window.electronAPI.pty.create(cwd);
      const id = `term-${nextIdRef.current++}`;
      setTerminals((prev) => {
        if (prev.length >= MAX_TERMINALS) {
          window.electronAPI.pty.close(ptyId);
          return prev;
        }
        return [...prev, { id, ptyId, cwd, label, createdAt: Date.now() }];
      });
    },
    []
  );

  const closeTerminal = useCallback((id: string) => {
    setTerminals((prev) => {
      const terminal = prev.find((t) => t.id === id);
      if (terminal) {
        window.electronAPI.pty.close(terminal.ptyId);
        setMaximizedId((maxId) => (maxId === id ? null : maxId));
        return prev.filter((t) => t.id !== id);
      }
      return prev;
    });
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setMaximizedId((prev) => (prev === id ? null : id));
  }, []);

  return {
    terminals,
    maximizedId,
    addTerminal,
    closeTerminal,
    toggleMaximize,
    canAdd: terminals.length < MAX_TERMINALS,
  };
}
```

- [ ] **Step 2: Write `src/components/TerminalGrid.tsx`**

```tsx
import React from 'react';
import { TerminalPanel } from './TerminalPanel';
import { computeGridLayout } from '../lib/grid-layout';
import type { TerminalState } from '../hooks/useTerminals';

interface TerminalGridProps {
  terminals: TerminalState[];
  maximizedId: string | null;
  onClose: (id: string) => void;
  onToggleMaximize: (id: string) => void;
}

export function TerminalGrid({
  terminals,
  maximizedId,
  onClose,
  onToggleMaximize,
}: TerminalGridProps) {
  if (terminals.length === 0) {
    return (
      <div className="terminal-grid empty">
        <p>Select a repository from the side pane to open a terminal.</p>
      </div>
    );
  }

  // Maximized mode: show only the maximized terminal
  if (maximizedId) {
    const terminal = terminals.find((t) => t.id === maximizedId);
    if (terminal) {
      return (
        <div className="terminal-grid">
          <div className="grid-row">
            <TerminalPanel
              key={terminal.id}
              ptyId={terminal.ptyId}
              label={terminal.label}
              isMaximized={true}
              onClose={() => onClose(terminal.id)}
              onToggleMaximize={() => onToggleMaximize(terminal.id)}
            />
          </div>
        </div>
      );
    }
  }

  // Normal grid mode
  const layout = computeGridLayout(terminals.length);
  const row1 = terminals.slice(0, layout.row1Count);
  const row2 = terminals.slice(layout.row1Count, layout.row1Count + layout.row2Count);

  return (
    <div className="terminal-grid">
      <div className="grid-row">
        {row1.map((t) => (
          <TerminalPanel
            key={t.id}
            ptyId={t.ptyId}
            label={t.label}
            isMaximized={false}
            onClose={() => onClose(t.id)}
            onToggleMaximize={() => onToggleMaximize(t.id)}
          />
        ))}
      </div>
      {row2.length > 0 && (
        <div className="grid-row">
          {row2.map((t) => (
            <TerminalPanel
              key={t.id}
              ptyId={t.ptyId}
              label={t.label}
              isMaximized={false}
              onClose={() => onClose(t.id)}
              onToggleMaximize={() => onToggleMaximize(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTerminals.ts src/components/TerminalGrid.tsx
git commit -m "feat: add terminal grid component and state management hook"
```

---

### Task 9: Side Pane Component

**Files:**
- Create: `src/components/RepoItem.tsx`
- Create: `src/components/SidePane.tsx`

- [ ] **Step 1: Write `src/components/RepoItem.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import type { SubDirectory } from '../types';

interface RepoItemProps {
  repoPath: string;
  onOpenTerminal: (cwd: string, label: string) => void;
  disabled: boolean;
  activeTerminalPaths: string[];
}

export function RepoItem({
  repoPath,
  onOpenTerminal,
  disabled,
  activeTerminalPaths,
}: RepoItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [subdirs, setSubdirs] = useState<SubDirectory[]>([]);
  const [exists, setExists] = useState(true);

  const repoName = repoPath.split(/[\\/]/).pop() || repoPath;
  const isActive = activeTerminalPaths.includes(repoPath);

  useEffect(() => {
    window.electronAPI.fs.directoryExists(repoPath).then(setExists);
  }, [repoPath]);

  const handleToggle = async () => {
    if (!expanded) {
      const dirs = await window.electronAPI.fs.listSubdirectories(repoPath);
      setSubdirs(dirs);
    }
    setExpanded(!expanded);
  };

  const handleClick = () => {
    if (!disabled && exists) {
      onOpenTerminal(repoPath, repoName);
    }
  };

  const handleSubdirClick = (sub: SubDirectory) => {
    if (!disabled) {
      onOpenTerminal(sub.path, `${repoName} / ${sub.name}`);
    }
  };

  if (!exists) {
    return (
      <div className="repo-item repo-item-missing" title="Directory not found">
        <span className="repo-toggle">{'\u25B6'}</span>
        <span className="repo-icon">{'\uD83D\uDCC1'}</span>
        <span className="repo-name">{repoName}</span>
        <span className="repo-warning">{'\u26A0'}</span>
      </div>
    );
  }

  return (
    <div className="repo-item-container">
      <div
        className={`repo-item${isActive ? ' repo-item-active' : ''}${disabled ? ' repo-item-disabled' : ''}`}
      >
        <button className="repo-toggle" onClick={handleToggle}>
          {expanded ? '\u25BC' : '\u25B6'}
        </button>
        <span className="repo-icon">{'\uD83D\uDCC1'}</span>
        <button
          className="repo-name"
          onClick={handleClick}
          disabled={disabled}
        >
          {repoName}
        </button>
      </div>
      {expanded && subdirs.length > 0 && (
        <div className="repo-subdirs">
          {subdirs.map((sub) => {
            const subIsActive = activeTerminalPaths.includes(sub.path);
            return (
              <button
                key={sub.path}
                className={`repo-subdir${subIsActive ? ' repo-subdir-active' : ''}`}
                onClick={() => handleSubdirClick(sub)}
                disabled={disabled}
              >
                <span className="repo-icon">{'\uD83D\uDCC2'}</span>
                {sub.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/SidePane.tsx`**

```tsx
import React from 'react';
import { RepoItem } from './RepoItem';
import type { AppConfig } from '../types';

interface SidePaneProps {
  config: AppConfig;
  onOpenTerminal: (cwd: string, label: string) => void;
  onOpenSettings: () => void;
  canAddTerminal: boolean;
  activeTerminalPaths: string[];
}

export function SidePane({
  config,
  onOpenTerminal,
  onOpenSettings,
  canAddTerminal,
  activeTerminalPaths,
}: SidePaneProps) {
  return (
    <div className="side-pane">
      <div className="side-pane-header">Repositories</div>
      <div className="side-pane-list">
        {config.repos.length === 0 ? (
          <div className="side-pane-empty">
            No repositories configured. Click Settings to add one.
          </div>
        ) : (
          config.repos.map((repoPath) => (
            <RepoItem
              key={repoPath}
              repoPath={repoPath}
              onOpenTerminal={onOpenTerminal}
              disabled={!canAddTerminal}
              activeTerminalPaths={activeTerminalPaths}
            />
          ))
        )}
      </div>
      <button className="side-pane-settings" onClick={onOpenSettings}>
        {'\u2699'} Settings
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RepoItem.tsx src/components/SidePane.tsx
git commit -m "feat: add side pane with expandable repo tree items"
```

---

### Task 10: Settings Dialog

**Files:**
- Create: `src/components/SettingsDialog.tsx`

- [ ] **Step 1: Write `src/components/SettingsDialog.tsx`**

```tsx
import React from 'react';
import type { AppConfig } from '../types';

interface SettingsDialogProps {
  config: AppConfig;
  onClose: () => void;
  onConfigChange: (config: AppConfig) => void;
}

export function SettingsDialog({
  config,
  onClose,
  onConfigChange,
}: SettingsDialogProps) {
  const handleAdd = async () => {
    const selectedPath = await window.electronAPI.dialog.selectDirectory();
    if (selectedPath) {
      const newConfig = await window.electronAPI.config.addRepo(selectedPath);
      onConfigChange(newConfig);
    }
  };

  const handleRemove = async (repoPath: string) => {
    const newConfig = await window.electronAPI.config.removeRepo(repoPath);
    onConfigChange(newConfig);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            {'\u2715'}
          </button>
        </div>
        <div className="settings-body">
          <h3>Repository Paths</h3>
          <div className="settings-repos">
            {config.repos.length === 0 ? (
              <p className="settings-empty">No repositories added yet.</p>
            ) : (
              config.repos.map((repo) => (
                <div key={repo} className="settings-repo-item">
                  <span className="settings-repo-path">{repo}</span>
                  <button
                    className="settings-repo-remove"
                    onClick={() => handleRemove(repo)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
          <button className="settings-add-btn" onClick={handleAdd}>
            + Add Repository
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SettingsDialog.tsx
git commit -m "feat: add settings dialog for managing repository paths"
```

---

### Task 11: Integration — Wire Everything Together

**Files:**
- Modify: `src/components/App.tsx`

- [ ] **Step 1: Update `src/components/App.tsx` with full wiring**

Replace the entire file:

```tsx
import React, { useState, useEffect } from 'react';
import { SidePane } from './SidePane';
import { TerminalGrid } from './TerminalGrid';
import { SettingsDialog } from './SettingsDialog';
import { useTerminals } from '../hooks/useTerminals';
import type { AppConfig } from '../types';

export default function App() {
  const [config, setConfig] = useState<AppConfig>({ repos: [] });
  const [showSettings, setShowSettings] = useState(false);
  const {
    terminals,
    maximizedId,
    addTerminal,
    closeTerminal,
    toggleMaximize,
    canAdd,
  } = useTerminals();

  // Load config on mount; auto-open settings if no repos configured
  useEffect(() => {
    window.electronAPI.config.get().then((cfg) => {
      setConfig(cfg);
      if (cfg.repos.length === 0) {
        setShowSettings(true);
      }
    });
  }, []);

  const handleOpenTerminal = async (cwd: string, label: string) => {
    await addTerminal(cwd, label);
  };

  const handleConfigChange = (newConfig: AppConfig) => {
    setConfig(newConfig);
  };

  return (
    <div className="app">
      <SidePane
        config={config}
        onOpenTerminal={handleOpenTerminal}
        onOpenSettings={() => setShowSettings(true)}
        canAddTerminal={canAdd}
        activeTerminalPaths={terminals.map((t) => t.cwd)}
      />
      <TerminalGrid
        terminals={terminals}
        maximizedId={maximizedId}
        onClose={closeTerminal}
        onToggleMaximize={toggleMaximize}
      />
      {showSettings && (
        <SettingsDialog
          config={config}
          onClose={() => setShowSettings(false)}
          onConfigChange={handleConfigChange}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run all unit tests**

Run:
```bash
cd C:/Repos/Accordion && npm test
```

Expected: All tests pass (config-manager: 9 tests, grid-layout: 7 tests).

- [ ] **Step 3: Launch the app and verify basic functionality**

Run:
```bash
cd C:/Repos/Accordion && npm start
```

Manual verification:
1. App launches with settings dialog auto-open (no repos yet)
2. Click "Add Repository", select a folder, it appears in the list
3. Close settings — the repo appears in the side pane
4. Click the repo name — a terminal opens in the grid with a live shell
5. Type a command (e.g., `dir`) and verify output appears
6. Close the terminal with the X button

- [ ] **Step 4: Commit**

```bash
git add src/components/App.tsx
git commit -m "feat: wire all components together with config loading and first-launch flow"
```

---

### Task 12: Full Manual Testing

No files to change. This task verifies the complete feature set.

- [ ] **Step 1: Test terminal grid progression**

1. Open the app with at least one repo configured
2. Click the repo to open terminal 1 → single full-width terminal
3. Open terminal 2 → 2 side by side
4. Open terminal 3 → 3 side by side
5. Open terminal 4 → 2x2 grid
6. Open terminal 5 → 3 top, 2 bottom
7. Open terminal 6 → 3x3 grid
8. Verify side pane items are greyed out (max reached)

- [ ] **Step 2: Test reflow on close**

1. With 5 terminals open (3+2), close terminal 2
2. Verify grid reflows to 4 terminals (2+2)
3. Side pane should re-enable clicking

- [ ] **Step 3: Test maximize/restore**

1. Click maximize on one terminal → it fills the entire grid area
2. Other terminals are hidden but still running
3. Click restore → returns to grid view
4. Close a maximized terminal → grid shows remaining terminals

- [ ] **Step 4: Test side pane subdirectories**

1. Click the expand arrow on a repo → shows 1 level of subdirectories
2. Click a subdirectory → opens a terminal with label "repo / subfolder"
3. Collapse the repo → subdirectories hide

- [ ] **Step 5: Test settings**

1. Open settings → see list of repos
2. Click "Add Repository" → native folder picker opens
3. Add a new repo → appears in list and side pane immediately
4. Remove a repo → disappears from list and side pane
5. Close settings by clicking outside the dialog

- [ ] **Step 6: Test error states**

1. Add a repo path, then rename/delete that folder on disk
2. Relaunch app → the missing repo shows greyed out with warning icon
3. Delete `%APPDATA%/Accordion/config.json` and relaunch → settings dialog opens automatically

- [ ] **Step 7: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: polish from manual testing"
```
