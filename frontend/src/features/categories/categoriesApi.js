import axiosClient from '../../lib/axiosClient';

// AD-18, AD-19 (admin) and PU-02 (public).
export const categoriesApi = {
  adminList: () => axiosClient.get('/admin/categories/').then((r) => r.data),
  create: (payload) => axiosClient.post('/admin/categories/', payload).then((r) => r.data),
  update: (id, payload) => axiosClient.patch(`/admin/categories/${id}/`, payload).then((r) => r.data),
  remove: (id) => axiosClient.delete(`/admin/categories/${id}/`),
  publicList: () => axiosClient.get('/public/categories/').then((r) => r.data),
};
