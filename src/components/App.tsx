import React, { useState, useEffect } from 'react';
import { SidePane } from './SidePane';
import { TerminalGrid } from './TerminalGrid';
import { SettingsDialog } from './SettingsDialog';
import { useTerminals } from '../hooks/useTerminals';
import type { AppConfig } from '../types';

export default function App() {
  const [config, setConfig] = useState<AppConfig>({ repos: [] });
  const [showSettings, setShowSettings] = useState(false);
  const {
    terminals,
    maximizedId,
    addTerminal,
    closeTerminal,
    toggleMaximize,
    canAdd,
  } = useTerminals();

  // Load config on mount; auto-open settings if no repos configured
  useEffect(() => {
    window.electronAPI.config.get().then((cfg) => {
      setConfig(cfg);
      if (cfg.repos.length === 0) {
        setShowSettings(true);
      }
    });
  }, []);

  const handleOpenTerminal = async (cwd: string, label: string) => {
    await addTerminal(cwd, label);
  };

  const handleConfigChange = (newConfig: AppConfig) => {
    setConfig(newConfig);
  };

  return (
    <div className="app">
      <SidePane
        config={config}
        onOpenTerminal={handleOpenTerminal}
        onOpenSettings={() => setShowSettings(true)}
        canAddTerminal={canAdd}
        activeTerminalPaths={terminals.map((t) => t.cwd)}
      />
      <TerminalGrid
        terminals={terminals}
        maximizedId={maximizedId}
        onClose={closeTerminal}
        onToggleMaximize={toggleMaximize}
      />
      {showSettings && (
        <SettingsDialog
          config={config}
          onClose={() => setShowSettings(false)}
          onConfigChange={handleConfigChange}
        />
      )}
    </div>
  );
}
