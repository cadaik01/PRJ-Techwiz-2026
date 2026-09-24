import { Tags } from 'lucide-react';

import { CATEGORY_ICONS } from './categoryIcons';

// Renders a stored icon name; unknown or empty names fall back to a generic tag.
export function CategoryIcon({ name, className = 'size-4' }) {
  const Icon = CATEGORY_ICONS[name] ?? Tags;
  return <Icon className={className} aria-hidden="true" />;
}
