import { getErrorMessage } from '@/utils/errorMap';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly fieldErrors: Record<string, string[]>;
  readonly apiMessage: string;
  readonly data: unknown;

  constructor(params: {
    status: number;
    message: string;
    code?: string;
    fieldErrors?: Record<string, string[]>;
    data?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors ?? {};
    this.apiMessage = params.message;
    this.data = params.data;
  }

  get friendlyMessage(): string {
    return getErrorMessage(this.code, this.apiMessage);
  }

  static fromUnknown(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (error instanceof Error) {
      return new ApiError({ status: 0, message: error.message });
    }
    return new ApiError({ status: 0, message: 'An unknown error occurred' });
  }
}
