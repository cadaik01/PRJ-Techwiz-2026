import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useFarmerStats } from '@/features/farmer/hooks/useFarmerStats';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatVnd } from '@/utils/formatters';

import './FarmerStatsPage.css';

export default function FarmerStatsPage() {
  const query = useFarmerStats();

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Không tải được thống kê"
        actionLabel="Thử lại"
        onAction={() => query.refetch()}
      />
    );
  }

  const data = query.data;

  return (
    <div className="farmer-stats-page">
      <PageHeader title="Thống kê" description="Doanh thu và sản phẩm bán chạy." />
      <div className="page-primitive__stat-grid-3">
        <Card>
          <CardHeader className="page-primitive__card-header-tight">
            <CardTitle className="page-primitive__card-title-muted">Doanh thu</CardTitle>
          </CardHeader>
          <CardContent className="page-primitive__stat-value">
            {formatVnd(data.kpis.revenue)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="page-primitive__card-header-tight">
            <CardTitle className="page-primitive__card-title-muted">Tổng đơn</CardTitle>
          </CardHeader>
          <CardContent className="page-primitive__stat-value">
            {data.kpis.total_orders}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="page-primitive__card-header-tight">
            <CardTitle className="page-primitive__card-title-muted">Đang xử lý</CardTitle>
          </CardHeader>
          <CardContent className="page-primitive__stat-value">
            {data.kpis.in_progress}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top sản phẩm theo doanh thu</CardTitle>
        </CardHeader>
        <CardContent className="page-primitive__chart-h-72">
          {data.top_products.length === 0 ? (
            <p className="page-primitive__muted-sm">Chưa có dữ liệu.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_products}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatVnd(Number(v))} />
                <Bar dataKey="revenue" fill="#16a34a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
