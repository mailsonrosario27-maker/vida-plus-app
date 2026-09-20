import { create } from 'zustand';
import { api, apiErrorMessage, setUnauthorizedHandler, storeTokens, clearTokens, getStoredRefreshToken } from '../api/client';
import { useNavigationStore } from './navigationStore';

export interface Profile {
  id: string;
  name: string;
  age?: number | null;
  sex?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  targetWeightKg?: number | null;
  goal: 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE' | 'HEALTHY_HABITS';
  activityLevel: string;
  wakeTime?: string | null;
  sleepTime?: string | null;
  dietaryPreferences: string[];
  dietaryRestrictions: string[];
  exerciseExperience: string;
  fastingExperience: string;
  waterGoalMl: number;
  onboardingCompleted: boolean;
  darkMode: boolean;
}

interface Subscription {
  plan: 'FREE' | 'PREMIUM';
  status: string;
}

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  userId: string | null;
  email: string | null;
  role: 'USER' | 'ADMIN' | null;
  profile: Profile | null;
  subscription: Subscription | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  error: string | null;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  userId: null,
  email: null,
  role: null,
  profile: null,
  subscription: null,
  error: null,
  clearError: () => set({ error: null }),

  bootstrap: async () => {
    // O access token dura só 15 min — o que determina se existe uma sessão
    // para restaurar é o refresh token, não ele. Se /auth/me vier com o
    // access token vencido, o interceptor em api/client.ts renova sozinho.
    const refreshToken = await getStoredRefreshToken();
    if (!refreshToken) {
      set({ status: 'signedOut' });
      return;
    }
    try {
      await get().refreshMe();
      set({ status: 'signedIn' });
    } catch {
      await clearTokens();
      set({ status: 'signedOut' });
    }
  },

  refreshMe: async () => {
    const { data } = await api.get('/auth/me');
    set({
      userId: data.id,
      email: data.email,
      role: data.role,
      profile: data.profile,
      subscription: data.subscription,
    });
  },

  login: async (email, password) => {
    try {
      set({ error: null });
      const { data } = await api.post('/auth/login', { email, password });
      await storeTokens(data.accessToken, data.refreshToken);
      set({ status: 'signedIn' });
      await get().refreshMe();
    } catch (err) {
      set({ error: apiErrorMessage(err) });
      throw err;
    }
  },

  register: async (email, password, name) => {
    try {
      set({ error: null });
      const { data } = await api.post('/auth/register', { email, password, name });
      await storeTokens(data.accessToken, data.refreshToken);
      set({ status: 'signedIn' });
      await get().refreshMe();
    } catch (err) {
      set({ error: apiErrorMessage(err) });
      throw err;
    }
  },

  logout: async () => {
    const refreshToken = await getStoredRefreshToken();
    if (refreshToken) {
      // Revoga a sessão no servidor também — não só apaga local. Falha de
      // rede aqui não deve impedir o logout local.
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    await clearTokens();
    set({
      status: 'signedOut',
      userId: null,
      email: null,
      role: null,
      profile: null,
      subscription: null,
    });
  },

  setProfile: (profile) => set({ profile }),
}));

setUnauthorizedHandler(() => {
  if (useAuthStore.getState().status === 'signedIn') {
    useAuthStore.getState().logout();
  }
  useNavigationStore.getState().reset();
});
