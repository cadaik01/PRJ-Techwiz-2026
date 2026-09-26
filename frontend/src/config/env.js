import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().default('/api'),
  VITE_WS_URL: z.string().default('/ws'),
  VITE_USE_MOCK: z.string().default('false'),
});

const parsed = envSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_WS_URL: import.meta.env.VITE_WS_URL,
  VITE_USE_MOCK: import.meta.env.VITE_USE_MOCK,
});

export const env = {
  API_URL: parsed.VITE_API_URL,
  WS_BASE_URL: parsed.VITE_WS_URL,
  USE_MOCK: parsed.VITE_USE_MOCK === 'true',
  IS_DEV: import.meta.env.DEV,
};

export function wsUrl(path        )         {
  const base = env.WS_BASE_URL;
  if (base.startsWith('ws://') || base.startsWith('wss://')) {
    return `${base}${path}`;
  }
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${window.location.host}${base}${path}`;
}
