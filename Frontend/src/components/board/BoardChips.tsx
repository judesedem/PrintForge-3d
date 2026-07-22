// components/board/BoardChips.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '@/constants/theme';
import type { BoardPrinter, PrinterStatus, JobStatus, Material } from '@/constants/boardData';

// ── Printer status dot colours ─────────────────────────────────────────────
const PRINTER_DOT: Record<PrinterStatus, string> = {
  AVAILABLE:   '#34d399',
  BUSY:        '#60a5fa',
  OFFLINE:     '#6b7280',
  MAINTENANCE: '#fbbf24',
};

// ── Job status chip colours ────────────────────────────────────────────────
export const JOB_STATUS_COLOR: Record<JobStatus, { text: string; bg: string; border: string }> = {
  SUBMITTED:  { text: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.20)' },
  APPROVED:   { text: '#22d3ee', bg: 'rgba(34,211,238,0.10)',  border: 'rgba(34,211,238,0.20)' },
  PRINTING:   { text: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.20)' },
  READY:      { text: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.20)' },
  COLLECTED:  { text: '#9ca3af', bg: 'rgba(156,163,175,0.10)', border: 'rgba(156,163,175,0.20)' },
};

// ── Material chip colours ──────────────────────────────────────────────────
const MATERIAL_COLOR: Record<Material, { text: string; bg: string }> = {
  PLA:          { text: '#34d399', bg: 'rgba(52,211,153,0.10)' },
  RESIN:        { text: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  ABS:          { text: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
  PETG:         { text: '#22d3ee', bg: 'rgba(34,211,238,0.10)' },
  CARBON_FIBER: { text: '#9ca3af', bg: 'rgba(156,163,175,0.10)' },
};

// ── JobStatusChip ──────────────────────────────────────────────────────────
export function JobStatusChip({ status }: { status: JobStatus }) {
  const c = JOB_STATUS_COLOR[status];
  return (
    <View style={[s.chip, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[s.chipText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

// ── MaterialChip ───────────────────────────────────────────────────────────
export function MaterialChip({ material }: { material: Material }) {
  const c = MATERIAL_COLOR[material];
  return (
    <View style={[s.chip, { backgroundColor: c.bg, borderColor: 'transparent' }]}>
      <Text style={[s.chipText, { color: c.text }]}>{material}</Text>
    </View>
  );
}

// ── PrinterPill ────────────────────────────────────────────────────────────
export function PrinterPill({ printer }: { printer: BoardPrinter }) {
  const dotColor = PRINTER_DOT[printer.status];
  return (
    <View style={s.pill}>
      <View style={[s.dot, { backgroundColor: dotColor }]} />
      <Text style={s.pillText}>{printer.name}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: T.radius,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: T.monoRegular,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: T.radius,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontFamily: T.monoRegular,
    fontSize: 10,
    color: T.mutedForeground,
  },
});
