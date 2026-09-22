import { format } from 'date-fns';

export function formatCurrency(amount, currency = 'VND', locale = 'vi-VN') {
  if (amount == null || Number.isNaN(Number(amount))) return '';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function formatDate(value, pattern = 'dd/MM/yyyy') {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, pattern);
}

export function formatDateTime(value) {
  return formatDate(value, 'dd/MM/yyyy HH:mm');
}
