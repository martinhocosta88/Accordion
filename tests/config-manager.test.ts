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
