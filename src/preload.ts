import { contextBridge, ipcRenderer, webFrame } from 'electron';
import type { ElectronAPI } from './types';

const api: ElectronAPI = {
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    addRepo: (path: string) => ipcRenderer.invoke('config:add-repo', path),
    removeRepo: (path: string) => ipcRenderer.invoke('config:remove-repo', path),
    reorderRepos: (repos: string[]) => ipcRenderer.invoke('config:reorder-repos', repos),
    setTheme: (theme: string) => ipcRenderer.invoke('config:set-theme', theme),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  },
  shell: {
    openPath: (dirPath: string) => ipcRenderer.invoke('shell:open-path', dirPath),
  },
  fs: {
    listSubdirectories: (dirPath: string) =>
      ipcRenderer.invoke('fs:list-subdirectories', dirPath),
    detectGitType: (dirPath: string) =>
      ipcRenderer.invoke('fs:detect-git-type', dirPath),
    directoryExists: (dirPath: string) =>
      ipcRenderer.invoke('fs:directory-exists', dirPath),
  },
  git: {
    getBranch: (dirPath: string) => ipcRenderer.invoke('git:get-branch', dirPath),
    getDiff: (dirPath: string) => ipcRenderer.invoke('git:get-diff', dirPath),
    changedFileCount: (dirPath: string) => ipcRenderer.invoke('git:changed-file-count', dirPath),
    fetch: (dirPath: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('git:fetch', dirPath),
    listBranches: (dirPath: string) => ipcRenderer.invoke('git:list-branches', dirPath),
    checkout: (dirPath: string, branch: string) => ipcRenderer.invoke('git:checkout', dirPath, branch),
    resetHard: (dirPath: string) => ipcRenderer.invoke('git:reset-hard', dirPath),
  },
  pty: {
    create: (cwd: string) => ipcRenderer.invoke('pty:create', cwd),
    write: (id: string, data: string) => ipcRenderer.send('pty:write', id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.send('pty:resize', id, cols, rows),
    close: (id: string) => ipcRenderer.send('pty:close', id),
    has: (id: string): Promise<boolean> => ipcRenderer.invoke('pty:has', id),
    onData: (callback: (id: string, data: string) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        id: string,
        data: string
      ) => callback(id, data);
      ipcRenderer.on('pty:data', handler);
      return () => {
        ipcRenderer.removeListener('pty:data', handler);
      };
    },
    onExit: (callback: (id: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string) =>
        callback(id);
      ipcRenderer.on('pty:exit', handler);
      return () => {
        ipcRenderer.removeListener('pty:exit', handler);
      };
    },
    onClaudeState: (callback: (id: string, state: string) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        id: string,
        state: string
      ) => callback(id, state);
      ipcRenderer.on('pty:claude-state', handler);
      return () => {
        ipcRenderer.removeListener('pty:claude-state', handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

contextBridge.exposeInMainWorld('zoomAPI', {
  getZoom: () => webFrame.getZoomFactor(),
  setZoom: (factor: number) => webFrame.setZoomFactor(factor),
});
