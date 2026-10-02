export interface TimedItem {
  id: string;
  /** Minutes since midnight. */
  startMin: number;
  endMin: number;
}

export interface Placed {
  id: string;
  col: number;
  /** Number of columns in this item's cluster of overlapping events. */
  cols: number;
}

/** Side-by-side columns for overlapping events. Each connected cluster shares one column count, so widths line up. */
export function layoutOverlaps(items: TimedItem[]): Placed[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const placed: Placed[] = [];
  let cluster: { id: string; col: number }[] = [];
  let clusterEnd = -Infinity;
  const columnEnds: number[] = [];

  const flush = () => {
    const cols = columnEnds.length;
    for (const member of cluster) placed.push({ ...member, cols });
    cluster = [];
    columnEnds.length = 0;
    clusterEnd = -Infinity;
  };

  for (const item of sorted) {
    if (item.startMin >= clusterEnd) flush();
    let col = columnEnds.findIndex((end) => end <= item.startMin);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(item.endMin);
    } else {
      columnEnds[col] = item.endMin;
    }
    cluster.push({ id: item.id, col });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();
  return placed;
}