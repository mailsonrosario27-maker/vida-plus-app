import axios, { AxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'vidaplus_admin_token';
const REFRESH_TOKEN_KEY = 'vidaplus_admin_refresh_token';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({ baseURL });

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasStoredSession(): boolean {
  return Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessão expirada/revogada em qualquer chamada derruba o admin de volta para o
// login, em vez de deixar as páginas travadas silenciosamente esperando dados
// que nunca chegam.
export const UNAUTHORIZED_EVENT = 'vidaplus-admin-unauthorized';

// Access token dura só 15 min (mesma regra do app mobile) — antes de
// desistir, tenta renovar em silêncio com o refresh token. Promise
// compartilhada evita duas renovações simultâneas invalidando uma à outra
// (o refresh token é de uso único).
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!storedRefreshToken) return null;
  try {
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: storedRefreshToken });
    storeTokens(res.data.accessToken, res.data.refreshToken);
    return res.data.accessToken as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const isAuthEndpoint = config?.url?.includes('/auth/refresh') || config?.url?.includes('/auth/login');

    if (status === 401 && config && !config._retried && !isAuthEndpoint) {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        config._retried = true;
        config.headers = { ...config.headers, Authorization: `Bearer ${newAccessToken}` };
        return api.request(config);
      }
    }

    if (status === 401 || status === 403) {
      clearTokens();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  }
);

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || 'Algo deu errado.';
  }
  return 'Algo deu errado.';
}
