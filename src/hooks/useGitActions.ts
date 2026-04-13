import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const BRANCH_REFRESH_INTERVAL = 30_000; // 30 seconds

export function useGitActions(repoPath: string) {
  const [branch, setBranch] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const branchRef = useRef(branch);
  branchRef.current = branch;

  // Fetch branch on mount and refresh periodically
  useEffect(() => {
    const refresh = () => {
      window.electronAPI.git.getBranch(repoPath).then(setBranch).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, BRANCH_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [repoPath]);

  const handleContextMenu = useCallback((e: React.MouseEvent, requireBranch = false) => {
    if (requireBranch && !branchRef.current) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleFetch = useCallback(async () => {
    setFetching(true);
    await window.electronAPI.git.fetch(repoPath);
    setFetching(false);
    window.dispatchEvent(new CustomEvent('git-changed', { detail: { path: repoPath } }));
  }, [repoPath]);

  const handleRevert = useCallback(async () => {
    setReverting(true);
    await window.electronAPI.git.resetHard(repoPath);
    setReverting(false);
    setShowRevertConfirm(false);
    window.dispatchEvent(new CustomEvent('git-changed', { detail: { path: repoPath } }));
  }, [repoPath]);

  const handleBranchChanged = useCallback((newBranch: string) => {
    setBranch(newBranch);
  }, []);

  const handleOpenFolder = useCallback(() => {
    window.electronAPI.shell.openPath(repoPath);
  }, [repoPath]);

  const contextMenuItems = useMemo(() => [
    {
      label: fetching ? 'Fetching...' : 'Fetch',
      icon: '\u21BB',
      disabled: fetching,
      onClick: handleFetch,
    },
    {
      label: 'Switch Branch',
      icon: '\u2387',
      onClick: () => setShowBranchPicker(true),
    },
    {
      label: reverting ? 'Reverting...' : 'Revert',
      icon: '\u27F2',
      disabled: reverting,
      onClick: () => setShowRevertConfirm(true),
    },
    {
      label: 'Go to Folder',
      icon: '\uD83D\uDCC2',
      separator: true,
      onClick: handleOpenFolder,
    },
  ], [fetching, reverting, handleFetch, handleOpenFolder]);

  return {
    branch,
    contextMenu,
    setContextMenu,
    showBranchPicker,
    setShowBranchPicker,
    showRevertConfirm,
    setShowRevertConfirm,
    handleContextMenu,
    handleRevert,
    handleBranchChanged,
    contextMenuItems,
  };
}
