import axios, { AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

const API_PORT = 4000;
const TOKEN_KEY = 'vidaplus_token';
const REFRESH_TOKEN_KEY = 'vidaplus_refresh_token';

// Em desenvolvimento (rodando via `expo start`, seja web, Expo Go ou dev
// client), descobrimos o backend sozinhos a partir do host que o próprio
// Metro Bundler usou para servir o app — na web isso é sempre a própria
// máquina (localhost); num dispositivo físico, é o IP do computador na rede.
// Num build de produção/standalone (gerado via `eas build`) não existe
// Metro/hostUri: nesse caso usamos a URL fixada em tempo de build pelo
// perfil do EAS (ver mobile/eas.json → env.API_URL, injetada em app.config.js).
function resolveApiUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri || (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
  if (hostUri) {
    if (Platform.OS === 'web') return `http://localhost:${API_PORT}/api`;
    const host = hostUri.split(':')[0];
    return `http://${host}:${API_PORT}/api`;
  }
  const configured = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  return configured || `http://localhost:${API_PORT}/api`;
}

const apiUrl = resolveApiUrl();

export const api = axios.create({ baseURL: apiUrl });

export async function storeTokens(accessToken: string, refreshToken: string) {
  await storage.setItem(TOKEN_KEY, accessToken);
  await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens() {
  await storage.removeItem(TOKEN_KEY);
  await storage.removeItem(REFRESH_TOKEN_KEY);
}

export async function getStoredRefreshToken() {
  return storage.getItem(REFRESH_TOKEN_KEY);
}

api.interceptors.request.use(async (config) => {
  const token = await storage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sessão expirada/token inválido em qualquer chamada derruba o usuário de volta
// para a tela de login, em vez de deixar as telas travadas silenciosamente.
// O handler é registrado por fora (authStore.ts) para evitar um ciclo estático
// de import (authStore já importa `api` deste arquivo).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// O access token dura só 15 minutos de propósito (ver backend). Em vez de
// derrubar o usuário toda hora, tentamos renovar silenciosamente com o
// refresh token antes de desistir. `refreshPromise` compartilhado evita que
// várias chamadas simultâneas disparem várias renovações ao mesmo tempo —
// como o refresh token é de uso único (rotação), a segunda chamada
// concorrente invalidaria a primeira.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const storedRefreshToken = await getStoredRefreshToken();
  if (!storedRefreshToken) return null;
  try {
    const res = await axios.post(`${apiUrl}/auth/refresh`, { refreshToken: storedRefreshToken });
    await storeTokens(res.data.accessToken, res.data.refreshToken);
    return res.data.accessToken as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthEndpoint = config?.url?.includes('/auth/refresh') || config?.url?.includes('/auth/login');

    if (axios.isAxiosError(error) && error.response?.status === 401 && config && !config._retried && !isAuthEndpoint) {
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
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || 'Não foi possível completar a ação. Tente novamente.';
  }
  return 'Algo deu errado. Tente novamente.';
}
