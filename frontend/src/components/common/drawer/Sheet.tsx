import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/cn';

import './Sheet.css';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export type SheetSide = 'top' | 'bottom' | 'left' | 'right';

export function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay className={cn('sheet-overlay', className)} {...props} />
  );
}

export function SheetContent({
  side = 'right',
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: SheetSide;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn('sheet-content', `sheet-content--${side}`, className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="sheet__close">
          <X className="sheet__close-icon" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('sheet-header', className)} {...props} />;
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('sheet-title', className)} {...props} />;
}
