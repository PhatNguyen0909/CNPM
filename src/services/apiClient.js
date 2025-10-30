import axios from 'axios';
import { getCookie } from '../utils/cookieUtils';

const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL?.trim() ||
  '/potato-api';

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
