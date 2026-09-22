import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind classes so a caller's class can override a component's default
// rather than both landing in the class list and the cascade deciding.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
