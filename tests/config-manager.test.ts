import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readConfig, writeConfig, addRepo, removeRepo, setTheme } from '../src/main/config-manager';

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
      expect(config).toEqual({ repos: [], theme: 'accordion' });
    });

    it('creates config file when it does not exist', () => {
      readConfig(configPath);
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('reads existing config file', () => {
      fs.writeFileSync(configPath, JSON.stringify({ repos: ['C:\\Repos\\test'], theme: 'carbon' }));
      const config = readConfig(configPath);
      expect(config).toEqual({ repos: ['C:\\Repos\\test'], theme: 'carbon' });
    });

    it('returns default config when file is corrupted JSON', () => {
      fs.writeFileSync(configPath, 'not json');
      const config = readConfig(configPath);
      expect(config).toEqual({ repos: [], theme: 'accordion' });
    });

    it('returns default config when repos is not an array', () => {
      fs.writeFileSync(configPath, JSON.stringify({ repos: 'bad' }));
      const config = readConfig(configPath);
      expect(config).toEqual({ repos: [], theme: 'accordion' });
    });

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
  });

  describe('writeConfig', () => {
    it('writes config to file', () => {
      const config = { repos: ['C:\\Repos\\test'], theme: 'accordion' as const };
      writeConfig(configPath, config);
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(data).toEqual(config);
    });

    it('creates parent directories if they do not exist', () => {
      const nestedPath = path.join(tempDir, 'a', 'b', 'config.json');
      writeConfig(nestedPath, { repos: [], theme: 'accordion' });
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
});
