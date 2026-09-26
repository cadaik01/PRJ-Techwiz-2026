import axiosClient from '@/lib/axiosClient';
import { adaptMe, stripConfirmPassword, type BeMe } from '@/lib/adapters/auth.adapter';
import type {
  ChangePasswordPayload,
  LoginPayload,
  RegisterCustomerPayload,
  RegisterFarmerPayload,
} from '@/features/auth/types/auth.types';
import type { AuthTokens, FarmerStatus, LoginResponse, Me, WsTicket } from '@/types';

export type {
  ChangePasswordPayload,
  LoginPayload,
  RegisterCustomerPayload,
  RegisterFarmerPayload,
} from '@/features/auth/types/auth.types';

type LoginRaw = Omit<LoginResponse, 'user'> & { user: BeMe };

async function enrichFarmerStatus(me: Me): Promise<Me> {
  if (me.role !== 'FARMER' || me.farmer_status !== null) return me;
  try {
    const { data } = await axiosClient.get<{ status?: FarmerStatus }>(
      '/farmer-profiles/me/',
    );
    if (data?.status) {
      return { ...me, farmer_status: data.status };
    }
  } catch {
    // Farmer profile may be unavailable during early onboarding.
  }
  return me;
}

function adaptLogin(raw: LoginRaw): LoginResponse {
  return {
    access: raw.access,
    refresh: raw.refresh,
    user: adaptMe(raw.user),
  };
}

export const authApi = {
  login: async (payload: LoginPayload) => {
    const { data } = await axiosClient.post<LoginRaw>('/auth/login/', payload);
    const adapted = adaptLogin(data);
    adapted.user = await enrichFarmerStatus(adapted.user);
    return adapted;
  },

  adminLogin: async (payload: LoginPayload) => {
    const { data } = await axiosClient.post<LoginRaw>('/auth/admin/login/', payload);
    return adaptLogin(data);
  },

  /** Legacy BE blacklists the access token rather than refresh. */
  logout: async (access: string) => {
    await axiosClient.post('/auth/logout/', { access });
  },

  refresh: async (refresh: string) => {
    const { data } = await axiosClient.post<AuthTokens>('/auth/refresh/', {
      refresh,
    });
    return data;
  },

  me: async () => {
    const { data } = await axiosClient.get<BeMe>('/auth/me/');
    return enrichFarmerStatus(adaptMe(data));
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    await axiosClient.post('/auth/change-password/', stripConfirmPassword(payload));
  },

  wsTicket: async () => {
    const { data } = await axiosClient.post<WsTicket>('/auth/ws-ticket/', {});
    return data;
  },

  registerCustomer: async (payload: RegisterCustomerPayload) => {
    const { data } = await axiosClient.post<LoginRaw>(
      '/auth/register/customer/',
      stripConfirmPassword(payload),
    );
    return adaptLogin(data);
  },

  registerFarmer: async (payload: RegisterFarmerPayload) => {
    const { data } = await axiosClient.post<LoginRaw>(
      '/auth/register/farmer/',
      stripConfirmPassword(payload),
    );
    const adapted = adaptLogin(data);
    adapted.user = await enrichFarmerStatus(adapted.user);
    return adapted;
  },
};
