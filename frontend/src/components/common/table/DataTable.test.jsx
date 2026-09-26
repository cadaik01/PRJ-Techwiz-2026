import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '@/components/common/table/DataTable';

const COLUMNS = [
  { key: 'id', header: 'Order' },
  { key: 'farmer', header: 'Farmer', render: (row) => row.farmer.stall_name },
  { key: 'total_amount', header: 'Total', align: 'end' },
];
const ROWS = [
  { id: 11, farmer: { stall_name: 'Green Stall' }, total_amount: '12.50' },
  { id: 12, farmer: { stall_name: 'Sunrise Stall' }, total_amount: '4.00' },
];

describe('DataTable', () => {
  it('renders a header per column and a row per record', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />);

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Order', 'Farmer', 'Total',
    ]);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + two records
  });

  it('uses the column renderer for nested values', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />);

    expect(screen.getByText('Green Stall')).toBeInTheDocument();
  });

  it('shows the empty message instead of an empty grid', () => {
    render(
      <DataTable columns={COLUMNS} rows={[]} rowKey={(row) => row.id} emptyMessage="You have no orders yet" />,
    );

    expect(screen.getByText('You have no orders yet')).toBeInTheDocument();
    expect(screen.queryByRole('row')).not.toBeInTheDocument();
  });

  it('shows a loading state instead of stale rows', () => {
    render(<DataTable columns={COLUMNS} rows={[]} rowKey={(row) => row.id} isLoading />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('labels the table for screen readers', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} caption="My orders" />);

    expect(screen.getByRole('table', { name: 'My orders' })).toBeInTheDocument();
  });

  it('calls back when a row is activated, by click and by keyboard', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} onRowClick={onRowClick} />);

    await userEvent.click(screen.getByText('Green Stall'));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);

    // A clickable row must be reachable without a mouse.
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('leaves rows inert when there is nothing to activate', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />);

    expect(screen.getAllByRole('row')[1]).not.toHaveAttribute('tabindex');
  });
});
