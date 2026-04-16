import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { getXtermTheme } from '../lib/themes';
import { usePtyData } from '../hooks/usePtyData';
import type { ThemeName } from '../types';

const DIFF_COUNT_INTERVAL = 15_000;

interface TerminalPanelProps {
  ptyId: string;
  cwd: string;
  label: string;
  branch: string | null;
  theme: ThemeName;
  isMaximized: boolean;
  isFocused: boolean;
  onClose: () => void;
  onToggleMaximize: () => void;
  onFocus: () => void;
  onShowDiff: () => void;
  terminalId: string;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  dragOverId: string | null;
  dragDisabled: boolean;
}

export function TerminalPanel({
  ptyId,
  cwd,
  label,
  branch,
  theme,
  isMaximized,
  isFocused,
  onClose,
  onToggleMaximize,
  onFocus,
  onShowDiff,
  terminalId,
  onDragStart,
  onDragEnd,
  dragOverId,
  dragDisabled,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [changedFiles, setChangedFiles] = useState(0);
  const [claudeWaiting, setClaudeWaiting] = useState(false);
  const claudeWaitingRef = useRef(false);

  // Poll changed file count
  useEffect(() => {
    const refresh = () => {
      window.electronAPI.git.changedFileCount(cwd).then(setChangedFiles).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, DIFF_COUNT_INTERVAL);
    const onGitChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (cwd.toLowerCase().startsWith(detail.path.toLowerCase())) {
        refresh();
      }
    };
    window.addEventListener('git-changed', onGitChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('git-changed', onGitChanged);
    };
  }, [cwd]);

  // Listen for Claude state changes (waiting for input vs busy)
  useEffect(() => {
    const unsubscribe = window.electronAPI.pty.onClaudeState((id, state) => {
      if (id === ptyId || id === '*') {
        const waiting = state === 'waiting';
        setClaudeWaiting(waiting);
        claudeWaitingRef.current = waiting;
      }
    });
    return unsubscribe;
  }, [ptyId]);

  // Centralized data dispatch — one global listener, not one per terminal
  usePtyData(ptyId, (data) => {
    if (terminalRef.current) {
      terminalRef.current.write(data);
    }
  });

  // Initialize xterm.js and connect to pty
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      scrollback: 1000,
      fontFamily: "'Cascadia Code', 'Consolas', monospace",
      fontSize: 14,
      theme: getXtermTheme(theme),
      windowsPty: {
        backend: 'conpty',
        buildNumber: 19041,
      },
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

    // Handle Ctrl+V paste into terminal via clipboard API
    terminal.attachCustomKeyEventHandler((e) => {
      if (e.type === 'keydown' && e.key === 'v' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        navigator.clipboard.readText().then((text) => {
          if (text) window.electronAPI.pty.write(ptyId, text);
        }).catch(() => {});
        return false;
      }
      return true;
    });

    const dataDisposable = terminal.onData((data) => {
      window.electronAPI.pty.write(ptyId, data);
      if (claudeWaitingRef.current) {
        claudeWaitingRef.current = false;
        setClaudeWaiting(false);
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      dataDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [ptyId]);

  // Focus the xterm instance when this terminal becomes focused
  // Also dismiss the waiting highlight — user has seen the notification
  useEffect(() => {
    if (isFocused) {
      claudeWaitingRef.current = false;
      setClaudeWaiting(false);
      if (terminalRef.current) {
        terminalRef.current.focus();
      }
    }
  }, [isFocused]);

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
    let rafPending = false;
    const refit = () => {
      rafPending = false;
      if (disposed) return;
      if (fitAddonRef.current && terminalRef.current && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth < 10 || clientHeight < 10) return;
        const term = terminalRef.current;
        fitAddonRef.current.fit();
        window.electronAPI.pty.resize(ptyId, term.cols, term.rows);
      }
    };

    const observer = new ResizeObserver(() => {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(refit);
      }
    });
    observer.observe(containerRef.current);

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [ptyId]);

  return (
    <div className={`terminal-panel${isFocused ? ' terminal-panel-focused' : ''}${claudeWaiting ? ' terminal-panel-waiting' : ''}`} onMouseDown={() => { onFocus(); if (claudeWaiting) { claudeWaitingRef.current = false; setClaudeWaiting(false); } }}>
      <div
        className={`terminal-header${isFocused ? ' terminal-header-focused' : ''}${claudeWaiting ? ' terminal-header-waiting' : ''}${dragOverId === terminalId ? ' terminal-header-drop-target' : ''}`}
        draggable={!dragDisabled}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', terminalId);
          onDragStart(terminalId);
        }}
        onDragEnd={onDragEnd}
        style={{ cursor: dragDisabled ? undefined : 'grab' }}
      >
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
            {changedFiles > 0 && (
              <span className="diff-count">{changedFiles}</span>
            )}
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
