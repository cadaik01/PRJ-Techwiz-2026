// Pure validation helpers, shared by zod schemas and ad-hoc checks.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Vietnamese mobile numbers: 0xx or +84xx, ten digits in local form.
const VN_PHONE = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

export const isEmail = (value) => EMAIL.test(String(value ?? '').trim());
export const isVnPhone = (value) => VN_PHONE.test(String(value ?? '').replace(/[\s.-]/g, ''));
export const isStrongPassword = (value) =>
  typeof value === 'string' && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
