// constants/theme.ts
// Static theme tokens used by the Lab Queue Kanban board components.
// These are intentionally flat (not reactive to ThemeContext) because the
// board is a standalone lab-staff screen that always renders in dark mode.

import { designTokens } from '@/theme';

export const T = {
  // Surfaces
  background:      '#0A182E',
  foreground:      '#FFFFFF',
  card:            '#152544',
  sidebar:         '#0A182E',
  border:          'rgba(255,255,255,0.08)',

  // Accent
  primary:         '#FF6A00',
  mutedForeground: 'rgba(255,255,255,0.5)',

  // Radius — single value used by board components
  radius:          8,

  // Typography — mapped from the project's design tokens
  fontRegular:     designTokens.type.body,
  fontMedium:      designTokens.type.medium,
  fontBold:        designTokens.type.heading,
  monoRegular:     designTokens.type.mono,
} as const;
