import { useState, useEffect, useCallback, useRef } from 'react';

export interface TerminalState {
  id: string;
  ptyId: string;
  cwd: string;
  label: string;
  branch: string | null;
  createdAt: number;
}

const MAX_TERMINALS = 6;

export function useTerminals() {
  const [terminals, setTerminals] = useState<TerminalState[]>([]);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const nextIdRef = useRef(1);
  const addingRef = useRef(false);
  const terminalsRef = useRef(terminals);
  terminalsRef.current = terminals;
  const autoTypeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Listen for pty exit events (shell process died)
  useEffect(() => {
    const unsubExit = window.electronAPI.pty.onExit((ptyId) => {
      setTerminals((prev) => {
        const exited = prev.find((t) => t.ptyId === ptyId);
        if (exited) {
          setMaximizedId((m) => (m === exited.id ? null : m));
          setFocusedId((f) => (f === exited.id ? null : f));
        }
        return prev.filter((t) => t.ptyId !== ptyId);
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
      if (terminalsRef.current.length >= MAX_TERMINALS) return;
      addingRef.current = true;
      try {
        const [ptyId, branch] = await Promise.all([
          window.electronAPI.pty.create(cwd),
          window.electronAPI.git.getBranch(cwd),
        ]);
        const id = `term-${nextIdRef.current++}`;
        setTerminals((prev) => {
          if (prev.length >= MAX_TERMINALS) {
            window.electronAPI.pty.close(ptyId);
            return prev;
          }
          return [...prev, { id, ptyId, cwd, label, branch, createdAt: Date.now() }];
        });
        setFocusedId(id);
        const timer = setTimeout(() => {
          autoTypeTimers.current.delete(ptyId);
          window.electronAPI.pty.write(ptyId, 'claude\r');
        }, 500);
        autoTypeTimers.current.set(ptyId, timer);
      } catch (err) {
        console.error('Failed to spawn terminal:', err);
      } finally {
        addingRef.current = false;
      }
    },
    []
  );

  const closeTerminal = useCallback((id: string) => {
    const terminal = terminalsRef.current.find((t) => t.id === id);
    if (terminal) {
      // Clear any pending auto-type timer
      const timer = autoTypeTimers.current.get(terminal.ptyId);
      if (timer) {
        clearTimeout(timer);
        autoTypeTimers.current.delete(terminal.ptyId);
      }
      window.electronAPI.pty.close(terminal.ptyId);
    }
    setTerminals((prev) => prev.filter((t) => t.id !== id));
    setMaximizedId((prev) => (prev === id ? null : prev));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setMaximizedId((prev) => (prev === id ? null : id));
  }, []);

  const focusTerminal = useCallback((id: string) => {
    setFocusedId(id);
  }, []);

  return {
    terminals,
    maximizedId,
    focusedId,
    addTerminal,
    closeTerminal,
    toggleMaximize,
    focusTerminal,
    canAdd: terminals.length < MAX_TERMINALS,
  };
}
