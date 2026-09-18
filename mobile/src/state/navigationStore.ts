import { create } from 'zustand';

export type TabName = 'home' | 'nutrition' | 'fasting' | 'activities' | 'profile';

export type StackScreen =
  | { name: 'recipeDetail'; recipeId: string }
  | { name: 'workoutSession'; sessionId: string; workoutId: string }
  | { name: 'hydration' }
  | { name: 'teas' }
  | { name: 'progress' }
  | { name: 'assistant' }
  | { name: 'paywall' }
  | { name: 'shoppingList' };

interface NavigationState {
  activeTab: TabName;
  stack: StackScreen[];
  setTab: (tab: TabName) => void;
  push: (screen: StackScreen) => void;
  pop: () => void;
  reset: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: 'home',
  stack: [],
  setTab: (tab) => set({ activeTab: tab, stack: [] }),
  push: (screen) => set((s) => ({ stack: [...s.stack, screen] })),
  pop: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  reset: () => set({ stack: [] }),
}));
