import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  // Tokens live in localStorage, so one test must never inherit another's session.
  localStorage.clear();
});

afterEach(cleanup);
