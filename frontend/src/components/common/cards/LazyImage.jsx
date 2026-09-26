import { useState } from 'react';

import { cn } from '@/lib/cn';

import './LazyImage.css';

/** Lazy-loaded image with blur-up placeholder for polish / perf. */
export function LazyImage({ src, alt, className }                ) {
  const [loaded, setLoaded] = useState(false);

  if (src === null || src === '') {
    return (
      <div
        className={cn('lazy-image--placeholder', className)}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={cn(
        'lazy-image',
        loaded ? 'lazy-image--loaded' : 'lazy-image--loading',
        className,
      )}
    />
  );
}
