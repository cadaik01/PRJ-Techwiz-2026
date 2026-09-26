import { Link } from 'react-router-dom';
import { Heart, Package, RefreshCcw, ShoppingCart, Star } from 'lucide-react';

import { useCustomerDashboard } from '@/hooks/queries/customer/useCustomerDashboard';
import { Countdown } from '@/components/common/badges/Countdown';
import { OrderCard } from '@/components/customer/OrderCard';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { Button } from '@/components/common/forms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/cards/Card';
import { useFavorites } from '@/hooks/queries/customer/useFavorites';
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
    { label: 'Open', value: data?.counts.open ?? 0, icon: Package },
    { label: 'Ready for pickup', value: data?.counts.ready_for_pickup ?? 0, icon: Star },
    { label: 'Completed', value: data?.counts.completed ?? 0, icon: Heart },
    {
      label: 'Awaiting review',
      value: data?.counts.pending_review ?? 0,
      icon: RefreshCcw,
    },
  ];

  const latest = data?.upcoming[0];

  return (
    <div className="customer-dashboard-page">
      <PageHeader
        title="Your overview"
        description="Track open pre-orders and the next pickup on your calendar."
        actions={
          <Button asChild>
            <Link to="/products">Continue shopping</Link>
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
            <CardTitle>Coming up</CardTitle>
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
                      label="Time until pickup"
                    />
                  ) : null}
                </div>
              ))
            ) : (
              <p className="page-primitive__muted-sm">
                No pickups scheduled yet — reserve something for market day.
              </p>
            )}
            <div className="page-primitive__actions-row">
              <Button asChild variant="outline" size="sm">
                <Link to="/app/orders">View all orders</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/app/cart">
                  <ShoppingCart className="page-primitive__icon-sm" /> Cart
                </Link>
              </Button>
              {latest ? (
                <Button asChild size="sm">
                  <Link to={`/app/orders/${latest.id}`}>Open latest order</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="customer-dashboard-page__sidebar">
          <Card>
            <CardHeader>
              <CardTitle>Saved favorites</CardTitle>
            </CardHeader>
            <CardContent className="page-primitive__stack-2 page-primitive__muted-sm">
              <p>
                {favFarmers} stalls · {favMarkets} markets
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/favorites">Open favorites</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest updates</CardTitle>
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
                <Link to="/app/notifications">See all notifications</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
