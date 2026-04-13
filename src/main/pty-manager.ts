import * as pty from 'node-pty';
import * as crypto from 'crypto';
import { BrowserWindow } from 'electron';

const processes = new Map<string, pty.IPty>();

const DANGEROUS_ENV_KEYS = new Set([
  'ELECTRON_RUN_AS_NODE',
  'ELECTRON_NO_ASAR',
  'NODE_OPTIONS',
  'NODE_REPL_EXTERNAL_MODULE',
]);

function getSafeEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !DANGEROUS_ENV_KEYS.has(key)) {
      env[key] = value;
    }
  }
  return env;
}

export function createPty(cwd: string, window: BrowserWindow): string {
  const shell = process.env.COMSPEC || 'cmd.exe';
  const id = crypto.randomUUID();

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cwd,
    env: getSafeEnv(),
  });

  ptyProcess.onData((data) => {
    if (!window.isDestroyed()) {
      window.webContents.send('pty:data', id, data);
    }
  });

  ptyProcess.onExit(() => {
    processes.delete(id);
    if (!window.isDestroyed()) {
      window.webContents.send('pty:exit', id);
    }
  });

  processes.set(id, ptyProcess);
  return id;
}

export function writePty(id: string, data: string): void {
  processes.get(id)?.write(data);
}

export function resizePty(id: string, cols: number, rows: number): void {
  try {
    processes.get(id)?.resize(cols, rows);
  } catch {
    // Ignore resize errors on dead processes
  }
}

export function closePty(id: string): void {
  const p = processes.get(id);
  if (p) {
    p.kill();
    processes.delete(id);
  }
}

export function hasPty(id: string): boolean {
  return processes.has(id);
}

export function closeAllPtys(): void {
  for (const [id] of processes) {
    closePty(id);
  }
}
