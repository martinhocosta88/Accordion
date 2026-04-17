import type { AheadBehind } from '../types';

export function parseAheadBehind(stdout: string, stderr: string | null): AheadBehind {
  if (stderr && /no upstream|unknown revision|@\{upstream\}/i.test(stderr)) {
    return { ahead: 0, behind: 0, hasUpstream: false };
  }
  const match = stdout.trim().match(/^(\d+)\s+(\d+)$/);
  if (!match) {
    return { ahead: 0, behind: 0, hasUpstream: false };
  }
  return {
    ahead: parseInt(match[1], 10),
    behind: parseInt(match[2], 10),
    hasUpstream: true,
  };
}
