import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

const API_PORT = 4000;

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

api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('vidaplus_token');
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

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
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
