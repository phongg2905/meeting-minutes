export function sanitizeUser<T extends Record<string, any>>(user: T) {
  if (!user) return user;

  const {
    password_hash,
    password_reset_code_hash,
    password_reset_expires_at,
    register_otp_hash,
    register_otp_expires_at,
    ...safeUser
  } = user;

  return safeUser;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
