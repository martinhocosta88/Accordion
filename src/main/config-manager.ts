import * as fs from 'fs';
import * as path from 'path';
import type { AppConfig } from '../types';

const defaultConfig = (): AppConfig => ({ repos: [] });

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
