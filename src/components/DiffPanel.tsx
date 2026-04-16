import { useState, useEffect, useRef } from 'react';

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
        if (line.startsWith('\\ ')) {
          // Skip "\ No newline at end of file" markers
        } else if (line.startsWith('+')) {
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

// Key for identifying a specific diff line for commenting
interface CommentTarget {
  filePath: string;
  hunkIndex: number;
  lineIndex: number;
  selectedText?: string; // specific text selection within the line
}

function sameTarget(a: CommentTarget | null, b: CommentTarget): boolean {
  return !!a && a.filePath === b.filePath && a.hunkIndex === b.hunkIndex && a.lineIndex === b.lineIndex;
}

interface DiffPanelProps {
  cwd: string;
  label: string;
  ptyId: string;
  onClose: () => void;
}

export function DiffPanel({ cwd, label, ptyId, onClose }: DiffPanelProps) {
  const [files, setFiles] = useState<DiffFile[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [commentText, setCommentText] = useState('');
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const textSelectHandledRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    window.electronAPI.git.getDiff(cwd).then((raw) => {
      const parsed = parseDiff(raw);
      setFiles(parsed);
      setExpanded(new Set(parsed.map((f) => f.path)));
      setLoading(false);
    }).catch(() => {
      setFiles([]);
      setLoading(false);
    });
  }, [cwd]);

  // Focus the comment input when it appears
  useEffect(() => {
    if (commentTarget && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [commentTarget]);

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
    setCommentTarget(null);
    window.electronAPI.git.getDiff(cwd).then((raw) => {
      const parsed = parseDiff(raw);
      setFiles(parsed);
      setExpanded(new Set(parsed.map((f) => f.path)));
      setLoading(false);
    }).catch(() => {
      setFiles([]);
      setLoading(false);
    });
  };

  const handleLineClick = (filePath: string, hunkIndex: number, lineIndex: number) => {
    // If mouseup just handled a text selection, skip the click
    if (textSelectHandledRef.current) {
      textSelectHandledRef.current = false;
      return;
    }

    const target: CommentTarget = { filePath, hunkIndex, lineIndex };
    if (sameTarget(commentTarget, target)) {
      setCommentTarget(null);
      setCommentText('');
    } else {
      setCommentTarget(target);
      setCommentText('');
    }
  };

  const handleTextSelect = (filePath: string, hunkIndex: number, lineIndex: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const selected = sel.toString().trim();
    if (!selected) return;

    // Verify the selection is within a diff-line-content span
    const anchor = sel.anchorNode?.parentElement;
    const focus = sel.focusNode?.parentElement;
    const isInContent = (el: Element | null | undefined) =>
      el?.closest('.diff-line-content') != null;
    if (!isInContent(anchor) && !isInContent(focus)) return;

    textSelectHandledRef.current = true;
    setCommentTarget({ filePath, hunkIndex, lineIndex, selectedText: selected });
    setCommentText('');
    sel.removeAllRanges();
  };

  const safePtyWrite = async (data: string) => {
    const alive = await window.electronAPI.pty.has(ptyId);
    if (!alive) return;
    window.electronAPI.pty.write(ptyId, data);
  };

  const sendComment = () => {
    if (!commentTarget || !commentText.trim()) return;

    const file = files.find((f) => f.path === commentTarget.filePath);
    if (!file) return;

    const hunk = file.hunks[commentTarget.hunkIndex];
    if (!hunk) return;

    const line = hunk.lines[commentTarget.lineIndex];
    if (!line) return;

    const prefix = line.type === 'add' ? '+' : '-';
    let message: string;
    if (commentTarget.selectedText) {
      message = [
        `In ${file.path}, regarding \`${commentTarget.selectedText}\` in this change:`,
        `${prefix} ${line.content}`,
        ``,
        commentText.trim(),
      ].join('\n');
    } else {
      message = [
        `In ${file.path}, regarding this change:`,
        `${prefix} ${line.content}`,
        ``,
        commentText.trim(),
      ].join('\n');
    }

    safePtyWrite(message + '\n');

    setCommentTarget(null);
    setCommentText('');
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendComment();
    } else if (e.key === 'Escape') {
      setCommentTarget(null);
      setCommentText('');
    }
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
                    {file.hunks.map((hunk, hi) => (
                      <div key={hi} className="diff-hunk">
                        <div className="diff-hunk-header">{hunk.header}</div>
                        {hunk.lines.map((line, li) => {
                          const isClickable = line.type !== 'context';
                          const isActive = sameTarget(commentTarget, {
                            filePath: file.path,
                            hunkIndex: hi,
                            lineIndex: li,
                          });
                          return (
                            <div key={li}>
                              <div
                                className={`diff-line diff-line-${line.type}${isClickable ? ' diff-line-clickable' : ''}${isActive ? ' diff-line-active' : ''}`}
                                onClick={isClickable ? () => handleLineClick(file.path, hi, li) : undefined}
                                onMouseUp={isClickable ? () => handleTextSelect(file.path, hi, li) : undefined}
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
                              {isActive && (
                                <div className="diff-comment">
                                  {commentTarget?.selectedText && (
                                    <div className="diff-comment-selection">
                                      Selected: <code>{commentTarget.selectedText}</code>
                                    </div>
                                  )}
                                  <textarea
                                    ref={commentInputRef}
                                    className="diff-comment-input"
                                    placeholder="Type feedback for Claude... (Enter to send, Esc to cancel)"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={handleCommentKeyDown}
                                    rows={2}
                                  />
                                  <div className="diff-comment-actions">
                                    <button
                                      className="diff-comment-send"
                                      onClick={sendComment}
                                      disabled={!commentText.trim()}
                                    >
                                      Send to Claude
                                    </button>
                                    <button
                                      className="diff-comment-cancel"
                                      onClick={() => {
                                        setCommentTarget(null);
                                        setCommentText('');
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
      <div className="diff-footer">
        <button
          className="diff-finalize-btn"
          onClick={async () => {
            await safePtyWrite(
              'I have finished reviewing the diff. Please apply all the feedback I provided above.\r'
            );
            onClose();
          }}
        >
          Finalize Review
        </button>
      </div>
    </div>
  );
}
