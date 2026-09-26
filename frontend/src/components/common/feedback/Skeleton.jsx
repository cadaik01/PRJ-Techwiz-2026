import { cn } from '@/lib/cn';

import './Skeleton.css';

export function Skeleton({ className, ...props }) {
  return <div className={cn('skeleton', className)} {...props} />;
}
