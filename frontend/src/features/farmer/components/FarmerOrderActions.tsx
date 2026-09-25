import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useFarmerOrderActions } from '@/features/farmer/hooks/useFarmerOrderActions';
import type { FarmerOrderAction, OrderAction, OrderSummary } from '@/types';

import './FarmerOrderActions.css';

type Props = {
  order: OrderSummary & { allowed_actions: OrderAction[] };
  size?: 'sm' | 'default';
};

export function FarmerOrderActions({ order, size = 'sm' }: Props) {
  const { run } = useFarmerOrderActions(order);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<FarmerOrderAction | null>(null);

  const afterSuccess = () => {
    setDeclineOpen(false);
    setConfirmAction(null);
    setReason('');
  };

  const mutate = (action: FarmerOrderAction) => {
    run.mutate(
      { action, reason },
      {
        onSuccess: () => {
          afterSuccess();
        },
      },
    );
  };

  const renderBtn = (
    action: FarmerOrderAction,
    label: string,
    variant: 'default' | 'outline' | 'destructive' | 'accent' = 'default',
  ) => {
    if (!order.allowed_actions.includes(action)) return null;

    return (
      <span key={action}>
        <Button
          size={size}
          variant={variant}
          data-write
          disabled={run.isPending}
          loading={
            run.isPending &&
            (confirmAction === action || (action === 'DECLINE' && declineOpen))
          }
          onClick={() => {
            if (action === 'DECLINE') {
              setDeclineOpen(true);
              return;
            }
            setConfirmAction(action);
          }}
        >
          {label}
        </Button>
      </span>
    );
  };

  return (
    <>
      <div className="farmer-order-actions">
        {renderBtn('ACCEPT', 'Xác nhận', 'default')}
        {renderBtn('DECLINE', 'Từ chối', 'destructive')}
        {renderBtn('READY', 'Sẵn sàng', 'accent')}
        {renderBtn('COMPLETE', 'Hoàn thành', 'default')}
        {renderBtn('NO_SHOW', 'No-show', 'outline')}
      </div>

      <ConfirmDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        title="Từ chối đơn"
        description="Nhập lý do từ chối (5–500 ký tự)."
        confirmLabel="Từ chối"
        destructive
        loading={run.isPending}
        onConfirm={() => {
          if (reason.trim().length < 5) {
            toast.error('Lý do tối thiểu 5 ký tự');
            return;
          }
          mutate('DECLINE');
        }}
      >
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do từ chối…"
          className="farmer-order-actions__reason"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmAction !== null && confirmAction !== 'DECLINE'}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={
          confirmAction === 'ACCEPT'
            ? 'Xác nhận đơn này?'
            : confirmAction === 'READY'
              ? 'Đánh dấu sẵn sàng lấy?'
              : confirmAction === 'COMPLETE'
                ? 'Hoàn thành đơn?'
                : 'Đánh no-show?'
        }
        loading={run.isPending}
        destructive={confirmAction === 'NO_SHOW'}
        onConfirm={() => {
          if (confirmAction) mutate(confirmAction);
        }}
      />
    </>
  );
}
