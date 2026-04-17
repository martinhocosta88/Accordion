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
  const hydratingRef = useRef(true);

  const saveManifest = useCallback((next: TerminalState[]) => {
    if (hydratingRef.current) return;
    const manifest = next.map((t) => ({ cwd: t.cwd, label: t.label }));
    window.electronAPI.config.setOpenTerminals(manifest).catch(() => {});
  }, []);

  // Listen for pty exit events (shell process died).
  // NOTE: We do NOT update the persisted manifest here — if PTYs die on sleep
  // or crash, we want the next launch to restore them, not forget them.
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

  const spawnTerminal = useCallback(
    async (cwd: string, label: string): Promise<TerminalState | null> => {
      if (terminalsRef.current.length >= MAX_TERMINALS) return null;
      const [ptyId, branch] = await Promise.all([
        window.electronAPI.pty.create(cwd),
        window.electronAPI.git.getBranch(cwd),
      ]);
      const id = `term-${nextIdRef.current++}`;
      const next: TerminalState = { id, ptyId, cwd, label, branch, createdAt: Date.now() };
      const timer = setTimeout(() => {
        autoTypeTimers.current.delete(ptyId);
        window.electronAPI.pty.write(ptyId, 'claude\r');
      }, 500);
      autoTypeTimers.current.set(ptyId, timer);
      return next;
    },
    []
  );

  const addTerminal = useCallback(
    async (cwd: string, label: string) => {
      if (addingRef.current) return;
      if (terminalsRef.current.length >= MAX_TERMINALS) return;
      addingRef.current = true;
      try {
        const created = await spawnTerminal(cwd, label);
        if (!created) return;
        const next = [...terminalsRef.current, created];
        if (next.length > MAX_TERMINALS) {
          window.electronAPI.pty.close(created.ptyId);
          return;
        }
        setTerminals(next);
        setFocusedId(created.id);
        saveManifest(next);
      } catch (err) {
        console.error('Failed to spawn terminal:', err);
      } finally {
        addingRef.current = false;
      }
    },
    [spawnTerminal, saveManifest]
  );

  // Hydrate terminals from persisted manifest on mount (once)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await window.electronAPI.config.get();
        const saved = config.openTerminals || [];
        for (const entry of saved) {
          if (cancelled) return;
          if (terminalsRef.current.length >= MAX_TERMINALS) break;
          try {
            const created = await spawnTerminal(entry.cwd, entry.label);
            if (!created || cancelled) continue;
            const next = [...terminalsRef.current, created];
            setTerminals(next);
          } catch (err) {
            console.error('Failed to restore terminal:', entry.cwd, err);
          }
        }
      } finally {
        hydratingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
      hydratingRef.current = false;
    };
  }, [spawnTerminal]);

  const closeTerminal = useCallback((id: string) => {
    const terminal = terminalsRef.current.find((t) => t.id === id);
    if (terminal) {
      const timer = autoTypeTimers.current.get(terminal.ptyId);
      if (timer) {
        clearTimeout(timer);
        autoTypeTimers.current.delete(terminal.ptyId);
      }
      window.electronAPI.pty.close(terminal.ptyId);
    }
    const next = terminalsRef.current.filter((t) => t.id !== id);
    setTerminals(next);
    setMaximizedId((prev) => (prev === id ? null : prev));
    saveManifest(next);
  }, [saveManifest]);

  const toggleMaximize = useCallback((id: string) => {
    setMaximizedId((prev) => (prev === id ? null : id));
  }, []);

  const focusTerminal = useCallback((id: string) => {
    setFocusedId(id);
  }, []);

  const swapTerminals = useCallback((idA: string, idB: string) => {
    const prev = terminalsRef.current;
    const indexA = prev.findIndex((t) => t.id === idA);
    const indexB = prev.findIndex((t) => t.id === idB);
    if (indexA === -1 || indexB === -1 || indexA === indexB) return;
    const next = [...prev];
    [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
    setTerminals(next);
    saveManifest(next);
  }, [saveManifest]);

  return {
    terminals,
    maximizedId,
    focusedId,
    addTerminal,
    closeTerminal,
    toggleMaximize,
    focusTerminal,
    swapTerminals,
    canAdd: terminals.length < MAX_TERMINALS,
  };
}
