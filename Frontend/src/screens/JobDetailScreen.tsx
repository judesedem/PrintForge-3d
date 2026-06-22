import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { StatusBadge, Card, InfoRow, Divider, Button } from '../components/UI';
import { apiApproveJob, apiRejectJob, apiGetPrinters } from '../services/api';
import { PrintJob, Printer } from '../types';

interface JobDetailScreenProps {
  job: PrintJob;
  onBack: () => void;
  isStaff?: boolean;
  /** Called after a successful approve, with the resulting estimate */
  onApproved?: (estimate: { cost: number; time: number; job_id: string }) => void;
  /** Called after a successful reject */
  onRejected?: (jobId: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const TIMELINE: { status: string; label: string }[] = [
  { status: 'submitted', label: 'Submitted' },
  { status: 'approved', label: 'Approved' },
  { status: 'queued', label: 'Queued' },
  { status: 'printing', label: 'Printing' },
  { status: 'completed', label: 'Completed' },
];

const STATUS_ORDER = ['submitted', 'approved', 'queued', 'printing', 'completed'];

export default function JobDetailScreen({ job, onBack, isStaff, onApproved, onRejected }: JobDetailScreenProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  const currentIdx = job.status === 'rejected' ? -1 : STATUS_ORDER.indexOf(job.status);

  // ── Approve panel state ───────────────────────────────────────────────
  const [showApprovePanel, setShowApprovePanel] = useState(false);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printersLoading, setPrintersLoading] = useState(false);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null);
  const [costInput, setCostInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!showApprovePanel) return;
    (async () => {
      setPrintersLoading(true);
      try {
        const data = await apiGetPrinters();
        setPrinters(data.filter(p => p.printer_status === 'idle'));
      } catch (e: any) {
        setActionError(e.message ?? 'Failed to load printers');
      } finally {
        setPrintersLoading(false);
      }
    })();
  }, [showApprovePanel]);

  const handleApproveSubmit = async () => {
    const cost = parseFloat(costInput);
    const time = parseInt(timeInput, 10);

    if (!selectedPrinterId) {
      setActionError('Please select a printer.');
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      setActionError('Please enter a valid estimated cost.');
      return;
    }
    if (isNaN(time) || time <= 0) {
      setActionError('Please enter a valid estimated time (minutes).');
      return;
    }

    setActionError(null);
    setSubmitting(true);
    try {
      await apiApproveJob(job.job_id, {
        estimated_cost: cost,
        estimated_time: time,
        printer_id: selectedPrinterId,
      });
      onApproved?.({ cost, time, job_id: job.job_id });
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to approve job. Please try again.');
      setSubmitting(false);
    }
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Job',
      `Reject "${job.file_name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiRejectJob(job.job_id, 'Rejected by staff during review.');
              onRejected?.(job.job_id);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to reject job. Please try again.');
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={[Typography.labelLarge, { color: Colors.textPrimary, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
            Job Details
          </Text>
          <StatusBadge status={job.status} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* File card */}
          <Card elevated style={s.fileCard}>
            <View style={{ flex: 1 }}>
              <View style={s.fileIcon}>
                <Ionicons name="cube-outline" size={32} color={Colors.accent} />
              </View>
              <Text style={[Typography.displaySmall, { color: Colors.textPrimary, marginTop: 12 }]}>
                {job.file_name}
              </Text>
              <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 4 }]}>
                Submitted by {job.user_name} · {formatDate(job.submitted_at)}
              </Text>
            </View>
          </Card>

          {/* Status timeline */}
          {job.status !== 'rejected' && (
            <View style={s.section}>
              <Text style={[Typography.labelLarge, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>
                Progress
              </Text>
              <View style={s.timeline}>
                {TIMELINE.map((step, i) => {
                  const done = i <= currentIdx;
                  const active = i === currentIdx;
                  return (
                    <React.Fragment key={step.status}>
                      <View style={s.timelineStep}>
                        <View style={[
                          s.timelineDot,
                          done && s.timelineDotDone,
                          active && s.timelineDotActive,
                        ]}>
                          {done && <Ionicons name="checkmark" size={14} color={Colors.background} />}
                        </View>
                        <Text style={[
                          Typography.caption,
                          { color: active ? Colors.accent : done ? Colors.success : Colors.textMuted, marginTop: 6, textAlign: 'center' }
                        ]}>
                          {step.label}
                        </Text>
                      </View>
                      {i < TIMELINE.length - 1 && (
                        <View style={[s.timelineLine, i < currentIdx && s.timelineLineDone]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          )}

          {/* Rejected notice */}
          {job.status === 'rejected' && (
            <View style={s.rejectedBox}>
              <Ionicons name="close-circle" size={32} color={Colors.error} style={{ marginBottom: 8 }} />
              <Text style={[Typography.labelLarge, { color: Colors.error }]}>Job Rejected</Text>
              {job.notes && (
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
                  {job.notes}
                </Text>
              )}
            </View>
          )}

          {/* Print details */}
          <View style={s.section}>
            <Text style={[Typography.labelLarge, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>
              Print Details
            </Text>
            <Card elevated>
              <View style={{ flex: 1 }}>
                <InfoRow label="Material" value={job.material} />
                <Divider style={{ marginVertical: 4 }} />
                <InfoRow label="Color" value={job.color} />
                <Divider style={{ marginVertical: 4 }} />
                <InfoRow label="Quantity" value={String(job.quantity)} />
                {job.printer_name && <>
                  <Divider style={{ marginVertical: 4 }} />
                  <InfoRow label="Printer" value={job.printer_name} />
                </>}
                {job.queue_position && job.status === 'queued' && <>
                  <Divider style={{ marginVertical: 4 }} />
                  <InfoRow label="Queue Position" value={`#${job.queue_position}`} valueColor={Colors.warning} />
                </>}
              </View>
            </Card>
          </View>

          {/* Estimate */}
          {(job.estimated_cost || job.estimated_time) && (
            <View style={s.section}>
              <Text style={[Typography.labelLarge, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>
                Estimate
              </Text>
              <View style={s.estimateRow}>
                {job.estimated_cost && (
                  <View style={s.estimateCard}>
                    <Ionicons name="cash-outline" size={26} color={Colors.accent} />
                    <Text style={[Typography.displayMedium, { color: Colors.accent, marginTop: 6 }]}>
                      GH₵ {job.estimated_cost.toFixed(2)}
                    </Text>
                    <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Estimated Cost</Text>
                  </View>
                )}
                {job.estimated_time && (
                  <View style={s.estimateCard}>
                    <Ionicons name="time-outline" size={26} color={Colors.warning} />
                    <Text style={[Typography.displayMedium, { color: Colors.warning, marginTop: 6 }]}>
                      {formatTime(job.estimated_time)}
                    </Text>
                    <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Print Time</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Notes */}
          {job.notes && job.status !== 'rejected' && (
            <View style={s.section}>
              <Text style={[Typography.labelLarge, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>Notes</Text>
              <Card elevated>
                <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, flex: 1 }]}>{job.notes}</Text>
              </Card>
            </View>
          )}

          {/* Staff actions */}
          {isStaff && job.status === 'submitted' && (
            <View style={s.section}>
              <Text style={[Typography.labelLarge, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>
                Review Actions
              </Text>

              {!showApprovePanel ? (
                <View style={s.actionRow}>
                  <Button
                    label="Approve"
                    icon={<Ionicons name="checkmark" size={16} color={Colors.background} />}
                    onPress={() => { setActionError(null); setShowApprovePanel(true); }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Reject"
                    icon={<Ionicons name="close" size={16} color={Colors.error} />}
                    onPress={handleReject}
                    variant="danger"
                    style={{ flex: 1 }}
                    disabled={submitting}
                  />
                </View>
              ) : (
                <Card elevated style={{ flexDirection: 'column' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginBottom: Spacing.sm }]}>
                      Select a printer
                    </Text>

                    {printersLoading ? (
                      <ActivityIndicator color={Colors.accent} style={{ marginVertical: Spacing.md }} />
                    ) : printers.length === 0 ? (
                      <Text style={[Typography.bodySmall, { color: Colors.warning, marginBottom: Spacing.md }]}>
                        No idle printers available right now.
                      </Text>
                    ) : (
                      <View style={s.printerChips}>
                        {printers.map(p => (
                          <TouchableOpacity
                            key={p.printer_id}
                            style={[
                              s.printerChip,
                              selectedPrinterId === p.printer_id && s.printerChipActive,
                            ]}
                            onPress={() => setSelectedPrinterId(p.printer_id)}
                          >
                            <Text style={[
                              Typography.labelMedium,
                              { color: selectedPrinterId === p.printer_id ? Colors.background : Colors.textPrimary },
                            ]}>
                              {p.printer_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Divider />

                    <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginBottom: 6 }]}>
                      Estimated cost (GH₵)
                    </Text>
                    <TextInput
                      style={s.input}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 45.50"
                      placeholderTextColor={Colors.textMuted}
                      value={costInput}
                      onChangeText={setCostInput}
                    />

                    <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: 6 }]}>
                      Estimated time (minutes)
                    </Text>
                    <TextInput
                      style={s.input}
                      keyboardType="number-pad"
                      placeholder="e.g. 180"
                      placeholderTextColor={Colors.textMuted}
                      value={timeInput}
                      onChangeText={setTimeInput}
                    />

                    {actionError && (
                      <Text style={[Typography.bodySmall, { color: Colors.error, marginTop: Spacing.sm }]}>
                        {actionError}
                      </Text>
                    )}

                    <View style={[s.actionRow, { marginTop: Spacing.md }]}>
                      <Button
                        label="Cancel"
                        variant="ghost"
                        onPress={() => setShowApprovePanel(false)}
                        style={{ flex: 1 }}
                        disabled={submitting}
                      />
                      <Button
                        label="Confirm Approval"
                        onPress={handleApproveSubmit}
                        loading={submitting}
                        style={{ flex: 2 }}
                      />
                    </View>
                  </View>
                </Card>
              )}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type ThemeColors = {
  background: string; surface: string; border: string; accent: string; accentGlow: string;
  success: string; warning: string; error: string; errorBg: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md },
  fileCard: { marginBottom: Spacing.lg, flexDirection: 'column' },
  fileIcon: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.accent + '44',
    alignItems: 'center', justifyContent: 'center',
  },
  section: { marginBottom: Spacing.lg },
  timeline: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  timelineStep: { alignItems: 'center', flex: 1 },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  timelineDotActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  timelineLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginTop: 13 },
  timelineLineDone: { backgroundColor: Colors.success },
  rejectedBox: {
    backgroundColor: Colors.errorBg, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.error + '44',
    padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg,
  },
  estimateRow: { flexDirection: 'row', gap: Spacing.sm },
  estimateCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'center',
  },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  printerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  printerChip: {
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  printerChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12,
    color: Colors.textPrimary, fontSize: 15,
  },
});
