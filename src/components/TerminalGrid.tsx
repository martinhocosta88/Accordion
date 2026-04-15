import { useMemo, useState } from 'react';
import { TerminalPanel } from './TerminalPanel';
import { DiffPanel } from './DiffPanel';
import { computeGridLayout } from '../lib/grid-layout';
import type { TerminalState } from '../hooks/useTerminals';
import type { ThemeName } from '../types';

interface TerminalGridProps {
  terminals: TerminalState[];
  maximizedId: string | null;
  focusedId: string | null;
  diffTerminalId: string | null;
  onClose: (id: string) => void;
  onToggleMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  onShowDiff: (terminalId: string) => void;
  onCloseDiff: () => void;
  theme: ThemeName;
  onSwapTerminals: (idA: string, idB: string) => void;
}

export function TerminalGrid({
  terminals,
  maximizedId,
  focusedId,
  diffTerminalId,
  onClose,
  onToggleMaximize,
  onFocus,
  onShowDiff,
  onCloseDiff,
  theme,
  onSwapTerminals,
}: TerminalGridProps) {
  const diffTerminal = diffTerminalId
    ? terminals.find((t) => t.id === diffTerminalId)
    : null;

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDragId(id);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const handleDrop = (targetId: string) => {
    if (dragId && dragId !== targetId) {
      onSwapTerminals(dragId, targetId);
    }
    setDragId(null);
    setDragOverId(null);
  };

  const dragDisabled = !!maximizedId || !!diffTerminalId;

  const gridStyle = useMemo((): React.CSSProperties => {
    if (diffTerminalId) {
      return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' };
    }
    if (maximizedId) {
      return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
    }
    const layout = computeGridLayout(terminals.length);
    const cols = layout.row1Count || 1;
    const rows = layout.row2Count > 0 ? 2 : 1;
    return {
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
    };
  }, [terminals.length, diffTerminalId, maximizedId]);

  if (terminals.length === 0) {
    return (
      <div className="terminal-grid empty">
        <p>Select a repository from the side pane to open a terminal.</p>
      </div>
    );
  }

  const isVisible = (id: string) => {
    if (diffTerminalId) return id === diffTerminalId;
    if (maximizedId) return id === maximizedId;
    return true;
  };

  return (
    <div className="terminal-grid" style={gridStyle}>
      {terminals.map((t) => (
        <div
          key={t.id}
          className={isVisible(t.id) ? `terminal-cell${dragId === t.id ? ' terminal-cell-dragging' : ''}` : 'terminal-cell-hidden'}
          onDragOver={(e) => {
            e.preventDefault();
            if (dragId && dragId !== t.id) setDragOverId(t.id);
          }}
          onDragLeave={() => setDragOverId(null)}
        >
          <TerminalPanel
            ptyId={t.ptyId}
            cwd={t.cwd}
            label={t.label}
            branch={t.branch}
            theme={theme}
            isMaximized={maximizedId === t.id}
            isFocused={diffTerminalId ? t.id === diffTerminalId : focusedId === t.id}
            onClose={() => onClose(t.id)}
            onToggleMaximize={() => onToggleMaximize(t.id)}
            onFocus={() => onFocus(t.id)}
            onShowDiff={() => onShowDiff(t.id)}
            terminalId={t.id}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            dragOverId={dragOverId}
            dragDisabled={dragDisabled}
          />
        </div>
      ))}
      {diffTerminal && (
        <DiffPanel
          cwd={diffTerminal.cwd}
          label={diffTerminal.label}
          ptyId={diffTerminal.ptyId}
          onClose={onCloseDiff}
        />
      )}
    </div>
  );
}
