import { describe, it, expect } from 'vitest';
import { parseAheadBehind } from '../src/main/git-helpers';

describe('parseAheadBehind', () => {
  it('returns in-sync when both counts are zero', () => {
    expect(parseAheadBehind('0\t0', null)).toEqual({ ahead: 0, behind: 0, hasUpstream: true });
  });

  it('parses ahead-only output', () => {
    expect(parseAheadBehind('3\t0', null)).toEqual({ ahead: 3, behind: 0, hasUpstream: true });
  });

  it('parses behind-only output', () => {
    expect(parseAheadBehind('0\t5', null)).toEqual({ ahead: 0, behind: 5, hasUpstream: true });
  });

  it('parses diverged output', () => {
    expect(parseAheadBehind('3\t5', null)).toEqual({ ahead: 3, behind: 5, hasUpstream: true });
  });

  it('handles large numbers', () => {
    expect(parseAheadBehind('412\t0', null)).toEqual({ ahead: 412, behind: 0, hasUpstream: true });
  });

  it('handles trailing newline in output', () => {
    expect(parseAheadBehind('2\t1\n', null)).toEqual({ ahead: 2, behind: 1, hasUpstream: true });
  });

  it('returns no-upstream when git reports no upstream configured', () => {
    const stderr = "fatal: no upstream configured for branch 'feature'";
    expect(parseAheadBehind('', stderr)).toEqual({ ahead: 0, behind: 0, hasUpstream: false });
  });

  it('returns no-upstream when git reports unknown revision @{upstream}', () => {
    const stderr = "fatal: ambiguous argument 'HEAD...@{upstream}': unknown revision";
    expect(parseAheadBehind('', stderr)).toEqual({ ahead: 0, behind: 0, hasUpstream: false });
  });

  it('returns no-upstream for malformed output', () => {
    expect(parseAheadBehind('garbage', null)).toEqual({ ahead: 0, behind: 0, hasUpstream: false });
  });

  it('returns no-upstream for empty output with no error', () => {
    expect(parseAheadBehind('', null)).toEqual({ ahead: 0, behind: 0, hasUpstream: false });
  });
});
