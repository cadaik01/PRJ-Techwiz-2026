import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/cn';

import './Button.css';

export type ButtonVariant =
  'default' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'destructive' | 'link';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

function sizeClass(size: ButtonSize): string {
  if (size === 'sm') return 'btn--sm';
  if (size === 'lg') return 'btn--lg';
  if (size === 'icon') return 'btn--icon';
  return 'btn--md';
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  const isDisabled = Boolean(disabled || loading);

  return (
    <Comp
      className={cn(
        'btn',
        `btn--${variant}`,
        sizeClass(size),
        loading && 'is-loading',
        isDisabled && 'is-disabled',
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <span className="btn__spinner" aria-hidden="true" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
