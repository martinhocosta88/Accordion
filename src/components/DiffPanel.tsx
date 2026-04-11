import { useState, useEffect } from 'react';

interface DiffFile {
  path: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
}

function parseDiff(raw: string): DiffFile[] {
  if (!raw.trim()) return [];

  const files: DiffFile[] = [];
  const fileChunks = raw.split(/^diff --git /m).filter(Boolean);

  for (const chunk of fileChunks) {
    const lines = chunk.split('\n');
    // Extract file path from "a/... b/..."
    const headerMatch = lines[0].match(/b\/(.+)/);
    const filePath = headerMatch ? headerMatch[1] : 'unknown';

    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let additions = 0;
    let deletions = 0;

    for (const line of lines.slice(1)) {
      if (line.startsWith('@@')) {
        currentHunk = { header: line, lines: [] };
        hunks.push(currentHunk);
      } else if (currentHunk) {
        if (line.startsWith('+')) {
          currentHunk.lines.push({ type: 'add', content: line.slice(1) });
          additions++;
        } else if (line.startsWith('-')) {
          currentHunk.lines.push({ type: 'remove', content: line.slice(1) });
          deletions++;
        } else if (line.startsWith(' ') || line === '') {
          currentHunk.lines.push({ type: 'context', content: line.slice(1) });
        }
      }
    }

    if (hunks.length > 0) {
      files.push({ path: filePath, hunks, additions, deletions });
    }
  }

  return files;
}

interface DiffPanelProps {
  cwd: string;
  label: string;
  onClose: () => void;
}

export function DiffPanel({ cwd, label, onClose }: DiffPanelProps) {
  const [files, setFiles] = useState<DiffFile[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.electronAPI.git.getDiff(cwd).then((raw) => {
      setFiles(parseDiff(raw));
      setLoading(false);
    });
  }, [cwd]);

  const toggleFile = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const refresh = () => {
    setLoading(true);
    window.electronAPI.git.getDiff(cwd).then((raw) => {
      setFiles(parseDiff(raw));
      setLoading(false);
    });
  };

  return (
    <div className="diff-panel">
      <div className="diff-header">
        <span className="diff-title">
          Changes &mdash; {label}
        </span>
        <div className="diff-controls">
          <button className="diff-btn" onClick={refresh} title="Refresh">
            {'\u21BB'}
          </button>
          <button className="diff-btn diff-btn-close" onClick={onClose} title="Close">
            {'\u2715'}
          </button>
        </div>
      </div>
      <div className="diff-body">
        {loading && <div className="diff-loading">Loading diff...</div>}
        {!loading && files.length === 0 && (
          <div className="diff-empty">No unstaged changes.</div>
        )}
        {!loading &&
          files.map((file) => {
            const isExpanded = expanded.has(file.path);
            return (
              <div key={file.path} className="diff-file">
                <button
                  className="diff-file-header"
                  onClick={() => toggleFile(file.path)}
                >
                  <span className="diff-file-toggle">
                    {isExpanded ? '\u25BC' : '\u25B6'}
                  </span>
                  <span className="diff-file-path">{file.path}</span>
                  <span className="diff-file-stats">
                    <span className="diff-stat-add">+{file.additions}</span>
                    <span className="diff-stat-remove">-{file.deletions}</span>
                  </span>
                </button>
                {isExpanded && (
                  <div className="diff-file-content">
                    {file.hunks.map((hunk, i) => (
                      <div key={i} className="diff-hunk">
                        <div className="diff-hunk-header">{hunk.header}</div>
                        {hunk.lines.map((line, j) => (
                          <div
                            key={j}
                            className={`diff-line diff-line-${line.type}`}
                          >
                            <span className="diff-line-prefix">
                              {line.type === 'add'
                                ? '+'
                                : line.type === 'remove'
                                  ? '-'
                                  : ' '}
                            </span>
                            <span className="diff-line-content">
                              {line.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
