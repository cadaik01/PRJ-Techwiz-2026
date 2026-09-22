import { cn } from '../../lib/utils';

// Placeholder blocks shaped like the content that is loading, so the layout does
// not jump when the data arrives.
export function PageSkeleton({ rows = 5, className }) {
  return (
    <div className={cn('flex flex-col gap-3 p-6', className)} aria-busy="true" aria-live="polite">
      <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded bg-slate-100" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
