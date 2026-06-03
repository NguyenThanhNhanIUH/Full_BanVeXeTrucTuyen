const HOLD_TOKEN_PREFIX = 'banvexe_seat_hold_';

export function getSeatHoldToken(chuyenId: number): string {
  const key = `${HOLD_TOKEN_PREFIX}${chuyenId}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const token = crypto.randomUUID().replace(/-/g, '').toLowerCase();
  sessionStorage.setItem(key, token);
  return token;
}

export function getApiBaseUrl(): string | undefined {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  return raw ? raw.replace(/\/+$/, '') : undefined;
}
