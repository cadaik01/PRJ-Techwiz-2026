import * as React from 'react';

import { cn } from '@/lib/cn';

import './Textarea.css';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return <textarea className={cn('textarea', className)} ref={ref} {...props} />;
});
Textarea.displayName = 'Textarea';
