# Ahead/Behind Branch Counters + Sidebar Width Bump

## Problem

The sidebar shows each repo/worktree's current branch and a transient fetch status (`↻` spinning, `⚠` on error), but gives no signal about how the local branch compares to its upstream. A user who just fetched cannot tell whether they need to pull, push, or do nothing without dropping into a terminal. As more information lands in the folder panel, the existing 220px sidebar width is also starting to feel cramped.

## Goals

- Show ahead/behind counts next to each branch name so the user can tell at a glance whether they are behind, ahead, or in sync with upstream.
- Keep visual noise low: counters only render when they carry information.
- Make the sidebar slightly wider so the new indicators fit without truncation.

## Non-goals

- No user-resizable sidebar (a drag handle is out of scope for this change).
- No automatic pull/push actions — this is a read-only indicator.
- No per-repo polling intervals; we piggyback on the existing 30-second branch refresh.

## Design

### Backend — new IPC handler

Add `git:get-ahead-behind` in `src/main.ts` alongside the existing git handlers. It runs:

```
git rev-list --left-right --count HEAD...@{upstream}
```

Output parsing:

- On success, output is `"<ahead>\t<behind>"`. Parse both as integers.
- If the branch has no upstream configured, git exits non-zero with a message like `"fatal: no upstream configured for branch 'foo'"`. Detect this and return `hasUpstream: false`.
- Any other error also returns `hasUpstream: false` (defensive — e.g. detached HEAD, corrupted ref).

Return shape:

```ts
type AheadBehind = {
  ahead: number;
  behind: number;
  hasUpstream: boolean;
};
```

When `hasUpstream` is false, `ahead` and `behind` are both 0.

### Preload + types

- `src/preload.ts`: expose `getAheadBehind: (dirPath: string) => ipcRenderer.invoke('git:get-ahead-behind', dirPath)` under `electronAPI.git`.
- `src/types.ts`: add the signature and `AheadBehind` type to the `git` namespace of `ElectronAPI`.

### Hook — `useGitActions.ts`

Add state:

```ts
const [aheadBehind, setAheadBehind] = useState<AheadBehind | null>(null);
```

Fetch it alongside `getBranch`:

- On mount.
- On the existing 30-second interval.
- On a new `git-changed` event listener (the current `useGitActions` does not subscribe to `git-changed` yet — the branch and ahead/behind should both refresh after a fetch, checkout, or revert so that the counters reflect the new state immediately).

Expose `aheadBehind` in the hook's return value.

### UI — `RepoItem.tsx` + `SubDirItem`

Both components already render a `.repo-branch` row containing the branch name and fetch status. Extend it:

```tsx
{git.branch && (
  <div className="repo-branch">
    <span className="repo-branch-text">{'\u2387'} {git.branch}</span>
    {git.aheadBehind?.hasUpstream && git.aheadBehind.ahead > 0 && (
      <span className="repo-ahead" title={`${git.aheadBehind.ahead} ahead of upstream`}>
        {'\u2191'}{git.aheadBehind.ahead}
      </span>
    )}
    {git.aheadBehind?.hasUpstream && git.aheadBehind.behind > 0 && (
      <span className="repo-behind" title={`${git.aheadBehind.behind} behind upstream`}>
        {'\u2193'}{git.aheadBehind.behind}
      </span>
    )}
    {git.fetching && <span className="repo-fetch-status" title="Fetching...">{'\u21BB'}</span>}
    {git.fetchError && <span className="repo-fetch-error" title={git.fetchError}>{'\u26A0'}</span>}
  </div>
)}
```

Rules:

- Hidden entirely when count is zero.
- Hidden entirely when `hasUpstream` is false (a fresh local branch shows nothing).
- Tooltips spell out the count in words.

### CSS

Add to `src/components/App.css` near the existing `.repo-branch` / `.repo-fetch-*` rules:

- `.repo-ahead` — small, non-bold, accent color (green-leaning, derived from existing theme tokens if present, else a new token).
- `.repo-behind` — small, non-bold, warning color (amber/red-leaning).
- Small horizontal gap between each indicator (existing row likely already uses flex/gap; reuse).

Colors should come from CSS variables so the theme system keeps working. If suitable tokens don't exist yet, add `--accent-ahead` and `--accent-behind` to each theme in `src/lib/themes.ts`.

### Sidebar width

In `src/components/App.css`:

- `.side-pane { width: 220px; }` → `width: 260px;`
- `.side-pane-collapsed { width: 42px; }` — unchanged.

40px bump gives enough room for `↑99 ↓99` plus breathing space on long branch names.

## Testing

### Unit

New test file covering the `rev-list` output parser (extracted as a pure helper from the main-process handler so it can be imported without spawning git):

- Normal in-sync output (`"0\t0"`) → `{ ahead: 0, behind: 0, hasUpstream: true }`
- Ahead only (`"3\t0"`) → `{ ahead: 3, behind: 0, hasUpstream: true }`
- Behind only (`"0\t5"`) → `{ ahead: 0, behind: 5, hasUpstream: true }`
- Diverged (`"3\t5"`) → `{ ahead: 3, behind: 5, hasUpstream: true }`
- Large numbers (`"412\t0"`) → `{ ahead: 412, behind: 0, hasUpstream: true }`
- No-upstream error output → `{ ahead: 0, behind: 0, hasUpstream: false }`
- Malformed/empty output → `{ ahead: 0, behind: 0, hasUpstream: false }`

### Manual (Electron run)

- Repo in sync: no indicators.
- Repo with local commits only: `↑N` only.
- Repo that needs pull only: `↓N` only.
- Diverged repo: both indicators.
- Brand-new branch with no upstream: no indicators (verify no error).
- Detached HEAD: no indicators, no crash.
- After a fetch: counters update within the same tick (via `git-changed` listener).
- After a checkout: counters refresh to reflect the new branch.
- Long branch names (e.g. `feature/really-long-branch-name`) still readable at 260px; truncation kicks in gracefully on very long ones.

## Rollout

Single PR. No feature flag — the feature is read-only and additive.

## Open questions

None.
