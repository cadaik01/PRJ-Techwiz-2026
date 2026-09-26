import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useFarmerOrderCounts, useFarmerOrders, usePickingList } from '@/features/farmer/hooks/useFarmerOrders';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { FarmerOrderActions } from '@/features/farmer/components/FarmerOrderActions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { formatDateTime, formatVnd } from '@/utils/formatters';
import './FarmerOrdersPage.css';
const TABS = [
    { id: 'pending', label: 'Pending' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'ready', label: 'Ready' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'history', label: 'History' },
];
function isTabId(value) {
    return TABS.some((t) => t.id === value);
}
export default function FarmerOrdersPage() {
    const [params, setParams] = useSearchParams();
    const tabParam = params.get('tab');
    const tab = isTabId(tabParam) ? tabParam : 'pending';
    const [q, setQ] = useState(params.get('q') ?? '');
    const [pickupDate, setPickupDate] = useState(params.get('pickup_date') ?? new Date().toISOString().slice(0, 10));
    const [mode, setMode] = useState('orders');
    const countsQuery = useFarmerOrderCounts();
    const ordersQuery = useFarmerOrders({
        tab,
        q: q || undefined,
        pickup_date: params.get('pickup_date') || undefined,
    }, mode === 'orders');
    const pickingQuery = usePickingList(pickupDate, mode === 'picking');
    const countMap = useMemo(() => {
        const c = countsQuery.data;
        if (!c)
            return {};
        return {
            pending: c.pending,
            accepted: c.accepted,
            ready: c.ready,
            overdue: c.overdue,
            history: c.history,
        };
    }, [countsQuery.data]);
    const modeToggle = (<div className="page-primitive__segmented page-primitive__toolbar-push" role="group" aria-label="Orders view mode">
      <button type="button" className={cn('page-primitive__segment', mode === 'orders' && 'is-active')} aria-pressed={mode === 'orders'} onClick={() => setMode('orders')}>
        Order list
      </button>
      <button type="button" className={cn('page-primitive__segment', mode === 'picking' && 'is-active')} aria-pressed={mode === 'picking'} onClick={() => setMode('picking')}>
        Picking list
      </button>
    </div>);
    return (<div className="farmer-orders-page">
      <PageHeader eyebrow="Order desk" title="Pickup orders" description="Accept requests, prep bags, and complete stall collections."/>

      {mode === 'picking' ? (<div className="farmer-orders-page__picking">
          <div className="page-primitive__toolbar">
            <Input type="date" label="Pickup date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="page-primitive__input-auto"/>
            {modeToggle}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="farmer-orders-page__print-icon"/> Print
            </Button>
          </div>
          {pickingQuery.isLoading ? (<PageSkeleton />) : !pickingQuery.data?.length ? (<EmptyState title="Nothing to prep for this day"/>) : (<div className="page-primitive__table-wrap">
              <table className="page-primitive__table">
                <thead className="page-primitive__table-head-60">
                  <tr>
                    <th className="page-primitive__table-th">Product</th>
                    <th className="page-primitive__table-th">Quantity</th>
                    <th className="page-primitive__table-th">Unit</th>
                    <th className="page-primitive__table-th">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {pickingQuery.data.map((row) => (<tr key={row.product_id} className="page-primitive__table-row">
                      <td className="page-primitive__table-td page-primitive__font-medium">
                        {row.product_name}
                      </td>
                      <td className="page-primitive__table-td">{row.total_qty}</td>
                      <td className="page-primitive__table-td">{row.unit}</td>
                      <td className="page-primitive__table-td">{row.order_count}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>)}
        </div>) : (<>
          <div className="page-primitive__toolbar">
            <Input label="Search customer name" value={q} onChange={(e) => {
                const value = e.target.value;
                setQ(value);
                const next = new URLSearchParams(params);
                next.set('tab', tab);
                if (value)
                    next.set('q', value);
                else
                    next.delete('q');
                setParams(next);
            }} className="page-primitive__input-narrow"/>
            <Input type="date" label="Pickup date" value={params.get('pickup_date') ?? ''} onChange={(e) => {
                const next = new URLSearchParams(params);
                if (e.target.value)
                    next.set('pickup_date', e.target.value);
                else
                    next.delete('pickup_date');
                setParams(next);
            }} className="page-primitive__input-auto"/>
            {modeToggle}
          </div>

          <Tabs value={tab} onValueChange={(value) => {
                if (!isTabId(value))
                    return;
                const next = new URLSearchParams(params);
                next.set('tab', value);
                setParams(next);
            }}>
            <TabsList className="page-primitive__tabs-list-wrap">
              {TABS.map((t) => (<TabsTrigger key={t.id} value={t.id}>
                  {t.label}
                  {countMap[t.id] !== undefined ? (<span className="page-primitive__tab-badge">{countMap[t.id]}</span>) : null}
                </TabsTrigger>))}
            </TabsList>
            <TabsContent value={tab} className="farmer-orders-page__tab-list">
              {ordersQuery.isLoading ? (<PageSkeleton />) : ordersQuery.isError ? (<EmptyState title="Orders couldn't be loaded" actionLabel="Try again" onAction={() => ordersQuery.refetch()}/>) : !ordersQuery.data?.results.length ? (<EmptyState title="No orders in this view" description="New pre-orders will land here as customers reserve."/>) : (ordersQuery.data.results.map((order) => (<div key={order.id} className="page-primitive__row-card-responsive">
                    <div>
                      <Link to={`/farmer/orders/${order.id}`} className="page-primitive__semibold page-primitive__link-underline">
                        #{order.id} · {order.customer.full_name}
                      </Link>
                      <p className="page-primitive__muted-sm">
                        {order.market.name} · {formatDateTime(order.pickup_start_at)} ·{' '}
                        {formatVnd(order.total_amount)}
                      </p>
                    </div>
                    <div className="page-primitive__actions-row">
                      <StatusBadge status={order.status}/>
                      <FarmerOrderActions order={order}/>
                    </div>
                  </div>)))}
            </TabsContent>
          </Tabs>
        </>)}
    </div>);
}
