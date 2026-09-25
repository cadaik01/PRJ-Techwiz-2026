/** BE Product.price is USD (0.01–10000). UI displays VND. */
export const USD_TO_VND_RATE = 25_000;

export function usdToVnd(usd: number): number {
  if (!Number.isFinite(usd)) return 0;
  return Math.round(usd * USD_TO_VND_RATE);
}

export function vndToUsd(vnd: number): number {
  if (!Number.isFinite(vnd)) return 0;
  return Math.round((vnd / USD_TO_VND_RATE) * 100) / 100;
}

export function usdToVndString(usd: string | number): string {
  const value = typeof usd === 'string' ? Number(usd) : usd;
  return String(usdToVnd(value));
}

export function vndToUsdString(vnd: string | number): string {
  const value = typeof vnd === 'string' ? Number(vnd) : vnd;
  return vndToUsd(value).toFixed(2);
}

const MONEY_FIELD_KEYS = new Set([
  'price',
  'unit_price',
  'total_amount',
  'line_total',
  'subtotal',
  'amount',
  'revenue',
]);

const MONEY_QUERY_KEYS = new Set(['price_min', 'price_max']);

function convertMoneyValue(
  _key: string,
  value: unknown,
  direction: 'toVnd' | 'toUsd',
): unknown {
  if (typeof value !== 'string' && typeof value !== 'number') return value;
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return value;

  if (direction === 'toVnd') {
    return typeof value === 'string' ? usdToVndString(numeric) : usdToVnd(numeric);
  }
  return typeof value === 'string' ? vndToUsdString(numeric) : vndToUsd(numeric);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Walk response/request JSON and convert known money fields. */
export function convertMoneyFields(
  input: unknown,
  direction: 'toVnd' | 'toUsd',
): unknown {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => convertMoneyFields(item, direction));
  }
  if (!isPlainRecord(input)) return input;
  if (input instanceof Date) return input;
  if (typeof Blob !== 'undefined' && input instanceof Blob) return input;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (MONEY_FIELD_KEYS.has(key)) {
      out[key] = convertMoneyValue(key, value, direction);
      continue;
    }
    if (
      value !== null &&
      typeof value === 'object' &&
      !(value instanceof Date) &&
      !(typeof Blob !== 'undefined' && value instanceof Blob)
    ) {
      out[key] = convertMoneyFields(value, direction);
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Convert VND filter query params to USD before hitting the API. */
export function convertMoneyParams(
  params: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!params) return params;
  const out: Record<string, unknown> = { ...params };
  for (const key of MONEY_QUERY_KEYS) {
    if (!(key in out)) continue;
    out[key] = convertMoneyValue(key, out[key], 'toUsd');
  }
  return out;
}
