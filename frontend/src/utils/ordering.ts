/** The `ordering` value a list is currently sorted by, e.g. "stall_name" or "-stall_name". */
export type Ordering = string | undefined;

export function toggleOrdering(current: Ordering, column: string): string {
  // First click sorts ascending; clicking the same column again reverses it. A different
  // column always restarts ascending rather than inheriting the previous direction.
  return current === column ? `-${column}` : column;
}
