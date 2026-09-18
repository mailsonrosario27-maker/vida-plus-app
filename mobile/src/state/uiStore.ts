import { create } from 'zustand';

interface UiState {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  darkMode: false,
  setDarkMode: (value) => set({ darkMode: value }),
}));
