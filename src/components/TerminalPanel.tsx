import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { getXtermTheme } from '../lib/themes';
import { usePtyData } from '../hooks/usePtyData';
import type { ThemeName } from '../types';

interface TerminalPanelProps {
  ptyId: string;
  label: string;
  branch: string | null;
  theme: ThemeName;
  isMaximized: boolean;
  isFocused: boolean;
  onClose: () => void;
  onToggleMaximize: () => void;
  onFocus: () => void;
  onShowDiff: () => void;
}

export function TerminalPanel({
  ptyId,
  label,
  branch,
  theme,
  isMaximized,
  isFocused,
  onClose,
  onToggleMaximize,
  onFocus,
  onShowDiff,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Centralized data dispatch — one global listener, not one per terminal
  usePtyData(ptyId, (data) => {
    terminalRef.current?.write(data);
  });

  // Initialize xterm.js and connect to pty
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      scrollback: 1000,
      fontFamily: "'Cascadia Code', 'Consolas', monospace",
      fontSize: 14,
      theme: getXtermTheme(theme),
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const rafId = requestAnimationFrame(() => {
      fitAddon.fit();
      window.electronAPI.pty.resize(ptyId, terminal.cols, terminal.rows);
    });

    const dataDisposable = terminal.onData((data) => {
      window.electronAPI.pty.write(ptyId, data);
    });

    return () => {
      cancelAnimationFrame(rafId);
      dataDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [ptyId]);

  // Update xterm theme when app theme changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = getXtermTheme(theme);
    }
  }, [theme]);

  // Re-fit on container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    const refit = () => {
      if (disposed) return;
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
      disposed = true;
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
            onClick={onShowDiff}
            title="Show diff"
          >
            {'\u0394'}
          </button>
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
