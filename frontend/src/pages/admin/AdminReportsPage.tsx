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
} from '@/features/admin/hooks/useAdminReports';
import { useAdminMarkets } from '@/features/admin/hooks/useAdminMarkets';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { formatVnd } from '@/utils/formatters';

import './AdminReportsPage.css';

type AppliedFilters = {
  from: string;
  to: string;
  market_id: number | undefined;
};

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
  const [applied, setApplied] = useState<AppliedFilters>({
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
      toast.error('Khoảng ngày tối đa 366 ngày');
      return;
    }
    if (daysDiff() < 0) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu');
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
      toast.success('Đã xuất báo cáo');
    } catch (e) {
      toast.error(ApiError.fromUnknown(e).friendlyMessage);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="admin-reports-page">
      <PageHeader
        title="Báo cáo"
        description="Thống kê đơn, doanh thu theo chợ và top nông dân."
        actions={
          <Button variant="outline" loading={exporting} onClick={() => void onExport()}>
            Xuất Excel
          </Button>
        }
      />

      <div className="page-primitive__filters-bar">
        <div>
          <Label className="page-primitive__label-xs">Từ ngày</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="page-primitive__label-xs">Đến ngày</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Label className="page-primitive__label-xs">Chợ</Label>
          <select
            className="page-primitive__select"
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
          >
            <option value="">Tất cả chợ</option>
            {marketsQuery.data?.results.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={onApply}>Áp dụng</Button>
      </div>

      {reportQuery.isLoading ? (
        <PageSkeleton />
      ) : reportQuery.isError || !reportQuery.data ? (
        <EmptyState
          title="Không tải được báo cáo"
          actionLabel="Thử lại"
          onAction={() => reportQuery.refetch()}
        />
      ) : (
        <>
          <div className="page-primitive__grid-2-lg">
            <Card>
              <CardHeader>
                <CardTitle>Đơn theo trạng thái</CardTitle>
              </CardHeader>
              <CardContent className="page-primitive__chart-card-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportQuery.data.orders_by_status}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#15803d" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Doanh thu theo chợ</CardTitle>
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
                  <th className="page-primitive__table-th">Top nông dân</th>
                  <th className="page-primitive__table-th">Số đơn</th>
                  <th className="page-primitive__table-th">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {reportQuery.data.top_farmers.map((f) => (
                  <tr key={f.farmer_id} className="page-primitive__table-row">
                    <td className="page-primitive__table-td page-primitive__font-medium">
                      {f.stall_name}
                    </td>
                    <td className="page-primitive__table-td">{f.order_count}</td>
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
