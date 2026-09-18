import { create } from 'zustand';
import { api, apiErrorMessage, setUnauthorizedHandler } from '../api/client';
import { storage } from '../utils/storage';
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
  token: string | null;
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
  token: null,
  userId: null,
  email: null,
  role: null,
  profile: null,
  subscription: null,
  error: null,
  clearError: () => set({ error: null }),

  bootstrap: async () => {
    const token = await storage.getItem('vidaplus_token');
    if (!token) {
      set({ status: 'signedOut' });
      return;
    }
    set({ token });
    try {
      await get().refreshMe();
      set({ status: 'signedIn' });
    } catch {
      await storage.removeItem('vidaplus_token');
      set({ status: 'signedOut', token: null });
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
      await storage.setItem('vidaplus_token', data.token);
      set({ token: data.token, status: 'signedIn' });
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
      await storage.setItem('vidaplus_token', data.token);
      set({ token: data.token, status: 'signedIn' });
      await get().refreshMe();
    } catch (err) {
      set({ error: apiErrorMessage(err) });
      throw err;
    }
  },

  logout: async () => {
    await storage.removeItem('vidaplus_token');
    set({
      status: 'signedOut',
      token: null,
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
