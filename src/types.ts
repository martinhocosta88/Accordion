export const VALID_THEMES = ['accordion', 'carbon', 'midnight', 'light'] as const;
export type ThemeName = (typeof VALID_THEMES)[number];

export interface AppConfig {
  repos: string[];
  theme: ThemeName;
}

export type DirType = 'repo' | 'worktree' | 'dir';

export interface SubDirectory {
  name: string;
  path: string;
  type: DirType;
}

export interface ElectronAPI {
  config: {
    get(): Promise<AppConfig>;
    addRepo(path: string): Promise<AppConfig>;
    removeRepo(path: string): Promise<AppConfig>;
    reorderRepos(repos: string[]): Promise<AppConfig>;
    setTheme(theme: string): Promise<AppConfig>;
  };
  dialog: {
    selectDirectory(): Promise<string | null>;
  };
  shell: {
    openPath(dirPath: string): Promise<void>;
  };
  fs: {
    listSubdirectories(dirPath: string): Promise<SubDirectory[]>;
    detectGitType(dirPath: string): Promise<DirType>;
    directoryExists(dirPath: string): Promise<boolean>;
  };
  git: {
    getBranch(dirPath: string): Promise<string | null>;
    getDiff(dirPath: string): Promise<string>;
    changedFileCount(dirPath: string): Promise<number>;
    fetch(dirPath: string): Promise<{ ok: boolean; error?: string }>;
    listBranches(dirPath: string): Promise<string[]>;
    checkout(dirPath: string, branch: string): Promise<{ ok: boolean; error?: string }>;
    resetHard(dirPath: string): Promise<boolean>;
  };
  pty: {
    create(cwd: string): Promise<string>;
    write(id: string, data: string): void;
    resize(id: string, cols: number, rows: number): void;
    close(id: string): void;
    has(id: string): Promise<boolean>;
    onData(callback: (id: string, data: string) => void): () => void;
    onExit(callback: (id: string) => void): () => void;
    onClaudeState(callback: (id: string, state: string) => void): () => void;
  };
}

export interface ZoomAPI {
  getZoom(): number;
  setZoom(factor: number): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    zoomAPI: ZoomAPI;
  }
}
