/**
 * Seed order in accounts.0002_seed_initial_roles: ADMIN, FARMER, CUSTOMER.
 * DRF ModelSerializer exposes role as FK id by default.
 */
const ROLE_BY_ID                       = {
  1: 'ADMIN',
  2: 'FARMER',
  3: 'CUSTOMER',
};

function isRoleCode(value        )                {
  return value === 'ADMIN' || value === 'FARMER' || value === 'CUSTOMER';
}

function mapRole(role              )       {
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

function buildDisplayName(raw      )         {
  if (raw.display_name && raw.display_name.trim()) return raw.display_name.trim();
  if (raw.full_name && raw.full_name.trim()) return raw.full_name.trim();
  if (raw.stall_name && raw.stall_name.trim()) return raw.stall_name.trim();

  const first = (raw.first_name ?? '').trim();
  const last = (raw.last_name ?? '').trim();
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;

  return raw.email;
}

function readFarmerStatus(raw      )                      {
  if (raw.farmer_status) return raw.farmer_status;
  if (raw.farmer_profile?.status) return raw.farmer_profile.status;
  return null;
}

/** Map legacy/DRF /auth/me/ payload into the Me shape the UI expects. */
export function adaptMe(raw      )     {
  return {
    id: raw.id,
    email: raw.email,
    role: mapRole(raw.role),
    display_name: buildDisplayName(raw),
    farmer_status: readFarmerStatus(raw),
  };
}

/** Drop confirm_password — BE legacy serializers reject unknown fields. */
export function stripConfirmPassword                                         (
  payload   ,
)                              {
  const { confirm_password: _ignored, ...rest } = payload;
  void _ignored;
  return rest;
}
