import { useState, useEffect, useCallback, useRef } from 'react';

export interface TerminalState {
  id: string;
  ptyId: string;
  cwd: string;
  label: string;
  createdAt: number;
}

const MAX_TERMINALS = 6;

export function useTerminals() {
  const [terminals, setTerminals] = useState<TerminalState[]>([]);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const nextIdRef = useRef(1);

  // Listen for pty exit events (shell process died)
  useEffect(() => {
    const unsubExit = window.electronAPI.pty.onExit((ptyId) => {
      setTerminals((prev) => {
        const terminal = prev.find((t) => t.ptyId === ptyId);
        if (terminal) {
          setMaximizedId((maxId) =>
            maxId === terminal.id ? null : maxId
          );
        }
        return prev.filter((t) => t.ptyId !== ptyId);
      });
    });
    return unsubExit;
  }, []);

  const addTerminal = useCallback(
    async (cwd: string, label: string) => {
      const ptyId = await window.electronAPI.pty.create(cwd);
      const id = `term-${nextIdRef.current++}`;
      setTerminals((prev) => {
        if (prev.length >= MAX_TERMINALS) {
          window.electronAPI.pty.close(ptyId);
          return prev;
        }
        return [...prev, { id, ptyId, cwd, label, createdAt: Date.now() }];
      });
    },
    []
  );

  const closeTerminal = useCallback((id: string) => {
    setTerminals((prev) => {
      const terminal = prev.find((t) => t.id === id);
      if (terminal) {
        window.electronAPI.pty.close(terminal.ptyId);
        setMaximizedId((maxId) => (maxId === id ? null : maxId));
        return prev.filter((t) => t.id !== id);
      }
      return prev;
    });
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setMaximizedId((prev) => (prev === id ? null : id));
  }, []);

  return {
    terminals,
    maximizedId,
    addTerminal,
    closeTerminal,
    toggleMaximize,
    canAdd: terminals.length < MAX_TERMINALS,
  };
}
