import { RepoItem } from './RepoItem';
import type { AppConfig } from '../types';

interface SidePaneProps {
  config: AppConfig;
  onOpenTerminal: (cwd: string, label: string) => void;
  onOpenSettings: () => void;
  canAddTerminal: boolean;
  activeTerminalPaths: string[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function SidePane({
  config,
  onOpenTerminal,
  onOpenSettings,
  canAddTerminal,
  activeTerminalPaths,
  collapsed,
  onToggleCollapse,
}: SidePaneProps) {
  return (
    <div className={`side-pane${collapsed ? ' side-pane-collapsed' : ''}`}>
      <div className="side-pane-header">
        {!collapsed && <span>Repositories</span>}
        <button
          className="side-pane-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '\u25B6' : '\u25C0'}
        </button>
      </div>
      {!collapsed && (
        <>
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
        </>
      )}
      {collapsed && (
        <button
          className="side-pane-settings-icon"
          onClick={onOpenSettings}
          title="Settings"
        >
          {'\u2699'}
        </button>
      )}
    </div>
  );
}
