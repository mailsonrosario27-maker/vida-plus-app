import { useUiStore } from '../state/uiStore';
import { getTheme } from './theme';

export function useThemeColors() {
  const darkMode = useUiStore((s) => s.darkMode);
  return getTheme(darkMode);
}
