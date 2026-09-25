import { Link } from 'react-router-dom';
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

import {
  useAdminDashboard,
  useDashboardApproveFarmer,
  useDashboardRejectFarmer,
} from '@/features/admin/hooks/useAdminDashboard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import './AdminDashboardPage.css';

const PIE_COLORS = ['#15803d', '#ca8a04', '#2563eb', '#dc2626', '#64748b', '#7c3aed'];

export default function AdminDashboardPage() {
  const query = useAdminDashboard();
  const approve = useDashboardApproveFarmer();
  const reject = useDashboardRejectFarmer();

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Không tải được tổng quan"
        actionLabel="Thử lại"
        onAction={() => query.refetch()}
      />
    );
  }

  const data = query.data;
  const cards = [
    { label: 'Nông dân', value: data.farmer_count },
    { label: 'Chờ duyệt', value: data.pending_farmer_count },
    { label: 'Khách hàng', value: data.customer_count },
    { label: 'Chợ hoạt động', value: data.active_market_count },
    { label: 'Đơn hôm nay', value: data.order_count_today },
  ];

  return (
    <div className="admin-dashboard-page">
      <PageHeader
        title="Tổng quan hệ thống"
        description="Theo dõi nông dân, chợ, đơn hàng và kiểm duyệt."
      />

      <div className="page-primitive__stat-grid-5">
        {cards.map((item) => (
          <Card key={item.label}>
            <CardHeader className="page-primitive__card-header-tight">
              <CardTitle className="page-primitive__card-title-muted">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="page-primitive__stat-value">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="page-primitive__charts-row">
        <Card>
          <CardHeader>
            <CardTitle>Đơn 30 ngày</CardTitle>
          </CardHeader>
          <CardContent className="page-primitive__chart-h">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.orders_last_30_days}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#15803d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đơn theo trạng thái</CardTitle>
          </CardHeader>
          <CardContent className="page-primitive__chart-h">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.orders_by_status}
                  dataKey="count"
                  nameKey="status"
                  outerRadius={80}
                  label
                >
                  {data.orders_by_status.map((entry, index) => (
                    <Cell
                      key={entry.status}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="page-primitive__card-header-row">
          <CardTitle>Nông dân chờ duyệt</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/farmers?status=PENDING">Xem tất cả</Link>
          </Button>
        </CardHeader>
        <CardContent className="admin-dashboard-page__pending-list">
          {data.pending_farmers.length === 0 ? (
            <p className="page-primitive__muted-sm">Không có hồ sơ chờ duyệt.</p>
          ) : (
            data.pending_farmers.map((f) => (
              <div key={f.id} className="page-primitive__row-card">
                <div>
                  <Link to={`/admin/farmers/${f.id}`} className="page-primitive__link">
                    {f.stall_name}
                  </Link>
                  <p className="page-primitive__muted-sm">{f.email}</p>
                </div>
                <div className="page-primitive__actions-row">
                  <Button
                    size="sm"
                    loading={approve.isPending}
                    onClick={() => approve.mutate(f.id)}
                  >
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={reject.isPending}
                    onClick={() => reject.mutate(f.id)}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
