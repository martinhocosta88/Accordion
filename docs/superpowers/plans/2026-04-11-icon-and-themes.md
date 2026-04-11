# App Icon & Color Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fading-chevrons app icon and a four-theme color system (Accordion, Carbon, Midnight, Light) selectable from settings.

**Architecture:** Extract all hardcoded colors in App.css to CSS custom properties with Accordion theme as `:root` default. Theme overrides via `[data-theme]` attribute selectors. A `themes.ts` module exports theme metadata and xterm color objects. Config gains a `theme` field persisted to disk. Settings dialog gets a theme picker.

**Tech Stack:** CSS custom properties, TypeScript, React, Electron IPC, SVG

---

### Task 1: Create App Icon

**Files:**
- Create: `assets/icon.svg`
- Create: `assets/icon.ico` (generated)
- Modify: `forge.config.ts`
- Modify: `src/main.ts:22-35`

- [ ] **Step 1: Create the SVG icon**

Create `assets/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="#1a1a2e"/>
  <text font-family="Consolas, 'Courier New', monospace" font-weight="bold" fill="#7c9cff" text-anchor="middle" x="128" y="155" font-size="72">
    <tspan opacity="0.3">&gt;</tspan><tspan opacity="0.45">&gt;</tspan><tspan opacity="0.6">&gt;</tspan><tspan opacity="0.8">&gt;</tspan><tspan>&gt;</tspan>
  </text>
</svg>
```

- [ ] **Step 2: Generate ICO file**

Run:
```bash
npx png-to-ico is not available, so we'll use electron-icon-builder or a manual approach.
```

Actually, Electron Forge on Windows uses .ico files. We can use the `sharp` library or an online tool. For the plan, install `sharp` as a dev dependency and run a script:

```bash
npm install --save-dev sharp
```

Then create a temporary script `scripts/generate-icon.js`:

```javascript
const sharp = require('sharp');
const path = require('path');

async function generateIcon() {
  const svgPath = path.join(__dirname, '..', 'assets', 'icon.svg');
  const pngPath = path.join(__dirname, '..', 'assets', 'icon.png');

  await sharp(svgPath)
    .resize(256, 256)
    .png()
    .toFile(pngPath);

  console.log('Generated icon.png at', pngPath);
}

generateIcon().catch(console.error);
```

Run: `node scripts/generate-icon.js`

Then use `png-to-ico` or the electron-forge maker to handle .ico conversion. For simplicity, generate a 256x256 PNG — Electron on Windows can use PNG directly.

- [ ] **Step 3: Configure forge.config.ts to use the icon**

In `forge.config.ts`, change `packagerConfig`:

```typescript
packagerConfig: {
  asar: true,
  icon: './assets/icon',
},
```

- [ ] **Step 4: Add icon to BrowserWindow**

In `src/main.ts`, add icon to createWindow:

```typescript
import * as path from 'path';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Accordion',
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
```

- [ ] **Step 5: Commit**

```bash
git add assets/ forge.config.ts src/main.ts scripts/generate-icon.js
git commit -m "feat: add fading-chevrons app icon"
```

---

### Task 2: Theme Definitions Module

**Files:**
- Create: `src/lib/themes.ts`

- [ ] **Step 1: Create themes.ts with all four theme definitions**

Create `src/lib/themes.ts`:

```typescript
export type ThemeName = 'accordion' | 'carbon' | 'midnight' | 'light';

export interface ThemeColors {
  bgMain: string;
  bgSide: string;
  bgTerminal: string;
  bgPanel: string;
  bgHeader: string;
  bgHeaderFocused: string;
  border: string;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textHeader: string;
  btnHover: string;
  error: string;
  warning: string;
  selection: string;
}

export interface ThemeDefinition {
  name: ThemeName;
  label: string;
  colors: ThemeColors;
}

const accordion: ThemeDefinition = {
  name: 'accordion',
  label: 'Accordion',
  colors: {
    bgMain: '#1a1a2e',
    bgSide: '#16162a',
    bgTerminal: '#0d0d1a',
    bgPanel: '#1e1e3a',
    bgHeader: '#1a1a30',
    bgHeaderFocused: '#252550',
    border: '#2a2a4a',
    accent: '#7c9cff',
    accentSoft: '#9ab0ff',
    textPrimary: '#e0e0f0',
    textSecondary: '#c0c0e0',
    textTertiary: '#a0a0d0',
    textHeader: '#8888cc',
    btnHover: '#2a2a50',
    error: '#ff5555',
    warning: '#ffcc33',
    selection: '#3a3a6a',
  },
};

const carbon: ThemeDefinition = {
  name: 'carbon',
  label: 'Carbon',
  colors: {
    bgMain: '#1e1e1e',
    bgSide: '#1a1a1a',
    bgTerminal: '#111111',
    bgPanel: '#242424',
    bgHeader: '#2a2a2a',
    bgHeaderFocused: '#333333',
    border: '#333333',
    accent: '#4fc3f7',
    accentSoft: '#80d8ff',
    textPrimary: '#d4d4d4',
    textSecondary: '#aaaaaa',
    textTertiary: '#888888',
    textHeader: '#888888',
    btnHover: '#383838',
    error: '#f44747',
    warning: '#ffcc33',
    selection: '#264f78',
  },
};

const midnight: ThemeDefinition = {
  name: 'midnight',
  label: 'Midnight',
  colors: {
    bgMain: '#0d1117',
    bgSide: '#0d1117',
    bgTerminal: '#010409',
    bgPanel: '#161b22',
    bgHeader: '#161b22',
    bgHeaderFocused: '#1c2333',
    border: '#21262d',
    accent: '#58a6ff',
    accentSoft: '#79c0ff',
    textPrimary: '#c9d1d9',
    textSecondary: '#8b949e',
    textTertiary: '#6e7681',
    textHeader: '#8b949e',
    btnHover: '#21262d',
    error: '#f85149',
    warning: '#d29922',
    selection: '#1c3a5c',
  },
};

const light: ThemeDefinition = {
  name: 'light',
  label: 'Light',
  colors: {
    bgMain: '#eaeaef',
    bgSide: '#f5f5f7',
    bgTerminal: '#ffffff',
    bgPanel: '#ffffff',
    bgHeader: '#f0f0f5',
    bgHeaderFocused: '#e8eaf4',
    border: '#d0d0d8',
    accent: '#4a6ad0',
    accentSoft: '#6680d8',
    textPrimary: '#1a1a2a',
    textSecondary: '#444460',
    textTertiary: '#666680',
    textHeader: '#666680',
    btnHover: '#e0e0e8',
    error: '#d32f2f',
    warning: '#c67600',
    selection: '#b4c8f0',
  },
};

export const themes: Record<ThemeName, ThemeDefinition> = {
  accordion,
  carbon,
  midnight,
  light,
};

export const themeNames: ThemeName[] = ['accordion', 'carbon', 'midnight', 'light'];

export function getXtermTheme(themeName: ThemeName) {
  const c = themes[themeName].colors;
  return {
    background: c.bgTerminal,
    foreground: c.textPrimary,
    cursor: c.accent,
    selectionBackground: c.selection,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/themes.ts
git commit -m "feat: add theme definitions for four color schemes"
```

---

### Task 3: Extend Config for Theme (TDD)

**Files:**
- Modify: `src/types.ts:1-3`
- Modify: `src/main/config-manager.ts:5`
- Modify: `tests/config-manager.test.ts`
- Modify: `src/main.ts:47-53`
- Modify: `src/preload.ts:6-8`

- [ ] **Step 1: Write tests for theme in config**

Add to `tests/config-manager.test.ts` at the end of the `readConfig` describe block (after the "repos is not an array" test):

```typescript
    it('returns default config with theme when file has no theme field', () => {
      fs.writeFileSync(configPath, JSON.stringify({ repos: ['C:\\test'] }));
      const config = readConfig(configPath);
      expect(config.theme).toBe('accordion');
    });

    it('preserves existing theme from config file', () => {
      fs.writeFileSync(configPath, JSON.stringify({ repos: [], theme: 'carbon' }));
      const config = readConfig(configPath);
      expect(config.theme).toBe('carbon');
    });
```

Add a new `describe('setTheme')` block after `removeRepo`:

```typescript
  describe('setTheme', () => {
    it('sets the theme in config', () => {
      const config = setTheme(configPath, 'midnight');
      expect(config.theme).toBe('midnight');
    });

    it('preserves repos when setting theme', () => {
      addRepo(configPath, 'C:\\Repos\\a');
      const config = setTheme(configPath, 'light');
      expect(config.repos).toEqual(['C:\\Repos\\a']);
      expect(config.theme).toBe('light');
    });
  });
```

Update the import line at the top of the test file:

```typescript
import { readConfig, writeConfig, addRepo, removeRepo, setTheme } from '../src/main/config-manager';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/config-manager.test.ts`
Expected: FAIL — `setTheme` is not exported, theme assertions fail

- [ ] **Step 3: Update types.ts**

Change `AppConfig` in `src/types.ts`:

```typescript
export type ThemeName = 'accordion' | 'carbon' | 'midnight' | 'light';

export interface AppConfig {
  repos: string[];
  theme: ThemeName;
}
```

Add `setTheme` to the `ElectronAPI.config` interface:

```typescript
  config: {
    get(): Promise<AppConfig>;
    addRepo(path: string): Promise<AppConfig>;
    removeRepo(path: string): Promise<AppConfig>;
    setTheme(theme: string): Promise<AppConfig>;
  };
```

- [ ] **Step 4: Update config-manager.ts**

Change `defaultConfig` in `src/main/config-manager.ts`:

```typescript
const defaultConfig = (): AppConfig => ({ repos: [], theme: 'accordion' });
```

Update `readConfig` to ensure the theme field always exists (after the `if (!Array.isArray(config.repos))` check, before the `return config;`):

```typescript
    if (!config.theme || !['accordion', 'carbon', 'midnight', 'light'].includes(config.theme)) {
      config.theme = 'accordion';
    }
    return config;
```

Add the `setTheme` function:

```typescript
export function setTheme(configPath: string, theme: string): AppConfig {
  const config = readConfig(configPath);
  config.theme = theme as AppConfig['theme'];
  writeConfig(configPath, config);
  return config;
}
```

- [ ] **Step 5: Add IPC handler and preload**

In `src/main.ts`, add after the `config:remove-repo` handler:

```typescript
ipcMain.handle('config:set-theme', (_event, theme: string) =>
  setTheme(CONFIG_PATH, theme)
);
```

Update the import to include `setTheme`:

```typescript
import { readConfig, addRepo, removeRepo, setTheme } from './main/config-manager';
```

In `src/preload.ts`, add to the config object:

```typescript
    setTheme: (theme: string) => ipcRenderer.invoke('config:set-theme', theme),
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS (23 total — 14 config + 9 grid)

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/main/config-manager.ts src/main.ts src/preload.ts tests/config-manager.test.ts
git commit -m "feat: extend config with theme field and setTheme IPC"
```

---

### Task 4: Extract CSS Colors to Custom Properties

**Files:**
- Modify: `src/components/App.css` (full rewrite of color values)

This is the largest task. Every hardcoded hex color in App.css becomes a `var(--token)` reference. The `:root` block defines Accordion theme defaults. Three `[data-theme]` blocks define overrides.

- [ ] **Step 1: Add CSS custom properties block at top of App.css**

Insert after the reset block (after line 15) and before the `body` rule:

```css
/* === Theme Variables === */
:root {
  --bg-main: #1a1a2e;
  --bg-side: #16162a;
  --bg-terminal: #0d0d1a;
  --bg-panel: #1e1e3a;
  --bg-header: #1a1a30;
  --bg-header-focused: #252550;
  --border: #2a2a4a;
  --accent: #7c9cff;
  --accent-soft: #9ab0ff;
  --text-primary: #e0e0f0;
  --text-secondary: #c0c0e0;
  --text-tertiary: #a0a0d0;
  --text-header: #8888cc;
  --btn-hover: #2a2a50;
  --error: #ff5555;
  --warning: #ffcc33;
  --selection: #3a3a6a;
}

[data-theme="carbon"] {
  --bg-main: #1e1e1e;
  --bg-side: #1a1a1a;
  --bg-terminal: #111111;
  --bg-panel: #242424;
  --bg-header: #2a2a2a;
  --bg-header-focused: #333333;
  --border: #333333;
  --accent: #4fc3f7;
  --accent-soft: #80d8ff;
  --text-primary: #d4d4d4;
  --text-secondary: #aaaaaa;
  --text-tertiary: #888888;
  --text-header: #888888;
  --btn-hover: #383838;
  --error: #f44747;
  --warning: #ffcc33;
  --selection: #264f78;
}

[data-theme="midnight"] {
  --bg-main: #0d1117;
  --bg-side: #0d1117;
  --bg-terminal: #010409;
  --bg-panel: #161b22;
  --bg-header: #161b22;
  --bg-header-focused: #1c2333;
  --border: #21262d;
  --accent: #58a6ff;
  --accent-soft: #79c0ff;
  --text-primary: #c9d1d9;
  --text-secondary: #8b949e;
  --text-tertiary: #6e7681;
  --text-header: #8b949e;
  --btn-hover: #21262d;
  --error: #f85149;
  --warning: #d29922;
  --selection: #1c3a5c;
}

[data-theme="light"] {
  --bg-main: #eaeaef;
  --bg-side: #f5f5f7;
  --bg-terminal: #ffffff;
  --bg-panel: #ffffff;
  --bg-header: #f0f0f5;
  --bg-header-focused: #e8eaf4;
  --border: #d0d0d8;
  --accent: #4a6ad0;
  --accent-soft: #6680d8;
  --text-primary: #1a1a2a;
  --text-secondary: #444460;
  --text-tertiary: #666680;
  --text-header: #666680;
  --btn-hover: #e0e0e8;
  --error: #d32f2f;
  --warning: #c67600;
  --selection: #b4c8f0;
}
```

- [ ] **Step 2: Replace all hardcoded colors with CSS variable references**

Replace throughout the file (every occurrence):

| Hardcoded | Replacement |
|-----------|-------------|
| `#1a1a2e` (body bg, terminal grid bg) | `var(--bg-main)` |
| `#16162a` (side pane bg, settings-repo-item bg) | `var(--bg-side)` |
| `#0d0d1a` (terminal bg) | `var(--bg-terminal)` |
| `#1e1e3a` (repo-item bg, side-pane-settings bg, settings-dialog bg) | `var(--bg-panel)` |
| `#1a1a30` (terminal-header bg) | `var(--bg-header)` |
| `#252550` (terminal-header-focused bg) | `var(--bg-header-focused)` |
| `#2a2a4a` (all borders) | `var(--border)` |
| `#7c9cff` (accent — active borders, labels, buttons, branch) | `var(--accent)` |
| `#9ab0ff` (terminal-branch color) | `var(--accent-soft)` |
| `#e0e0f0` (text-primary — body color, settings-header h2) | `var(--text-primary)` |
| `#c0c0e0` (text-secondary — repo-item, settings-repo-path) | `var(--text-secondary)` |
| `#a0a0d0` (text-tertiary — repo-subdir, repo-subdir-leaf) | `var(--text-tertiary)` |
| `#8888cc` (text-header — side-pane-header, settings h3, side-pane-settings) | `var(--text-header)` |
| `#2a2a50` (btn-hover — side-pane-settings:hover, settings-add-btn bg, repo-subdir bg, repo-subdir-leaf bg) | `var(--btn-hover)` |
| `#ff5555` (error — close hover, terminal-error) | `var(--error)` |
| `#ffcc33` (warning) | `var(--warning)` |
| `#3a3a6a` (selection) — not used in CSS but in xterm | n/a |

Also replace these derived colors:
| Hardcoded | Replacement |
|-----------|-------------|
| `#6c6caa` (repo-toggle color) | `var(--text-tertiary)` |
| `#c0c0f0` (repo-subdir-name hover, repo-subdir-leaf hover) | `var(--text-secondary)` |
| `#3a3a60` (repo-subdir-leaf hover bg) | `var(--btn-hover)` |
| `#4a4a7a` (settings-add-btn dashed border) | `var(--border)` |
| `#3a1a1a` (close button hover bg) | keep hardcoded (error-specific) |
| `#3a2a2a` (remove button border) | keep hardcoded (error-specific) |
| `#555` (terminal-grid empty, terminal-btn, settings-close, side-pane-empty) | `var(--text-tertiary)` |
| `#666` (repo-item-missing, settings-empty) | `var(--text-tertiary)` |
| `#aaa` (btn hover, settings-close hover) | `var(--text-secondary)` |
| `#2a2a4a` in scrollbar-thumb | `var(--border)` |
| `#3a3a5a` in scrollbar-thumb:hover | `var(--btn-hover)` |
| `rgba(0, 0, 0, 0.6)` (settings overlay) | keep as-is |

- [ ] **Step 3: Verify the app still looks correct**

Run: `npm start`
Expected: App looks identical — all colors pulled from CSS variables with same default values.

- [ ] **Step 4: Commit**

```bash
git add src/components/App.css
git commit -m "refactor: extract all colors to CSS custom properties with theme overrides"
```

---

### Task 5: Wire Theme Switching in React

**Files:**
- Modify: `src/components/App.tsx`
- Modify: `src/components/TerminalPanel.tsx:35-44`
- Modify: `src/components/SettingsDialog.tsx`

- [ ] **Step 1: Apply theme on mount and handle changes in App.tsx**

Update `src/components/App.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { SidePane } from './SidePane';
import { TerminalGrid } from './TerminalGrid';
import { SettingsDialog } from './SettingsDialog';
import { useTerminals } from '../hooks/useTerminals';
import type { AppConfig } from '../types';

export default function App() {
  const [config, setConfig] = useState<AppConfig>({ repos: [], theme: 'accordion' });
  const [showSettings, setShowSettings] = useState(false);
  const {
    terminals,
    maximizedId,
    focusedId,
    addTerminal,
    closeTerminal,
    toggleMaximize,
    focusTerminal,
    canAdd,
  } = useTerminals();

  // Load config on mount; apply theme; auto-open settings if no repos
  useEffect(() => {
    window.electronAPI.config.get().then((cfg) => {
      setConfig(cfg);
      document.documentElement.setAttribute('data-theme', cfg.theme);
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
    document.documentElement.setAttribute('data-theme', newConfig.theme);
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
        focusedId={focusedId}
        onClose={closeTerminal}
        onToggleMaximize={toggleMaximize}
        onFocus={focusTerminal}
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

- [ ] **Step 2: Update TerminalPanel.tsx to use theme-aware xterm colors**

In `src/components/TerminalPanel.tsx`, add import and use `getXtermTheme`:

```typescript
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { getXtermTheme } from '../lib/themes';
import type { ThemeName } from '../types';
import '@xterm/xterm/css/xterm.css';
```

Add `theme` prop:

```typescript
interface TerminalPanelProps {
  ptyId: string;
  label: string;
  branch: string | null;
  theme: ThemeName;
  isMaximized: boolean;
  isFocused: boolean;
  onClose: () => void;
  onToggleMaximize: () => void;
  onFocus: () => void;
}
```

Replace the hardcoded xterm theme in the `new Terminal()` call:

```typescript
    const terminal = new Terminal({
      scrollback: 1000,
      fontFamily: "'Cascadia Code', 'Consolas', monospace",
      fontSize: 14,
      theme: getXtermTheme(theme),
    });
```

Add an effect to update xterm theme when the app theme changes (after the ResizeObserver effect):

```typescript
  // Update xterm theme when app theme changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = getXtermTheme(theme);
    }
  }, [theme]);
```

- [ ] **Step 3: Pass theme through TerminalGrid**

In `src/components/TerminalGrid.tsx`, add `theme` to `TerminalGridProps`:

```typescript
import type { ThemeName } from '../types';

interface TerminalGridProps {
  terminals: TerminalState[];
  maximizedId: string | null;
  focusedId: string | null;
  theme: ThemeName;
  onClose: (id: string) => void;
  onToggleMaximize: (id: string) => void;
  onFocus: (id: string) => void;
}
```

Pass `theme={theme}` to every `<TerminalPanel>` instance (all 3 places).

In `src/components/App.tsx`, pass `theme={config.theme}` to `<TerminalGrid>`.

- [ ] **Step 4: Add theme picker to SettingsDialog**

Update `src/components/SettingsDialog.tsx`:

```typescript
import { useEffect } from 'react';
import type { AppConfig } from '../types';
import { themes, themeNames } from '../lib/themes';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  const handleThemeChange = async (themeName: string) => {
    const newConfig = await window.electronAPI.config.setTheme(themeName);
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
          <h3>Theme</h3>
          <div className="settings-themes">
            {themeNames.map((name) => {
              const t = themes[name];
              const isActive = config.theme === name;
              return (
                <button
                  key={name}
                  className={`settings-theme-btn${isActive ? ' settings-theme-active' : ''}`}
                  onClick={() => handleThemeChange(name)}
                >
                  <div className="settings-theme-swatch">
                    <div
                      className="settings-theme-color"
                      style={{ background: t.colors.bgMain }}
                    >
                      <span style={{ color: t.colors.accent }}>&gt;&gt;&gt;</span>
                    </div>
                  </div>
                  <span className="settings-theme-label">{t.label}</span>
                </button>
              );
            })}
          </div>
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

- [ ] **Step 5: Add theme picker CSS to App.css**

Add before the `/* === Scrollbar === */` section:

```css
/* === Theme Picker === */
.settings-themes {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.settings-theme-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: var(--bg-side);
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.settings-theme-btn:hover {
  border-color: var(--accent);
}

.settings-theme-active {
  border-color: var(--accent);
}

.settings-theme-swatch {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
}

.settings-theme-color {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Consolas', monospace;
  font-weight: bold;
  font-size: 14px;
  border-radius: 4px;
}

.settings-theme-label {
  font-size: 11px;
  color: var(--text-secondary);
}
```

- [ ] **Step 6: Verify all four themes work**

Run: `npm start`
Expected: Open settings, see 4 theme buttons. Click each one — the entire app should repaint instantly, including the terminal background.

- [ ] **Step 7: Commit**

```bash
git add src/components/App.tsx src/components/App.css src/components/TerminalPanel.tsx src/components/TerminalGrid.tsx src/components/SettingsDialog.tsx
git commit -m "feat: wire theme switching with settings UI and xterm theme sync"
```
