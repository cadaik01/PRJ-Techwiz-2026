import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError } from '@/lib/ApiError';
import { useCustomerOrder, useUpdateOrder } from '@/features/customer/hooks/useCustomerOrders';
import { useFarmerPickupOptions } from '@/features/catalog/hooks/useCatalog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { QuantityStepper } from '@/components/common/QuantityStepper';
import { PriceTag } from '@/components/common/PriceTag';
import { TimeSlotPicker } from '@/features/customer/components/TimeSlotPicker';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { usePublicConfigData } from '@/features/catalog/hooks/usePublicConfig';
import './OrderEditPage.css';
export default function OrderEditPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const config = usePublicConfigData();
    const orderQuery = useCustomerOrder(id);
    const farmerId = orderQuery.data?.farmer.id;
    const pickupQuery = useFarmerPickupOptions(farmerId !== undefined ? String(farmerId) : '');
    if (orderQuery.isLoading)
        return <PageSkeleton />;
    if (orderQuery.isError || !orderQuery.data) {
        return (<EmptyState title="Order couldn't be loaded" actionLabel="Try again" onAction={() => orderQuery.refetch()}/>);
    }
    return (<OrderEditForm key={orderQuery.data.version} order={orderQuery.data} pickupOptions={pickupQuery.data} horizonDays={config.booking_horizon_days} onSaved={() => navigate(`/app/orders/${id}`)} onConflict={() => {
            void orderQuery.refetch();
        }} onCancel={() => navigate(`/app/orders/${id}`)}/>);
}
function OrderEditForm({ order, pickupOptions, horizonDays, onSaved, onConflict, onCancel, }) {
    const [quantities, setQuantities] = useState(() => {
        const qty = {};
        for (const item of order.items) {
            qty[item.product_id] = item.quantity;
        }
        return qty;
    });
    const [note, setNote] = useState(order.note ?? '');
    const [slot, setSlot] = useState(() => {
        if (order.pickup_slot_id === null)
            return null;
        return {
            market_id: order.market.id,
            pickup_slot_id: order.pickup_slot_id,
            pickup_date: order.pickup_date,
            label: `${order.market.name} · ${order.pickup_date}`,
        };
    });
    const saveMutation = useUpdateOrder(order.id);
    return (<div className="order-edit-page">
      <PageHeader eyebrow="Before cut-off" title={`Edit order #${order.id}`} description="Changes are allowed only before the stall cut-off time."/>

      <div className="order-edit-page__quantities">
        <h2 className="order-edit-page__block-title">Quantities</h2>
        {order.items.map((item) => (<div key={item.product_id} className="order-edit-page__qty-row">
            <div>
              <p className="order-edit-page__item-name">{item.product_name}</p>
              <p className="order-edit-page__item-price">
                <PriceTag amount={item.unit_price} unit={item.unit}/>
              </p>
            </div>
            <QuantityStepper value={quantities[item.product_id] ?? item.quantity} onChange={(value) => setQuantities((prev) => ({ ...prev, [item.product_id]: value }))}/>
          </div>))}
      </div>

      <div>
        <h2 className="order-edit-page__slot-title">Pickup time</h2>
        {pickupOptions ? (<TimeSlotPicker options={pickupOptions} value={slot} onChange={setSlot} horizonDays={horizonDays}/>) : null}
      </div>

      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note"/>

      <div className="order-edit-page__actions">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button loading={saveMutation.isPending} onClick={() => {
            if (!slot) {
                toast.error('Select a pickup slot');
                return;
            }
            saveMutation.mutate({
                payload: {
                    note,
                    pickup_slot_id: slot.pickup_slot_id,
                    pickup_date: slot.pickup_date,
                    items: Object.entries(quantities).map(([product_id, quantity]) => ({
                        product_id: Number(product_id),
                        quantity,
                    })),
                },
                version: order.version,
            }, {
                onSuccess: () => onSaved(),
                onError: (error) => {
                    const apiError = ApiError.fromUnknown(error);
                    toast.error(apiError.friendlyMessage);
                    if (apiError.code === 'RESOURCE_MODIFIED') {
                        toast.info('Order was just updated — reloading…');
                        onConflict();
                    }
                },
            });
        }}>
          Save changes
        </Button>
      </div>
    </div>);
}
