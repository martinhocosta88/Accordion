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
    swapTerminals,
    canAdd,
  } = useTerminals();

  // Load config on mount
  useEffect(() => {
    window.electronAPI.config.get().then((cfg) => {
      setConfig(cfg);
      document.documentElement.setAttribute('data-theme', cfg.theme);
    }).catch(() => {
    });
  }, []);

  const handleOpenTerminal = async (cwd: string, label: string) => {
    await addTerminal(cwd, label);
  };

  const handleConfigChange = (newConfig: AppConfig) => {
    setConfig(newConfig);
    document.documentElement.setAttribute('data-theme', newConfig.theme);
  };

  const handleAddRepo = async () => {
    const selectedPath = await window.electronAPI.dialog.selectDirectory();
    if (selectedPath) {
      const newConfig = await window.electronAPI.config.addRepo(selectedPath);
      handleConfigChange(newConfig);
    }
  };

  const handleReorderRepos = async (reordered: string[]) => {
    const newConfig = await window.electronAPI.config.reorderRepos(reordered);
    handleConfigChange(newConfig);
  };

  const handleRemoveRepo = async (repoPath: string) => {
    const newConfig = await window.electronAPI.config.removeRepo(repoPath);
    handleConfigChange(newConfig);
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
        focusedTerminalPath={terminals.find((t) => t.id === focusedId)?.cwd ?? null}
        collapsed={sideCollapsed}
        onToggleCollapse={() => setSideCollapsed((c) => !c)}
        onAddRepo={handleAddRepo}
        onReorderRepos={handleReorderRepos}
        onRemoveRepo={handleRemoveRepo}
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
        onSwapTerminals={swapTerminals}
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
