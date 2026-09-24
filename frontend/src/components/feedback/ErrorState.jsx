import { AlertTriangle } from 'lucide-react';

import { Button } from '../ui/Button';

// Error state for a list or page (Pass 3 §1.6): message, retry, and the request_id
// so a user can quote the incident to support.
export function ErrorState({ error, onRetry }) {
  const requestId = error?.response?.data?.request_id;
  const message = error?.apiMessage || 'Không tải được dữ liệu. Vui lòng thử lại.';

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center"
    >
      <AlertTriangle className="size-8 text-red-500" aria-hidden="true" />
      <p className="text-sm text-red-800">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
      {requestId && <p className="text-xs text-red-700">Mã sự cố: {requestId}</p>}
    </div>
  );
}
