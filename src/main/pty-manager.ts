import * as pty from 'node-pty';
import * as crypto from 'crypto';
import { BrowserWindow } from 'electron';
import { CLAUDE_STATE_PORT } from './claude-state-server';

const processes = new Map<string, pty.IPty>();
const cwdToPtyId = new Map<string, string>();

function normalizeCwd(cwd: string): string {
  return cwd.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
}

export function getPtyIdByCwd(cwd: string): string | null {
  return cwdToPtyId.get(normalizeCwd(cwd)) || null;
}

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
    env: {
      ...getSafeEnv(),
      ACCORDION_PTY_ID: id,
      ACCORDION_STATE_PORT: String(CLAUDE_STATE_PORT),
    },
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
  cwdToPtyId.set(normalizeCwd(cwd), id);
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
    for (const [cwd, ptyId] of cwdToPtyId) {
      if (ptyId === id) { cwdToPtyId.delete(cwd); break; }
    }
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
