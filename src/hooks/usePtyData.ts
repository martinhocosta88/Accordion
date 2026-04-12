import { useEffect, useRef } from 'react';

type PtyDataHandler = (data: string) => void;

const handlers = new Map<string, PtyDataHandler>();
let globalUnsub: (() => void) | null = null;
let refCount = 0;

function ensureGlobalListener() {
  if (globalUnsub) return;
  globalUnsub = window.electronAPI.pty.onData((id, data) => {
    handlers.get(id)?.(data);
  });
}

function releaseGlobalListener() {
  if (globalUnsub && refCount === 0) {
    globalUnsub();
    globalUnsub = null;
  }
}

export function usePtyData(ptyId: string, handler: PtyDataHandler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    refCount++;
    ensureGlobalListener();

    const wrappedHandler: PtyDataHandler = (data) => handlerRef.current(data);
    handlers.set(ptyId, wrappedHandler);

    return () => {
      handlers.delete(ptyId);
      refCount--;
      releaseGlobalListener();
    };
  }, [ptyId]);
}
