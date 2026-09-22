import axiosClient from '../../lib/axiosClient';

export const notificationsApi = {
  list: () => axiosClient.get('/notifications/').then((r) => r.data),
  markRead: (id) => axiosClient.patch(`/notifications/${id}/read/`).then((r) => r.data),
  markAllRead: () => axiosClient.patch('/notifications/read-all/').then((r) => r.data),
};
