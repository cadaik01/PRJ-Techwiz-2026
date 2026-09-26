import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '@/lib/cn';

import './Switch.css';

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root className={cn('switch', className)} {...props}>
      <SwitchPrimitives.Thumb className="switch__thumb" />
    </SwitchPrimitives.Root>
  );
}
