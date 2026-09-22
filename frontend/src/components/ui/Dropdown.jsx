import * as RadixDropdown from '@radix-ui/react-dropdown-menu';

import { cn } from '../../lib/utils';

export function Dropdown({ trigger, children, align = 'end' }) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>{trigger}</RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align={align}
          sideOffset={6}
          className="min-w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
        >
          {children}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

export function DropdownItem({ className, ...props }) {
  return (
    <RadixDropdown.Item
      className={cn(
        'cursor-pointer rounded px-3 py-2 text-sm text-slate-700 outline-none',
        'data-[highlighted]:bg-slate-100',
        className,
      )}
      {...props}
    />
  );
}

export const DropdownSeparator = () => (
  <RadixDropdown.Separator className="my-1 h-px bg-slate-200" />
);
