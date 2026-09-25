import * as React from 'react';

import { cn } from '@/lib/cn';

import './Badge.css';

export type BadgeVariant =
  'default' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'outline';

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return <div className={cn('badge', `badge--${variant}`, className)} {...props} />;
}
