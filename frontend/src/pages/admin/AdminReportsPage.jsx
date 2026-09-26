import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { ApiError } from '@/lib/ApiError';
import { exportAdminReports, useAdminReports } from '@/features/admin/hooks/useAdminReports';
import { useAdminMarkets } from '@/features/admin/hooks/useAdminMarkets';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatVnd } from '@/utils/formatters';
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
    const [applied, setApplied] = useState({
        ...initial,
        market_id: undefined,
    });
    const [exporting, setExporting] = useState(false);
    const marketsQuery = useAdminMarkets();
    const reportQuery = useAdminReports(applied);
    const daysDiff = (start, end) => {
        const a = new Date(start);
        const b = new Date(end);
        return Math.ceil((b.getTime() - a.getTime()) / 86400000);
    };
    const applyRange = (nextFrom, nextTo, nextMarketId) => {
        const diff = daysDiff(nextFrom, nextTo);
        if (diff > 366) {
            toast.error('Date range cannot exceed 366 days');
            return;
        }
        if (diff < 0) {
            toast.error('End date must be after start date');
            return;
        }
        setApplied({
            from: nextFrom,
            to: nextTo,
            market_id: nextMarketId ? Number(nextMarketId) : undefined,
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
        }
        catch (e) {
            toast.error(ApiError.fromUnknown(e).friendlyMessage);
        }
        finally {
            setExporting(false);
        }
    };
    return (<div className="admin-reports-page">
      <PageHeader eyebrow="Insights" title="Reports" description="Order volume, revenue by market, and top-performing stalls."/>

      <div className="page-primitive__toolbar">
        <Input type="date" label="From" value={from} className="page-primitive__input-auto" onChange={(e) => {
            const nextFrom = e.target.value;
            setFrom(nextFrom);
            applyRange(nextFrom, to, marketId);
        }}/>
        <Input type="date" label="To" value={to} className="page-primitive__input-auto" onChange={(e) => {
            const nextTo = e.target.value;
            setTo(nextTo);
            applyRange(from, nextTo, marketId);
        }}/>
        <select className="page-primitive__select" value={marketId} aria-label="Market" onChange={(e) => {
            const nextMarketId = e.target.value;
            setMarketId(nextMarketId);
            applyRange(from, to, nextMarketId);
        }}>
          <option value="">All markets</option>
          {marketsQuery.data?.results.map((m) => (<option key={m.id} value={String(m.id)}>
              {m.name}
            </option>))}
        </select>
        <Button variant="outline" loading={exporting} className="page-primitive__toolbar-push" onClick={() => void onExport()}>
          Export Excel
        </Button>
      </div>

      {reportQuery.isLoading ? (<PageSkeleton />) : reportQuery.isError || !reportQuery.data ? (<EmptyState title="Report couldn't be loaded" actionLabel="Try again" onAction={() => reportQuery.refetch()}/>) : (<>
          <div className="page-primitive__grid-2-lg">
            <Card>
              <CardHeader>
                <CardTitle>Orders by status</CardTitle>
              </CardHeader>
              <CardContent className="page-primitive__chart-card-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportQuery.data.orders_by_status}>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="status" tick={{ fontSize: 10 }}/>
                    <YAxis allowDecimals={false}/>
                    <Tooltip />
                    <Bar dataKey="count" fill="#15803d" radius={[8, 8, 0, 0]}/>
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
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="market_name" tick={{ fontSize: 10 }}/>
                    <YAxis tick={{ fontSize: 10 }}/>
                    <Tooltip formatter={(v) => formatVnd(Number(v))}/>
                    <Bar dataKey="revenue" fill="#ca8a04" radius={[8, 8, 0, 0]}/>
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
                {reportQuery.data.top_farmers.map((f) => (<tr key={f.farmer_id} className="page-primitive__table-row">
                    <td className="page-primitive__table-td page-primitive__font-medium">
                      {f.stall_name}
                    </td>
                    <td className="page-primitive__table-td">{f.order_count}</td>
                    <td className="page-primitive__table-td">{formatVnd(f.revenue)}</td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </>)}
    </div>);
}
