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
ipcMain.handle('config:add-repo', (_event, repoPath: string) =>
  addRepo(CONFIG_PATH, repoPath)
);
ipcMain.handle('config:remove-repo', (_event, repoPath: string) =>
  removeRepo(CONFIG_PATH, repoPath)
);
ipcMain.handle('config:set-theme', (_event, theme: string) =>
  setTheme(CONFIG_PATH, theme)
);

// Dialog IPC handler
ipcMain.handle('dialog:select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Validate that a path is within a configured repo root
function isPathWithinRepos(targetPath: string): boolean {
  const config = readConfig(CONFIG_PATH);
  const normalized = path.resolve(targetPath);
  return config.repos.some((repo) => normalized.startsWith(path.resolve(repo)));
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
    const content = await run(['diff', '--no-index', '--', '/dev/null', file]);
    // Rewrite header so the parser sees a clean path
    untrackedDiff += content.replace(
      /^diff --git .+$/m,
      `diff --git a/${file} b/${file}`
    ).replace(/^(\+\+\+) .+$/m, `+++ b/${file}`) + '\n';
  }

  return trackedDiff + untrackedDiff;
});

// PTY IPC handlers
ipcMain.handle('pty:create', (_event, cwd: string) => {
  if (!mainWindow) throw new Error('No window available');
  return createPty(cwd, mainWindow);
});

ipcMain.on('pty:write', (_event, id: string, data: string) =>
  writePty(id, data)
);
ipcMain.on('pty:resize', (_event, id: string, cols: number, rows: number) =>
  resizePty(id, cols, rows)
);
ipcMain.on('pty:close', (_event, id: string) => closePty(id));

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  closeAllPtys();
  app.quit();
});
