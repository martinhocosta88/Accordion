# Sidebar Drag-and-Drop & Repo Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move repo management out of the settings dialog into the sidebar with drag-and-drop reordering, and add drag-and-drop terminal swapping in the grid.

**Architecture:** Native HTML Drag and Drop API for both sidebar repo reordering (insert) and terminal grid swapping. No new dependencies. Repo order persisted via existing `config:reorder-repos` IPC; terminal order is ephemeral in-memory state. New "+" button in sidebar header reuses existing `config:add-repo` IPC.

**Tech Stack:** React 19, Electron 34, TypeScript, native HTML DnD API

---

### Task 1: Strip repo management from SettingsDialog

**Files:**
- Modify: `src/components/SettingsDialog.tsx`
- Modify: `src/components/App.css`

- [ ] **Step 1: Remove repo functions and UI from SettingsDialog.tsx**

Replace the entire file content with:

```tsx
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
```

- [ ] **Step 2: Remove repo-related CSS from App.css**

Delete these CSS blocks from `src/components/App.css` (lines 653-750):
- `.settings-repos` (lines 653-658)
- `.settings-empty` (lines 660-664)
- `.settings-repo-item` (lines 666-674)
- `.settings-repo-path` (lines 676-684)
- `.settings-repo-sort` (lines 686-691)
- `.settings-sort-btn` (lines 694-718)
- `.settings-repo-remove` (lines 720-734)
- `.settings-add-btn` (lines 736-750)

That is, remove everything from `.settings-repos {` through `.settings-add-btn:hover { }` (the block starting at line 653 through line 750).

- [ ] **Step 3: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsDialog.tsx src/components/App.css
git commit -m "refactor: remove repo management from settings dialog"
```

---

### Task 2: Add "+" button to sidebar header

**Files:**
- Modify: `src/components/SidePane.tsx`
- Modify: `src/components/App.tsx`
- Modify: `src/components/App.css`

- [ ] **Step 1: Add onAddRepo prop and "+" button to SidePane**

In `src/components/SidePane.tsx`, add `onAddRepo` to the props interface and render the button in the header:

Add to the `SidePaneProps` interface (after `onToggleCollapse: () => void;`):
```tsx
  onAddRepo: () => void;
```

Add to the destructured props:
```tsx
  onAddRepo,
```

Replace the header div (lines 67-76):
```tsx
      <div className="side-pane-header">
        {!collapsed && <span>Repositories</span>}
        {!collapsed && (
          <div className="side-pane-header-actions">
            <button
              className="side-pane-add"
              onClick={onAddRepo}
              title="Add repository"
            >
              +
            </button>
            <button
              className="side-pane-toggle"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
            >
              {'\u25C0'}
            </button>
          </div>
        )}
        {collapsed && (
          <button
            className="side-pane-toggle"
            onClick={onToggleCollapse}
            title="Expand sidebar"
          >
            {'\u25B6'}
          </button>
        )}
      </div>
```

Also update the empty state message (line 82):
```tsx
                No repositories configured. Click + to add one.
```

- [ ] **Step 2: Add CSS for the header actions and "+" button**

Add to `src/components/App.css`, after the `.side-pane-header` rules (after line 138):

```css
.side-pane-header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.side-pane-add {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  line-height: 1;
}

.side-pane-add:hover {
  color: var(--accent);
}
```

- [ ] **Step 3: Wire up onAddRepo in App.tsx**

In `src/components/App.tsx`, add the handler and pass it to SidePane.

Add this handler after `handleConfigChange` (after line 44):
```tsx
  const handleAddRepo = async () => {
    const selectedPath = await window.electronAPI.dialog.selectDirectory();
    if (selectedPath) {
      const newConfig = await window.electronAPI.config.addRepo(selectedPath);
      handleConfigChange(newConfig);
    }
  };
```

Update the initial config load — replace the auto-open settings on empty repos (lines 29-31):
```tsx
      // No longer auto-open settings when repos empty
```

Add `onAddRepo={handleAddRepo}` to the SidePane JSX (after `onToggleCollapse`):
```tsx
        onAddRepo={handleAddRepo}
```

- [ ] **Step 4: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Manual test**

Run: `npm start`
Expected:
- "+" button visible in sidebar header between "Repositories" and the collapse arrow
- Clicking "+" opens OS folder picker
- Selecting a folder adds it to the sidebar list
- Hover shows tooltip "Add repository"

- [ ] **Step 6: Commit**

```bash
git add src/components/SidePane.tsx src/components/App.tsx src/components/App.css
git commit -m "feat: add repo button in sidebar header"
```

---

### Task 3: Sidebar drag-and-drop repo reordering

**Files:**
- Modify: `src/components/SidePane.tsx`
- Modify: `src/components/App.tsx`
- Modify: `src/components/App.css`

- [ ] **Step 1: Add drag-and-drop state and handlers to SidePane**

In `src/components/SidePane.tsx`, add `onReorderRepos` to props and implement DnD.

Add to `SidePaneProps` interface:
```tsx
  onReorderRepos: (reordered: string[]) => void;
```

Add to destructured props:
```tsx
  onReorderRepos,
```

Add state imports — update the import line:
```tsx
import { useState, useRef } from 'react';
```

Inside the `SidePane` component function, before the return statement, add:
```tsx
  const dragIndexRef = useRef<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    (e.currentTarget as HTMLElement).style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    dragIndexRef.current = null;
    setDropIndex(null);
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setDropIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDropIndex(null);
  };

  const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === targetIndex) {
      setDropIndex(null);
      return;
    }
    const reordered = [...config.repos];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorderRepos(reordered);
    dragIndexRef.current = null;
    setDropIndex(null);
  };
```

- [ ] **Step 2: Wire drag attributes onto repo items in the list**

Replace the repo list mapping (the `config.repos.map(...)` block, lines 85-94) with:

```tsx
              config.repos.map((repoPath, index) => (
                <div
                  key={repoPath}
                  draggable
                  onDragStart={handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver(index)}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop(index)}
                  className={`repo-drag-wrapper${dropIndex === index ? ' repo-drag-over' : ''}`}
                >
                  <RepoItem
                    repoPath={repoPath}
                    onOpenTerminal={onOpenTerminal}
                    disabled={!canAddTerminal}
                    activeTerminalPaths={activeTerminalPaths}
                    focusedTerminalPath={focusedTerminalPath}
                  />
                </div>
              ))
```

- [ ] **Step 3: Add drag-and-drop CSS**

Add to `src/components/App.css`, after the `.side-pane-add:hover` rule:

```css
.repo-drag-wrapper {
  position: relative;
}

.repo-drag-wrapper[draggable] {
  cursor: grab;
}

.repo-drag-wrapper[draggable]:active {
  cursor: grabbing;
}

.repo-drag-over::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 4px;
  right: 4px;
  height: 3px;
  background: var(--accent);
  border-radius: 2px;
  z-index: 10;
}
```

- [ ] **Step 4: Wire up onReorderRepos in App.tsx**

In `src/components/App.tsx`, add the handler and pass it to SidePane.

Add this handler after `handleAddRepo`:
```tsx
  const handleReorderRepos = async (reordered: string[]) => {
    const newConfig = await window.electronAPI.config.reorderRepos(reordered);
    handleConfigChange(newConfig);
  };
```

Add `onReorderRepos={handleReorderRepos}` to the SidePane JSX:
```tsx
        onReorderRepos={handleReorderRepos}
```

- [ ] **Step 5: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Manual test**

Run: `npm start`
Expected:
- Grabbing a repo item in the sidebar makes it semi-transparent (opacity 0.4)
- Dragging over another repo shows a colored insertion line above the target
- Dropping inserts the repo at the new position
- New order persists after restarting the app
- Dragging over the header/footer has no effect

- [ ] **Step 7: Commit**

```bash
git add src/components/SidePane.tsx src/components/App.tsx src/components/App.css
git commit -m "feat: drag-and-drop repo reordering in sidebar"
```

---

### Task 4: Terminal drag-and-drop swap

**Files:**
- Modify: `src/hooks/useTerminals.ts`
- Modify: `src/components/TerminalGrid.tsx`
- Modify: `src/components/TerminalPanel.tsx`
- Modify: `src/components/App.tsx`
- Modify: `src/components/App.css`

- [ ] **Step 1: Add swapTerminals to useTerminals hook**

In `src/hooks/useTerminals.ts`, add a `swapTerminals` function after `focusTerminal`:

```tsx
  const swapTerminals = useCallback((idA: string, idB: string) => {
    setTerminals((prev) => {
      const indexA = prev.findIndex((t) => t.id === idA);
      const indexB = prev.findIndex((t) => t.id === idB);
      if (indexA === -1 || indexB === -1 || indexA === indexB) return prev;
      const next = [...prev];
      [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
      return next;
    });
  }, []);
```

Add `swapTerminals` to the return object:
```tsx
  return {
    terminals,
    maximizedId,
    focusedId,
    addTerminal,
    closeTerminal,
    toggleMaximize,
    focusTerminal,
    swapTerminals,
    canAdd: terminals.length < MAX_TERMINALS,
  };
```

- [ ] **Step 2: Add drag props to TerminalPanel**

In `src/components/TerminalPanel.tsx`, add drag props to the interface:

Add to `TerminalPanelProps`:
```tsx
  terminalId: string;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string) => void;
  dragOverId: string | null;
  dragDisabled: boolean;
```

Add to the destructured props:
```tsx
  terminalId,
  onDragStart,
  onDragEnd,
  onDrop: onDropTerminal,
  dragOverId,
  dragDisabled,
```

Replace the terminal-header div (line 158) with:

```tsx
      <div
        className={`terminal-header${isFocused ? ' terminal-header-focused' : ''}${dragOverId === terminalId ? ' terminal-header-drop-target' : ''}`}
        draggable={!dragDisabled}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', terminalId);
          onDragStart(terminalId);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDropTerminal(terminalId);
        }}
        style={{ cursor: dragDisabled ? undefined : 'grab' }}
      >
```

- [ ] **Step 3: Add drag state and handlers to TerminalGrid**

In `src/components/TerminalGrid.tsx`, add drag state and pass props through.

Update the import:
```tsx
import { useMemo, useState } from 'react';
```

Add to `TerminalGridProps`:
```tsx
  onSwapTerminals: (idA: string, idB: string) => void;
```

Add to the destructured props:
```tsx
  onSwapTerminals,
```

Inside the component, before `gridStyle`, add:

```tsx
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDragId(id);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const handleDrop = (targetId: string) => {
    if (dragId && dragId !== targetId) {
      onSwapTerminals(dragId, targetId);
    }
    setDragId(null);
    setDragOverId(null);
  };

  const dragDisabled = !!maximizedId || !!diffTerminalId;
```

- [ ] **Step 4: Update TerminalPanel usage in TerminalGrid**

Replace the TerminalPanel JSX inside the `.map()` (lines 74-86):

```tsx
          <TerminalPanel
            ptyId={t.ptyId}
            cwd={t.cwd}
            label={t.label}
            branch={t.branch}
            theme={theme}
            isMaximized={maximizedId === t.id}
            isFocused={diffTerminalId ? t.id === diffTerminalId : focusedId === t.id}
            onClose={() => onClose(t.id)}
            onToggleMaximize={() => onToggleMaximize(t.id)}
            onFocus={() => onFocus(t.id)}
            onShowDiff={() => onShowDiff(t.id)}
            terminalId={t.id}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            dragOverId={dragOverId}
            dragDisabled={dragDisabled}
          />
```

Update the terminal-cell div to handle dragOver for setting the hover target:

```tsx
        <div
          key={t.id}
          className={isVisible(t.id) ? `terminal-cell${dragId === t.id ? ' terminal-cell-dragging' : ''}` : 'terminal-cell-hidden'}
          onDragOver={(e) => {
            e.preventDefault();
            if (dragId && dragId !== t.id) setDragOverId(t.id);
          }}
          onDragLeave={() => setDragOverId(null)}
        >
```

- [ ] **Step 5: Wire up swapTerminals in App.tsx**

In `src/components/App.tsx`, destructure `swapTerminals` from `useTerminals()`:

Add `swapTerminals` to the destructured return (after `canAdd`):
```tsx
    swapTerminals,
```

Add `onSwapTerminals={swapTerminals}` to the TerminalGrid JSX:
```tsx
        onSwapTerminals={swapTerminals}
```

- [ ] **Step 6: Add drag-and-drop CSS for terminals**

Add to `src/components/App.css`, after the `.terminal-cell-hidden` rule:

```css
.terminal-cell-dragging {
  opacity: 0.4;
}

.terminal-header-drop-target {
  outline: 2px dashed var(--accent);
  outline-offset: -2px;
}

.terminal-header[draggable] {
  cursor: grab;
}

.terminal-header[draggable]:active {
  cursor: grabbing;
}
```

- [ ] **Step 7: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 8: Manual test**

Run: `npm start`
Expected:
- Open 2+ terminals
- Grabbing a terminal header shows grab cursor
- Dragging makes the source terminal semi-transparent
- Hovering over another terminal shows dashed accent border on its header
- Dropping swaps the two terminals' positions
- Drag is disabled when a terminal is maximized
- Drag is disabled when diff panel is showing
- Single terminal: grab cursor shows but nothing happens on drag

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useTerminals.ts src/components/TerminalGrid.tsx src/components/TerminalPanel.tsx src/components/App.tsx src/components/App.css
git commit -m "feat: drag-and-drop terminal swapping in grid"
```

---

### Task 5: Final verification

**Files:** None (testing only)

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings related to our changes.

- [ ] **Step 2: End-to-end manual test**

Run: `npm start`

Test checklist:
1. Settings dialog opens, shows only theme picker — no repo list
2. "+" button in sidebar header opens folder picker and adds repo
3. Repos can be reordered by drag-and-drop in sidebar (insertion line feedback, persists after restart)
4. Terminals can be swapped by dragging headers (dashed border feedback)
5. Terminal drag disabled when maximized or in diff view
6. Right-click context menu on repos still works (fetch, switch branch, revert, go to folder)
7. Collapsing/expanding sidebar works — no "+" button when collapsed
8. All 4 themes render correctly in settings dialog

- [ ] **Step 3: Commit any fixups if needed**

Only if issues were found in step 2.
