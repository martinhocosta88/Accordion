import { TerminalPanel } from './TerminalPanel';
import { computeGridLayout } from '../lib/grid-layout';
import type { TerminalState } from '../hooks/useTerminals';
import type { ThemeName } from '../types';

interface TerminalGridProps {
  terminals: TerminalState[];
  maximizedId: string | null;
  focusedId: string | null;
  onClose: (id: string) => void;
  onToggleMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  theme: ThemeName;
}

export function TerminalGrid({
  terminals,
  maximizedId,
  focusedId,
  onClose,
  onToggleMaximize,
  onFocus,
  theme,
}: TerminalGridProps) {
  if (terminals.length === 0) {
    return (
      <div className="terminal-grid empty">
        <p>Select a repository from the side pane to open a terminal.</p>
      </div>
    );
  }

  // Maximized mode: show only the maximized terminal
  if (maximizedId) {
    const terminal = terminals.find((t) => t.id === maximizedId);
    if (terminal) {
      return (
        <div className="terminal-grid">
          <div className="grid-row">
            <TerminalPanel
              key={terminal.id}
              ptyId={terminal.ptyId}
              label={terminal.label}
              branch={terminal.branch}
              theme={theme}
              isMaximized={true}
              isFocused={true}
              onClose={() => onClose(terminal.id)}
              onToggleMaximize={() => onToggleMaximize(terminal.id)}
              onFocus={() => onFocus(terminal.id)}
            />
          </div>
        </div>
      );
    }
  }

  // Normal grid mode
  const layout = computeGridLayout(terminals.length);
  const row1 = terminals.slice(0, layout.row1Count);
  const row2 = terminals.slice(layout.row1Count, layout.row1Count + layout.row2Count);

  return (
    <div className="terminal-grid">
      <div className="grid-row">
        {row1.map((t) => (
          <TerminalPanel
            key={t.id}
            ptyId={t.ptyId}
            label={t.label}
            branch={t.branch}
            theme={theme}
            isMaximized={false}
            isFocused={focusedId === t.id}
            onClose={() => onClose(t.id)}
            onToggleMaximize={() => onToggleMaximize(t.id)}
            onFocus={() => onFocus(t.id)}
          />
        ))}
      </div>
      {row2.length > 0 && (
        <div className="grid-row">
          {row2.map((t) => (
            <TerminalPanel
              key={t.id}
              ptyId={t.ptyId}
              label={t.label}
              branch={t.branch}
              theme={theme}
              isMaximized={false}
              isFocused={focusedId === t.id}
              onClose={() => onClose(t.id)}
              onToggleMaximize={() => onToggleMaximize(t.id)}
              onFocus={() => onFocus(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
