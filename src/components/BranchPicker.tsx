import { useState, useEffect, useRef } from 'react';

interface BranchPickerProps {
  repoPath: string;
  currentBranch: string | null;
  onClose: () => void;
  onBranchChanged: (branch: string) => void;
}

export function BranchPicker({
  repoPath,
  currentBranch,
  onClose,
  onBranchChanged,
}: BranchPickerProps) {
  const [branches, setBranches] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.electronAPI.git.listBranches(repoPath)
      .then((list) => {
        setBranches(list);
        setLoading(false);
      })
      .catch(() => {
        setBranches([]);
        setLoading(false);
        setError('Failed to load branches');
      });
  }, [repoPath]);

  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const filtered = branches.filter((b) =>
    b.toLowerCase().includes(filter.toLowerCase())
  );

  const handleCheckout = async (branch: string) => {
    setSwitching(true);
    setError(null);
    const result = await window.electronAPI.git.checkout(repoPath, branch);
    setSwitching(false);
    if (result.ok) {
      const cleanName = branch.startsWith('origin/')
        ? branch.replace('origin/', '')
        : branch;
      onBranchChanged(cleanName);
      onClose();
    } else {
      setError(result.error || 'Checkout failed');
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="branch-picker" onClick={(e) => e.stopPropagation()}>
        <div className="branch-picker-header">
          <h2>Switch Branch</h2>
          <button className="settings-close" onClick={onClose}>
            {'\u2715'}
          </button>
        </div>
        <div className="branch-picker-search">
          <input
            ref={inputRef}
            type="text"
            className="branch-picker-input"
            placeholder="Filter branches..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        {error && <div className="branch-picker-error">{error}</div>}
        <div className="branch-picker-list">
          {loading && <div className="branch-picker-empty">Loading branches...</div>}
          {!loading && filtered.length === 0 && (
            <div className="branch-picker-empty">No matching branches.</div>
          )}
          {!loading &&
            filtered.map((branch) => {
              const isCurrent = branch === currentBranch;
              const isRemote = branch.startsWith('origin/');
              return (
                <button
                  key={branch}
                  className={`branch-picker-item${isCurrent ? ' branch-picker-item-current' : ''}`}
                  onClick={() => !isCurrent && handleCheckout(branch)}
                  disabled={isCurrent || switching}
                >
                  <span className="branch-picker-name">
                    {isRemote && <span className="branch-picker-remote">origin/</span>}
                    {isRemote ? branch.replace('origin/', '') : branch}
                  </span>
                  {isCurrent && <span className="branch-picker-badge">current</span>}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
