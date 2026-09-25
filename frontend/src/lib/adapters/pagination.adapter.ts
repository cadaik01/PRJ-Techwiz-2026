import type { PaginatedData } from '@/types';

/** DRF PageNumberPagination default shape. */
export type DrfPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function pageFromUrl(url: string | null): number | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, 'http://localhost');
    const page = parsed.searchParams.get('page');
    if (!page) return null;
    const n = Number(page);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readNullableString(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return null;
}

function isPaginatedData<T>(
  value: Record<string, unknown>,
): value is PaginatedData<T> & Record<string, unknown> {
  return (
    typeof value.page === 'number' &&
    typeof value.page_size === 'number' &&
    typeof value.total_pages === 'number' &&
    Array.isArray(value.results)
  );
}

/**
 * Normalize DRF pagination (or a bare array) into the FE PaginatedData contract.
 */
export function adaptPaginated<T>(raw: unknown, fallbackPageSize = 20): PaginatedData<T> {
  if (!raw) {
    return {
      count: 0,
      page: 1,
      page_size: fallbackPageSize,
      total_pages: 0,
      next: null,
      previous: null,
      results: [],
    };
  }

  if (Array.isArray(raw)) {
    return {
      count: raw.length,
      page: 1,
      page_size: raw.length || fallbackPageSize,
      total_pages: raw.length > 0 ? 1 : 0,
      next: null,
      previous: null,
      results: raw.filter((_item): _item is T => true),
    };
  }

  if (!isRecord(raw)) {
    return {
      count: 0,
      page: 1,
      page_size: fallbackPageSize,
      total_pages: 0,
      next: null,
      previous: null,
      results: [],
    };
  }

  if (isPaginatedData<T>(raw)) {
    return {
      count: typeof raw.count === 'number' ? raw.count : raw.results.length,
      page: raw.page,
      page_size: raw.page_size,
      total_pages: raw.total_pages,
      next: typeof raw.next === 'number' || raw.next === null ? raw.next : null,
      previous:
        typeof raw.previous === 'number' || raw.previous === null ? raw.previous : null,
      results: raw.results,
    };
  }

  const results = Array.isArray(raw.results)
    ? raw.results.filter((_item): _item is T => true)
    : [];
  const count = typeof raw.count === 'number' ? raw.count : results.length;
  const pageSize =
    results.length > 0 && count > results.length
      ? results.length
      : results.length || fallbackPageSize;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(count / pageSize)) : 0;
  const nextPage = pageFromUrl(readNullableString(raw.next));
  const prevPage = pageFromUrl(readNullableString(raw.previous));
  const currentPage =
    prevPage !== null ? prevPage + 1 : nextPage !== null ? nextPage - 1 : 1;

  return {
    count,
    page: currentPage,
    page_size: pageSize,
    total_pages: totalPages,
    next: nextPage,
    previous: prevPage,
    results,
  };
}

export function emptyPage<T>(pageSize = 20): PaginatedData<T> {
  return adaptPaginated<T>(undefined, pageSize);
}
