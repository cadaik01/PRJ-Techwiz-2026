import { Inbox } from 'lucide-react';

import { Button } from '../ui/Button';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 p-10 text-center">
      <Icon className="size-8 text-slate-400" aria-hidden="true" />
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && <p className="max-w-sm text-sm text-slate-600">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
