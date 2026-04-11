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
  const addingRef = useRef(false);

  // Listen for pty exit events (shell process died)
  useEffect(() => {
    const unsubExit = window.electronAPI.pty.onExit((ptyId) => {
      setTerminals((prev) => prev.filter((t) => t.ptyId !== ptyId));
      setMaximizedId((prev) => {
        // We need to check if the exited pty was the maximized one
        // This is handled by the cleanup in the next render cycle
        return prev;
      });
    });
    return unsubExit;
  }, []);

  // Clear maximizedId if the maximized terminal no longer exists
  useEffect(() => {
    if (maximizedId && !terminals.find((t) => t.id === maximizedId)) {
      setMaximizedId(null);
    }
  }, [terminals, maximizedId]);

  const addTerminal = useCallback(
    async (cwd: string, label: string) => {
      if (addingRef.current) return;
      if (terminals.length >= MAX_TERMINALS) return;
      addingRef.current = true;
      try {
        const ptyId = await window.electronAPI.pty.create(cwd);
        const id = `term-${nextIdRef.current++}`;
        setTerminals((prev) => {
          if (prev.length >= MAX_TERMINALS) {
            window.electronAPI.pty.close(ptyId);
            return prev;
          }
          return [...prev, { id, ptyId, cwd, label, createdAt: Date.now() }];
        });
      } catch (err) {
        console.error('Failed to spawn terminal:', err);
      } finally {
        addingRef.current = false;
      }
    },
    [terminals.length]
  );

  const closeTerminal = useCallback((id: string) => {
    setTerminals((prev) => {
      const terminal = prev.find((t) => t.id === id);
      if (terminal) {
        window.electronAPI.pty.close(terminal.ptyId);
        return prev.filter((t) => t.id !== id);
      }
      return prev;
    });
    setMaximizedId((prev) => (prev === id ? null : prev));
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
