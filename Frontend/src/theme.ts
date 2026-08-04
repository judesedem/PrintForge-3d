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
    // READY/COLLECTED postdate the original 3-bucket brand doc (added
    // alongside the PATCH /api/print-jobs/{id}/transition endpoint) —
    // both are "good outcome" terminal-ish states, same as COMPLETED, so
    // they reuse the same `approved` (green) bucket rather than
    // introducing new colors nobody's specified.
    statusReady: withDot(approved),
    statusCollected: withDot(approved),
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

  // Same green as statusApproved/statusCompleted above — not a new color
  // choice, just a semantic alias so profile.tsx's "Verified" badge and
  // "LIVE" earnings tag don't need to reference a payment-status-named
  // token to get the same green.
  verified: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E' },
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

  verified: { bg: 'rgba(34,197,94,0.12)', text: '#16A34A' },
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
    // Roboto replaces Barlow Condensed entirely (2026-08-04). Same 4-role
    // shape as before — display/heading share one bold weight, body is
    // the regular weight, medium sits between them — just a different
    // family. Every screen already goes through these tokens rather than
    // a hardcoded font string, so this one change cascades app-wide; the
    // sole exception is app/index.tsx's splash-screen "IDEAS" word, which
    // hardcodes 'Roboto_700Bold_Italic' directly (needs the real italic
    // font file loaded, not fontStyle: 'italic' on a regular weight —
    // same reason Barlow Condensed had its own italic import before).
    display: 'Roboto_700Bold',
    heading: 'Roboto_700Bold',
    body: 'Roboto_400Regular',
    medium: 'Roboto_500Medium',
    // Roboto has no monospace variant either — same substitution as
    // before (medium weight stands in for MonoText.tsx's job IDs/
    // tracking numbers), not a new regression introduced by this switch.
    mono: 'Roboto_500Medium',
  },
} as const;


export function makeControlStyles(colors: Colors) {
  return StyleSheet.create({
    /**
     * The primary CTA carries real weight — it's the Pay Now button on the
     * marketplace and checkout screens. A flat orange bar sitting flush under
     * a full-width card reads as another panel rather than a control, so the
     * button is lifted off the page with a drop shadow tinted with its own
     * hue: a black shadow is effectively invisible against the navy dark-mode
     * background, an orange one glows on both themes.
     */
    primaryButton: {
      minHeight: 54,
      // Fully rounded ends + a defined rim. A 14pt-radius rectangle the same
      // width as the cards above it reads as one more panel in the stack;
      // a pill with its own visible edge can only be a control. The rim is
      // one step lighter than the fill so the boundary holds against both
      // the light background and the navy dark one.
      borderRadius: designTokens.radius.pill,
      borderWidth: 2,
      borderColor: colors.primaryLight,
      backgroundColor: colors.primary,
      paddingHorizontal: designTokens.spacing.xl,
      paddingVertical: designTokens.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: designTokens.spacing.sm,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.38,
      shadowRadius: 14,
      elevation: 8,
    },
    // Press collapses the shadow and drops the button 2pt, so it physically
    // depresses instead of only changing color.
    primaryButtonPressed: {
      backgroundColor: colors.primaryPressed,
      transform: [{ translateY: 2 }, { scale: 0.985 }],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 2,
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
      letterSpacing: 0.3,
    },
    // Height tracks primaryButton — the two sit side by side in a row on the
    // submit flow's summary footer and must stay aligned.
    secondaryButton: {
      minHeight: 54,
      borderRadius: designTokens.radius.pill,
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
    input: {
      minHeight: 48,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.cardElevated,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 15,
      paddingHorizontal: 16,
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
