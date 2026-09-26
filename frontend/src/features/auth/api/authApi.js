import axiosClient from '@/lib/axiosClient';
import { adaptMe, stripConfirmPassword } from '@/lib/adapters/auth.adapter';
async function enrichFarmerStatus(me) {
    if (me.role !== 'FARMER' || me.farmer_status !== null)
        return me;
    try {
        const { data } = await axiosClient.get('/farmer-profiles/me/');
        if (data?.status) {
            return { ...me, farmer_status: data.status };
        }
    }
    catch {
        // Farmer profile may be unavailable during early onboarding.
    }
    return me;
}
function adaptLogin(raw) {
    return {
        access: raw.access,
        refresh: raw.refresh,
        user: adaptMe(raw.user),
    };
}
export const authApi = {
    login: async (payload) => {
        const { data } = await axiosClient.post('/auth/login/', payload);
        const adapted = adaptLogin(data);
        adapted.user = await enrichFarmerStatus(adapted.user);
        return adapted;
    },
    adminLogin: async (payload) => {
        const { data } = await axiosClient.post('/auth/admin/login/', payload);
        return adaptLogin(data);
    },
    /** Legacy BE blacklists the access token rather than refresh. */
    logout: async (access) => {
        await axiosClient.post('/auth/logout/', { access });
    },
    refresh: async (refresh) => {
        const { data } = await axiosClient.post('/auth/refresh/', {
            refresh,
        });
        return data;
    },
    me: async () => {
        const { data } = await axiosClient.get('/auth/me/');
        return enrichFarmerStatus(adaptMe(data));
    },
    changePassword: async (payload) => {
        await axiosClient.post('/auth/change-password/', stripConfirmPassword(payload));
    },
    wsTicket: async () => {
        const { data } = await axiosClient.post('/auth/ws-ticket/', {});
        return data;
    },
    registerCustomer: async (payload) => {
        const { data } = await axiosClient.post('/auth/register/customer/', stripConfirmPassword(payload));
        return adaptLogin(data);
    },
    registerFarmer: async (payload) => {
        const { data } = await axiosClient.post('/auth/register/farmer/', stripConfirmPassword(payload));
        const adapted = adaptLogin(data);
        adapted.user = await enrichFarmerStatus(adapted.user);
        return adapted;
    },
};
