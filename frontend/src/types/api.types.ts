/** Shared API envelope types (DRF-aligned). */

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: Record<string, string[]>;
  code?: string;
  request_id?: string;
}

export interface PaginatedData<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
  results: T[];
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;
