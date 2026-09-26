/** Parse MSW route/query params to number. */
export function numParam(value) {
  if (typeof value === 'string') return Number(value);
  if (Array.isArray(value) && typeof value[0] === 'string') return Number(value[0]);
  return Number.NaN;
}

export function pageParams(url) {
  const page = Number(url.searchParams.get('page') ?? '1') || 1;
  const rawSize = Number(url.searchParams.get('page_size') ?? '20') || 20;
  const page_size = rawSize === 5 || rawSize === 10 || rawSize === 20 ? rawSize : 20;
  return { page, page_size };
}

export function requireAuth(authHeader, getUser, role) {
  const user = getUser(authHeader);
  if (!user) return { error: 'unauthorized' };
  if (role && user.role !== role) return { error: 'forbidden' };
  return { user };
}
