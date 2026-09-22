import { LogOut, User } from 'lucide-react';

import { Dropdown, DropdownItem, DropdownSeparator } from '../../components/ui/Dropdown';
import { useAuth } from './useAuth';

export function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          aria-label="Account menu"
          className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <User className="size-4" />
          )}
        </button>
      }
    >
      <div className="px-3 py-2 text-sm text-slate-500">{user?.email}</div>
      <DropdownSeparator />
      <DropdownItem onSelect={() => logout()} className="text-red-600">
        <span className="flex items-center gap-2">
          <LogOut className="size-4" />
          Sign out
        </span>
      </DropdownItem>
    </Dropdown>
  );
}
