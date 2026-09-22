import * as RadixDialog from '@radix-ui/react-dialog';

import { cn } from '../../lib/utils';

export function Dialog({ open, onOpenChange, title, description, children, className }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-slate-900/50" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
            'rounded-lg bg-white p-6 shadow-xl',
            className,
          )}
        >
          <RadixDialog.Title className="text-lg font-semibold text-slate-900">
            {title}
          </RadixDialog.Title>
          {description && (
            <RadixDialog.Description className="mt-1 text-sm text-slate-600">
              {description}
            </RadixDialog.Description>
          )}
          <div className="mt-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogClose = RadixDialog.Close;
