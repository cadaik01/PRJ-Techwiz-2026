export const publicConfig = {
    ai_chat_enabled: true,
    booking_horizon_days: 7,
    max_open_orders_total: 5,
    max_open_orders_per_farmer: 1,
    max_upload_mb: 2,
};

/** Role seed order in accounts.0002: 1=ADMIN, 2=FARMER, 3=CUSTOMER */
export const demoUsers = {
    'customer@demo.vn': {
        id: 1,
        email: 'customer@demo.vn',
        role: 'CUSTOMER',
        role_id: 3,
        display_name: 'Minh Van',
        farmer_status: null,
        password: 'Demo1234',
    },
    'farmer@demo.vn': {
        id: 2,
        email: 'farmer@demo.vn',
        role: 'FARMER',
        role_id: 2,
        display_name: 'Da Lat Greens Stall',
        farmer_status: 'APPROVED',
        password: 'Demo1234',
    },
    'admin@demo.vn': {
        id: 3,
        email: 'admin@demo.vn',
        role: 'ADMIN',
        role_id: 1,
        display_name: 'Administrator',
        farmer_status: null,
        password: 'Demo1234',
    },
};
const sessions = new Map();
const refreshToAccess = new Map();
const dynamicUsers = { ...demoUsers };
function stripPassword(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        farmer_status: user.farmer_status,
    };
}
/** BE-shaped /auth/me/ payload (role FK id + display fields). */
function toBeMe(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role_id,
        display_name: user.display_name,
        farmer_status: user.farmer_status,
        farmer_profile: user.role === 'FARMER' && user.farmer_status
            ? { status: user.farmer_status }
            : null,
    };
}
export function envelope(data, message = 'OK') {
    return {
        success: true,
        message,
        request_id: crypto.randomUUID(),
        data,
        errors: {},
    };
}
export function errorEnvelope(message, code, errors = {}) {
    return {
        success: false,
        message,
        request_id: crypto.randomUUID(),
        data: {},
        errors,
        code,
    };
}
export function paginate(items, page, pageSize) {
    const allowed = pageSize === 5 || pageSize === 10 || pageSize === 20 ? pageSize : 20;
    const count = items.length;
    const total_pages = Math.max(1, Math.ceil(count / allowed));
    const safePage = Math.min(Math.max(1, page), total_pages);
    const start = (safePage - 1) * allowed;
    return {
        count,
        page: safePage,
        page_size: allowed,
        total_pages,
        next: safePage < total_pages ? safePage + 1 : null,
        previous: safePage > 1 ? safePage - 1 : null,
        results: items.slice(start, start + allowed),
    };
}
export function issueTokens(email) {
    const user = dynamicUsers[email];
    if (!user)
        return null;
    const access = `access-${email}-${Date.now()}`;
    const refresh = `refresh-${email}-${Date.now()}`;
    sessions.set(access, { access, refresh, userId: user.id });
    refreshToAccess.set(refresh, access);
    return {
        access,
        refresh,
        user: toBeMe(user),
    };
}
export function userFromAccess(access) {
    if (!access)
        return null;
    const session = sessions.get(access);
    if (!session)
        return null;
    const user = Object.values(dynamicUsers).find((u) => u.id === session.userId);
    return user ? stripPassword(user) : null;
}
/** Alias for handlers that read Bearer tokens. */
export function getUserByAccess(authHeader) {
    if (!authHeader?.startsWith('Bearer '))
        return null;
    return userFromAccess(authHeader.slice(7));
}
export function getDemoUserByAccess(authHeader) {
    if (!authHeader?.startsWith('Bearer '))
        return null;
    const session = sessions.get(authHeader.slice(7));
    if (!session)
        return null;
    return Object.values(dynamicUsers).find((u) => u.id === session.userId) ?? null;
}
export { toBeMe };
export function refreshTokens(refresh) {
    const oldAccess = refreshToAccess.get(refresh);
    if (!oldAccess)
        return null;
    const session = sessions.get(oldAccess);
    if (!session)
        return null;
    const user = Object.values(dynamicUsers).find((u) => u.id === session.userId);
    if (!user)
        return null;
    sessions.delete(oldAccess);
    refreshToAccess.delete(refresh);
    return issueTokens(user.email);
}
export function revokeRefresh(refresh) {
    const access = refreshToAccess.get(refresh);
    if (access)
        sessions.delete(access);
    refreshToAccess.delete(refresh);
}
/** BE LogoutView revokes the access token (FE posts `{ access }`). */
export function revokeAccess(access) {
    const session = sessions.get(access);
    if (!session)
        return;
    sessions.delete(access);
    refreshToAccess.delete(session.refresh);
}
export function registerCustomerUser(input) {
    const email = input.email.toLowerCase();
    if (dynamicUsers[email])
        return { error: 'EMAIL_EXISTS' };
    const id = 1000 + Object.keys(dynamicUsers).length;
    dynamicUsers[email] = {
        id,
        email,
        role: 'CUSTOMER',
        role_id: 3,
        display_name: input.full_name,
        farmer_status: null,
        password: input.password,
    };
    return { tokens: issueTokens(email) };
}
export function registerFarmerUser(input) {
    const email = input.email.toLowerCase();
    if (dynamicUsers[email])
        return { error: 'EMAIL_EXISTS' };
    const id = 2000 + Object.keys(dynamicUsers).length;
    dynamicUsers[email] = {
        id,
        email,
        role: 'FARMER',
        role_id: 2,
        display_name: input.stall_name,
        farmer_status: 'PENDING',
        password: input.password,
    };
    return { tokens: issueTokens(email) };
}
export function findDemoByEmail(email) {
    return dynamicUsers[email.toLowerCase()] ?? null;
}
export const findUserByEmail = findDemoByEmail;
export function createSession(user) {
    return issueTokens(user.email);
}
export function refreshSession(refresh) {
    const tokens = refreshTokens(refresh);
    if (!tokens)
        return null;
    return { access: tokens.access, refresh: tokens.refresh };
}
export function updatePassword(userId, currentPassword, newPassword) {
    const user = Object.values(dynamicUsers).find((u) => u.id === userId);
    if (!user || user.password !== currentPassword) {
        return { error: 'INVALID_CREDENTIALS' };
    }
    user.password = newPassword;
    return { ok: true };
}
export function registerUser(input) {
    if (input.role === 'CUSTOMER') {
        return registerCustomerUser({
            email: input.email,
            password: input.password,
            full_name: input.full_name ?? input.email,
            phone: input.phone,
            address: input.address ?? 'Vietnam',
        });
    }
    return registerFarmerUser({
        email: input.email,
        password: input.password,
        stall_name: input.stall_name ?? 'New stall',
        contact_person: input.contact_person ?? input.full_name ?? 'Stall owner',
        phone: input.phone,
        address: input.address ?? 'Vietnam',
    });
}
export function getCustomerProfile(userId) {
    const user = Object.values(dynamicUsers).find((u) => u.id === userId);
    if (!user || user.role !== 'CUSTOMER')
        return null;
    return {
        full_name: user.display_name,
        phone: '0901234567',
        address: 'District 1, HCMC',
        email: user.email,
    };
}
