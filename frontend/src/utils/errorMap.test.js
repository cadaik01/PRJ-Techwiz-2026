import { describe, expect, it } from 'vitest';
import { getErrorMessage, mapErrorCode } from '@/utils/errorMap';

/** The frozen catalogue, Pass 4B §2.5. Every code the API can return needs a sentence for the UI. */
const SPEC_CODES = [
  'VALIDATION_ERROR',
  'EMAIL_EXISTS',
  'INSUFFICIENT_STOCK',
  'INVALID_STATUS_TRANSITION',
  'NOT_AUTHENTICATED',
  'INVALID_CREDENTIALS',
  'TOKEN_INVALID',
  'ACCOUNT_LOCKED',
  'PERMISSION_DENIED',
  'ACTION_NOT_PERMITTED_FOR_ROLE',
  'FARMER_NOT_APPROVED',
  'FARMER_SUSPENDED',
  'NOT_FOUND',
  'RESOURCE_MODIFIED',
  'IDEMPOTENCY_IN_PROGRESS',
  'CONFLICT_RETRY',
  'OPEN_ORDER_LIMIT_EXCEEDED',
  'CUTOFF_PASSED',
  'CUTOFF_NOT_REACHED',
  'PICKUP_ALREADY_STARTED',
  'PICKUP_NOT_ENDED',
  'SLOT_NOT_AVAILABLE',
  'PRODUCT_NOT_AVAILABLE',
  'REVIEW_NOT_ALLOWED',
  'REPLY_ALREADY_EXISTS',
  'RESOURCE_IN_USE',
  'IDEMPOTENCY_KEY_REUSED',
  'FAILED_PRECONDITION',
  'PRECONDITION_REQUIRED',
  'THROTTLED',
  'INTERNAL_SERVER_ERROR',
  'AI_UNAVAILABLE',
];

const FALLBACK_TITLE = 'Something went wrong';

describe('error code to UI text', () => {
  it.each(SPEC_CODES)('%s has its own sentence', (code) => {
    const { title, suggestion } = mapErrorCode(code);

    expect(title).not.toBe(FALLBACK_TITLE);
    expect(suggestion?.length ?? 0).toBeGreaterThan(0);
  });

  it('every sentence is plain English, not a raw code', () => {
    for (const code of SPEC_CODES) {
      expect(mapErrorCode(code).title).not.toMatch(/[A-Z]{2,}_[A-Z]/);
    }
  });

  it('falls back for a code nobody has mapped yet', () => {
    expect(mapErrorCode('BRAND_NEW_CODE').title).toBe(FALLBACK_TITLE);
    expect(mapErrorCode(undefined).title).toBe(FALLBACK_TITLE);
  });

  it('prefers the message the server sent over the generic title', () => {
    expect(getErrorMessage('CUTOFF_PASSED', 'The deadline passed 5 minutes ago')).toBe(
      'The deadline passed 5 minutes ago',
    );
    expect(getErrorMessage('CUTOFF_PASSED')).toBe(mapErrorCode('CUTOFF_PASSED').title);
  });
});
