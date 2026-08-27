/**
 * Design Tokens for Aadan Pradan
 * Supports Dark & Light palettes with Tactical LCD accents.
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  surfaceBezel: string;

  border: string;
  borderStrong: string;
  borderFocus: string;

  primary: string;
  primaryMuted: string;
  primaryGlow: string;

  amber: string;
  amberMuted: string;
  amberGlow: string;

  emerald: string;
  emeraldMuted: string;
  emeraldGlow: string;

  crimson: string;
  crimsonMuted: string;

  lcdBackground: string;
  lcdText: string;
  lcdTextDim: string;
  lcdBorder: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  textInverse: string;

  tabBarBackground: string;
  tabBarBorder: string;
  cardHighlight: string;
  overlay: string;
}

export const darkColors: ThemeColors = {
  // Deep obsidian black background
  background: '#080C14',
  surface: '#151A23',
  surfaceElevated: '#1C2330',
  surfaceSubtle: '#11151D',
  surfaceBezel: '#222B3A',

  // Borders
  border: '#232A38',
  borderStrong: '#364257',
  borderFocus: '#FF7A00',

  // Primary Brand Orange Accents (from reference image)
  primary: '#FF7A00',
  primaryMuted: 'rgba(255, 122, 0, 0.15)',
  primaryGlow: 'rgba(255, 122, 0, 0.35)',

  // Secondary & Radio Status Colors
  amber: '#FFA000',
  amberMuted: 'rgba(255, 160, 0, 0.15)',
  amberGlow: 'rgba(255, 160, 0, 0.3)',

  emerald: '#22C55E', // Live Transmission Neon Green
  emeraldMuted: 'rgba(34, 197, 94, 0.15)',
  emeraldGlow: 'rgba(34, 197, 94, 0.35)',

  crimson: '#EF4444', // End call / Alert Crimson
  crimsonMuted: 'rgba(239, 68, 68, 0.15)',

  // LCD Screen Colors (for Frequency Readouts)
  lcdBackground: '#080C12',
  lcdText: '#00FFCC',
  lcdTextDim: 'rgba(0, 229, 255, 0.25)',
  lcdBorder: 'rgba(0, 229, 255, 0.25)',

  // Typography Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',
  textInverse: '#0B0E14',

  tabBarBackground: '#0F1218',
  tabBarBorder: '#1A212B',
  cardHighlight: 'rgba(255, 122, 0, 0.06)',
  overlay: 'rgba(11, 14, 20, 0.88)',
};

export const lightColors: ThemeColors = {
  // Crisp precision light palette
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceSubtle: '#F8FAFC',
  surfaceBezel: '#E2E8F0',

  // Borders
  border: '#CBD5E1',
  borderStrong: '#94A3B8',
  borderFocus: '#0284C7',

  // Primary Tactical Accents
  primary: '#0284C7', // Tactical Signal Blue
  primaryMuted: 'rgba(2, 132, 199, 0.12)',
  primaryGlow: 'rgba(2, 132, 199, 0.25)',

  // Secondary & Radio Status Colors
  amber: '#D97706', // Radio Amber
  amberMuted: 'rgba(217, 119, 6, 0.12)',
  amberGlow: 'rgba(217, 119, 6, 0.25)',

  emerald: '#16A34A', // Live Transmission Emerald
  emeraldMuted: 'rgba(22, 163, 74, 0.12)',
  emeraldGlow: 'rgba(22, 163, 74, 0.25)',

  crimson: '#E11D48', // Alert / Disconnect Crimson
  crimsonMuted: 'rgba(225, 29, 72, 0.12)',

  // LCD Screen Colors (for Frequency Readouts - Deep contrast dark LCD in light mode for realism)
  lcdBackground: '#0A121E',
  lcdText: '#00FFCC',
  lcdTextDim: 'rgba(0, 255, 204, 0.3)',
  lcdBorder: '#00FFCC44',

  // Typography Colors
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#94A3B8',
  textInverse: '#FFFFFF',

  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  cardHighlight: 'rgba(2, 132, 199, 0.04)',
  overlay: 'rgba(15, 23, 42, 0.65)',
};

// Default export for dark mode fallback
export const colors = darkColors;

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'Courier',
  },
  fontSize: {
    xxs: 10,
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 32,
    lcd: 44,
    lcdLarge: 54,
  },
  lineHeight: {
    xxs: 13,
    xs: 15,
    sm: 18,
    base: 22,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 40,
    lcd: 50,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1.2,
    lcd: 3.0,
    tactical: 2.0,
  },
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 48,
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  tacticalButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
};
