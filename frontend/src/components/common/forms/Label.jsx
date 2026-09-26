import * as LabelPrimitive from '@radix-ui/react-label';

import { cn } from '@/lib/cn';

import './Label.css';

export function Label({
  className,
  ...props
}                                                  ) {
  return <LabelPrimitive.Root className={cn('label', className)} {...props} />;
}
