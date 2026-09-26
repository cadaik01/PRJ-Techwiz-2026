import axiosClient from '@/lib/axiosClient';
import { adaptPaginated } from '@/lib/adapters/pagination.adapter';
/** /api/admin/* is the intentional DRF admin branch (see BE urls comment). */
export const adminApi = {
    getDashboard: async () => {
        const { data } = await axiosClient.get('/admin/dashboard/');
        return data;
    },
    getFarmers: async (params = {}) => {
        const { data } = await axiosClient.get('/admin/farmers/', { params });
        return adaptPaginated(data);
    },
    getFarmer: async (id) => {
        const { data } = await axiosClient.get(`/admin/farmers/${id}/`);
        return data;
    },
    getFarmerImpact: async (id) => {
        const { data } = await axiosClient.get(`/admin/farmers/${id}/impact/`);
        return data;
    },
    approveFarmer: async (id) => {
        const { data } = await axiosClient.post(`/admin/farmers/${id}/approve/`);
        return data;
    },
    rejectFarmer: async (id, reason) => {
        const { data } = await axiosClient.post(`/admin/farmers/${id}/reject/`, { reason });
        return data;
    },
    suspendFarmer: async (id, reason) => {
        const { data } = await axiosClient.post(`/admin/farmers/${id}/suspend/`, { reason });
        return data;
    },
    reinstateFarmer: async (id) => {
        const { data } = await axiosClient.post(`/admin/farmers/${id}/reinstate/`);
        return data;
    },
    getCustomers: async (params = {}) => {
        const { data } = await axiosClient.get('/admin/customers/', { params });
        return adaptPaginated(data);
    },
    getCustomerImpact: async (id) => {
        const { data } = await axiosClient.get(`/admin/customers/${id}/impact/`);
        return data;
    },
    deactivateCustomer: async (id, reason) => {
        const { data } = await axiosClient.post(`/admin/customers/${id}/deactivate/`, { reason });
        return data;
    },
    activateCustomer: async (id) => {
        const { data } = await axiosClient.post(`/admin/customers/${id}/activate/`);
        return data;
    },
    getMarkets: async (params = {}) => {
        const { data } = await axiosClient.get('/admin/markets/', { params });
        return adaptPaginated(data);
    },
    getMarket: async (id) => {
        const { data } = await axiosClient.get(`/admin/markets/${id}/`);
        return data;
    },
    createMarket: async (payload) => {
        const { data } = await axiosClient.post('/admin/markets/', payload);
        return data;
    },
    updateMarket: async (id, payload) => {
        const { data } = await axiosClient.patch(`/admin/markets/${id}/`, payload);
        return data;
    },
    activateMarket: async (id) => {
        const { data } = await axiosClient.post(`/admin/markets/${id}/activate/`);
        return data;
    },
    deactivateMarket: async (id) => {
        const { data } = await axiosClient.post(`/admin/markets/${id}/deactivate/`);
        return data;
    },
    getCategories: async () => {
        const { data } = await axiosClient.get('/admin/categories/');
        return data;
    },
    createCategory: async (payload) => {
        const { data } = await axiosClient.post('/admin/categories/', payload);
        return data;
    },
    updateCategory: async (id, payload) => {
        const { data } = await axiosClient.patch(`/admin/categories/${id}/`, payload);
        return data;
    },
    reorderCategories: async (ordered_ids) => {
        const { data } = await axiosClient.patch('/admin/categories/reorder/', { ordered_ids });
        return data;
    },
    deleteCategory: async (id) => {
        await axiosClient.delete(`/admin/categories/${id}/`);
    },
    getModerationProducts: async () => {
        const { data } = await axiosClient.get('/admin/moderation/products/');
        return adaptPaginated(data);
    },
    hideProduct: async (id, reason) => {
        const { data } = await axiosClient.post(`/admin/moderation/products/${id}/hide/`, { reason });
        return data;
    },
    restoreProduct: async (id) => {
        const { data } = await axiosClient.post(`/admin/moderation/products/${id}/restore/`);
        return data;
    },
    getModerationReviews: async () => {
        const { data } = await axiosClient.get('/admin/moderation/reviews/');
        return adaptPaginated(data);
    },
    hideReview: async (id, reason) => {
        const { data } = await axiosClient.post(`/admin/moderation/reviews/${id}/hide/`, { reason });
        return data;
    },
    restoreReview: async (id) => {
        const { data } = await axiosClient.post(`/admin/moderation/reviews/${id}/restore/`);
        return data;
    },
    getReports: async (params) => {
        const { data } = await axiosClient.get('/admin/reports/', {
            params,
        });
        return data;
    },
    exportReports: async (params) => {
        const response = await axiosClient.get('/admin/reports/export/', {
            params,
            responseType: 'blob',
        });
        return response.data;
    },
    getAnnouncements: async () => {
        const { data } = await axiosClient.get('/admin/announcements/');
        return adaptPaginated(data);
    },
    createAnnouncement: async (payload) => {
        const { data } = await axiosClient.post('/admin/announcements/', payload);
        return data;
    },
    updateAnnouncement: async (id, payload) => {
        const { data } = await axiosClient.patch(`/admin/announcements/${id}/`, payload);
        return data;
    },
    deleteAnnouncement: async (id) => {
        await axiosClient.delete(`/admin/announcements/${id}/`);
    },
    getAuditLogs: async (params = {}) => {
        const { data } = await axiosClient.get('/admin/audit-logs/', { params });
        return adaptPaginated(data);
    },
};
