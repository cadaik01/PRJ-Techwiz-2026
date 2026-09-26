import axiosClient from '@/lib/axiosClient';
import { adaptPaginated } from '@/lib/adapters/pagination.adapter';
import type {
  AdminAnnouncement,
  AdminCategory,
  AdminCustomer,
  AdminCustomerDetail,
  AdminDashboard,
  AdminFarmerDetail,
  AdminFarmerSummary,
  AdminMarket,
  AdminMarketPayload,
  AdminReport,
  AuditLogItem,
  ChangeLogEntry,
  TrackedModel,
  CustomerImpact,
  FarmerImpact,
  FarmerStatus,
  ModerationProduct,
  MarketClosure,
  MarketClosurePayload,
  ModerationReview,
  PageSize,
  ReviewType,
} from '@/types';

/** /api/admin/* is the intentional DRF admin branch (see BE urls comment). */
// AD-23 and AD-24 are separate endpoints because farmer_reviews.id and
// product_reviews.id are different id spaces - the same number means two reviews.
function reviewSegment(type: ReviewType): string {
  return type === 'FARMER' ? 'farmer-reviews' : 'product-reviews';
}

export const adminApi = {
  getDashboard: async () => {
    const { data } = await axiosClient.get<AdminDashboard>('/admin/dashboard/');
    return data;
  },

  getFarmers: async (
    params: {
      q?: string;
      status?: FarmerStatus;
      ordering?: string;
      page?: number;
      page_size?: PageSize;
    } = {},
  ) => {
    const { data } = await axiosClient.get('/admin/farmers/', { params });
    return adaptPaginated<AdminFarmerSummary>(data);
  },

  getFarmer: async (id: number) => {
    const { data } = await axiosClient.get<AdminFarmerDetail>(`/admin/farmers/${id}/`);
    return data;
  },

  getFarmerImpact: async (id: number) => {
    const { data } = await axiosClient.get<FarmerImpact>(`/admin/farmers/${id}/suspension-impact/`);
    return data;
  },

  approveFarmer: async (id: number) => {
    const { data } = await axiosClient.post<AdminFarmerSummary>(
      `/admin/farmers/${id}/approve/`,
    );
    return data;
  },

  rejectFarmer: async (id: number, reason: string) => {
    const { data } = await axiosClient.post<AdminFarmerSummary>(
      `/admin/farmers/${id}/reject/`,
      { reason },
    );
    return data;
  },

  suspendFarmer: async (id: number, reason: string) => {
    const { data } = await axiosClient.post<AdminFarmerSummary>(
      `/admin/farmers/${id}/suspend/`,
      { reason },
    );
    return data;
  },

  reinstateFarmer: async (id: number) => {
    const { data } = await axiosClient.post<AdminFarmerSummary>(
      `/admin/farmers/${id}/reinstate/`,
    );
    return data;
  },

  getCustomers: async (
    params: {
      q?: string;
      is_active?: boolean;
      ordering?: string;
      page?: number;
      page_size?: PageSize;
    } = {},
  ) => {
    const { data } = await axiosClient.get('/admin/customers/', { params });
    return adaptPaginated<AdminCustomer>(data);
  },

  // AD-03 PATCH. Contact details only: operating days and coordinates carry rules that live
  // on the stall's own profile screen (D-031, D-032).
  updateFarmer: async (
    id: number,
    payload: Partial<{
      stall_name: string;
      contact_person: string;
      phone: string;
      description: string | null;
      order_cutoff_hours: number;
    }>,
  ) => {
    const { data } = await axiosClient.patch<AdminFarmerSummary>(
      `/admin/farmers/${id}/`,
      payload,
    );
    return data;
  },

  // AD-10 PATCH.
  updateCustomer: async (
    id: number,
    payload: Partial<{ full_name: string; phone: string; address: string }>,
  ) => {
    const { data } = await axiosClient.patch<AdminCustomer>(`/admin/customers/${id}/`, payload);
    return data;
  },

  getCustomer: async (id: number) => {
    const { data } = await axiosClient.get<AdminCustomerDetail>(`/admin/customers/${id}/`);
    return data;
  },

  getCustomerImpact: async (id: number) => {
    const { data } = await axiosClient.get<CustomerImpact>(
      `/admin/customers/${id}/deactivation-impact/`,
    );
    return data;
  },

  deactivateCustomer: async (id: number, reason: string) => {
    const { data } = await axiosClient.post<AdminCustomer & { affected_orders: number }>(
      `/admin/customers/${id}/deactivate/`,
      { reason },
    );
    return data;
  },

  activateCustomer: async (id: number) => {
    const { data } = await axiosClient.post<AdminCustomer>(
      `/admin/customers/${id}/activate/`,
    );
    return data;
  },

  getMarkets: async (
    params: { ordering?: string; page?: number; page_size?: PageSize } = {},
  ) => {
    const { data } = await axiosClient.get('/admin/markets/', { params });
    return adaptPaginated<AdminMarket>(data);
  },

  getMarket: async (id: number) => {
    const { data } = await axiosClient.get<AdminMarket>(`/admin/markets/${id}/`);
    return data;
  },

  createMarket: async (payload: AdminMarketPayload) => {
    const { data } = await axiosClient.post<AdminMarket>('/admin/markets/', payload);
    return data;
  },

  updateMarket: async (id: number, payload: Partial<AdminMarketPayload>) => {
    const { data } = await axiosClient.patch<
      AdminMarket & { deactivated_slot_count?: number }
    >(`/admin/markets/${id}/`, payload);
    return data;
  },

  activateMarket: async (id: number) => {
    const { data } = await axiosClient.post<AdminMarket>(
      `/admin/markets/${id}/activate/`,
    );
    return data;
  },

  // AD-17. Closing carries out the orders still open at the market, so the reason the admin
  // gives is what both the shoppers and the stalls are told.
  deactivateMarket: async (id: number, reason: string) => {
    const { data } = await axiosClient.post<AdminMarket & { cancelled_orders: number }>(
      `/admin/markets/${id}/deactivate/`,
      { reason },
    );
    return data;
  },

  // AD-31: a plain array, not a paginated page.
  getMarketClosures: async (marketId: number, includePast = false) => {
    const { data } = await axiosClient.get<MarketClosure[]>(
      `/admin/markets/${marketId}/closures/`,
      { params: includePast ? { include_past: true } : undefined },
    );
    return data;
  },

  createMarketClosure: async (marketId: number, payload: MarketClosurePayload) => {
    const { data } = await axiosClient.post<MarketClosure>(
      `/admin/markets/${marketId}/closures/`,
      payload,
    );
    return data;
  },

  deleteMarketClosure: async (closureId: number) => {
    await axiosClient.delete(`/admin/market-closures/${closureId}/`);
  },

  getCategories: async () => {
    const { data } = await axiosClient.get<AdminCategory[]>('/admin/categories/');
    return data;
  },

  createCategory: async (payload: {
    name: string;
    icon?: string | null;
    display_order?: number;
  }) => {
    const { data } = await axiosClient.post<AdminCategory>('/admin/categories/', payload);
    return data;
  },

  updateCategory: async (
    id: number,
    payload: Partial<{
      name: string;
      icon: string | null;
      display_order: number;
      is_active: boolean;
    }>,
  ) => {
    const { data } = await axiosClient.patch<AdminCategory>(
      `/admin/categories/${id}/`,
      payload,
    );
    return data;
  },

  // There is no bulk reorder endpoint: A-07 edits display_order through AD-19, one
  // category at a time. The list is short, so the writes go out together.
  reorderCategories: async (ordered_ids: number[]) => {
    return Promise.all(
      ordered_ids.map(async (id, index) => {
        const { data } = await axiosClient.patch<AdminCategory>(
          `/admin/categories/${id}/`,
          { display_order: index + 1 },
        );
        return data;
      }),
    );
  },

  deleteCategory: async (id: number) => {
    await axiosClient.delete(`/admin/categories/${id}/`);
  },

  getModerationProducts: async (params: { ordering?: string } = {}) => {
    const { data } = await axiosClient.get('/admin/products/', { params });
    return adaptPaginated<ModerationProduct>(data);
  },

  hideProduct: async (id: number, reason: string) => {
    const { data } = await axiosClient.post<ModerationProduct>(
      `/admin/products/${id}/hide/`,
      { reason },
    );
    return data;
  },

  restoreProduct: async (id: number) => {
    const { data } = await axiosClient.post<ModerationProduct>(
      `/admin/products/${id}/restore/`,
    );
    return data;
  },

  getModerationReviews: async (params: { ordering?: string } = {}) => {
    const { data } = await axiosClient.get('/admin/reviews/', { params });
    return adaptPaginated<ModerationReview>(data);
  },

  hideReview: async (id: number, type: ReviewType, reason: string) => {
    const { data } = await axiosClient.post<ModerationReview>(
      `/admin/${reviewSegment(type)}/${id}/hide/`,
      { reason },
    );
    return data;
  },

  restoreReview: async (id: number, type: ReviewType) => {
    const { data } = await axiosClient.post<ModerationReview>(
      `/admin/${reviewSegment(type)}/${id}/restore/`,
    );
    return data;
  },

  getReports: async (params: { from: string; to: string; market_id?: number }) => {
    const { data } = await axiosClient.get<AdminReport>('/admin/reports/summary/', {
      params,
    });
    return data;
  },

  exportReports: async (params: { from: string; to: string; market_id?: number }) => {
    const response = await axiosClient.get<Blob>('/admin/reports/export/', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  getAnnouncements: async () => {
    const { data } = await axiosClient.get('/admin/announcements/');
    return adaptPaginated<AdminAnnouncement>(data);
  },

  createAnnouncement: async (payload: {
    title: string;
    content: string;
    audience: 'ALL' | 'CUSTOMER' | 'FARMER';
    starts_at: string;
    ends_at?: string | null;
    is_active?: boolean;
  }) => {
    const { data } = await axiosClient.post<AdminAnnouncement>(
      '/admin/announcements/',
      payload,
    );
    return data;
  },

  updateAnnouncement: async (
    id: number,
    payload: Partial<{
      title: string;
      content: string;
      audience: 'ALL' | 'CUSTOMER' | 'FARMER';
      starts_at: string;
      ends_at: string | null;
      is_active: boolean;
    }>,
  ) => {
    const { data } = await axiosClient.patch<AdminAnnouncement>(
      `/admin/announcements/${id}/`,
      payload,
    );
    return data;
  },

  deleteAnnouncement: async (id: number) => {
    await axiosClient.delete(`/admin/announcements/${id}/`);
  },

  // The audit trail: how one record changed over time. Distinct from the audit log above,
  // which is the security record of who did what.
  getChangeLog: async (model: TrackedModel, id: number) => {
    const { data } = await axiosClient.get<ChangeLogEntry[]>(
      `/admin/audit-trail/${model}/${id}/`,
    );
    return data;
  },

  getAuditLogs: async (
    params: {
      action?: string;
      user_id?: number;
      from?: string;
      to?: string;
      ordering?: string;
      page?: number;
      page_size?: PageSize;
    } = {},
  ) => {
    const { data } = await axiosClient.get('/admin/audit-logs/', { params });
    return adaptPaginated<AuditLogItem>(data);
  },
};
