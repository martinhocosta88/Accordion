import React, { useState, useEffect } from 'react';
import type { SubDirectory } from '../types';

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

  const handleSubdirClick = (sub: SubDirectory) => {
    if (!disabled) {
      onOpenTerminal(sub.path, `${repoName} / ${sub.name}`);
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
      >
        <button className="repo-toggle" onClick={handleToggle}>
          {expanded ? '\u25BC' : '\u25B6'}
        </button>
        <span className="repo-icon">{'\uD83D\uDCC1'}</span>
        <button
          className="repo-name"
          onClick={handleClick}
          disabled={disabled}
        >
          {repoName}
        </button>
      </div>
      {expanded && subdirs.length > 0 && (
        <div className="repo-subdirs">
          {subdirs.map((sub) => {
            const subIsActive = activeTerminalPaths.includes(sub.path);
            return (
              <button
                key={sub.path}
                className={`repo-subdir${subIsActive ? ' repo-subdir-active' : ''}`}
                onClick={() => handleSubdirClick(sub)}
                disabled={disabled}
              >
                <span className="repo-icon">{'\uD83D\uDCC2'}</span>
                {sub.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
