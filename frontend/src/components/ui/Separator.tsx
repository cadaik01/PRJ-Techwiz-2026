import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

import { cn } from '@/lib/cn';

import './Separator.css';

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'separator',
        orientation === 'horizontal' ? 'separator--horizontal' : 'separator--vertical',
        className,
      )}
      {...props}
    />
  );
}
