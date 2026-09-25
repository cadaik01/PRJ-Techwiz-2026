import { useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

import {
  useAddFarmerMarket,
  useCreatePickupSlot,
  useFarmerMarkets,
  usePublicMarketsForJoin,
  useRemoveFarmerMarket,
  useTogglePickupSlot,
  useUpdateFarmerMarketStall,
} from '@/features/farmer/hooks/useFarmerMarkets';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import type { DayOfWeek } from '@/types';

import './FarmerMarketsPage.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const WEEKDAYS: Array<{ value: DayOfWeek; label: string }> = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 7, label: 'CN' },
];

export default function FarmerMarketsPage() {
  const marketsQuery = useFarmerMarkets();
  const publicMarketsQuery = usePublicMarketsForJoin();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addMarketId, setAddMarketId] = useState('');
  const [stallLabel, setStallLabel] = useState('');
  const [editStall, setEditStall] = useState('');

  const selected = useMemo(
    () => marketsQuery.data?.find((m) => m.id === selectedId) ?? null,
    [marketsQuery.data, selectedId],
  );

  const addMutation = useAddFarmerMarket();
  const updateStallMutation = useUpdateFarmerMarketStall();
  const removeMutation = useRemoveFarmerMarket();
  const addSlotMutation = useCreatePickupSlot();
  const toggleSlotMutation = useTogglePickupSlot();

  if (marketsQuery.isLoading) return <PageSkeleton />;

  const publicList = publicMarketsQuery.data?.results ?? [];
  const joinedIds = new Set(marketsQuery.data?.map((m) => m.market.id) ?? []);
  const availableToJoin = publicList.filter((m) => !joinedIds.has(m.id));

  const selectMarket = (membershipId: number, label: string) => {
    setSelectedId(membershipId);
    setEditStall(label);
  };

  return (
    <div className="farmer-markets-page">
      <PageHeader
        title="Chợ & khung giờ"
        description="Tham gia chợ, đặt nhãn quầy và cấu hình khung giờ nhận hàng."
      />

      <div className="page-primitive__layout-5">
        <div className="page-primitive__layout-5-side">
          {!marketsQuery.data?.length ? (
            <EmptyState title="Chưa tham gia chợ nào" />
          ) : (
            marketsQuery.data.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMarket(m.id, m.stall_label)}
                className={
                  selectedId === m.id
                    ? 'farmer-markets-page__market-btn farmer-markets-page__market-btn--selected'
                    : 'farmer-markets-page__market-btn'
                }
              >
                <p className="page-primitive__semibold">{m.market.name}</p>
                <p className="page-primitive__muted-sm">{m.stall_label}</p>
              </button>
            ))
          )}

          <div className="page-primitive__dashed-panel">
            <p className="page-primitive__font-medium">Thêm chợ</p>
            <select
              className="page-primitive__select-full"
              value={addMarketId}
              onChange={(e) => setAddMarketId(e.target.value)}
            >
              <option value="">Chọn chợ…</option>
              {availableToJoin.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Nhãn quầy (VD: Dãy A · Quầy 12)"
              value={stallLabel}
              onChange={(e) => setStallLabel(e.target.value)}
            />
            <Button
              data-write
              className="page-primitive__btn-full"
              disabled={!addMarketId}
              loading={addMutation.isPending}
              onClick={() => {
                const marketId = Number(addMarketId);
                if (!Number.isFinite(marketId)) return;
                addMutation.mutate(
                  {
                    market_id: marketId,
                    stall_label: stallLabel || 'Quầy mới',
                  },
                  {
                    onSuccess: (data) => {
                      setSelectedId(data.id);
                      setAddMarketId('');
                      setStallLabel('');
                      setEditStall(data.stall_label);
                    },
                  },
                );
              }}
            >
              Thêm chợ
            </Button>
          </div>
        </div>

        <div className="page-primitive__layout-5-main">
          {!selected ? (
            <EmptyState title="Chọn một chợ để cấu hình" />
          ) : (
            <>
              <div className="page-primitive__form-field">
                <Label>Nhãn quầy</Label>
                <div className="page-primitive__inline-row">
                  <Input
                    value={editStall}
                    onChange={(e) => setEditStall(e.target.value)}
                  />
                  <Button
                    data-write
                    loading={updateStallMutation.isPending}
                    onClick={() =>
                      updateStallMutation.mutate({
                        farmerMarketId: selected.id,
                        stall_label: editStall,
                      })
                    }
                  >
                    Lưu
                  </Button>
                </div>
              </div>

              <div className="page-primitive__map-h-64">
                <MapContainer
                  center={[selected.market.latitude, selected.market.longitude]}
                  zoom={16}
                  className="page-primitive__map-fill"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[selected.market.latitude, selected.market.longitude]}
                  />
                </MapContainer>
              </div>

              <div>
                <div className="farmer-markets-page__slots-head">
                  <h3 className="page-primitive__heading">Khung giờ theo tuần</h3>
                </div>
                <div className="page-primitive__actions-row farmer-markets-page__slots-actions">
                  {WEEKDAYS.map((d) => (
                    <Button
                      key={d.value}
                      size="sm"
                      variant="outline"
                      data-write
                      onClick={() =>
                        addSlotMutation.mutate({
                          farmer_market_id: selected.id,
                          day_of_week: d.value,
                          start_time: '06:00',
                          end_time: '08:00',
                        })
                      }
                    >
                      + {d.label}
                    </Button>
                  ))}
                </div>
                <div className="page-primitive__stack-2">
                  {selected.slots.length === 0 ? (
                    <p className="page-primitive__muted-sm">Chưa có khung giờ.</p>
                  ) : (
                    selected.slots.map((slot) => {
                      const day =
                        WEEKDAYS.find((d) => d.value === slot.day_of_week)?.label ??
                        String(slot.day_of_week);
                      return (
                        <div key={slot.id} className="page-primitive__list-item-row">
                          <span>
                            {day} · {slot.start_time}–{slot.end_time}
                          </span>
                          <Switch
                            checked={slot.is_active}
                            onCheckedChange={(checked) =>
                              toggleSlotMutation.mutate({
                                slotId: slot.id,
                                is_active: checked,
                              })
                            }
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <Button
                variant="destructive"
                data-write
                loading={removeMutation.isPending}
                onClick={() =>
                  removeMutation.mutate(selected.id, {
                    onSuccess: () => setSelectedId(null),
                  })
                }
              >
                Rời chợ
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
