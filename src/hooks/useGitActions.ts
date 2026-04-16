import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { AheadBehind } from '../types';

const BRANCH_REFRESH_INTERVAL = 30_000; // 30 seconds

export function useGitActions(repoPath: string) {
  const [branch, setBranch] = useState<string | null>(null);
  const [aheadBehind, setAheadBehind] = useState<AheadBehind | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reverting, setReverting] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const branchRef = useRef(branch);
  branchRef.current = branch;

  // Fetch branch + ahead/behind on mount, on interval, and on git-changed events
  useEffect(() => {
    const refresh = () => {
      window.electronAPI.git.getBranch(repoPath).then(setBranch).catch(() => {});
      window.electronAPI.git.getAheadBehind(repoPath).then(setAheadBehind).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, BRANCH_REFRESH_INTERVAL);
    const onGitChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string }>).detail;
      if (detail?.path === repoPath) refresh();
    };
    window.addEventListener('git-changed', onGitChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('git-changed', onGitChanged);
    };
  }, [repoPath]);

  const handleContextMenu = useCallback((e: React.MouseEvent, requireBranch = false) => {
    if (requireBranch && !branchRef.current) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleFetch = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    const result = await window.electronAPI.git.fetch(repoPath);
    setFetching(false);
    if (result.ok) {
      window.dispatchEvent(new CustomEvent('git-changed', { detail: { path: repoPath } }));
    } else {
      setFetchError(result.error || 'Fetch failed');
    }
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
    aheadBehind,
    fetching,
    fetchError,
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
