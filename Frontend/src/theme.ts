import { StyleSheet } from 'react-native';

export type Theme = 'dark' | 'light';

/**
 * PrintForge "forge" visual identity — Bolt redesign Pass 1 (2026-07-16).
 * Core tokens follow the forge palette:
 *   Forge Orange #FF6A00 → primary accent (light variant #FF8533)
 *   Forge Navy   #0A182E → dark-mode background / light-mode text
 *   Navy Light   #152544 → dark-mode cards
 *   Navy Elevated #1E3460 → dark-mode elevated surfaces
 *
 * offBlack/offWhite are legacy keys from the previous brand doc, kept only
 * so screens not yet migrated in this pass keep compiling — don't use them
 * in new code. Supplementary colors (destructive/success/warning/info,
 * printer/material/chart) are untouched except where they referenced the
 * old orange.
 */
const brand = {
  primary: '#FF6A00',
  primaryLight: '#FF8533',
  navy: '#0A182E',
  offBlack: '#222222',
  offWhite: '#E5E5E5',
};

const shared = {
  ...brand,
  destructive: '#D92D20',
  success: '#159455',
  warning: '#D97706',
  info: '#2563EB',

  primaryPressed: '#E05F00',
  // The forge palette uses pure white for text/icons on primary and dark
  // surfaces (previous brand doc used Off White #E5E5E5).
  onPrimary: '#FFFFFF',
  white: '#FFFFFF',

  printerAvailable: '#22A06B',
  printerBusy: '#FF6A00',
  printerOffline: '#98A2B3',
  printerMaintenance: '#D97706',

  materialPla: '#FFF0E8',
  materialResin: '#EEF2FF',
  materialAbs: '#ECFDF3',
  materialPetg: '#EAF8FF',
  materialTpu: '#F4EBFF',

  chart1: '#FF6A00',
  chart2: '#2563EB',
  chart3: '#22A06B',
  chart4: '#7F56D9',
  chart5: '#D92D20',
};

type StatusColor = { bg: string; text: string };

/**
 * The brand doc only specifies 3 status buckets (approved/pending/failed),
 * but StatusBadge.tsx needs a color for all 8 JobStatus values. Mapped as a
 * traffic-light simplification: APPROVED + COMPLETED → approved (green);
 * SUBMITTED/QUEUED/PRINTING/IN_PROGRESS → pending (orange, "in the
 * pipeline"); FAILED + REJECTED → failed (red). The brand doc also doesn't
 * give a `dot` sub-color (used for small status indicators throughout the
 * app) — reused `text` for `dot` rather than inventing an unlisted color.
 */
function statusColors(approved: StatusColor, pending: StatusColor, failed: StatusColor) {
  const withDot = (c: StatusColor) => ({ ...c, dot: c.text });
  return {
    statusApproved: withDot(approved),
    statusCompleted: withDot(approved),
    statusSubmitted: withDot(pending),
    statusQueued: withDot(pending),
    statusPrinting: withDot(pending),
    statusInProgress: withDot(pending),
    statusFailed: withDot(failed),
    statusRejected: withDot(failed),
  };
}

const dark = {
  ...shared,
  background: '#0A182E',
  foreground: '#FFFFFF',
  card: '#152544',
  cardElevated: '#1E3460',
  secondary: '#1E3460',
  muted: 'rgba(255, 255, 255, 0.10)',
  mutedFg: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
  sidebar: '#0A182E',
  sidebarFg: 'rgba(255, 255, 255, 0.7)',
  sidebarBorder: 'rgba(255, 255, 255, 0.08)',
  // Login mockup calls for input fields on colors.card — reused here so
  // every text input in the app (not just login) picks up the same
  // dark-mode surface treatment.
  inputBg: '#152544',
  overlay: 'rgba(4, 10, 20, 0.72)',
  shadow: '#000000',
  primarySoft: 'rgba(255, 106, 0, 0.15)',

  ...statusColors(
    { bg: 'rgba(34,197,94,0.15)', text: '#22C55E' },
    { bg: 'rgba(255,106,0,0.15)', text: '#FF6A00' },
    { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
  ),
};

const light = {
  ...shared,
  background: '#F0F2F5',
  foreground: '#0A182E',
  card: '#FFFFFF',
  cardElevated: '#F8F9FB',
  secondary: '#F8F9FB',
  muted: 'rgba(10, 24, 46, 0.06)',
  mutedFg: 'rgba(10, 24, 46, 0.55)',
  border: 'rgba(10, 24, 46, 0.08)',
  sidebar: '#FFFFFF',
  sidebarFg: 'rgba(10, 24, 46, 0.7)',
  sidebarBorder: 'rgba(10, 24, 46, 0.08)',
  inputBg: '#FFFFFF',
  overlay: 'rgba(10, 24, 46, 0.52)',
  shadow: '#0A182E',
  primarySoft: 'rgba(255, 106, 0, 0.12)',

  ...statusColors(
    { bg: 'rgba(34,197,94,0.12)', text: '#16A34A' },
    { bg: 'rgba(255,106,0,0.12)', text: '#E85D00' },
    { bg: 'rgba(239,68,68,0.12)', text: '#DC2626' },
  ),
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
    // Barlow Condensed replaces Outfit entirely. The brand brief specifies
    // exactly one bold weight "for all headings/labels" — display and
    // heading previously used two different Outfit weights (700/600), but
    // Barlow Condensed 700Bold now covers both roles.
    display: 'BarlowCondensed_700Bold',
    heading: 'BarlowCondensed_700Bold',
    body: 'BarlowCondensed_400Regular',
    medium: 'BarlowCondensed_500Medium',
    // Barlow Condensed has no monospace variant, and the brief calls for
    // removing @expo-google-fonts/jetbrains-mono entirely. MonoText.tsx
    // (job IDs, tracking numbers) now renders in the medium weight instead
    // of a true mono font — a visible but accepted regression, flagged in
    // Handoff.md's Progress Log.
    mono: 'BarlowCondensed_500Medium',
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

// Fallback static export for files not yet migrated to ThemeContext. Dark
// is the app's default theme, so this mirrors that.
export const colors = dark;
