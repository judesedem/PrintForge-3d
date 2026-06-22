import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrintJob } from '../types';
import { Typography, Spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { Card, StatusBadge } from './UI';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface JobCardProps {
  job: PrintJob;
  onPress?: () => void;
  compact?: boolean;
}

export function JobCard({ job, onPress, compact }: JobCardProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  // Built per-render now (was a module-level constant before) since it
  // reads from the current theme's palette, not a fixed import.
  const STATUS_ACCENT: Record<string, string> = {
    submitted: Colors.textMuted,
    approved: Colors.success,
    queued: Colors.warning,
    printing: Colors.accent,
    completed: Colors.success,
    rejected: Colors.error,
  };

  const accent = STATUS_ACCENT[job.status] || Colors.border;

  return (
    <Card onPress={onPress} accentLeft={accent} style={s.card}>
      <View style={{ flex: 1 }}>
        {/* Header row */}
        <View style={s.headerRow}>
          <Text style={[Typography.labelLarge, { color: Colors.textPrimary, flex: 1, marginRight: 8 }]} numberOfLines={1}>
            {job.file_name}
          </Text>
          <StatusBadge status={job.status} />
        </View>

        {/* Meta row */}
        <View style={s.metaRow}>
          <MetaPill icon="cube-outline" label={job.material} />
          <MetaPill icon="color-palette-outline" label={job.color} />
          <MetaPill icon="close-outline" label={`Qty ${job.quantity}`} />
        </View>

        {!compact && (
          <>
            {/* Cost / time if available */}
            {(job.estimated_cost || job.estimated_time) && (
              <View style={s.estimateRow}>
                {job.estimated_cost && (
                  <Text style={[Typography.bodySmall, { color: Colors.accent }]}>
                    GH₵ {job.estimated_cost.toFixed(2)}
                  </Text>
                )}
                {job.estimated_cost && job.estimated_time && (
                  <Text style={{ color: Colors.textMuted, marginHorizontal: 8 }}>·</Text>
                )}
                {job.estimated_time && (
                  <View style={s.inlineIconRow}>
                    <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                    <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginLeft: 4 }]}>
                      {formatTime(job.estimated_time)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Printer / queue */}
            {job.printer_name && (
              <View style={[s.inlineIconRow, { marginTop: 4 }]}>
                <Ionicons name="print-outline" size={12} color={Colors.textMuted} />
                <Text style={[Typography.caption, { color: Colors.textMuted, marginLeft: 4 }]}>
                  {job.printer_name}
                </Text>
              </View>
            )}
            {job.queue_position && job.status === 'queued' && (
              <Text style={[Typography.caption, { color: Colors.warning, marginTop: 4 }]}>
                Queue position #{job.queue_position}
              </Text>
            )}
          </>
        )}

        {/* Date */}
        <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 6 }]}>
          {formatDate(job.submitted_at)}
        </Text>
      </View>
    </Card>
  );
}

function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  return (
    <View style={s.pill}>
      <Ionicons name={icon} size={12} color={Colors.textSecondary} />
      <Text style={[s.pillText, { marginLeft: 4 }]}>{label}</Text>
    </View>
  );
}

type ThemeColors = { surfaceElevated: string; textSecondary: string };

const styles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    marginBottom: Spacing.sm + 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  inlineIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});
