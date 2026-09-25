import { Link } from 'react-router-dom';

import { ApiError } from '@/lib/ApiError';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { formatRelative } from '@/utils/formatters';

import './FarmerNotificationsPage.css';

export default function FarmerNotificationsPage() {
  const { query, results, unread, markAll, markOne } = useNotifications('FARMER');

  if (query.isLoading) return <PageSkeleton />;

  if (query.isError) {
    return (
      <EmptyState
        title="Không tải được thông báo"
        description={ApiError.fromUnknown(query.error).friendlyMessage}
        actionLabel="Thử lại"
        onAction={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="farmer-notifications-page">
      <PageHeader
        title="Thông báo"
        description={`${unread} chưa đọc`}
        actions={
          <Button
            size="sm"
            variant="outline"
            loading={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Đánh dấu đã đọc tất cả
          </Button>
        }
      />
      {!results.length ? (
        <EmptyState title="Chưa có thông báo" />
      ) : (
        <ul className="farmer-notifications-page__list">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={
                  item.is_read
                    ? 'farmer-notifications-page__item'
                    : 'farmer-notifications-page__item farmer-notifications-page__item--unread'
                }
                onClick={() => {
                  if (!item.is_read) markOne.mutate(item.id);
                }}
              >
                <div className="farmer-notifications-page__row">
                  <div>
                    <p className="farmer-notifications-page__title">{item.title}</p>
                    <p className="farmer-notifications-page__message">{item.message}</p>
                    <p className="farmer-notifications-page__time">
                      {formatRelative(item.created_at)}
                    </p>
                  </div>
                  {!item.is_read ? <span className="page-primitive__dot-unread" /> : null}
                </div>
                {item.target_url ? (
                  <Link
                    to={item.target_url}
                    className="farmer-notifications-page__link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Xem chi tiết →
                  </Link>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
