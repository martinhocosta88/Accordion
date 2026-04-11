import { describe, it, expect } from 'vitest';
import { computeGridLayout } from '../src/lib/grid-layout';

describe('computeGridLayout', () => {
  it('returns empty layout for 0 terminals', () => {
    expect(computeGridLayout(0)).toEqual({ row1Count: 0, row2Count: 0 });
  });

  it('returns 1 in row 1 for 1 terminal', () => {
    expect(computeGridLayout(1)).toEqual({ row1Count: 1, row2Count: 0 });
  });

  it('returns 2 in row 1 for 2 terminals', () => {
    expect(computeGridLayout(2)).toEqual({ row1Count: 2, row2Count: 0 });
  });

  it('returns 3 in row 1 for 3 terminals', () => {
    expect(computeGridLayout(3)).toEqual({ row1Count: 3, row2Count: 0 });
  });

  it('returns 2+2 for 4 terminals', () => {
    expect(computeGridLayout(4)).toEqual({ row1Count: 2, row2Count: 2 });
  });

  it('returns 3+2 for 5 terminals', () => {
    expect(computeGridLayout(5)).toEqual({ row1Count: 3, row2Count: 2 });
  });

  it('returns 3+3 for 6 terminals', () => {
    expect(computeGridLayout(6)).toEqual({ row1Count: 3, row2Count: 3 });
  });

  it('clamps to 3+3 for counts above 6', () => {
    expect(computeGridLayout(7)).toEqual({ row1Count: 3, row2Count: 3 });
    expect(computeGridLayout(100)).toEqual({ row1Count: 3, row2Count: 3 });
  });

  it('returns empty layout for negative counts', () => {
    expect(computeGridLayout(-1)).toEqual({ row1Count: 0, row2Count: 0 });
  });
});
