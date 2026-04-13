import { useEffect } from 'react';
import type { AppConfig } from '../types';
import { themes, themeNames } from '../lib/themes';

interface SettingsDialogProps {
  config: AppConfig;
  onClose: () => void;
  onConfigChange: (config: AppConfig) => void;
}

export function SettingsDialog({
  config,
  onClose,
  onConfigChange,
}: SettingsDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAdd = async () => {
    const selectedPath = await window.electronAPI.dialog.selectDirectory();
    if (selectedPath) {
      const newConfig = await window.electronAPI.config.addRepo(selectedPath);
      onConfigChange(newConfig);
    }
  };

  const handleRemove = async (repoPath: string) => {
    const newConfig = await window.electronAPI.config.removeRepo(repoPath);
    onConfigChange(newConfig);
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.repos.length) return;
    const reordered = [...config.repos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const newConfig = await window.electronAPI.config.reorderRepos(reordered);
    onConfigChange(newConfig);
  };

  const handleThemeChange = async (themeName: string) => {
    const newConfig = await window.electronAPI.config.setTheme(themeName);
    onConfigChange(newConfig);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            {'\u2715'}
          </button>
        </div>
        <div className="settings-body">
          <h3>Theme</h3>
          <div className="settings-themes">
            {themeNames.map((name) => {
              const t = themes[name];
              const isActive = config.theme === name;
              return (
                <button
                  key={name}
                  className={`settings-theme-btn${isActive ? ' settings-theme-active' : ''}`}
                  onClick={() => handleThemeChange(name)}
                >
                  <div className="settings-theme-swatch">
                    <div
                      className="settings-theme-color"
                      style={{ background: t.colors.bgMain }}
                    >
                      <span style={{ color: t.colors.accent }}>&gt;&gt;&gt;</span>
                    </div>
                  </div>
                  <span className="settings-theme-label">{t.label}</span>
                </button>
              );
            })}
          </div>
          <h3>Repository Paths</h3>
          <div className="settings-repos">
            {config.repos.length === 0 ? (
              <p className="settings-empty">No repositories added yet.</p>
            ) : (
              config.repos.map((repo, i) => (
                <div key={repo} className="settings-repo-item">
                  <div className="settings-repo-sort">
                    <button
                      className="settings-sort-btn"
                      onClick={() => handleMove(i, -1)}
                      disabled={i === 0}
                      title="Move up"
                    >
                      {'\u25B2'}
                    </button>
                    <button
                      className="settings-sort-btn"
                      onClick={() => handleMove(i, 1)}
                      disabled={i === config.repos.length - 1}
                      title="Move down"
                    >
                      {'\u25BC'}
                    </button>
                  </div>
                  <span className="settings-repo-path">{repo}</span>
                  <button
                    className="settings-repo-remove"
                    onClick={() => handleRemove(repo)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
          <button className="settings-add-btn" onClick={handleAdd}>
            + Add Repository
          </button>
        </div>
      </div>
    </div>
  );
}
