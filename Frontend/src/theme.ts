import { StyleSheet } from 'react-native';

export type Theme = 'dark' | 'light';

/**
 * PrintForge 3D visual identity
 *
 * The named color keys below intentionally preserve the existing theme API so
 * screens can continue to call makeStyles(colors) without structural changes.
 * Extra semantic tokens are additive and are used to keep buttons, chips and
 * status treatments visually consistent across the app.
 */
const brand = {
  primary: '#FF5803',
  navy: '#16182B',
  offBlack: '#222222',
  coolGray: '#697386',
  lightGray: '#E8EBF0',
  white: '#FFFFFF',
};

const shared = {
  ...brand,
  destructive: '#D92D20',
  success: '#159455',
  warning: '#D97706',
  info: '#2563EB',

  primarySoft: '#FFF0E8',
  primaryPressed: '#E84F00',
  onPrimary: '#FFFFFF',

  printerAvailable: '#22A06B',
  printerBusy: '#FF5803',
  printerOffline: '#98A2B3',
  printerMaintenance: '#D97706',

  materialPla: '#FFF0E8',
  materialResin: '#EEF2FF',
  materialAbs: '#ECFDF3',
  materialPetg: '#EAF8FF',
  materialTpu: '#F4EBFF',

  chart1: '#FF5803',
  chart2: '#2563EB',
  chart3: '#22A06B',
  chart4: '#7F56D9',
  chart5: '#D92D20',
};

const dark = {
  ...shared,
  background: '#10121D',
  foreground: '#F8FAFC',
  card: '#191C2B',
  secondary: '#222638',
  muted: '#2B3045',
  mutedFg: '#A8B0C0',
  border: '#30364A',
  sidebar: '#16182B',
  sidebarFg: '#B8C0D0',
  sidebarBorder: '#2B3045',
  inputBg: '#202436',
  overlay: 'rgba(16,18,29,0.72)',
  shadow: '#000000',

  statusSubmitted: { bg: '#3A311C', text: '#F5C451', dot: '#D9A11A' },
  statusApproved: { bg: '#183548', text: '#77C8F2', dot: '#38A4D8' },
  statusQueued: { bg: '#3A311C', text: '#F5C451', dot: '#D9A11A' },
  statusPrinting: { bg: '#3D2419', text: '#FF9C68', dot: '#FF5803' },
  statusInProgress: { bg: '#3D2419', text: '#FF9C68', dot: '#FF5803' },
  statusCompleted: { bg: '#17372B', text: '#72D7A7', dot: '#22A06B' },
  statusFailed: { bg: '#3F2020', text: '#FDA29B', dot: '#D92D20' },
  statusRejected: { bg: '#3F2020', text: '#FDA29B', dot: '#D92D20' },
};

const light = {
  ...shared,
  background: '#F6F7F9',
  foreground: '#16182B',
  card: '#FFFFFF',
  secondary: '#F1F3F6',
  muted: '#E8EBF0',
  mutedFg: '#697386',
  border: '#DDE1E7',
  sidebar: '#FFFFFF',
  sidebarFg: '#697386',
  sidebarBorder: '#E8EBF0',
  inputBg: '#F7F8FA',
  overlay: 'rgba(22,24,43,0.52)',
  shadow: '#16182B',

  statusSubmitted: { bg: '#FFF7DB', text: '#8A5A00', dot: '#D9A11A' },
  statusApproved: { bg: '#EAF7FF', text: '#075985', dot: '#38A4D8' },
  statusQueued: { bg: '#FFF7DB', text: '#8A5A00', dot: '#D9A11A' },
  statusPrinting: { bg: '#FFF0E8', text: '#B83E00', dot: '#FF5803' },
  statusInProgress: { bg: '#FFF0E8', text: '#B83E00', dot: '#FF5803' },
  statusCompleted: { bg: '#EAF8F1', text: '#126B43', dot: '#22A06B' },
  statusFailed: { bg: '#FDECEC', text: '#A61B1B', dot: '#D92D20' },
  statusRejected: { bg: '#FDECEC', text: '#A61B1B', dot: '#D92D20' },
};

export const themes = { dark, light };
export type Colors = typeof dark;

export const designTokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    section: 32,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    pill: 999,
  },
  type: {
    display: 'Outfit_700Bold',
    heading: 'Outfit_600SemiBold',
    body: 'Outfit_400Regular',
    medium: 'Outfit_500Medium',
    mono: 'JetBrainsMono_400Regular',
  },
} as const;


export function makeControlStyles(colors: Colors) {
  return StyleSheet.create({
    primaryButton: {
      minHeight: 52,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primary,
      paddingHorizontal: designTokens.spacing.xl,
      paddingVertical: designTokens.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: designTokens.spacing.sm,
    },
    primaryButtonPressed: {
      backgroundColor: colors.primaryPressed,
      transform: [{ scale: 0.99 }],
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
    secondaryButton: {
      minHeight: 52,
      borderRadius: designTokens.radius.md,
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
      paddingHorizontal: designTokens.spacing.xl,
      paddingVertical: designTokens.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: designTokens.spacing.sm,
    },
    secondaryButtonPressed: {
      backgroundColor: colors.primarySoft,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
    chip: {
      minHeight: 36,
      borderRadius: designTokens.radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    chipText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 13,
    },
    chipTextSelected: {
      color: colors.primary,
    },
  });
}

export function getMaterialChipColors(colors: Colors, material: string) {
  switch (material.toUpperCase()) {
    case 'PLA':
      return { backgroundColor: colors.materialPla, color: colors.primary };
    case 'RESIN':
      return { backgroundColor: colors.materialResin, color: '#4338CA' };
    case 'ABS':
      return { backgroundColor: colors.materialAbs, color: '#147A4B' };
    case 'PETG':
      return { backgroundColor: colors.materialPetg, color: '#0369A1' };
    case 'TPU':
      return { backgroundColor: colors.materialTpu, color: '#6941C6' };
    default:
      return { backgroundColor: colors.secondary, color: colors.mutedFg };
  }
}

// Fallback static export for files not yet migrated to ThemeContext.
export const colors = light;
