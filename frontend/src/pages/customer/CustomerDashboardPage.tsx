import { Link } from 'react-router-dom';
import { Heart, Package, RefreshCcw, ShoppingCart, Star } from 'lucide-react';

import { useCustomerDashboard } from '@/features/customer/hooks/useCustomerDashboard';
import { Countdown } from '@/components/common/Countdown';
import { OrderCard } from '@/features/customer/components/OrderCard';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useFavorites } from '@/features/customer/hooks/useFavorites';
import { formatRelative } from '@/utils/formatters';

import './CustomerDashboardPage.css';

export default function CustomerDashboardPage() {
  const dashboardQuery = useCustomerDashboard();
  const { farmerIds, marketIds } = useFavorites();
  const favFarmers = farmerIds.length;
  const favMarkets = marketIds.length;

  if (dashboardQuery.isLoading) return <PageSkeleton />;
  const data = dashboardQuery.data;

  const stats = [
    { label: 'Đang mở', value: data?.counts.open ?? 0, icon: Package },
    { label: 'Sẵn sàng lấy', value: data?.counts.ready_for_pickup ?? 0, icon: Star },
    { label: 'Hoàn thành', value: data?.counts.completed ?? 0, icon: Heart },
    {
      label: 'Chờ đánh giá',
      value: data?.counts.pending_review ?? 0,
      icon: RefreshCcw,
    },
  ];

  const latest = data?.upcoming[0];

  return (
    <div className="customer-dashboard-page">
      <PageHeader
        title="Tổng quan"
        description="Theo dõi đơn đặt trước và phiên chợ sắp tới."
        actions={
          <Button asChild>
            <Link to="/products">Tiếp tục mua sắm</Link>
          </Button>
        }
      />

      <div className="customer-dashboard-page__stats">
        {stats.map((item) => (
          <Card key={item.label} className="customer-dashboard-page__stat-card">
            <CardHeader className="customer-dashboard-page__stat-header">
              <CardTitle className="customer-dashboard-page__stat-label">
                {item.label}
              </CardTitle>
              <item.icon className="customer-dashboard-page__stat-icon" />
            </CardHeader>
            <CardContent>
              <p className="customer-dashboard-page__stat-value">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="customer-dashboard-page__main">
        <Card className="customer-dashboard-page__upcoming-wide">
          <CardHeader>
            <CardTitle>Đơn sắp tới</CardTitle>
          </CardHeader>
          <CardContent className="page-primitive__stack-3">
            {data?.upcoming.length ? (
              data.upcoming.map((order) => (
                <div key={order.id}>
                  <OrderCard order={order} />
                  {order.id === latest?.id ? (
                    <Countdown
                      className="customer-dashboard-page__countdown"
                      targetIso={order.pickup_start_at}
                      label="Đếm ngược nhận hàng"
                    />
                  ) : null}
                </div>
              ))
            ) : (
              <p className="page-primitive__muted-sm">Chưa có đơn sắp tới.</p>
            )}
            <div className="page-primitive__actions-row">
              <Button asChild variant="outline" size="sm">
                <Link to="/app/orders">Xem đơn</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/app/cart">
                  <ShoppingCart className="page-primitive__icon-sm" /> Giỏ hàng
                </Link>
              </Button>
              {latest ? (
                <Button asChild size="sm">
                  <Link to={`/app/orders/${latest.id}`}>Đặt lại đơn gần nhất</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="customer-dashboard-page__sidebar">
          <Card>
            <CardHeader>
              <CardTitle>Yêu thích</CardTitle>
            </CardHeader>
            <CardContent className="page-primitive__stack-2 page-primitive__muted-sm">
              <p>
                {favFarmers} quầy nông dân · {favMarkets} chợ
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/favorites">Xem yêu thích</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thông báo gần đây</CardTitle>
            </CardHeader>
            <CardContent className="page-primitive__stack-3">
              {data?.recent_notifications.map((n) => (
                <div key={n.id} className="customer-dashboard-page__notif-item">
                  <div className="customer-dashboard-page__notif-head">
                    <p className="customer-dashboard-page__notif-title">{n.title}</p>
                    {!n.is_read ? <span className="page-primitive__dot-unread" /> : null}
                  </div>
                  <p className="page-primitive__muted-xs">
                    {formatRelative(n.created_at)}
                  </p>
                </div>
              ))}
              <Button
                asChild
                size="sm"
                variant="link"
                className="customer-dashboard-page__link-all"
              >
                <Link to="/app/notifications">Tất cả thông báo</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
