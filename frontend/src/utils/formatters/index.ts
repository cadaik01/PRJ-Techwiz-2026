import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

import { usdToVnd, vndToUsd } from '@/utils/helpers/currency';
import { moneyToNumber } from '@/types';

export { usdToVnd, vndToUsd };

/** Amounts are already converted to VND by the Axios response adapter. */
export function formatMoney(amount: string | number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(moneyToNumber(amount));
}

export function formatVnd(amount: string | number): string {
  return formatMoney(amount);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'dd/MM/yyyy HH:mm', { locale: vi });
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'dd/MM/yyyy', { locale: vi });
}

export function formatRelative(value: string | Date): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return formatDistanceToNow(date, { addSuffix: true, locale: vi });
}
