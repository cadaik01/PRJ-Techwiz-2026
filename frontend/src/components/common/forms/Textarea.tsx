import * as React from 'react';

import { cn } from '@/lib/cn';

import './Textarea.css';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return <textarea className={cn('textarea', className)} ref={ref} {...props} />;
  },
);
Textarea.displayName = 'Textarea';
