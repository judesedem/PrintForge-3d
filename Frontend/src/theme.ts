import { StyleSheet } from 'react-native';

export type Theme = 'dark' | 'light';

/**
 * PrintForge 3D visual identity — rebuilt to match the brand identity doc
 * exactly. The four core brand colors are used for nothing but their named
 * roles below:
 *   Warm Orange #FF5803  → primary accent
 *   Off Black   #222222  → dark-mode surfaces/cards
 *   Off White   #E5E5E5  → light-mode background, dark-mode text
 *   Navy        #16182B  → dark-mode background, light-mode text
 *
 * Everything else (destructive/success/warning/info, printer/material/
 * chart colors) is supplementary and intentionally untouched — the brand
 * doc doesn't cover them, and they're already proper theme tokens rather
 * than hardcoded literals in component files.
 */
const brand = {
  primary: '#FF5803',
  navy: '#16182B',
  offBlack: '#222222',
  offWhite: '#E5E5E5',
};

const shared = {
  ...brand,
  destructive: '#D92D20',
  success: '#159455',
  warning: '#D97706',
  info: '#2563EB',

  primaryPressed: '#E04E00',
  // Both onPrimary (text/icons on top of a primary-colored surface) and
  // white (text/icons on top of dark/colored surfaces elsewhere — avatar
  // initials, checkmarks on badges, etc.) are repointed to the brand's Off
  // White rather than pure #FFFFFF, so nothing renders an unlisted white.
  onPrimary: '#E5E5E5',
  white: '#E5E5E5',

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
  background: '#16182B',
  foreground: '#E5E5E5',
  card: '#222222',
  cardElevated: '#2A2A2A',
  secondary: '#2A2A2A',
  muted: 'rgba(229, 229, 229, 0.08)',
  mutedFg: 'rgba(229, 229, 229, 0.55)',
  border: 'rgba(229, 229, 229, 0.10)',
  sidebar: '#16182B',
  sidebarFg: 'rgba(229, 229, 229, 0.7)',
  sidebarBorder: 'rgba(229, 229, 229, 0.08)',
  // Login mockup calls for input fields on colors.card — reused here so
  // every text input in the app (not just login) picks up the same
  // dark-mode surface treatment.
  inputBg: '#222222',
  overlay: 'rgba(22, 24, 43, 0.72)',
  shadow: '#000000',
  primarySoft: 'rgba(255, 88, 3, 0.15)',

  ...statusColors(
    { bg: 'rgba(34,197,94,0.15)', text: '#22C55E' },
    { bg: 'rgba(255,88,3,0.15)', text: '#FF5803' },
    { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
  ),
};

const light = {
  ...shared,
  background: '#E5E5E5',
  foreground: '#16182B',
  card: '#FFFFFF',
  cardElevated: '#F5F5F5',
  secondary: '#F5F5F5',
  muted: 'rgba(22, 24, 43, 0.06)',
  mutedFg: 'rgba(22, 24, 43, 0.55)',
  border: 'rgba(22, 24, 43, 0.10)',
  sidebar: '#FFFFFF',
  sidebarFg: 'rgba(22, 24, 43, 0.7)',
  sidebarBorder: 'rgba(22, 24, 43, 0.08)',
  inputBg: '#FFFFFF',
  overlay: 'rgba(22, 24, 43, 0.52)',
  shadow: '#16182B',
  primarySoft: 'rgba(255, 88, 3, 0.12)',

  ...statusColors(
    { bg: 'rgba(34,197,94,0.12)', text: '#16A34A' },
    { bg: 'rgba(255,88,3,0.12)', text: '#EA4500' },
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
