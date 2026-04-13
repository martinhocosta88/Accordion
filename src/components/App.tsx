import { useState, useEffect } from 'react';
import { SidePane } from './SidePane';
import { TerminalGrid } from './TerminalGrid';
import { SettingsDialog } from './SettingsDialog';
import { useTerminals } from '../hooks/useTerminals';
import type { AppConfig } from '../types';

export default function App() {
  const [config, setConfig] = useState<AppConfig>({ repos: [], theme: 'accordion' as const });
  const [showSettings, setShowSettings] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [diffTerminalId, setDiffTerminalId] = useState<string | null>(null);
  const {
    terminals,
    maximizedId,
    focusedId,
    addTerminal,
    closeTerminal,
    toggleMaximize,
    focusTerminal,
    canAdd,
  } = useTerminals();

  // Load config on mount; auto-open settings if no repos configured
  useEffect(() => {
    window.electronAPI.config.get().then((cfg) => {
      setConfig(cfg);
      document.documentElement.setAttribute('data-theme', cfg.theme);
      if (cfg.repos.length === 0) {
        setShowSettings(true);
      }
    }).catch(() => {
      setShowSettings(true);
    });
  }, []);

  const handleOpenTerminal = async (cwd: string, label: string) => {
    await addTerminal(cwd, label);
  };

  const handleConfigChange = (newConfig: AppConfig) => {
    setConfig(newConfig);
    document.documentElement.setAttribute('data-theme', newConfig.theme);
  };

  // Toggle diff: clicking the same terminal closes it, clicking a different one switches
  const handleShowDiff = (terminalId: string) => {
    setDiffTerminalId((prev) => (prev === terminalId ? null : terminalId));
  };

  // Close diff if the terminal it belongs to is closed
  const handleCloseTerminal = (id: string) => {
    if (diffTerminalId === id) setDiffTerminalId(null);
    closeTerminal(id);
  };

  return (
    <div className="app">
      <SidePane
        config={config}
        onOpenTerminal={handleOpenTerminal}
        onOpenSettings={() => setShowSettings(true)}
        canAddTerminal={canAdd}
        activeTerminalPaths={terminals.map((t) => t.cwd)}
        collapsed={sideCollapsed}
        onToggleCollapse={() => setSideCollapsed((c) => !c)}
      />
      <TerminalGrid
        terminals={terminals}
        maximizedId={maximizedId}
        focusedId={focusedId}
        diffTerminalId={diffTerminalId}
        onClose={handleCloseTerminal}
        onToggleMaximize={toggleMaximize}
        onFocus={focusTerminal}
        onShowDiff={handleShowDiff}
        onCloseDiff={() => setDiffTerminalId(null)}
        theme={config.theme}
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
