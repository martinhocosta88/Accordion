import { useState, useEffect, useCallback } from 'react';

const BRANCH_REFRESH_INTERVAL = 10_000; // 10 seconds

export function useGitActions(repoPath: string) {
  const [branch, setBranch] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  // Fetch branch on mount and refresh periodically
  useEffect(() => {
    const refresh = () => {
      window.electronAPI.git.getBranch(repoPath).then(setBranch);
    };
    refresh();
    const interval = setInterval(refresh, BRANCH_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [repoPath]);

  const handleContextMenu = useCallback((e: React.MouseEvent, requireBranch = false) => {
    if (requireBranch && !branch) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [branch]);

  const handleFetch = useCallback(async () => {
    setFetching(true);
    await window.electronAPI.git.fetch(repoPath);
    setFetching(false);
  }, [repoPath]);

  const handleRevert = useCallback(async () => {
    setReverting(true);
    await window.electronAPI.git.resetHard(repoPath);
    setReverting(false);
    setShowRevertConfirm(false);
  }, [repoPath]);

  const handleBranchChanged = useCallback((newBranch: string) => {
    setBranch(newBranch);
  }, []);

  const contextMenuItems = [
    {
      label: fetching ? 'Fetching...' : 'Fetch',
      disabled: fetching,
      onClick: handleFetch,
    },
    {
      label: 'Switch Branch',
      onClick: () => setShowBranchPicker(true),
    },
    {
      label: reverting ? 'Reverting...' : 'Revert',
      disabled: reverting,
      onClick: () => setShowRevertConfirm(true),
    },
  ];

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
