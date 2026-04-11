import { useEffect } from 'react';
import type { AppConfig } from '../types';

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
          <h3>Repository Paths</h3>
          <div className="settings-repos">
            {config.repos.length === 0 ? (
              <p className="settings-empty">No repositories added yet.</p>
            ) : (
              config.repos.map((repo) => (
                <div key={repo} className="settings-repo-item">
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
