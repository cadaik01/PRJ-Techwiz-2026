import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

// Confirmation for actions that cannot be undone or that change a status (Pass 3 §1.8).
// `tone` colours the confirm button by severity.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Xác nhận',
  tone = 'primary',
  loading = false,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
          Hủy
        </Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
