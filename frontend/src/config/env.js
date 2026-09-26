export const env = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  WS_BASE_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
};
