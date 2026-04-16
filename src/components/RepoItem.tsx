import { useState, useEffect, useMemo } from 'react';
import { ContextMenu } from './ContextMenu';
import type { MenuItem } from './ContextMenu';
import { BranchPicker } from './BranchPicker';
import { ConfirmDialog } from './ConfirmDialog';
import { useGitActions } from '../hooks/useGitActions';
import type { DirType, SubDirectory } from '../types';

const ICON_REPO = '\uD83D\uDCE6';     // 📦
const ICON_WORKTREE = '\uD83D\uDD17';  // 🔗
const ICON_DIR = '\uD83D\uDCC1';       // 📁

function gitIcon(type: DirType): string {
  if (type === 'worktree') return ICON_WORKTREE;
  if (type === 'repo') return ICON_REPO;
  return ICON_DIR;
}

interface SubDirItemProps {
  sub: SubDirectory;
  repoName: string;
  parentLabel: string;
  onOpenTerminal: (cwd: string, label: string) => void;
  disabled: boolean;
  activeTerminalPaths: string[];
  focusedTerminalPath: string | null;
}

function SubDirItem({
  sub,
  repoName,
  parentLabel,
  onOpenTerminal,
  disabled,
  activeTerminalPaths,
  focusedTerminalPath,
}: SubDirItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<SubDirectory[] | null>(null);
  const isActive = activeTerminalPaths.includes(sub.path);
  const isFocused = focusedTerminalPath === sub.path;

  const git = useGitActions(sub.path);

  const gitChildren = children ? children.filter((c) => c.type !== 'dir') : [];
  const hasExpandableChildren = children === null || gitChildren.length > 0;

  useEffect(() => {
    window.electronAPI.fs.listSubdirectories(sub.path).then(setChildren).catch(() => setChildren([]));
  }, [sub.path]);

  const handleClick = () => {
    if (!disabled) {
      onOpenTerminal(sub.path, parentLabel);
    }
  };

  return (
    <div className="repo-subdir-container">
      <div
        className={`repo-subdir${isActive ? ' repo-subdir-active' : ''}${isFocused ? ' repo-subdir-focused' : ''}`}
        onContextMenu={(e) => git.handleContextMenu(e, true)}
      >
        <div className="repo-subdir-content">
          <button
            className="repo-subdir-name"
            onClick={handleClick}
            disabled={disabled}
          >
            <span className="repo-icon">{gitIcon(sub.type)}</span>
            <span className="repo-text-truncate">{sub.name}</span>
          </button>
          {git.branch && (
            <div className="repo-branch">
              <span className="repo-branch-text">{'\u2387'} {git.branch}</span>
              {git.aheadBehind?.hasUpstream && git.aheadBehind.ahead > 0 && (
                <span className="repo-ahead" title={`${git.aheadBehind.ahead} ahead of upstream`}>
                  {'\u2191'}{git.aheadBehind.ahead}
                </span>
              )}
              {git.aheadBehind?.hasUpstream && git.aheadBehind.behind > 0 && (
                <span className="repo-behind" title={`${git.aheadBehind.behind} behind upstream`}>
                  {'\u2193'}{git.aheadBehind.behind}
                </span>
              )}
              {git.fetching && <span className="repo-fetch-status" title="Fetching...">{'\u21BB'}</span>}
              {git.fetchError && <span className="repo-fetch-error" title={git.fetchError}>{'\u26A0'}</span>}
            </div>
          )}
        </div>
        {hasExpandableChildren && (
          <button className="repo-toggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? '\u25BC' : '\u25B6'}
          </button>
        )}
      </div>
      {expanded && gitChildren.length > 0 && (
        <div className="repo-subdirs">
          {gitChildren.map((child) => {
            const childIsActive = activeTerminalPaths.includes(child.path);
            const childIsFocused = focusedTerminalPath === child.path;
            return (
              <button
                key={child.path}
                className={`repo-subdir repo-subdir-leaf${childIsActive ? ' repo-subdir-active' : ''}${childIsFocused ? ' repo-subdir-focused' : ''}`}
                onClick={() => {
                  if (!disabled) {
                    onOpenTerminal(child.path, `${repoName} / ${sub.name} / ${child.name}`);
                  }
                }}
                disabled={disabled}
              >
                <span className="repo-icon">{gitIcon(child.type)}</span>
                <span className="repo-text-truncate">{child.name}</span>
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
  focusedTerminalPath: string | null;
  onRemove?: () => void;
}

export function RepoItem({
  repoPath,
  onOpenTerminal,
  disabled,
  activeTerminalPaths,
  focusedTerminalPath,
  onRemove,
}: RepoItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [subdirs, setSubdirs] = useState<SubDirectory[] | null>(null);
  const [exists, setExists] = useState(true);
  const [gitType, setGitType] = useState<DirType>('dir');

  const git = useGitActions(repoPath);

  const menuItems = useMemo((): MenuItem[] => {
    const items = [...git.contextMenuItems];
    if (onRemove) {
      items.push({
        label: 'Remove from List',
        icon: '\u2715',
        separator: true,
        onClick: onRemove,
      });
    }
    return items;
  }, [git.contextMenuItems, onRemove]);

  const repoName = repoPath.split(/[\\/]/).pop() || repoPath;
  const isActive = activeTerminalPaths.includes(repoPath);
  const isFocused = focusedTerminalPath === repoPath;

  const gitSubdirs = subdirs ? subdirs.filter((s) => s.type !== 'dir') : [];
  const hasExpandableChildren = subdirs === null || gitSubdirs.length > 0;

  useEffect(() => {
    window.electronAPI.fs.directoryExists(repoPath).then(setExists).catch(() => setExists(false));
    window.electronAPI.fs.detectGitType(repoPath).then(setGitType).catch(() => {});
    window.electronAPI.fs.listSubdirectories(repoPath).then(setSubdirs).catch(() => setSubdirs([]));
  }, [repoPath]);

  const handleClick = () => {
    if (!disabled && exists) {
      onOpenTerminal(repoPath, repoName);
    }
  };

  if (!exists) {
    return (
      <div className="repo-item repo-item-missing" title="Directory not found">
        <span className="repo-icon">{ICON_DIR}</span>
        <span className="repo-name">{repoName}</span>
        <span className="repo-warning">{'\u26A0'}</span>
      </div>
    );
  }

  return (
    <div className="repo-item-container">
      <div
        className={`repo-item${isActive ? ' repo-item-active' : ''}${isFocused ? ' repo-item-focused' : ''}${disabled ? ' repo-item-disabled' : ''}`}
        onContextMenu={(e) => git.handleContextMenu(e)}
      >
        <div className="repo-item-content">
          <button
            className="repo-name"
            onClick={handleClick}
            disabled={disabled}
          >
            <span className="repo-icon">{gitIcon(gitType)}</span>
            <span className="repo-text-truncate">{repoName}</span>
          </button>
          {git.branch && (
            <div className="repo-branch">
              <span className="repo-branch-text">{'\u2387'} {git.branch}</span>
              {git.aheadBehind?.hasUpstream && git.aheadBehind.ahead > 0 && (
                <span className="repo-ahead" title={`${git.aheadBehind.ahead} ahead of upstream`}>
                  {'\u2191'}{git.aheadBehind.ahead}
                </span>
              )}
              {git.aheadBehind?.hasUpstream && git.aheadBehind.behind > 0 && (
                <span className="repo-behind" title={`${git.aheadBehind.behind} behind upstream`}>
                  {'\u2193'}{git.aheadBehind.behind}
                </span>
              )}
              {git.fetching && <span className="repo-fetch-status" title="Fetching...">{'\u21BB'}</span>}
              {git.fetchError && <span className="repo-fetch-error" title={git.fetchError}>{'\u26A0'}</span>}
            </div>
          )}
        </div>
        {hasExpandableChildren && (
          <button className="repo-toggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? '\u25BC' : '\u25B6'}
          </button>
        )}
      </div>
      {expanded && gitSubdirs.length > 0 && (
        <div className="repo-subdirs">
          {gitSubdirs.map((sub) => (
            <SubDirItem
              key={sub.path}
              sub={sub}
              repoName={repoName}
              parentLabel={`${repoName} / ${sub.name}`}
              onOpenTerminal={onOpenTerminal}
              disabled={disabled}
              activeTerminalPaths={activeTerminalPaths}
              focusedTerminalPath={focusedTerminalPath}
            />
          ))}
        </div>
      )}
      {git.contextMenu && (
        <ContextMenu
          x={git.contextMenu.x}
          y={git.contextMenu.y}
          items={menuItems}
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
