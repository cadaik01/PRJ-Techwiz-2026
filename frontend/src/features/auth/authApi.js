import { STORAGE_KEYS } from '../../config/constants';
import axiosClient from '../../lib/axiosClient';

function storedRefreshToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.REFRESH);
  } catch {
    return null;
  }
}

export const authApi = {
  login: (credentials) => axiosClient.post('/auth/login/', credentials).then((r) => r.data),
  // Sending the refresh token lets the backend blacklist it too, not only the access token.
  logout: () =>
    axiosClient
      .post('/auth/logout/', { refresh: storedRefreshToken() ?? '' })
      .then((r) => r.data),
  me: () => axiosClient.get('/auth/me/').then((r) => r.data),
  changePassword: (payload) =>
    axiosClient.post('/auth/change-password/', payload).then((r) => r.data),
  // Single-use ticket for the WebSocket handshake; fetch a fresh one per connection.
  wsTicket: () => axiosClient.post('/auth/ws-ticket/').then((r) => r.data.ticket),
};
