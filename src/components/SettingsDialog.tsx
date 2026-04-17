import type { AppConfig } from '../types';
import { themes, themeNames } from '../lib/themes';
import { useEscapeKey } from '../hooks/useEscapeKey';

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
  useEscapeKey(onClose);

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
        </div>
      </div>
    </div>
  );
}
