import { Link } from 'react-router-dom';
import { ApiError } from '@/lib/ApiError';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { formatRelative } from '@/utils/formatters';
import './NotificationsPage.css';
export default function NotificationsPage() {
    const { query, results, unread, markAll, markOne } = useNotifications('CUSTOMER');
    if (query.isLoading)
        return <PageSkeleton />;
    if (query.isError) {
        return (<EmptyState title="Notifications couldn't be loaded" description={ApiError.fromUnknown(query.error).friendlyMessage} actionLabel="Try again" onAction={() => void query.refetch()}/>);
    }
    return (<div className="notifications-page">
      <PageHeader eyebrow="Stay in the loop" title="Your notifications" description={unread > 0
            ? `${unread} unread update${unread === 1 ? '' : 's'}`
            : 'You are all caught up'} actions={<Button size="sm" variant="outline" loading={markAll.isPending} onClick={() => markAll.mutate()}>
            Mark all as read
          </Button>}/>

      {!results.length ? (<EmptyState title="No notifications yet" description="Order updates and stall messages will appear here."/>) : (<ul className="notifications-page__list">
          {results.map((item) => (<li key={item.id}>
              <button type="button" className={item.is_read
                    ? 'notifications-page__item'
                    : 'notifications-page__item notifications-page__item--unread'} onClick={() => {
                    if (!item.is_read)
                        markOne.mutate(item.id);
                }}>
                <div className="notifications-page__item-head">
                  <div>
                    <p className="notifications-page__item-title">{item.title}</p>
                    <p className="notifications-page__item-message">{item.message}</p>
                    <p className="notifications-page__item-time">
                      {formatRelative(item.created_at)}
                    </p>
                  </div>
                  {!item.is_read ? <span className="page-primitive__dot-unread"/> : null}
                </div>
                {item.target_url ? (<Link to={item.target_url} className="notifications-page__item-link" onClick={(e) => e.stopPropagation()}>
                    View details →
                  </Link>) : null}
              </button>
            </li>))}
        </ul>)}
    </div>);
}
