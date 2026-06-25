// PrintForge 3D — EstimateResult screen
// Shown immediately after a staff member approves a job. Surfaces the
// cost + time estimate that was just submitted, with a cyan-accented
// "success" treatment matching the app's design language.

import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { Button, Card, Divider, InfoRow } from '../components/UI';

interface EstimateResultProps {
  estimate: { cost: number; time: number; job_id: string };
  /** Optional context for a richer summary, if the caller has it on hand */
  fileName?: string;
  printerName?: string;
  onDone: () => void;
  onViewJob?: () => void;
}

function formatTime(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function EstimateResult({
  estimate,
  fileName,
  printerName,
  onDone,
  onViewJob,
}: EstimateResultProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Success glow header */}
          <View style={s.glowWrap}>
            <View style={s.glowRing}>
              <View style={s.glowCore}>
                <Text style={{ fontSize: 40 }}>✓</Text>
              </View>
            </View>
            <Text style={[Typography.displayMedium, { color: Colors.textPrimary, marginTop: Spacing.lg, textAlign: 'center' }]}>
              Job Approved
            </Text>
            {fileName && (
              <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 6, textAlign: 'center' }]} numberOfLines={1}>
                {fileName}
              </Text>
            )}
            <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 4, textAlign: 'center' }]}>
              Job ID · {estimate.job_id}
            </Text>
          </View>

          {/* Estimate cards */}
          <View style={s.estimateRow}>
            <View style={[s.estimateCard, s.estimateCardAccent]}>
              <Text style={{ fontSize: 30 }}>💰</Text>
              <Text style={[Typography.displayLarge, { color: Colors.accent, marginTop: Spacing.sm }]}>
                GH₵ {estimate.cost.toFixed(2)}
              </Text>
              <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginTop: 4 }]}>
                Estimated Cost
              </Text>
            </View>

            <View style={s.estimateCard}>
              <Text style={{ fontSize: 30 }}>⏱</Text>
              <Text style={[Typography.displayLarge, { color: Colors.textPrimary, marginTop: Spacing.sm }]}>
                {formatTime(estimate.time)}
              </Text>
              <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginTop: 4 }]}>
                Print Time
              </Text>
            </View>
          </View>

          {/* Summary card */}
          <Card elevated style={s.summaryCard}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.labelLarge, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>
                What happens next
              </Text>
              <InfoRow label="Status" value="Approved" valueColor={Colors.success} />
              <Divider style={{ marginVertical: 4 }} />
              {printerName && (
                <>
                  <InfoRow label="Assigned Printer" value={printerName} />
                  <Divider style={{ marginVertical: 4 }} />
                </>
              )}
              <InfoRow label="Next Step" value="Added to print queue" />
            </View>
          </Card>

          <Text style={[Typography.bodySmall, { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 20 }]}>
            The student has been notified of this estimate. The job will move to{' '}
            <Text style={{ color: Colors.warning }}>Queued</Text> once it reaches the front of the printer's queue.
          </Text>

          {/* Actions */}
          <View style={s.actions}>
            {onViewJob && (
              <Button label="View Job Details" onPress={onViewJob} variant="secondary" style={{ marginBottom: Spacing.sm }} />
            )}
            <Button label="Done" onPress={onDone} />
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type ThemeColors = {
  background: string; surface: string; border: string; accent: string;
  accentGlow: string; success: string; successBg: string; warning: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  glowWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  glowRing: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.accent + '55',
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.accent,
  },
  glowCore: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.successBg, borderWidth: 1.5, borderColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  estimateRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  estimateCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, alignItems: 'center',
    ...Shadow.card,
  },
  estimateCardAccent: {
    borderColor: Colors.accent + '55',
    backgroundColor: Colors.accentGlow,
  },
  summaryCard: { flexDirection: 'column', marginBottom: Spacing.sm },
  actions: { marginTop: Spacing.xl },
});
