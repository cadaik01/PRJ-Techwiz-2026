import { useEffect, useState } from 'react';

/**
 * Follows `value` but only after it has stopped changing for `delay` ms.
 *
 * Typing "nguyen" fires one request instead of six. The timer is cleared on every keystroke
 * and on unmount, so a pending update never lands on a screen that has gone away.
 */
export function useDebouncedValue(value, delay = 300) {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
