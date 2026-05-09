import axios from 'axios';
import { clearAuth, getToken } from '../auth/storage';

const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const apiBaseURL = rawApiBase ? rawApiBase.replace(/\/+$/, '') : undefined;

export const api = axios.create({
  baseURL: apiBaseURL,
});

/** Chuẩn hoá pathname (bỏ slash cuối) để khớp /login và /login/ */
function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/**
 * Lỗi 401/403 từ các API mà người dùng gọi khi chưa đăng nhập (form đăng nhập/đăng ký/quên MK).
 * Không được `location.replace('/')` — đó là lỗi UX (đang ở trang đăng nhập mà bị đẩy về chủ).
 */
function isPublicAuthFormRequest(err: { config?: { url?: string; method?: string; baseURL?: string } }): boolean {
  const method = (err.config?.method || 'get').toLowerCase();
  if (method !== 'post') return false;
  const raw = (err.config?.url || '').split('?')[0];
  if (!raw) return false;
  let path = raw;
  if (raw.startsWith('http')) {
    try {
      path = new URL(raw).pathname;
    } catch {
      return false;
    }
  }
  return (
    path === '/api/auth/login' ||
    path.endsWith('/api/auth/login') ||
    path.includes('/api/auth/register') ||
    path.includes('/api/auth/resend-otp') ||
    path.includes('/api/auth/verify-email') ||
    path.includes('/api/auth/forgot-password/')
  );
}

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const st = err.response?.status;
    if (st === 401 || st === 403) {
      clearAuth();
      const currentPath =
        typeof window !== 'undefined' ? normalizePathname(window.location.pathname) : '/';
      const shouldStayOnLookupPage = currentPath === '/tra-cuu-ve';
      const shouldStayOnLoginPage = currentPath === '/login';
      const fromAuthForm = isPublicAuthFormRequest(err);
      if (
        typeof window !== 'undefined' &&
        currentPath !== '/' &&
        !shouldStayOnLookupPage &&
        !shouldStayOnLoginPage &&
        !fromAuthForm
      ) {
        window.location.replace('/');
      }
    }
    return Promise.reject(err);
  }
);
