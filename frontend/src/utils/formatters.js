import { format } from 'date-fns';

// D-020: USD, always two decimals, comma thousands separator, e.g. $1,245.50.
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  if (amount == null || Number.isNaN(Number(amount))) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value, pattern = 'dd/MM/yyyy') {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, pattern);
}

export function formatDateTime(value) {
  return formatDate(value, 'dd/MM/yyyy HH:mm');
}
