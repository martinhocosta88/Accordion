import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  ptyId: string;
  label: string;
  branch: string | null;
  isMaximized: boolean;
  isFocused: boolean;
  onClose: () => void;
  onToggleMaximize: () => void;
  onFocus: () => void;
}

export function TerminalPanel({
  ptyId,
  label,
  branch,
  isMaximized,
  isFocused,
  onClose,
  onToggleMaximize,
  onFocus,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Initialize xterm.js and connect to pty
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      scrollback: 1000,
      fontFamily: "'Cascadia Code', 'Consolas', monospace",
      fontSize: 14,
      theme: {
        background: '#0d0d1a',
        foreground: '#e0e0f0',
        cursor: '#7c9cff',
        selectionBackground: '#3a3a6a',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Fit after a brief delay to let the container size settle
    requestAnimationFrame(() => {
      fitAddon.fit();
      window.electronAPI.pty.resize(ptyId, terminal.cols, terminal.rows);
    });

    // Send keystrokes to pty
    const dataDisposable = terminal.onData((data) => {
      window.electronAPI.pty.write(ptyId, data);
    });

    // Receive pty output
    const unsubData = window.electronAPI.pty.onData((id, data) => {
      if (id === ptyId) {
        terminal.write(data);
      }
    });

    return () => {
      dataDisposable.dispose();
      unsubData();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [ptyId]);

  // Re-fit on container size changes (grid reflow, maximize, window resize)
  useEffect(() => {
    if (!containerRef.current) return;

    const refit = () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit();
        window.electronAPI.pty.resize(
          ptyId,
          terminalRef.current.cols,
          terminalRef.current.rows
        );
      }
    };

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(refit);
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [ptyId]);

  return (
    <div className={`terminal-panel${isFocused ? ' terminal-panel-focused' : ''}`} onMouseDown={onFocus}>
      <div className={`terminal-header${isFocused ? ' terminal-header-focused' : ''}`}>
        <span className="terminal-label">
          {label}
          {branch && <span className="terminal-branch">{'\u2387'} {branch}</span>}
        </span>
        <div className="terminal-controls">
          <button
            className="terminal-btn"
            onClick={onToggleMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? '\u29C9' : '\u25A1'}
          </button>
          <button
            className="terminal-btn terminal-btn-close"
            onClick={onClose}
            title="Close"
          >
            {'\u2715'}
          </button>
        </div>
      </div>
      <div className="terminal-body" ref={containerRef} />
    </div>
  );
}
