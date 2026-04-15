# Sidebar Drag-and-Drop & Repo Management Redesign

**Date:** 2026-04-15
**Status:** Approved

## Overview

Move repo management out of the settings dialog and into the sidebar. Replace the sort buttons with drag-and-drop reordering. Add drag-and-drop terminal swapping in the grid. Add a "+" button in the sidebar header for adding repos.

## 1. Settings Dialog Changes

**Remove** the entire "Repository Paths" section from `SettingsDialog.tsx`:
- Repo list UI (sort buttons, remove buttons, path display, add button)
- `handleAdd`, `handleRemove`, `handleMove` functions
- CSS classes: `.settings-repo-item`, `.settings-repo-sort`, `.settings-sort-btn`, `.settings-repo-remove`, `.settings-add-btn`

**Keep** the theme picker unchanged. The dialog becomes a compact theme-selection modal. Dialog structure (overlay, close button, title) remains the same.

## 2. "+" Button in Sidebar Header

**Location:** SidePane header, between the "Repositories" label and the collapse toggle button.

```
┌─────────────────────────────────┐
│ Repositories      [+]  [◀/▶]  │
└─────────────────────────────────┘
```

**Behavior:**
- Click opens the OS native directory picker (same flow as the old "Add Repository" in settings)
- The selected path is auto-detected as repo, worktree, or plain directory (existing icon logic handles this)
- Added to the bottom of the repos list
- Styled as a small subtle button matching the collapse toggle style (same size, same hover behavior)

**Implementation:**
- Add button element in `SidePane.tsx` header section (lines 67-76)
- Reuse the existing `window.electronAPI.config.addRepo()` IPC call
- No new backend code needed

## 3. Sidebar Drag-and-Drop (Repo Reordering)

**Technology:** Native HTML Drag and Drop API (no library dependencies).

**Drag initiation:** Each top-level `RepoItem` is draggable. Grab any part of the repo item row to start.

**Visual feedback:**
- Dragged item: opacity 0.4 (semi-transparent)
- Insertion indicator: 2-3px horizontal line in `var(--accent)` color with border-radius, shown between items at the drop target position

**Drop behavior:**
- Dragged repo removed from original position and inserted at the indicated position
- New order persisted via existing `config:reorder-repos` IPC call and `reorderRepos` in config-manager
- Sidebar re-renders with updated order

**Scope:**
- Only top-level repo items are draggable
- Sub-items (nested worktrees/dirs within expanded repos) are not independently draggable — they stay attached to their parent

**Edge cases:**
- Drag over header/"+" button: no drop target, item returns to original position
- Single repo: draggable but no valid drop target, no-op
- Collapsed sidebar: drag-and-drop disabled (items not visible)

## 4. Terminal Grid Drag-and-Drop (Swap Positions)

**Technology:** Native HTML Drag and Drop API.

**Drag initiation:** Terminal header bar is the drag handle. Cursor shows `grab` on hover over the header (excluding diff, maximize, and close buttons). Cursor becomes `grabbing` while dragging.

**Visual feedback:**
- Dragged terminal: opacity 0.4 (semi-transparent)
- Hover target terminal: dashed accent-colored border indicating swap target
- Other terminals: unchanged

**Drop behavior:**
- Dragged terminal and target terminal swap grid positions
- Swap is in-memory only — no config persistence needed (terminals are ephemeral)

**Edge cases:**
- Drop on empty grid space: no-op, returns to original position
- Drop on self: no-op
- Single terminal: grab cursor shown but no valid swap target
- Maximized terminal: drag disabled (only one terminal visible)
- Diff panel view: drag disabled for the terminal showing the diff split

## 5. Backend & IPC — No Changes

All existing IPC channels remain:
- `config:add-repo` — used by new "+" button
- `config:remove-repo` — still accessible via right-click context menu on repo items
- `config:reorder-repos` — used by sidebar drag-and-drop
- `config:set-theme` — used by settings dialog

`config-manager.ts` functions `addRepo`, `removeRepo`, `reorderRepos` all kept as-is. No backend changes required.

## 6. Files Affected

| File | Changes |
|------|---------|
| `src/components/SettingsDialog.tsx` | Remove repo list section, keep theme picker only |
| `src/components/SidePane.tsx` | Add "+" button in header |
| `src/components/RepoItem.tsx` | Add drag event handlers for reordering |
| `src/components/TerminalGrid.tsx` | Add drag-and-drop swap logic |
| `src/components/TerminalPanel.tsx` | Add drag handle on header bar |
| `src/components/App.css` | Remove settings repo CSS, add drag-and-drop styles |
