import { createElement } from 'react';

import { resolveCategoryIcon } from '@/utils/categoryIcon';

/** Draws the lucide icon a category stores by name. Built with createElement rather than a
 *  <Icon /> local binding, which React would treat as a brand-new component each render and
 *  remount on every keystroke. */
export function CategoryIcon({
  icon,
  className,
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  return createElement(resolveCategoryIcon(icon), {
    className,
    strokeWidth: 1.75,
    'aria-hidden': true,
  });
}
