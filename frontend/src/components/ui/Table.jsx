import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';

import { cn } from '../../lib/utils';

// Table on desktop, stacked cards below md. The same markup drives both, so a
// narrow screen never gets a horizontally scrolling table.
export function Table({ columns, data = [], emptyMessage = 'No data.', className }) {
  const [sorting, setSorting] = useState([]);

  // TanStack Table returns fresh closures each render by design, which the React
  // Compiler cannot memoize. That is expected here, not a defect.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!data.length) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className={cn('w-full', className)}>
      <table className="hidden w-full border-collapse text-sm md:table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-slate-200">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="px-3 py-2 text-left font-medium text-slate-600 select-none"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 text-slate-800">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden">
        {table.getRowModel().rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-slate-200 p-3">
            {row.getVisibleCells().map((cell) => (
              <div key={cell.id} className="flex justify-between gap-3 py-1 text-sm">
                <span className="text-slate-500">
                  {flexRender(cell.column.columnDef.header, cell.getContext())}
                </span>
                <span className="text-right text-slate-800">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
