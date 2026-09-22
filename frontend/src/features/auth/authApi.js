import axiosClient from '../../lib/axiosClient';

export const authApi = {
  login: (credentials) => axiosClient.post('/auth/login/', credentials).then((r) => r.data),
  logout: () => axiosClient.post('/auth/logout/').then((r) => r.data),
  me: () => axiosClient.get('/auth/me/').then((r) => r.data),
  changePassword: (payload) =>
    axiosClient.post('/auth/change-password/', payload).then((r) => r.data),
  // Single-use ticket for the WebSocket handshake; fetch a fresh one per connection.
  wsTicket: () => axiosClient.post('/auth/ws-ticket/').then((r) => r.data.ticket),
};
