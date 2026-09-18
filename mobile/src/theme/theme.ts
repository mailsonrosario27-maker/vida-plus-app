// Identidade visual VIDA+: premium, minimalista, acolhedora — sem aparência
// hospitalar. Branco, verde suave/escuro, bege, cinza, com pequenos toques
// quentes para energia (laranja suave em conquistas/alertas leves).

export const lightColors = {
  background: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EEE6',
  border: '#E7E3D8',
  textPrimary: '#20261F',
  textSecondary: '#5B6259',
  textMuted: '#8C9188',
  primary: '#3F7A54',
  primaryDark: '#274D34',
  primarySoft: '#DCEAE0',
  accentWarm: '#E0A458',
  accentWarmSoft: '#F6E6D0',
  danger: '#C2554B',
  water: '#4C8FBF',
  waterSoft: '#DCEBF5',
  fasting: '#7A5FBF',
  fastingSoft: '#E7E0F5',
};

export const darkColors = {
  background: '#141812',
  surface: '#1C221B',
  surfaceAlt: '#232B21',
  border: '#2E362B',
  textPrimary: '#EDEFE9',
  textSecondary: '#B7BDB0',
  textMuted: '#828A7C',
  primary: '#6FBE85',
  primaryDark: '#3F7A54',
  primarySoft: '#233A2B',
  accentWarm: '#E0A458',
  accentWarmSoft: '#3A2F1F',
  danger: '#E08278',
  water: '#7FB6DE',
  waterSoft: '#1E2C36',
  fasting: '#A491D6',
  fastingSoft: '#2A2438',
};

export type ThemeColors = typeof lightColors;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 };

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  small: { fontSize: 11, fontWeight: '500' as const },
};

export function getTheme(darkMode: boolean): ThemeColors {
  return darkMode ? darkColors : lightColors;
}
