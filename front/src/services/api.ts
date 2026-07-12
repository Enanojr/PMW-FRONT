import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const ACCESS_KEY = 'kyo_access';
const REFRESH_KEY = 'kyo_refresh';

export const tokenStorage = {
  getAccess: () => sessionStorage.getItem(ACCESS_KEY),
  getRefresh: () => sessionStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    sessionStorage.setItem(ACCESS_KEY, access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

// --- Interceptor de petición: inyecta el token JWT -------------------------
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Interceptor de respuesta: refresh transparente ante 401 ---------------
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) throw new Error('Sin refresh token');
  // Instancia limpia para no entrar en bucle de interceptores
  const { data } = await axios.post<{ access: string; refresh?: string }>(
    `${API_URL}/api/auth/refresh/`,
    { refresh },
  );
  tokenStorage.set(data.access, data.refresh ?? refresh);
  return data.access;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry && tokenStorage.getRefresh()) {
      original._retry = true;
      try {
        // Una sola petición de refresh compartida entre llamadas concurrentes
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const nuevoToken = await refreshPromise;
        refreshPromise = null;
        original.headers.Authorization = `Bearer ${nuevoToken}`;
        return api(original);
      } catch (refreshError) {
        refreshPromise = null;
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
