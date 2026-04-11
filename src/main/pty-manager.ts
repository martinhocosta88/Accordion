import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';

const processes = new Map<string, pty.IPty>();
let nextId = 1;

export function createPty(cwd: string, window: BrowserWindow): string {
  const shell = process.env.COMSPEC || 'cmd.exe';
  const id = `terminal-${nextId++}`;

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cwd,
    env: process.env as Record<string, string>,
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

export function closeAllPtys(): void {
  for (const [id] of processes) {
    closePty(id);
  }
}
