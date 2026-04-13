import * as fs from 'fs';
import * as path from 'path';
import { VALID_THEMES } from '../types';
import type { AppConfig, ThemeName } from '../types';

const defaultConfig = (): AppConfig => ({ repos: [], theme: 'accordion' });

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
      config.theme = 'accordion';
    }
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

export function setTheme(configPath: string, theme: string): AppConfig {
  if (!(VALID_THEMES as readonly string[]).includes(theme)) {
    return readConfig(configPath);
  }
  const config = readConfig(configPath);
  config.theme = theme as ThemeName;
  writeConfig(configPath, config);
  return config;
}
