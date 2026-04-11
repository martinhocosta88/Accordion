export type ThemeName = 'accordion' | 'carbon' | 'midnight' | 'light';

export interface ThemeColors {
  bgMain: string;
  bgSide: string;
  bgTerminal: string;
  bgPanel: string;
  bgHeader: string;
  bgHeaderFocused: string;
  border: string;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textHeader: string;
  btnHover: string;
  error: string;
  warning: string;
  selection: string;
}

export interface ThemeDefinition {
  name: ThemeName;
  label: string;
  colors: ThemeColors;
}

const accordionTheme: ThemeDefinition = {
  name: 'accordion',
  label: 'Accordion',
  colors: {
    bgMain: '#1a1a2e',
    bgSide: '#16162a',
    bgTerminal: '#0d0d1a',
    bgPanel: '#1e1e3a',
    bgHeader: '#1a1a30',
    bgHeaderFocused: '#252550',
    border: '#2a2a4a',
    accent: '#7c9cff',
    accentSoft: '#9ab0ff',
    textPrimary: '#e0e0f0',
    textSecondary: '#c0c0e0',
    textTertiary: '#a0a0d0',
    textHeader: '#8888cc',
    btnHover: '#2a2a50',
    error: '#ff5555',
    warning: '#ffcc33',
    selection: '#3a3a6a',
  },
};

const carbonTheme: ThemeDefinition = {
  name: 'carbon',
  label: 'Carbon',
  colors: {
    bgMain: '#1e1e1e',
    bgSide: '#1a1a1a',
    bgTerminal: '#111111',
    bgPanel: '#242424',
    bgHeader: '#2a2a2a',
    bgHeaderFocused: '#333333',
    border: '#333333',
    accent: '#4fc3f7',
    accentSoft: '#80d8ff',
    textPrimary: '#d4d4d4',
    textSecondary: '#aaaaaa',
    textTertiary: '#888888',
    textHeader: '#888888',
    btnHover: '#383838',
    error: '#f44747',
    warning: '#ffcc33',
    selection: '#264f78',
  },
};

const midnightTheme: ThemeDefinition = {
  name: 'midnight',
  label: 'Midnight',
  colors: {
    bgMain: '#0d1117',
    bgSide: '#0d1117',
    bgTerminal: '#010409',
    bgPanel: '#161b22',
    bgHeader: '#161b22',
    bgHeaderFocused: '#1c2333',
    border: '#21262d',
    accent: '#58a6ff',
    accentSoft: '#79c0ff',
    textPrimary: '#c9d1d9',
    textSecondary: '#8b949e',
    textTertiary: '#6e7681',
    textHeader: '#8b949e',
    btnHover: '#21262d',
    error: '#f85149',
    warning: '#d29922',
    selection: '#1c3a5c',
  },
};

const lightTheme: ThemeDefinition = {
  name: 'light',
  label: 'Light',
  colors: {
    bgMain: '#eaeaef',
    bgSide: '#f5f5f7',
    bgTerminal: '#ffffff',
    bgPanel: '#ffffff',
    bgHeader: '#f0f0f5',
    bgHeaderFocused: '#e8eaf4',
    border: '#d0d0d8',
    accent: '#4a6ad0',
    accentSoft: '#6680d8',
    textPrimary: '#1a1a2a',
    textSecondary: '#444460',
    textTertiary: '#666680',
    textHeader: '#666680',
    btnHover: '#e0e0e8',
    error: '#d32f2f',
    warning: '#c67600',
    selection: '#b4c8f0',
  },
};

export const themes: Record<ThemeName, ThemeDefinition> = {
  accordion: accordionTheme,
  carbon: carbonTheme,
  midnight: midnightTheme,
  light: lightTheme,
};

export const themeNames: ThemeName[] = ['accordion', 'carbon', 'midnight', 'light'];

export function getXtermTheme(themeName: ThemeName): {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
} {
  const { colors } = themes[themeName];
  return {
    background: colors.bgTerminal,
    foreground: colors.textPrimary,
    cursor: colors.accent,
    selectionBackground: colors.selection,
  };
}
