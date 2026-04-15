import { useState, useRef } from 'react';
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
  onAddRepo: () => void;
  onReorderRepos: (reordered: string[]) => void;
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
  onAddRepo,
  onReorderRepos,
}: SidePaneProps) {
  const dragIndexRef = useRef<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDropIndex(null);
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setDropIndex(index);
    } else {
      setDropIndex(null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropIndex(null);
    }
  };

  const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === targetIndex) {
      setDropIndex(null);
      return;
    }
    const reordered = [...config.repos];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorderRepos(reordered);
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDropIndex(null);
  };

  return (
    <div className={`side-pane${collapsed ? ' side-pane-collapsed' : ''}`}>
      <div className="side-pane-header">
        {!collapsed && <span>Repositories</span>}
        {!collapsed && (
          <div className="side-pane-header-actions">
            <button
              className="side-pane-add"
              onClick={onAddRepo}
              title="Add repository"
            >
              +
            </button>
            <button
              className="side-pane-toggle"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
            >
              {'\u25C0'}
            </button>
          </div>
        )}
        {collapsed && (
          <button
            className="side-pane-toggle"
            onClick={onToggleCollapse}
            title="Expand sidebar"
          >
            {'\u25B6'}
          </button>
        )}
      </div>
      {!collapsed && (
        <>
          <div className="side-pane-list">
            {config.repos.length === 0 ? (
              <div className="side-pane-empty">
                No repositories configured. Click + to add one.
              </div>
            ) : (
              config.repos.map((repoPath, index) => (
                <div
                  key={repoPath}
                  draggable
                  onDragStart={handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver(index)}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop(index)}
                  className={`repo-drag-wrapper${dropIndex === index ? ' repo-drag-over' : ''}${draggingIndex === index ? ' repo-drag-source' : ''}`}
                >
                  <RepoItem
                    repoPath={repoPath}
                    onOpenTerminal={onOpenTerminal}
                    disabled={!canAddTerminal}
                    activeTerminalPaths={activeTerminalPaths}
                    focusedTerminalPath={focusedTerminalPath}
                  />
                </div>
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
