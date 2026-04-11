import { useState, useEffect } from 'react';
import { ContextMenu } from './ContextMenu';
import { BranchPicker } from './BranchPicker';
import { ConfirmDialog } from './ConfirmDialog';
import { useGitActions } from '../hooks/useGitActions';
import type { SubDirectory } from '../types';

interface SubDirItemProps {
  sub: SubDirectory;
  repoName: string;
  parentLabel: string;
  onOpenTerminal: (cwd: string, label: string) => void;
  disabled: boolean;
  activeTerminalPaths: string[];
}

function SubDirItem({
  sub,
  repoName,
  parentLabel,
  onOpenTerminal,
  disabled,
  activeTerminalPaths,
}: SubDirItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<SubDirectory[]>([]);
  const isActive = activeTerminalPaths.includes(sub.path);

  const git = useGitActions(sub.path);

  const handleToggle = async () => {
    if (!expanded) {
      const dirs = await window.electronAPI.fs.listSubdirectories(sub.path);
      setChildren(dirs);
    }
    setExpanded(!expanded);
  };

  const handleClick = () => {
    if (!disabled) {
      onOpenTerminal(sub.path, parentLabel);
    }
  };

  return (
    <div className="repo-subdir-container">
      <div
        className={`repo-subdir${isActive ? ' repo-subdir-active' : ''}`}
        onContextMenu={(e) => git.handleContextMenu(e, true)}
      >
        <button className="repo-toggle" onClick={handleToggle}>
          {expanded ? '\u25BC' : '\u25B6'}
        </button>
        <div className="repo-subdir-content">
          <button
            className="repo-subdir-name"
            onClick={handleClick}
            disabled={disabled}
          >
            <span className="repo-icon">{'\uD83D\uDCC2'}</span>
            {sub.name}
          </button>
          {git.branch && (
            <div className="repo-branch">{'\u2387'} {git.branch}</div>
          )}
        </div>
      </div>
      {expanded && children.length > 0 && (
        <div className="repo-subdirs">
          {children.map((child) => {
            const childIsActive = activeTerminalPaths.includes(child.path);
            return (
              <button
                key={child.path}
                className={`repo-subdir repo-subdir-leaf${childIsActive ? ' repo-subdir-active' : ''}`}
                onClick={() => {
                  if (!disabled) {
                    onOpenTerminal(child.path, `${repoName} / ${sub.name} / ${child.name}`);
                  }
                }}
                disabled={disabled}
              >
                <span className="repo-icon">{'\uD83D\uDCC2'}</span>
                {child.name}
              </button>
            );
          })}
        </div>
      )}
      {git.contextMenu && (
        <ContextMenu
          x={git.contextMenu.x}
          y={git.contextMenu.y}
          items={git.contextMenuItems}
          onClose={() => git.setContextMenu(null)}
        />
      )}
      {git.showBranchPicker && (
        <BranchPicker
          repoPath={sub.path}
          currentBranch={git.branch}
          onClose={() => git.setShowBranchPicker(false)}
          onBranchChanged={git.handleBranchChanged}
        />
      )}
      {git.showRevertConfirm && (
        <ConfirmDialog
          message="Revert all uncommitted changes? This cannot be undone."
          confirmLabel="Revert"
          onConfirm={git.handleRevert}
          onCancel={() => git.setShowRevertConfirm(false)}
        />
      )}
    </div>
  );
}

interface RepoItemProps {
  repoPath: string;
  onOpenTerminal: (cwd: string, label: string) => void;
  disabled: boolean;
  activeTerminalPaths: string[];
}

export function RepoItem({
  repoPath,
  onOpenTerminal,
  disabled,
  activeTerminalPaths,
}: RepoItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [subdirs, setSubdirs] = useState<SubDirectory[]>([]);
  const [exists, setExists] = useState(true);

  const git = useGitActions(repoPath);

  const repoName = repoPath.split(/[\\/]/).pop() || repoPath;
  const isActive = activeTerminalPaths.includes(repoPath);

  useEffect(() => {
    window.electronAPI.fs.directoryExists(repoPath).then(setExists);
  }, [repoPath]);

  const handleToggle = async () => {
    if (!expanded) {
      const dirs = await window.electronAPI.fs.listSubdirectories(repoPath);
      setSubdirs(dirs);
    }
    setExpanded(!expanded);
  };

  const handleClick = () => {
    if (!disabled && exists) {
      onOpenTerminal(repoPath, repoName);
    }
  };

  if (!exists) {
    return (
      <div className="repo-item repo-item-missing" title="Directory not found">
        <span className="repo-toggle">{'\u25B6'}</span>
        <span className="repo-icon">{'\uD83D\uDCC1'}</span>
        <span className="repo-name">{repoName}</span>
        <span className="repo-warning">{'\u26A0'}</span>
      </div>
    );
  }

  return (
    <div className="repo-item-container">
      <div
        className={`repo-item${isActive ? ' repo-item-active' : ''}${disabled ? ' repo-item-disabled' : ''}`}
        onContextMenu={(e) => git.handleContextMenu(e)}
      >
        <button className="repo-toggle" onClick={handleToggle}>
          {expanded ? '\u25BC' : '\u25B6'}
        </button>
        <div className="repo-item-content">
          <button
            className="repo-name"
            onClick={handleClick}
            disabled={disabled}
          >
            <span className="repo-icon">{'\uD83D\uDCC1'}</span>
            {repoName}
          </button>
          {git.branch && (
            <div className="repo-branch">{'\u2387'} {git.branch}</div>
          )}
        </div>
      </div>
      {expanded && subdirs.length > 0 && (
        <div className="repo-subdirs">
          {subdirs.map((sub) => (
            <SubDirItem
              key={sub.path}
              sub={sub}
              repoName={repoName}
              parentLabel={`${repoName} / ${sub.name}`}
              onOpenTerminal={onOpenTerminal}
              disabled={disabled}
              activeTerminalPaths={activeTerminalPaths}
            />
          ))}
        </div>
      )}
      {git.contextMenu && (
        <ContextMenu
          x={git.contextMenu.x}
          y={git.contextMenu.y}
          items={git.contextMenuItems}
          onClose={() => git.setContextMenu(null)}
        />
      )}
      {git.showBranchPicker && (
        <BranchPicker
          repoPath={repoPath}
          currentBranch={git.branch}
          onClose={() => git.setShowBranchPicker(false)}
          onBranchChanged={git.handleBranchChanged}
        />
      )}
      {git.showRevertConfirm && (
        <ConfirmDialog
          message="Revert all uncommitted changes? This cannot be undone."
          confirmLabel="Revert"
          onConfirm={git.handleRevert}
          onCancel={() => git.setShowRevertConfirm(false)}
        />
      )}
    </div>
  );
}
