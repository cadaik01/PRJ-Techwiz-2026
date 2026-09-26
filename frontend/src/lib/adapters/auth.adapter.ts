import type { FarmerStatus, Me, Role } from '@/types';

/**
 * Seed order in accounts.0002_seed_initial_roles: ADMIN, FARMER, CUSTOMER.
 * DRF ModelSerializer exposes role as FK id by default.
 */
const ROLE_BY_ID: Record<number, Role> = {
  1: 'ADMIN',
  2: 'FARMER',
  3: 'CUSTOMER',
};

export type BeMe = {
  id: number;
  email: string;
  role: number | string | { id?: number; code?: string };
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  stall_name?: string | null;
  farmer_status?: FarmerStatus | null;
  farmer_profile?: { status?: FarmerStatus | null } | null;
};

function isRoleCode(value: string): value is Role {
  return value === 'ADMIN' || value === 'FARMER' || value === 'CUSTOMER';
}

function mapRole(role: BeMe['role']): Role {
  if (typeof role === 'number') {
    const mapped = ROLE_BY_ID[role];
    if (mapped) return mapped;
  }
  if (typeof role === 'string') {
    const upper = role.toUpperCase();
    if (isRoleCode(upper)) return upper;
  }
  if (role && typeof role === 'object') {
    if (typeof role.code === 'string') {
      const upper = role.code.toUpperCase();
      if (isRoleCode(upper)) return upper;
    }
    if (typeof role.id === 'number' && ROLE_BY_ID[role.id]) {
      return ROLE_BY_ID[role.id];
    }
  }
  return 'CUSTOMER';
}

function buildDisplayName(raw: BeMe): string {
  if (raw.display_name && raw.display_name.trim()) return raw.display_name.trim();
  if (raw.full_name && raw.full_name.trim()) return raw.full_name.trim();
  if (raw.stall_name && raw.stall_name.trim()) return raw.stall_name.trim();

  const first = (raw.first_name ?? '').trim();
  const last = (raw.last_name ?? '').trim();
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;

  return raw.email;
}

function readFarmerStatus(raw: BeMe): FarmerStatus | null {
  if (raw.farmer_status) return raw.farmer_status;
  if (raw.farmer_profile?.status) return raw.farmer_profile.status;
  return null;
}

/** Map legacy/DRF /auth/me/ payload into the Me shape the UI expects. */
export function adaptMe(raw: BeMe): Me {
  return {
    id: raw.id,
    email: raw.email,
    role: mapRole(raw.role),
    display_name: buildDisplayName(raw),
    farmer_status: readFarmerStatus(raw),
  };
}

/** Drop confirm_password — BE legacy serializers reject unknown fields. */
export function stripConfirmPassword<T extends { confirm_password?: string }>(
  payload: T,
): Omit<T, 'confirm_password'> {
  const { confirm_password: _ignored, ...rest } = payload;
  void _ignored;
  return rest;
}
