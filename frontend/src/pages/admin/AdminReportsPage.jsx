import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import {
  exportAdminReports,
  useAdminReports,
} from '../../hooks/queries/admin/useAdminReports';
import { useAdminMarkets } from '../../hooks/queries/admin/useAdminMarkets';
import { EmptyState } from '@/components/common/feedback/EmptyState';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { Button } from '@/components/common/forms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/cards/Card';
import { Input } from '@/components/common/forms/Input';
import { Label } from '@/components/common/forms/Label';
import { formatVnd } from '@/utils/formatters';
import { orderStatusLabel } from '@/utils/labels';

import './AdminReportsPage.css';

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function AdminReportsPage() {
  const initial = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [marketId, setMarketId] = useState('');
  const [applied, setApplied] = useState                ({
    ...initial,
    market_id: undefined,
  });
  const [exporting, setExporting] = useState(false);

  const marketsQuery = useAdminMarkets();
  const reportQuery = useAdminReports(applied);

  const daysDiff = () => {
    const a = new Date(from);
    const b = new Date(to);
    return Math.ceil((b.getTime() - a.getTime()) / 86400000);
  };

  const onApply = () => {
    if (daysDiff() > 366) {
      toast.error('Date range cannot exceed 366 days');
      return;
    }
    if (daysDiff() < 0) {
      toast.error('End date must be after start date');
      return;
    }
    setApplied({
      from,
      to,
      market_id: marketId ? Number(marketId) : undefined,
    });
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await exportAdminReports({
        from: applied.from,
        to: applied.to,
        market_id: applied.market_id,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'marketlink-report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch (e) {
      toast.error(ApiError.fromUnknown(e).friendlyMessage);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="admin-reports-page">
      <PageHeader
        title="Reports"
        description="Order volume, revenue by market, and top-performing stalls."
        actions={
          <Button variant="outline" loading={exporting} onClick={() => void onExport()}>
            Export Excel
          </Button>
        }
      />

      <div className="page-primitive__filters-bar">
        <div>
          <Input type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Input type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Label className="page-primitive__label-xs">Market</Label>
          <select
            className="page-primitive__select"
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
          >
            <option value="">All markets</option>
            {marketsQuery.data?.results.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={onApply}>Apply</Button>
      </div>

      {reportQuery.isLoading ? (
        <PageSkeleton />
      ) : reportQuery.isError || !reportQuery.data ? (
        <EmptyState
          title="Report couldn't be loaded"
          actionLabel="Try again"
          onAction={() => reportQuery.refetch()}
        />
      ) : (
        <>
          <div className="page-primitive__grid-2-lg">
            <Card>
              <CardHeader>
                <CardTitle>Orders by status</CardTitle>
              </CardHeader>
              <CardContent className="page-primitive__chart-card-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reportQuery.data.orders_by_status.map((row) => ({
                      ...row,
                      name: orderStatusLabel(row.status),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#15803d" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue by market</CardTitle>
              </CardHeader>
              <CardContent className="page-primitive__chart-card-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportQuery.data.revenue_by_market}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="market_name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => formatVnd(Number(v))} />
                    <Bar dataKey="revenue" fill="#ca8a04" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="page-primitive__table-wrap">
            <table className="page-primitive__table">
              <thead className="page-primitive__table-head">
                <tr>
                  <th className="page-primitive__table-th">Top farmers</th>
                  <th className="page-primitive__table-th">Orders</th>
                  <th className="page-primitive__table-th">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportQuery.data.top_farmers.map((f) => (
                  <tr key={f.farmer_id} className="page-primitive__table-row">
                    <td className="page-primitive__table-td page-primitive__font-medium">
                      {f.stall_name}
                    </td>
                    <td className="page-primitive__table-td">{f.completed_orders}</td>
                    <td className="page-primitive__table-td">{formatVnd(f.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
