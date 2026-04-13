import { useState } from 'react';
import { RepoItem } from './RepoItem';
import type { AppConfig } from '../types';

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;

function ZoomControl() {
  const [zoom, setZoom] = useState(() => {
    const raw = window.zoomAPI.getZoom();
    return Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, raw)) * 100) / 100;
  });

  const applyZoom = (factor: number) => {
    const clamped = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, factor)) * 100) / 100;
    window.zoomAPI.setZoom(clamped);
    setZoom(clamped);
  };

  return (
    <div className="zoom-control">
      <button
        className="zoom-btn"
        onClick={() => applyZoom(zoom - ZOOM_STEP)}
        disabled={zoom <= ZOOM_MIN}
        title="Zoom out"
      >
        {'\u2212'}
      </button>
      <span className="zoom-label">{Math.round(zoom * 100)}%</span>
      <button
        className="zoom-btn"
        onClick={() => applyZoom(zoom + ZOOM_STEP)}
        disabled={zoom >= ZOOM_MAX}
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
}

interface SidePaneProps {
  config: AppConfig;
  onOpenTerminal: (cwd: string, label: string) => void;
  onOpenSettings: () => void;
  canAddTerminal: boolean;
  activeTerminalPaths: string[];
  focusedTerminalPath: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function SidePane({
  config,
  onOpenTerminal,
  onOpenSettings,
  canAddTerminal,
  activeTerminalPaths,
  focusedTerminalPath,
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
                  focusedTerminalPath={focusedTerminalPath}
                />
              ))
            )}
          </div>
          <div className="side-pane-footer">
            <ZoomControl />
            <button className="side-pane-settings" onClick={onOpenSettings} title="Settings">
              {'\u2699'}
            </button>
          </div>
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
