export type Theme = 'dark' | 'light';

const shared = {
  primary: '#F97316',
  destructive: '#EF4444',
  printerAvailable: '#34D399',
  printerBusy: '#60A5FA',
  printerOffline: '#6B7280',
  printerMaintenance: '#FBBF24',
  chart1: '#F97316',
  chart2: '#22D3EE',
  chart3: '#10B981',
  chart4: '#A78BFA',
  chart5: '#F43F5E',
};

const dark = {
  ...shared,
  background: '#0A0F1E',
  foreground: '#E8EDF5',
  card: '#111827',
  secondary: '#1E2A42',
  muted: '#1A2235',
  mutedFg: '#64748B',
  border: 'rgba(255,255,255,0.07)',
  sidebar: '#060C18',
  sidebarFg: '#94A3B8',
  sidebarBorder: 'rgba(255,255,255,0.05)',
  inputBg: '#0F172A',
  statusSubmitted:  { bg: 'rgba(234,179,8,0.15)',   text: '#FBBF24' },
  statusApproved:   { bg: 'rgba(6,182,212,0.15)',   text: '#22D3EE' },
  statusInProgress: { bg: 'rgba(37,99,235,0.15)',   text: '#60A5FA' },
  statusCompleted:  { bg: 'rgba(16,185,129,0.15)',  text: '#34D399' },
  statusFailed:     { bg: 'rgba(239,68,68,0.15)',   text: '#F87171' },
  statusRejected:   { bg: 'rgba(239,68,68,0.15)',   text: '#F87171' },
};

const light = {
  ...shared,
  background: '#F8FAFC',
  foreground: '#0F172A',
  card: '#FFFFFF',
  secondary: '#F1F5F9',
  muted: '#E2E8F0',
  mutedFg: '#94A3B8',
  border: '#E2E8F0',
  sidebar: '#FFFFFF',
  sidebarFg: '#64748B',
  sidebarBorder: '#E2E8F0',
  inputBg: '#F8FAFC',
  statusSubmitted:  { bg: 'rgba(234,179,8,0.12)',   text: '#B45309' },
  statusApproved:   { bg: 'rgba(6,182,212,0.12)',   text: '#0E7490' },
  statusInProgress: { bg: 'rgba(37,99,235,0.12)',   text: '#1D4ED8' },
  statusCompleted:  { bg: 'rgba(16,185,129,0.12)',  text: '#047857' },
  statusFailed:     { bg: 'rgba(239,68,68,0.12)',   text: '#B91C1C' },
  statusRejected:   { bg: 'rgba(239,68,68,0.12)',   text: '#B91C1C' },
};

export const themes = { dark, light };
export type Colors = typeof dark;

// fallback static export for files not yet on context
export const colors = dark;
