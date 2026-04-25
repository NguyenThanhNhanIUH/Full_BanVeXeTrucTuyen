import axios from 'axios';
import { clearAuth, getToken } from '../auth/storage';

export const api = axios.create();

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
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const shouldStayOnLookupPage = currentPath === '/tra-cuu-ve';
      if (typeof window !== 'undefined' && currentPath !== '/' && !shouldStayOnLookupPage) {
        window.location.replace('/');
      }
    }
    return Promise.reject(err);
  }
);
