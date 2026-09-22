// Read and validate environment variables once, at module load, so a missing or
// malformed value fails loudly here instead of surfacing as a confusing 404 later.

function required(name, fallback) {
  const value = import.meta.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  API_BASE_URL: required('VITE_API_BASE_URL', '/api'),
  WS_BASE_URL: required('VITE_WS_BASE_URL', '/ws'),
  IS_DEV: import.meta.env.DEV,
};

// Absolute ws:// or wss:// URL for a relative WebSocket path.
export function wsUrl(path) {
  const base = env.WS_BASE_URL;
  if (base.startsWith('ws://') || base.startsWith('wss://')) return `${base}${path}`;
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${window.location.host}${base}${path}`;
}
