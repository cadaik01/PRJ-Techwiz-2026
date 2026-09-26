import { Suspense,                } from 'react';

import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';

export function Suspend({ children }                         ) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
