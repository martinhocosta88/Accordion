import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { readConfig, addRepo, removeRepo, setTheme } from './main/config-manager';
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
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
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
ipcMain.handle('config:add-repo', (_event, repoPath: string) => {
  invalidateConfigCache();
  return addRepo(CONFIG_PATH, repoPath);
});
ipcMain.handle('config:remove-repo', (_event, repoPath: string) => {
  invalidateConfigCache();
  return removeRepo(CONFIG_PATH, repoPath);
});
ipcMain.handle('config:set-theme', (_event, theme: string) => {
  invalidateConfigCache();
  return setTheme(CONFIG_PATH, theme);
});

// Dialog IPC handler
ipcMain.handle('dialog:select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Config cache to avoid reading from disk on every IPC call
let configCache: ReturnType<typeof readConfig> | null = null;

function getCachedConfig(): ReturnType<typeof readConfig> {
  if (!configCache) configCache = readConfig(CONFIG_PATH);
  return configCache;
}

function invalidateConfigCache(): void {
  configCache = null;
}

// Validate that a path is within a configured repo root
function isPathWithinRepos(targetPath: string): boolean {
  const config = getCachedConfig();
  const normalized = path.resolve(targetPath);
  return config.repos.some((repo) => {
    const resolved = path.resolve(repo);
    return normalized === resolved || normalized.startsWith(resolved + path.sep);
  });
}

// Validate branch name to prevent flag injection
function isValidBranchName(name: string): boolean {
  return name.length > 0 && !name.startsWith('-');
}

// Filesystem IPC handlers
ipcMain.handle('fs:list-subdirectories', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return [];
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
  if (!isPathWithinRepos(dirPath)) return false;
  try {
    const stat = await fs.promises.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
});

// Git IPC handlers
ipcMain.handle('git:get-branch', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return null;
  return new Promise<string | null>((resolve) => {
    execFile('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dirPath }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.trim() || null);
    });
  });
});

ipcMain.handle('git:get-diff', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return '';

  const run = (args: string[]): Promise<string> =>
    new Promise((resolve) => {
      execFile('git', args, { cwd: dirPath, maxBuffer: 1024 * 1024 }, (err, stdout) => {
        resolve(err ? '' : stdout);
      });
    });

  // Tracked file changes
  const trackedDiff = await run(['diff']);

  // Untracked files
  const untrackedList = await run(['ls-files', '--others', '--exclude-standard']);
  let untrackedDiff = '';
  for (const file of untrackedList.split('\n').filter(Boolean)) {
    const emptyRef = process.platform === 'win32' ? 'NUL' : '/dev/null';
    const content = await run(['diff', '--no-index', '--', emptyRef, file]);
    // Rewrite header so the parser sees a clean path
    untrackedDiff += content.replace(
      /^diff --git .+$/m,
      `diff --git a/${file} b/${file}`
    ).replace(/^(\+\+\+) .+$/m, `+++ b/${file}`) + '\n';
  }

  return trackedDiff + untrackedDiff;
});

ipcMain.handle('git:fetch', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return false;
  return new Promise<boolean>((resolve) => {
    execFile('git', ['fetch', '--all', '--prune'], { cwd: dirPath, timeout: 30000 }, (err) => {
      resolve(!err);
    });
  });
});

ipcMain.handle('git:list-branches', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return [];
  return new Promise<string[]>((resolve) => {
    execFile('git', ['branch', '-a', '--format=%(refname:short)'], { cwd: dirPath, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve([]);
      const branches = stdout.split('\n').filter(Boolean);
      // Deduplicate: if origin/X exists and local X exists, keep local X only
      const local = new Set(branches.filter((b) => !b.startsWith('origin/')));
      const result = [...local];
      for (const b of branches) {
        if (b.startsWith('origin/') && b !== 'origin/HEAD') {
          const name = b.replace('origin/', '');
          if (!local.has(name)) result.push(b);
        }
      }
      resolve(result.sort());
    });
  });
});

ipcMain.handle('git:checkout', async (_event, dirPath: string, branch: string) => {
  if (!isPathWithinRepos(dirPath)) return { ok: false, error: 'Path not allowed' };
  if (!isValidBranchName(branch)) return { ok: false, error: 'Invalid branch name' };

  const run = (args: string[]): Promise<{ ok: boolean; error?: string }> =>
    new Promise((resolve) => {
      execFile('git', args, { cwd: dirPath }, (err, _stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: stderr?.trim() || err.message });
        } else {
          resolve({ ok: true });
        }
      });
    });

  if (branch.startsWith('origin/')) {
    const localName = branch.replace('origin/', '');
    // Try plain checkout first (works if local branch already exists)
    const result = await run(['checkout', localName]);
    if (result.ok) return result;
    // If local branch doesn't exist, create it tracking the remote
    return run(['checkout', '-b', localName, '--track', branch]);
  }

  return run(['checkout', branch]);
});

ipcMain.handle('git:reset-hard', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return false;
  const runGit = (args: string[]): Promise<boolean> =>
    new Promise((resolve) => {
      execFile('git', args, { cwd: dirPath }, (err) => resolve(!err));
    });
  const resetOk = await runGit(['reset', '--hard', 'HEAD']);
  if (!resetOk) return false;
  // Clean untracked files — even if this fails, tracked changes were already reverted
  await runGit(['clean', '-fd']);
  return true;
});

// PTY IPC handlers
ipcMain.handle('pty:create', (_event, cwd: string) => {
  if (!mainWindow) throw new Error('No window available');
  if (!isPathWithinRepos(cwd)) throw new Error('Path not allowed');
  return createPty(cwd, mainWindow);
});

ipcMain.on('pty:write', (_event, id: string, data: string) => {
  if (typeof id !== 'string' || typeof data !== 'string') return;
  writePty(id, data);
});
ipcMain.on('pty:resize', (_event, id: string, cols: number, rows: number) => {
  if (typeof id !== 'string' || typeof cols !== 'number' || typeof rows !== 'number') return;
  resizePty(id, cols, rows);
});
ipcMain.on('pty:close', (_event, id: string) => {
  if (typeof id !== 'string') return;
  closePty(id);
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  closeAllPtys();
  app.quit();
});
