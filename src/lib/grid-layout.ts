export interface GridConfig {
  row1Count: number;
  row2Count: number;
}

export function computeGridLayout(terminalCount: number): GridConfig {
  if (terminalCount <= 0) return { row1Count: 0, row2Count: 0 };
  if (terminalCount <= 3) return { row1Count: terminalCount, row2Count: 0 };
  if (terminalCount === 4) return { row1Count: 2, row2Count: 2 };
  if (terminalCount === 5) return { row1Count: 3, row2Count: 2 };
  return { row1Count: 3, row2Count: 3 };
}
