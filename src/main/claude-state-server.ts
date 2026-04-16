import * as http from 'http';
import { BrowserWindow } from 'electron';
import { getPtyIdByCwd } from './pty-manager';

export const CLAUDE_STATE_PORT = 19222;

let server: http.Server | null = null;

export function startClaudeStateServer(window: BrowserWindow): void {
  server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${CLAUDE_STATE_PORT}`);
    if (url.pathname !== '/claude-state') {
      res.writeHead(404);
      res.end();
      return;
    }

    const rawCwd = url.searchParams.get('cwd');
    let resolvedPtyId: string | null = null;
    if (rawCwd) {
      try { resolvedPtyId = getPtyIdByCwd(decodeURIComponent(rawCwd)); }
      catch { resolvedPtyId = getPtyIdByCwd(rawCwd); }
    }
    const ptyId = (req.headers['x-pty-id'] as string) || url.searchParams.get('ptyId') || resolvedPtyId || '*';
    const state = url.searchParams.get('state');
    if (!state) {
      res.writeHead(400);
      res.end();
      return;
    }

    if (!window.isDestroyed()) {
      window.webContents.send('pty:claude-state', ptyId, state);
    }

    res.writeHead(200);
    res.end('ok');
  });

  server.listen(CLAUDE_STATE_PORT, '127.0.0.1');
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Claude state server port ${CLAUDE_STATE_PORT} in use, feature disabled`);
    }
  });
}

export function stopClaudeStateServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
