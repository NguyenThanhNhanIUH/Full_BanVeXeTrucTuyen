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

function getRequestPath(config?: import('axios').InternalAxiosRequestConfig): string {
  if (!config) return '';
  try {
    return new URL(axios.getUri(config), 'http://localhost').pathname;
  } catch {
    return `${config.baseURL || ''}${config.url || ''}`.split('?')[0];
  }
}

/** Chỉ các API cần đăng nhập mới kích hoạt logout + redirect khi 401/403. */
function isProtectedApiPath(path: string): boolean {
  return (
    path.startsWith('/api/accounts/me') ||
    path.startsWith('/api/auth/me') ||
    path.startsWith('/api/me/') ||
    path.startsWith('/api/admin/') ||
    path.startsWith('/api/staff/') ||
    path.startsWith('/api/manager/')
  );
}

function shouldStayOnPageAfterAuthError(pathname: string): boolean {
  return pathname === '/' || pathname === '/login' || pathname === '/tra-cuu-ve' || pathname === '/dat-ve';
}

function isPublicAuthFormRequest(err: { config?: import('axios').InternalAxiosRequestConfig }): boolean {
  const config = err.config;
  if (!config) return false;
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'post') return false;
  try {
    const uri = axios.getUri(config);
    const path = new URL(uri, 'http://localhost').pathname;
    return (
      path.includes('/api/auth/login') ||
      path.includes('/api/auth/register') ||
      path.includes('/api/auth/resend-otp') ||
      path.includes('/api/auth/verify-email') ||
      path.includes('/api/auth/forgot-password')
    );
  } catch {
    const raw = `${config.baseURL || ''}${config.url || ''}`.split('?')[0];
    return (
      raw.includes('/api/auth/login') ||
      raw.includes('/api/auth/register') ||
      raw.includes('/api/auth/resend-otp') ||
      raw.includes('/api/auth/verify-email') ||
      raw.includes('/api/auth/forgot-password')
    );
  }
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
      const requestPath = getRequestPath(err.config);
      if (!isProtectedApiPath(requestPath)) {
        return Promise.reject(err);
      }
      clearAuth();
      const currentPath =
        typeof window !== 'undefined' ? normalizePathname(window.location.pathname) : '/';
      const fromAuthForm = isPublicAuthFormRequest(err);
      if (
        typeof window !== 'undefined' &&
        !shouldStayOnPageAfterAuthError(currentPath) &&
        !fromAuthForm
      ) {
        window.location.replace('/');
      }
    }
    return Promise.reject(err);
  }
);
