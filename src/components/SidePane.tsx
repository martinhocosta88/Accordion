import React from 'react';
import { RepoItem } from './RepoItem';
import type { AppConfig } from '../types';

interface SidePaneProps {
  config: AppConfig;
  onOpenTerminal: (cwd: string, label: string) => void;
  onOpenSettings: () => void;
  canAddTerminal: boolean;
  activeTerminalPaths: string[];
}

export function SidePane({
  config,
  onOpenTerminal,
  onOpenSettings,
  canAddTerminal,
  activeTerminalPaths,
}: SidePaneProps) {
  return (
    <div className="side-pane">
      <div className="side-pane-header">Repositories</div>
      <div className="side-pane-list">
        {config.repos.length === 0 ? (
          <div className="side-pane-empty">
            No repositories configured. Click Settings to add one.
          </div>
        ) : (
          config.repos.map((repoPath) => (
            <RepoItem
              key={repoPath}
              repoPath={repoPath}
              onOpenTerminal={onOpenTerminal}
              disabled={!canAddTerminal}
              activeTerminalPaths={activeTerminalPaths}
            />
          ))
        )}
      </div>
      <button className="side-pane-settings" onClick={onOpenSettings}>
        {'\u2699'} Settings
      </button>
    </div>
  );
}
