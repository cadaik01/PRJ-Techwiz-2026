import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import {                toggleOrdering } from '@/utils/ordering';

import './SortableTh.css';

// The helper lives in utils so this file exports a component and nothing else, which is what
// React Fast Refresh needs to hot-reload it.

export function SortableTh({
  column,
  current,
  onSort,
  children,
}

 ) {
  const active = current === column || current === `-${column}`;
  const descending = current === `-${column}`;
  const Icon = !active ? ChevronsUpDown : descending ? ArrowDown : ArrowUp;

  return (
    <th
      className="page-primitive__table-th"
      // Screen readers announce the sort state from the column header, not from the icon.
      aria-sort={!active ? 'none' : descending ? 'descending' : 'ascending'}
    >
      <button
        type="button"
        className={`sortable-th${active ? ' sortable-th--active' : ''}`}
        onClick={() => onSort(toggleOrdering(current, column))}
      >
        {children}
        <Icon className="sortable-th__icon" aria-hidden />
      </button>
    </th>
  );
}
