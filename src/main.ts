import { app, BrowserWindow, Menu, ipcMain, dialog, shell, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { readConfig, addRepo, removeRepo, reorderRepos, setTheme, setOpenTerminals, setUiState } from './main/config-manager';
import { parseAheadBehind } from './main/git-helpers';
import {
  createPty,
  writePty,
  resizePty,
  closePty,
  hasPty,
  closeAllPtys,
} from './main/pty-manager';
import { startClaudeStateServer, stopClaudeStateServer } from './main/claude-state-server';

const CONFIG_PATH = path.join(
  app.getPath('appData'),
  'Accordion',
  'config.json'
);

let mainWindow: BrowserWindow | null = null;
let geometrySaveTimer: NodeJS.Timeout | null = null;

function scheduleGeometrySave() {
  if (!mainWindow) return;
  if (geometrySaveTimer) clearTimeout(geometrySaveTimer);
  geometrySaveTimer = setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const maximized = mainWindow.isMaximized();
    const bounds = maximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();
    invalidateConfigCache();
    setUiState(CONFIG_PATH, {
      window: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        maximized,
      },
    });
  }, 500);
}

function isPointOnAnyDisplay(x: number, y: number): boolean {
  const displays = screen.getAllDisplays();
  return displays.some((d) => {
    const { x: dx, y: dy, width, height } = d.bounds;
    return x >= dx && x < dx + width && y >= dy && y < dy + height;
  });
}

function createWindow() {
  const saved = readConfig(CONFIG_PATH).uiState?.window;
  const width = saved?.width ?? 1200;
  const height = saved?.height ?? 800;
  const options: Electron.BrowserWindowConstructorOptions = {
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    title: 'Accordion',
    icon: path.join(__dirname, '../../assets/icon.png'),
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  };
  // Only restore position if the top-left corner is on a currently connected display —
  // otherwise Electron may refuse to apply the bounds and silently fall back to defaults.
  if (
    saved &&
    typeof saved.x === 'number' &&
    typeof saved.y === 'number' &&
    isPointOnAnyDisplay(saved.x, saved.y)
  ) {
    options.x = saved.x;
    options.y = saved.y;
  }
  mainWindow = new BrowserWindow(options);
  // Apply size/position via setBounds as well — constructor options can be ignored
  // when position is off-screen, which also drops width/height on some platforms.
  const applyBounds: Electron.Rectangle = { x: options.x ?? 0, y: options.y ?? 0, width, height };
  if (typeof options.x === 'number' && typeof options.y === 'number') {
    mainWindow.setBounds(applyBounds);
  } else {
    mainWindow.setSize(width, height);
    mainWindow.center();
  }
  if (saved?.maximized) mainWindow.maximize();

  mainWindow.on('resize', scheduleGeometrySave);
  mainWindow.on('move', scheduleGeometrySave);
  mainWindow.on('maximize', scheduleGeometrySave);
  mainWindow.on('unmaximize', scheduleGeometrySave);
  mainWindow.on('close', () => {
    if (geometrySaveTimer) clearTimeout(geometrySaveTimer);
    if (mainWindow && !mainWindow.isDestroyed()) {
      const maximized = mainWindow.isMaximized();
      const bounds = maximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();
      invalidateConfigCache();
      setUiState(CONFIG_PATH, {
        window: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          maximized,
        },
      });
    }
  });

  // Keep clipboard accelerators (Ctrl+C/V/X/A) working while hiding the menu bar
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ role: 'editMenu' }])
  );
  mainWindow.setMenuBarVisibility(false);

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
ipcMain.handle('config:reorder-repos', (_event, repos: string[]) => {
  if (!Array.isArray(repos)) return readConfig(CONFIG_PATH);
  invalidateConfigCache();
  return reorderRepos(CONFIG_PATH, repos);
});
ipcMain.handle('config:set-open-terminals', (_event, terminals: unknown) => {
  invalidateConfigCache();
  setOpenTerminals(CONFIG_PATH, terminals);
});
ipcMain.handle('config:set-ui-state', (_event, partial: unknown) => {
  invalidateConfigCache();
  setUiState(CONFIG_PATH, partial);
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

// Shell IPC handler
ipcMain.handle('shell:open-path', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return;
  shell.openPath(path.resolve(dirPath));
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
  const normalized = path.resolve(targetPath).toLowerCase();
  return config.repos.some((repo) => {
    const resolved = path.resolve(repo).toLowerCase();
    return normalized === resolved || normalized.startsWith(resolved + path.sep);
  });
}

// Validate branch name to prevent flag injection
function isValidBranchName(name: string): boolean {
  return name.length > 0 && !name.startsWith('-');
}

// Detect whether a path is a git repo, worktree, or plain directory
async function detectGitType(dirPath: string): Promise<'repo' | 'worktree' | 'dir'> {
  try {
    const gitStat = await fs.promises.stat(path.join(dirPath, '.git'));
    return gitStat.isDirectory() ? 'repo' : 'worktree';
  } catch {
    return 'dir';
  }
}

// Filesystem IPC handlers
ipcMain.handle('fs:list-subdirectories', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return [];
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));
    return Promise.all(
      dirs.map(async (e) => {
        const fullPath = path.join(dirPath, e.name);
        const type = await detectGitType(fullPath);
        return { name: e.name, path: fullPath, type };
      })
    );
  } catch {
    return [];
  }
});

ipcMain.handle('fs:detect-git-type', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return 'dir';
  return detectGitType(dirPath);
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

ipcMain.handle('git:get-ahead-behind', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return { ahead: 0, behind: 0, hasUpstream: false };
  return new Promise((resolve) => {
    execFile(
      'git',
      ['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'],
      { cwd: dirPath },
      (_err, stdout, stderr) => {
        resolve(parseAheadBehind(stdout || '', stderr || null));
      }
    );
  });
});

ipcMain.handle('git:changed-file-count', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return 0;
  return new Promise<number>((resolve) => {
    execFile('git', ['status', '--short'], { cwd: dirPath, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve(0);
      resolve(stdout.split('\n').filter(Boolean).length);
    });
  });
});

ipcMain.handle('git:get-diff', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return '';

  const run = (args: string[]): Promise<string> =>
    new Promise((resolve) => {
      execFile('git', args, { cwd: dirPath, maxBuffer: 1024 * 1024 }, (err, stdout) => {
        // git diff --no-index exits 1 when differences exist; still has valid stdout
        resolve(stdout || '');
      });
    });

  // Tracked file changes
  const trackedDiff = await run(['diff']);

  // Untracked files — diff in parallel batches
  const untrackedList = await run(['ls-files', '--others', '--exclude-standard']);
  const untrackedFiles = untrackedList.split('\n').filter(Boolean);
  const emptyRef = process.platform === 'win32' ? 'NUL' : '/dev/null';

  const BATCH_SIZE = 5;
  const untrackedParts: string[] = [];
  for (let i = 0; i < untrackedFiles.length; i += BATCH_SIZE) {
    const batch = untrackedFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (file) => {
        const content = await run(['diff', '--no-index', '--', emptyRef, file]);
        return content.replace(
          /^diff --git .+$/m,
          `diff --git a/${file} b/${file}`
        ).replace(/^(\+\+\+) .+$/m, `+++ b/${file}`) + '\n';
      })
    );
    untrackedParts.push(...results);
  }

  return trackedDiff + untrackedParts.join('');
});

ipcMain.handle('git:fetch', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return { ok: false, error: 'Path not allowed' };
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    execFile('git', ['fetch', '--all', '--prune'], { cwd: dirPath, timeout: 30000 }, (err, _stdout, stderr) => {
      if (err) {
        const msg = stderr?.trim() || err.message || 'Fetch failed';
        resolve({ ok: false, error: msg });
      } else {
        resolve({ ok: true });
      }
    });
  });
});

ipcMain.handle('git:pull', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return { ok: false, error: 'Path not allowed' };
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    execFile('git', ['pull', '--ff-only'], { cwd: dirPath, timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        const msg = stderr?.trim() || stdout?.trim() || err.message || 'Pull failed';
        resolve({ ok: false, error: msg });
      } else {
        resolve({ ok: true });
      }
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

ipcMain.handle('git:stage-all', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return { ok: false, error: 'Path not allowed' };
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    execFile('git', ['add', '-A'], { cwd: dirPath, timeout: 30000 }, (err, _stdout, stderr) => {
      if (err) {
        resolve({ ok: false, error: stderr?.trim() || err.message || 'Stage failed' });
      } else {
        resolve({ ok: true });
      }
    });
  });
});

ipcMain.handle('git:commit', async (_event, dirPath: string, message: string) => {
  if (!isPathWithinRepos(dirPath)) return { ok: false, error: 'Path not allowed' };
  if (typeof message !== 'string' || !message.trim()) {
    return { ok: false, error: 'Commit message is empty' };
  }
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    execFile(
      'git',
      ['commit', '-m', message],
      { cwd: dirPath, timeout: 30000 },
      (err, stdout, stderr) => {
        if (err) {
          const msg = stderr?.trim() || stdout?.trim() || err.message || 'Commit failed';
          resolve({ ok: false, error: msg });
        } else {
          resolve({ ok: true });
        }
      }
    );
  });
});

ipcMain.handle('git:push', async (_event, dirPath: string) => {
  if (!isPathWithinRepos(dirPath)) return { ok: false, error: 'Path not allowed' };
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    execFile('git', ['push'], { cwd: dirPath, timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        const msg = stderr?.trim() || stdout?.trim() || err.message || 'Push failed';
        resolve({ ok: false, error: msg });
      } else {
        resolve({ ok: true });
      }
    });
  });
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
ipcMain.handle('pty:has', (_event, id: string) => {
  if (typeof id !== 'string') return false;
  return hasPty(id);
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  if (mainWindow) startClaudeStateServer(mainWindow);
});

app.on('window-all-closed', () => {
  stopClaudeStateServer();
  closeAllPtys();
  app.quit();
});
