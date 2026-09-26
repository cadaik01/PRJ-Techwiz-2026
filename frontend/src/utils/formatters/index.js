import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';

import { moneyToNumber } from '@/utils/helpers/domain';

/** Amounts from the API are USD. */
export function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(moneyToNumber(amount));
}

export function formatVnd(amount) {
  return formatMoney(amount);
}

export function formatDateTime(value) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'dd/MM/yyyy HH:mm', { locale: enUS });
}

export function formatDate(value) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'dd/MM/yyyy', { locale: enUS });
}

export function formatRelative(value) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return formatDistanceToNow(date, { addSuffix: true, locale: enUS });
}
