import * as fs from 'fs';
import * as path from 'path';
import { VALID_THEMES } from '../types';
import type { AppConfig, OpenTerminal, ThemeName, UiState, WindowGeometry } from '../types';

const defaultConfig = (): AppConfig => ({ repos: [], theme: 'claude', openTerminals: [] });

function sanitizeUiState(value: unknown): UiState | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Partial<UiState> & { window?: unknown };
  const out: UiState = {};
  if (typeof v.sidebarCollapsed === 'boolean') out.sidebarCollapsed = v.sidebarCollapsed;
  if (typeof v.zoomLevel === 'number' && Number.isFinite(v.zoomLevel)) out.zoomLevel = v.zoomLevel;
  if (v.window && typeof v.window === 'object') {
    const w = v.window as Partial<WindowGeometry>;
    if (typeof w.width === 'number' && typeof w.height === 'number') {
      out.window = {
        x: typeof w.x === 'number' ? w.x : undefined,
        y: typeof w.y === 'number' ? w.y : undefined,
        width: w.width,
        height: w.height,
        maximized: Boolean(w.maximized),
      };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function sanitizeOpenTerminals(value: unknown): OpenTerminal[] {
  if (!Array.isArray(value)) return [];
  const out: OpenTerminal[] = [];
  for (const entry of value) {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as OpenTerminal).cwd === 'string' &&
      typeof (entry as OpenTerminal).label === 'string'
    ) {
      out.push({ cwd: (entry as OpenTerminal).cwd, label: (entry as OpenTerminal).label });
    }
  }
  return out;
}

export function readConfig(configPath: string): AppConfig {
  try {
    if (!fs.existsSync(configPath)) {
      writeConfig(configPath, defaultConfig());
      return defaultConfig();
    }
    const data = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(data) as AppConfig;
    if (!Array.isArray(config.repos)) {
      writeConfig(configPath, defaultConfig());
      return defaultConfig();
    }
    if (!config.theme || !(VALID_THEMES as readonly string[]).includes(config.theme)) {
      config.theme = 'claude';
    }
    config.openTerminals = sanitizeOpenTerminals(config.openTerminals);
    const ui = sanitizeUiState((config as AppConfig).uiState);
    if (ui) config.uiState = ui;
    else delete (config as Partial<AppConfig>).uiState;
    return config;
  } catch {
    writeConfig(configPath, defaultConfig());
    return defaultConfig();
  }
}

export function writeConfig(configPath: string, config: AppConfig): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

function normalizePath(p: string): string {
  return path.resolve(p).toLowerCase();
}

export function addRepo(configPath: string, repoPath: string): AppConfig {
  const config = readConfig(configPath);
  const normalized = normalizePath(repoPath);
  const alreadyExists = config.repos.some((r) => normalizePath(r) === normalized);
  if (!alreadyExists) {
    try {
      const stat = fs.statSync(repoPath);
      if (!stat.isDirectory()) return config;
    } catch {
      return config;
    }
    config.repos.push(repoPath);
    writeConfig(configPath, config);
  }
  return config;
}

export function removeRepo(configPath: string, repoPath: string): AppConfig {
  const config = readConfig(configPath);
  const normalized = normalizePath(repoPath);
  config.repos = config.repos.filter((r) => normalizePath(r) !== normalized);
  writeConfig(configPath, config);
  return config;
}

export function reorderRepos(configPath: string, repos: string[]): AppConfig {
  const config = readConfig(configPath);
  // Only accept paths that already exist in config
  const existing = new Set(config.repos.map(normalizePath));
  const filtered = repos.filter((r) => existing.has(normalizePath(r)));
  if (filtered.length === config.repos.length) {
    config.repos = filtered;
    writeConfig(configPath, config);
  }
  return config;
}

export function setTheme(configPath: string, theme: string): AppConfig {
  if (!(VALID_THEMES as readonly string[]).includes(theme)) {
    return readConfig(configPath);
  }
  const config = readConfig(configPath);
  config.theme = theme as ThemeName;
  writeConfig(configPath, config);
  return config;
}

export function setOpenTerminals(configPath: string, terminals: unknown): AppConfig {
  const config = readConfig(configPath);
  config.openTerminals = sanitizeOpenTerminals(terminals);
  writeConfig(configPath, config);
  return config;
}

export function setUiState(configPath: string, partial: unknown): AppConfig {
  const config = readConfig(configPath);
  const sanitized = sanitizeUiState(partial);
  if (!sanitized) return config;
  config.uiState = { ...(config.uiState || {}), ...sanitized };
  writeConfig(configPath, config);
  return config;
}
