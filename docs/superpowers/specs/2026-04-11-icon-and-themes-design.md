# App Icon & Color Themes Design

## Goal

Add an app icon (fading chevrons representing accordion folds + terminal prompts) and a theme system with four color schemes selectable from settings.

## Icon

**Concept:** Five `>` chevrons fading in from left to right. The rightmost is fully opaque — the active terminal prompt. The leftward chevrons fade out, evoking accordion bellows expanding.

**Format:** SVG source rendered to .ico (256x256, 128x128, 64x64, 48x48, 32x32, 16x16) for Windows. The SVG uses the Accordion theme's accent blue (#7c9cff) on a dark background (#1a1a2e) with rounded rect container.

**Integration:**
- `assets/icon.svg` — source SVG
- `assets/icon.ico` — Windows icon (generated from SVG)
- `forge.config.ts` — `packagerConfig.icon: './assets/icon'`
- `src/main.ts` — `BrowserWindow` icon option

## Themes

### Four Themes

| Token | Accordion (default) | Carbon | Midnight | Light |
|-------|-------------------|--------|----------|-------|
| `--bg-main` | #1a1a2e | #1e1e1e | #0d1117 | #eaeaef |
| `--bg-side` | #16162a | #1a1a1a | #0d1117 | #f5f5f7 |
| `--bg-terminal` | #0d0d1a | #111111 | #010409 | #ffffff |
| `--bg-panel` | #1e1e3a | #242424 | #161b22 | #ffffff |
| `--bg-header` | #1a1a30 | #2a2a2a | #161b22 | #f0f0f5 |
| `--bg-header-focused` | #252550 | #333333 | #1c2333 | #e8eaf4 |
| `--border` | #2a2a4a | #333333 | #21262d | #d0d0d8 |
| `--accent` | #7c9cff | #4fc3f7 | #58a6ff | #4a6ad0 |
| `--accent-soft` | #9ab0ff | #80d8ff | #79c0ff | #6680d8 |
| `--text-primary` | #e0e0f0 | #d4d4d4 | #c9d1d9 | #1a1a2a |
| `--text-secondary` | #c0c0e0 | #aaaaaa | #8b949e | #444460 |
| `--text-tertiary` | #a0a0d0 | #888888 | #6e7681 | #666680 |
| `--text-header` | #8888cc | #888888 | #8b949e | #666680 |
| `--btn-hover` | #2a2a50 | #383838 | #21262d | #e0e0e8 |
| `--error` | #ff5555 | #f44747 | #f85149 | #d32f2f |
| `--warning` | #ffcc33 | #ffcc33 | #d29922 | #c67600 |
| `--selection` | #3a3a6a | #264f78 | #1c3a5c | #b4c8f0 |

### xterm.js Theme

Each theme provides an xterm theme object derived from its tokens:
- `background` = `--bg-terminal`
- `foreground` = `--text-primary`
- `cursor` = `--accent`
- `selectionBackground` = `--selection`

## Config

Extend `AppConfig`:
```typescript
export interface AppConfig {
  repos: string[];
  theme: 'accordion' | 'carbon' | 'midnight' | 'light';
}
```

Default: `"accordion"`. The `defaultConfig()` factory returns `{ repos: [], theme: 'accordion' }`.

## CSS Architecture

Colors extracted to CSS custom properties on `:root` (Accordion theme as default). Theme overrides via `[data-theme="carbon"]`, `[data-theme="midnight"]`, `[data-theme="light"]` attribute selectors on `<html>`.

All hardcoded hex values in App.css replaced with `var(--token-name)` references.

The xterm.js inline theme in TerminalPanel.tsx reads from a `getXtermTheme(themeName)` function exported from `themes.ts`.

## Settings UI

Add a "Theme" section above "Repository Paths" in the settings dialog. Four clickable theme cards showing:
- Theme name
- Small color swatch (background + accent preview)
- Active indicator (checkmark or highlight) on the currently selected theme

Selecting a theme:
1. Saves to config via `config:set-theme` IPC
2. Sets `data-theme` attribute on `document.documentElement`
3. Updates xterm.js theme on all open terminals (via re-render)

## Files Changed

- **Create:** `assets/icon.svg`, `assets/icon.ico`
- **Create:** `src/lib/themes.ts` — theme definitions and `getXtermTheme()`
- **Modify:** `src/types.ts` — add `theme` to AppConfig and ElectronAPI
- **Modify:** `src/main/config-manager.ts` — `defaultConfig()` includes theme, add `setTheme()`
- **Modify:** `src/main.ts` — add `config:set-theme` IPC handler, icon in BrowserWindow
- **Modify:** `src/preload.ts` — expose `config.setTheme()`
- **Modify:** `src/components/App.css` — replace hardcoded colors with CSS variables, add theme blocks
- **Modify:** `src/components/App.tsx` — apply theme on mount and on change
- **Modify:** `src/components/TerminalPanel.tsx` — use `getXtermTheme()` instead of hardcoded theme
- **Modify:** `src/components/SettingsDialog.tsx` — add theme picker
- **Modify:** `forge.config.ts` — icon path in packagerConfig
