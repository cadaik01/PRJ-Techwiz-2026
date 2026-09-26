import type { FarmerStatus, Role } from './common.types';

/** Auth / session types. */

export interface Me {
  id: number;
  email: string;
  role: Role;
  display_name: string;
  farmer_status: FarmerStatus | null;
}

export interface PublicConfig {
  ai_chat_enabled: boolean;
  booking_horizon_days: number;
  max_open_orders_total: number;
  max_open_orders_per_farmer: number;
  max_upload_mb: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: Me;
}

export interface WsTicket {
  ticket: string;
}
