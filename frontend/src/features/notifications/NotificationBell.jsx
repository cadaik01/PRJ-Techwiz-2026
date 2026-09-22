import { Bell } from 'lucide-react';

import { Dropdown, DropdownItem, DropdownSeparator } from '../../components/ui/Dropdown';
import { formatDateTime } from '../../utils/formatters';
import { useNotifications } from './useNotifications';

export function NotificationBell() {
  const { items, unreadCount, read, readAll } = useNotifications();

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          className="relative rounded p-2 text-slate-600 hover:bg-slate-100"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      }
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium text-slate-900">Notifications</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={readAll}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>
      <DropdownSeparator />

      {items.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-slate-500">Nothing yet.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {items.slice(0, 10).map((item) => (
            <DropdownItem key={item.id} onSelect={() => read(item.id)}>
              <div className="flex flex-col gap-0.5">
                <span className={item.is_read ? 'text-slate-600' : 'font-medium text-slate-900'}>
                  {item.verb}
                </span>
                <span className="text-xs text-slate-400">{formatDateTime(item.created_at)}</span>
              </div>
            </DropdownItem>
          ))}
        </div>
      )}
    </Dropdown>
  );
}
