import { Suspense, type ReactNode } from 'react';

import { PageSkeleton } from '@/components/feedback/PageSkeleton';

export function Suspend({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
