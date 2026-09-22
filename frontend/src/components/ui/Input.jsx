import { useId } from 'react';

import { cn } from '../../lib/utils';

export function Input({ label, error, className, id, ...props }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        // Point the field at its message so a screen reader announces the error
        // instead of leaving it as unrelated text below.
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'h-10 rounded-md border px-3 text-sm outline-none transition',
          'focus:ring-2 focus:ring-blue-500/40',
          error ? 'border-red-500' : 'border-slate-300 focus:border-blue-500',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
