// PrintForge 3D — Design Tokens
// Two palettes: Dark (deep navy, electric cyan accent) and Light (clean white, same cyan accent)
// `Colors` is no longer a static export — use the `useTheme()` hook to get the
// current palette so screens react when the user switches mode.

export const DarkColors = {
  // Primary palette
  background: '#0A0F1E',        // Deep space navy
  surface: '#131929',            // Card background
  surfaceElevated: '#1C2540',    // Elevated cards
  border: '#2A3656',             // Subtle borders
  borderLight: '#1E2E4A',        // Very subtle borders

  // Accent
  accent: '#00D2FF',             // Electric cyan — brand signature
  accentDim: '#0099BB',          // Muted cyan for secondary elements
  accentGlow: 'rgba(0, 210, 255, 0.15)', // Glow effect background

  // Text
  textPrimary: '#F0F4FF',        // Near-white, primary text
  textSecondary: '#8899BB',      // Muted blue-grey
  textMuted: '#4A5878',          // Very muted

  // Status
  success: '#00D68F',            // Approved / completed
  warning: '#FFB020',            // Pending / queued
  error: '#FF4D6A',              // Rejected / error
  info: '#5B8DEF',               // Info blue

  // Status backgrounds
  successBg: 'rgba(0, 214, 143, 0.12)',
  warningBg: 'rgba(255, 176, 32, 0.12)',
  errorBg: 'rgba(255, 77, 106, 0.12)',
  infoBg: 'rgba(91, 141, 239, 0.12)',

  // Gradient stops
  gradientStart: '#0A0F1E',
  gradientMid: '#0D1530',
  gradientAccent: '#001A33',

  // Status bar / system UI
  statusBarStyle: 'light-content' as const,
};

export const LightColors = {
  // Primary palette
  background: '#F5F7FB',         // Soft off-white
  surface: '#FFFFFF',            // Card background
  surfaceElevated: '#FFFFFF',    // Elevated cards (shadow does the lifting instead of color)
  border: '#E0E5F0',             // Subtle borders
  borderLight: '#ECEFF7',        // Very subtle borders

  // Accent — same brand cyan, slightly deepened for contrast on white
  accent: '#0099CC',
  accentDim: '#007799',
  accentGlow: 'rgba(0, 153, 204, 0.10)',

  // Text
  textPrimary: '#0F1626',        // Near-black, primary text
  textSecondary: '#566180',      // Muted slate
  textMuted: '#9AA3BD',          // Very muted

  // Status — kept close to dark mode for consistent meaning, deepened for contrast
  success: '#00A572',
  warning: '#C97F00',
  error: '#E0314F',
  info: '#3E6FD9',

  // Status backgrounds
  successBg: 'rgba(0, 165, 114, 0.10)',
  warningBg: 'rgba(201, 127, 0, 0.10)',
  errorBg: 'rgba(224, 49, 79, 0.10)',
  infoBg: 'rgba(62, 111, 217, 0.10)',

  // Gradient stops
  gradientStart: '#F5F7FB',
  gradientMid: '#EAEEF7',
  gradientAccent: '#E3F2FA',

  // Status bar / system UI
  statusBarStyle: 'dark-content' as const,
};

// Kept for any leftover static imports during migration — points at Dark by
// default. Once every screen is migrated to useTheme(), this export can be
// deleted entirely.
export const Colors = DarkColors;

export const Typography = {
  // Display: used for headings — tight, strong
  displayLarge: { fontFamily: 'System', fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  displayMedium: { fontFamily: 'System', fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  displaySmall: { fontFamily: 'System', fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2 },

  // Body
  bodyLarge: { fontFamily: 'System', fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontFamily: 'System', fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontFamily: 'System', fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },

  // Labels
  labelLarge: { fontFamily: 'System', fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.1 },
  labelMedium: { fontFamily: 'System', fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.2 },
  labelSmall: { fontFamily: 'System', fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },

  // Caption / data
  caption: { fontFamily: 'System', fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.3 },
  mono: { fontFamily: 'System', fontSize: 13, fontWeight: '500' as const, letterSpacing: 0.5 },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadow = {
  card: {
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  accent: {
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
};
