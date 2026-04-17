import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readConfig, writeConfig, addRepo, removeRepo, setTheme, setOpenTerminals, setUiState } from '../src/main/config-manager';

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
      expect(config).toEqual({ repos: [], theme: 'claude', openTerminals: [] });
    });

    it('creates config file when it does not exist', () => {
      readConfig(configPath);
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('reads existing config file', () => {
      fs.writeFileSync(configPath, JSON.stringify({ repos: ['C:\\Repos\\test'], theme: 'carbon' }));
      const config = readConfig(configPath);
      expect(config).toEqual({ repos: ['C:\\Repos\\test'], theme: 'carbon', openTerminals: [] });
    });

    it('returns default config when file is corrupted JSON', () => {
      fs.writeFileSync(configPath, 'not json');
      const config = readConfig(configPath);
      expect(config).toEqual({ repos: [], theme: 'claude', openTerminals: [] });
    });

    it('returns default config when repos is not an array', () => {
      fs.writeFileSync(configPath, JSON.stringify({ repos: 'bad' }));
      const config = readConfig(configPath);
      expect(config).toEqual({ repos: [], theme: 'claude', openTerminals: [] });
    });

    it('reads openTerminals from an existing config file', () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          repos: [],
          theme: 'accordion',
          openTerminals: [{ cwd: 'C:\\Repos\\a', label: 'A' }],
        })
      );
      const config = readConfig(configPath);
      expect(config.openTerminals).toEqual([{ cwd: 'C:\\Repos\\a', label: 'A' }]);
    });

    it('defaults openTerminals to empty array when missing', () => {
      fs.writeFileSync(configPath, JSON.stringify({ repos: [], theme: 'accordion' }));
      const config = readConfig(configPath);
      expect(config.openTerminals).toEqual([]);
    });

    it('drops malformed openTerminals entries', () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          repos: [],
          theme: 'accordion',
          openTerminals: [
            { cwd: 'C:\\Repos\\a', label: 'A' },
            { cwd: 123, label: 'bad' },
            { label: 'no-cwd' },
            'string-entry',
            null,
          ],
        })
      );
      const config = readConfig(configPath);
      expect(config.openTerminals).toEqual([{ cwd: 'C:\\Repos\\a', label: 'A' }]);
    });

    it('returns default config with theme when file has no theme field', () => {
      fs.writeFileSync(configPath, JSON.stringify({ repos: ['C:\\test'] }));
      const config = readConfig(configPath);
      expect(config.theme).toBe('claude');
    });

    it('preserves existing theme from config file', () => {
      fs.writeFileSync(configPath, JSON.stringify({ repos: [], theme: 'carbon' }));
      const config = readConfig(configPath);
      expect(config.theme).toBe('carbon');
    });
  });

  describe('writeConfig', () => {
    it('writes config to file', () => {
      const config = { repos: ['C:\\Repos\\test'], theme: 'accordion' as const, openTerminals: [] };
      writeConfig(configPath, config);
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(data).toEqual(config);
    });

    it('creates parent directories if they do not exist', () => {
      const nestedPath = path.join(tempDir, 'a', 'b', 'config.json');
      writeConfig(nestedPath, { repos: [], theme: 'accordion', openTerminals: [] });
      expect(fs.existsSync(nestedPath)).toBe(true);
    });
  });

  describe('addRepo', () => {
    it('adds a new repo path', () => {
      const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
      const config = addRepo(configPath, repoDir);
      expect(config.repos).toEqual([repoDir]);
      fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('does not add a duplicate repo path', () => {
      const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
      addRepo(configPath, repoDir);
      const config = addRepo(configPath, repoDir);
      expect(config.repos).toEqual([repoDir]);
      fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('preserves existing repos when adding', () => {
      const repoDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-a-'));
      const repoDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-b-'));
      addRepo(configPath, repoDirA);
      const config = addRepo(configPath, repoDirB);
      expect(config.repos).toEqual([repoDirA, repoDirB]);
      fs.rmSync(repoDirA, { recursive: true, force: true });
      fs.rmSync(repoDirB, { recursive: true, force: true });
    });

    it('rejects a path that does not exist', () => {
      const config = addRepo(configPath, 'C:\\Repos\\nonexistent-fake-path');
      expect(config.repos).toEqual([]);
    });
  });

  describe('removeRepo', () => {
    it('removes a repo path', () => {
      const repoDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-a-'));
      const repoDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-b-'));
      addRepo(configPath, repoDirA);
      addRepo(configPath, repoDirB);
      const config = removeRepo(configPath, repoDirA);
      expect(config.repos).toEqual([repoDirB]);
      fs.rmSync(repoDirA, { recursive: true, force: true });
      fs.rmSync(repoDirB, { recursive: true, force: true });
    });

    it('handles removing a path that does not exist', () => {
      const config = removeRepo(configPath, 'C:\\Repos\\nonexistent');
      expect(config.repos).toEqual([]);
    });
  });

  describe('setTheme', () => {
    it('sets the theme in config', () => {
      const config = setTheme(configPath, 'midnight');
      expect(config.theme).toBe('midnight');
    });

    it('preserves repos when setting theme', () => {
      const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
      addRepo(configPath, repoDir);
      const config = setTheme(configPath, 'light');
      expect(config.repos).toEqual([repoDir]);
      expect(config.theme).toBe('light');
      fs.rmSync(repoDir, { recursive: true, force: true });
    });
  });

  describe('setOpenTerminals', () => {
    it('persists the provided terminal manifest', () => {
      const manifest = [
        { cwd: 'C:\\Repos\\a', label: 'A' },
        { cwd: 'C:\\Repos\\b', label: 'B' },
      ];
      setOpenTerminals(configPath, manifest);
      const config = readConfig(configPath);
      expect(config.openTerminals).toEqual(manifest);
    });

    it('replaces any previously saved manifest', () => {
      setOpenTerminals(configPath, [{ cwd: 'C:\\Repos\\a', label: 'A' }]);
      setOpenTerminals(configPath, [{ cwd: 'C:\\Repos\\b', label: 'B' }]);
      const config = readConfig(configPath);
      expect(config.openTerminals).toEqual([{ cwd: 'C:\\Repos\\b', label: 'B' }]);
    });

    it('clears the manifest when given an empty array', () => {
      setOpenTerminals(configPath, [{ cwd: 'C:\\Repos\\a', label: 'A' }]);
      setOpenTerminals(configPath, []);
      const config = readConfig(configPath);
      expect(config.openTerminals).toEqual([]);
    });

    it('ignores non-array input and writes an empty manifest', () => {
      setOpenTerminals(configPath, 'not an array');
      const config = readConfig(configPath);
      expect(config.openTerminals).toEqual([]);
    });

    it('preserves repos and theme when setting terminals', () => {
      const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
      addRepo(configPath, repoDir);
      setTheme(configPath, 'carbon');
      setOpenTerminals(configPath, [{ cwd: repoDir, label: 'R' }]);
      const config = readConfig(configPath);
      expect(config.repos).toEqual([repoDir]);
      expect(config.theme).toBe('carbon');
      expect(config.openTerminals).toEqual([{ cwd: repoDir, label: 'R' }]);
      fs.rmSync(repoDir, { recursive: true, force: true });
    });
  });

  describe('setUiState', () => {
    it('persists sidebar collapsed state', () => {
      setUiState(configPath, { sidebarCollapsed: true });
      const config = readConfig(configPath);
      expect(config.uiState?.sidebarCollapsed).toBe(true);
    });

    it('merges partial updates instead of replacing', () => {
      setUiState(configPath, { sidebarCollapsed: true });
      setUiState(configPath, { zoomLevel: 1.25 });
      const config = readConfig(configPath);
      expect(config.uiState?.sidebarCollapsed).toBe(true);
      expect(config.uiState?.zoomLevel).toBe(1.25);
    });

    it('persists window geometry', () => {
      setUiState(configPath, {
        window: { x: 10, y: 20, width: 1000, height: 700, maximized: false },
      });
      const config = readConfig(configPath);
      expect(config.uiState?.window).toEqual({
        x: 10,
        y: 20,
        width: 1000,
        height: 700,
        maximized: false,
      });
    });

    it('rejects a window entry without width/height', () => {
      setUiState(configPath, { window: { maximized: true } as unknown as never });
      const config = readConfig(configPath);
      expect(config.uiState?.window).toBeUndefined();
    });

    it('drops non-boolean sidebarCollapsed values', () => {
      setUiState(configPath, { sidebarCollapsed: 'yes' as unknown as boolean });
      const config = readConfig(configPath);
      expect(config.uiState).toBeUndefined();
    });

    it('does not write when the partial has nothing valid', () => {
      setUiState(configPath, {});
      const config = readConfig(configPath);
      expect(config.uiState).toBeUndefined();
    });

    it('preserves repos, theme, and openTerminals when setting uiState', () => {
      const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
      addRepo(configPath, repoDir);
      setTheme(configPath, 'midnight');
      setOpenTerminals(configPath, [{ cwd: repoDir, label: 'R' }]);
      setUiState(configPath, { sidebarCollapsed: true });
      const config = readConfig(configPath);
      expect(config.repos).toEqual([repoDir]);
      expect(config.theme).toBe('midnight');
      expect(config.openTerminals).toEqual([{ cwd: repoDir, label: 'R' }]);
      expect(config.uiState?.sidebarCollapsed).toBe(true);
      fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('drops malformed uiState when reading config', () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          repos: [],
          theme: 'accordion',
          openTerminals: [],
          uiState: 'broken',
        })
      );
      const config = readConfig(configPath);
      expect(config.uiState).toBeUndefined();
    });
  });
});
