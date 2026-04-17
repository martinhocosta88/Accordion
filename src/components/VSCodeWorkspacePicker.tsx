import { useEffect, useRef } from 'react';

interface Props {
  folderPath: string;
  workspaces: string[];
  onPick: (target: string) => void;
  onCancel: () => void;
}

const ICON_FOLDER = '\u25AD';     // ▭ white rectangle
const ICON_WORKSPACE = '\u25A4';  // ▤ square with horizontal fill

function basename(p: string): string {
  return p.split(/[\\/]/).pop() || p;
}

export function VSCodeWorkspacePicker({ folderPath, workspaces, onPick, onCancel }: Props) {
  const firstBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="settings-overlay" onClick={onCancel}>
      <div className="confirm-dialog vscode-picker" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-dialog-message">Open in VS Code</p>
        <div className="vscode-picker-list">
          <button
            ref={firstBtnRef}
            className="vscode-picker-item"
            onClick={() => onPick(folderPath)}
          >
            <span className="vscode-picker-icon">{ICON_FOLDER}</span>
            <span className="vscode-picker-label">Folder ({basename(folderPath)})</span>
          </button>
          {workspaces.map((w) => (
            <button
              key={w}
              className="vscode-picker-item"
              onClick={() => onPick(w)}
            >
              <span className="vscode-picker-icon">{ICON_WORKSPACE}</span>
              <span className="vscode-picker-label">{basename(w)}</span>
            </button>
          ))}
        </div>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
