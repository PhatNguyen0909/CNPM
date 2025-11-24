import axios from 'axios';
import { getCookie } from '../utils/cookieUtils';

// Compute base URL from env. Prefer absolute VITE_PROXY_TARGET when provided,
// but strip swagger-ui paths if the user copied the docs URL.
const envApi = import.meta?.env?.VITE_API_BASE_URL?.trim();
const envProxy = import.meta?.env?.VITE_PROXY_TARGET?.trim();

const normalizeProxyBase = (url) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    // remove swagger-ui or other trailing doc paths if present
    const cleanPath = u.pathname
      .replace(/\/swagger-ui\/.*/i, '')
      .replace(/\/?index\.html\??.*$/i, '')
      .replace(/\/?$/,'');
    return `${u.origin}${cleanPath}`;
  } catch {
    return '';
  }
};

const proxyBase = normalizeProxyBase(envProxy);
// Prefer envApi (e.g. /potato-api) to use the proxy, otherwise fall back to direct proxyBase
const API_BASE_URL = envApi || proxyBase || '/potato-api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// export base url for debugging/logging
export { API_BASE_URL };

export const attachToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const getPublicApi = () => publicApi;

// Always try to attach token from cookie at request time to avoid race conditions
api.interceptors.request.use((config) => {
  if (!config.headers) config.headers = {};
  const hasAuth = Boolean(config.headers.Authorization || api.defaults.headers.common.Authorization);
  if (!hasAuth) {
    const token = getCookie('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  // Accept JSON by default
  if (!config.headers.Accept) {
    config.headers.Accept = 'application/json';
  }
  return config;
});

export default api;
