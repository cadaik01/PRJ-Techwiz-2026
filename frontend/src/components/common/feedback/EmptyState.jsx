import { Inbox } from 'lucide-react';

import { Button } from '@/components/common/forms/Button';
import { cn } from '@/lib/cn';

import './EmptyState.css';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}                 ) {
  return (
    <div className={cn('empty-state', className)}>
      <div className="empty-state__icon-wrap">
        {icon ?? <Inbox className="empty-state__icon" aria-hidden />}
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button className="empty-state__action" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
