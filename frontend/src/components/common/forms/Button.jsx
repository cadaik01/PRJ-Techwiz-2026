import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/cn';

import './Button.css';

function sizeClass(size) {
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
}) {
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
