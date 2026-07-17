import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { useJobs } from '@/JobsContext';
import { useSession } from '@/SessionContext';
import { approveJob, rejectJob } from '@/api/jobs';
import { Job, JobStatus, PRINTERS } from '@/data/mockData';
import { Colors, designTokens } from '@/theme';

/**
 * Lab queue — Bolt redesign Pass 2.
 *
 * Real actions kept exactly: approveJob / rejectJob (PATCH endpoints) +
 * refetch, including the printerId the approve call always sent. The old
 * screen's printer-fleet section was entirely MOCK data (PRINTERS from
 * mockData.ts) and is gone; the approve call still passes the same
 * default available-printer id it effectively always did.
 *
 * Buttons the backend can't back yet render DISABLED on purpose:
 * "Mark as Ready" / "Mark Collected" have no endpoint (the only staff
 * transitions are approve/reject), so they're visible per the design but
 * inert with a "not wired" caption — no fake API calls.
 *
 * Spec pills show material/quality/qty — Job carries no infill % or file
 * size, so those two from the reference can't be shown.
 */

type QueueFilter = 'All' | 'Pending' | 'Printing' | 'Ready';
const FILTERS: QueueFilter[] = ['All', 'Pending', 'Printing', 'Ready'];

const FILTER_STATUSES: Record<Exclude<QueueFilter, 'All'>, JobStatus[]> = {
  Pending: ['SUBMITTED'],
  Printing: ['APPROVED', 'QUEUED', 'PRINTING', 'IN_PROGRESS'],
  Ready: ['COMPLETED'],
};

function statusPill(status: JobStatus, colors: Colors): { label: string; fg: string; bg: string } {
  switch (status) {
    case 'SUBMITTED':
      return { label: 'Pending review', fg: colors.mutedFg, bg: colors.muted };
    case 'APPROVED':
    case 'QUEUED':
      return { label: status === 'APPROVED' ? 'Approved' : 'Queued', fg: '#5B8DEF', bg: 'rgba(37, 99, 235, 0.18)' };
    case 'PRINTING':
    case 'IN_PROGRESS':
      return { label: 'Printing', fg: colors.primary, bg: colors.primarySoft };
    case 'COMPLETED':
      return { label: 'Ready', fg: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' };
    case 'FAILED':
      return { label: 'Failed', fg: colors.statusFailed.text, bg: colors.statusFailed.bg };
    case 'REJECTED':
      return { label: 'Rejected', fg: colors.statusRejected.text, bg: colors.statusRejected.bg };
    default:
      return { label: status, fg: colors.mutedFg, bg: colors.muted };
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function submittedAgo(submittedAt: string): string {
  if (!submittedAt) return '';
  const d = new Date(submittedAt);
  if (Number.isNaN(d.getTime())) return `Submitted ${submittedAt}`;
  const hours = Math.max(0, Math.floor((Date.now() - d.getTime()) / 3_600_000));
  if (hours < 1) return 'Submitted just now';
  if (hours < 24) return `Submitted ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `Submitted ${days} day${days === 1 ? '' : 's'} ago`;
}

export default function StaffQueue() {
  const router = useRouter();
  const { colors } = useTheme();
  const { jobs, refetch } = useJobs();
  const { token } = useSession();
  const s = makeStyles(colors);

  const [filter, setFilter] = useState<QueueFilter>('All');
  // Same default the old screen used for its approve call — first
  // AVAILABLE mock printer (the fleet UI itself was mock and is gone).
  const [printer] = useState(
    PRINTERS.find(item => item.status === 'AVAILABLE')?.id || 'printer-3',
  );
  const [actionJob, setActionJob] = useState<{ id: string; kind: 'approve' | 'reject' } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filtered = useMemo(
    () =>
      filter === 'All'
        ? jobs
        : jobs.filter(job => FILTER_STATUSES[filter].includes(job.status)),
    [jobs, filter],
  );

  const handleApprove = async (job: Job) => {
    if (!token || actionJob) return;
    setActionJob({ id: job.id, kind: 'approve' });
    setActionError(null);
    try {
      await approveJob(token, job.id, { printerId: printer });
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve job');
    } finally {
      setActionJob(null);
    }
  };

  const handleConfirmReject = async (job: Job) => {
    if (!token || actionJob) return;
    setActionJob({ id: job.id, kind: 'reject' });
    setActionError(null);
    try {
      await rejectJob(token, job.id, rejectReason.trim() || undefined);
      await refetch();
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject job');
    } finally {
      setActionJob(null);
    }
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View style={s.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [s.backButton, pressed && s.pressed]}
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <Text style={s.title}>Print Queue</Text>
        <View style={s.topSpacer} />
      </View>

      <View style={s.filterRow}>
        {FILTERS.map(item => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(item)}
              style={[s.filterPill, active && s.filterPillActive]}
            >
              <Text style={[s.filterText, active && s.filterTextActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {actionError ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>{actionError}</Text>
          </View>
        ) : null}

        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>Queue is clear</Text>
            <Text style={s.emptyBody}>No jobs match this filter right now.</Text>
          </View>
        ) : (
          filtered.map(job => {
            const pill = statusPill(job.status, colors);
            const busy = actionJob?.id === job.id;
            const rejecting = rejectingId === job.id;
            return (
              <View key={job.id} style={s.card}>
                <View style={s.cardTopRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initialsOf(job.student)}</Text>
                  </View>
                  <Text style={s.studentName} numberOfLines={1}>{job.student}</Text>
                  <View style={[s.statusPill, { backgroundColor: pill.bg }]}>
                    <Text style={[s.statusPillText, { color: pill.fg }]}>{pill.label}</Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/jobs/${job.id}`)}
                  style={({ pressed }) => pressed && s.pressed}
                >
                  <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
                </Pressable>

                <View style={s.specRow}>
                  <View style={s.specPill}><Text style={s.specPillText}>{job.material}</Text></View>
                  <View style={s.specPill}><Text style={s.specPillText}>{job.quality}</Text></View>
                  <View style={s.specPill}><Text style={s.specPillText}>Qty {job.qty}</Text></View>
                  <View style={s.specPill}>
                    <Text style={s.specPillText}>GH₵ {job.cost.toFixed(2)}</Text>
                  </View>
                </View>

                <Text style={s.submittedText}>{submittedAgo(job.submittedAt)}</Text>

                {job.status === 'SUBMITTED' ? (
                  rejecting ? (
                    <View style={s.rejectBlock}>
                      <TextInput
                        style={s.reasonInput}
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        placeholder="Reason for rejection (optional)..."
                        placeholderTextColor={colors.mutedFg}
                        multiline
                        editable={!busy}
                      />
                      <View style={s.actionRow}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          style={({ pressed }) => [s.ghostButton, pressed && s.pressed]}
                        >
                          <Text style={s.ghostButtonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() => handleConfirmReject(job)}
                          style={({ pressed }) => [s.rejectButton, pressed && s.pressed, busy && s.disabled]}
                        >
                          {busy && actionJob?.kind === 'reject' ? (
                            <ActivityIndicator color={colors.destructive} size="small" />
                          ) : (
                            <>
                              <X size={16} color={colors.destructive} />
                              <Text style={s.rejectButtonText}>Confirm Reject</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={s.actionRow}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={() => setRejectingId(job.id)}
                        style={({ pressed }) => [s.rejectButton, pressed && s.pressed, busy && s.disabled]}
                      >
                        <X size={16} color={colors.destructive} />
                        <Text style={s.rejectButtonText}>Reject</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={() => handleApprove(job)}
                        style={({ pressed }) => [s.approveButton, pressed && s.pressed, busy && s.disabled]}
                      >
                        {busy && actionJob?.kind === 'approve' ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <Check size={16} color="#FFFFFF" />
                            <Text style={s.approveButtonText}>Approve</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )
                ) : null}

                {['APPROVED', 'QUEUED', 'PRINTING', 'IN_PROGRESS'].includes(job.status) ? (
                  <>
                    <View style={[s.fullButton, s.disabled]}>
                      <Text style={s.fullButtonText}>Mark as Ready</Text>
                    </View>
                    <Text style={s.notWiredText}>
                      Status updates beyond approval aren’t supported by the backend yet.
                    </Text>
                  </>
                ) : null}

                {job.status === 'COMPLETED' ? (
                  <>
                    <View style={[s.fullGhostButton, s.disabled]}>
                      <Text style={s.fullGhostButtonText}>Mark Collected</Text>
                    </View>
                    <Text style={s.notWiredText}>
                      Pickup tracking isn’t supported by the backend yet.
                    </Text>
                  </>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.5 },
    topBar: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: designTokens.spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -8,
    },
    title: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 19,
      textAlign: 'center',
    },
    topSpacer: { width: 32 },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: designTokens.spacing.lg,
      paddingVertical: designTokens.spacing.sm,
    },
    filterPill: {
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.muted,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    filterPillActive: { backgroundColor: colors.primary },
    filterText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    filterTextActive: { color: '#FFFFFF' },
    content: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.sm,
      paddingBottom: 44,
    },
    errorBanner: {
      padding: 12,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.statusFailed.bg,
      borderWidth: 1,
      borderColor: colors.statusFailed.dot,
      marginBottom: designTokens.spacing.md,
    },
    errorBannerText: {
      color: colors.statusFailed.text,
      fontFamily: designTokens.type.body,
      fontSize: 12,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 56,
      gap: 5,
    },
    emptyTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
    emptyBody: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
    },
    card: {
      borderRadius: 16,
      backgroundColor: colors.card,
      padding: designTokens.spacing.md,
      marginBottom: designTokens.spacing.md,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    studentName: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.medium,
      fontSize: 13,
    },
    statusPill: {
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    statusPillText: {
      fontFamily: designTokens.type.heading,
      fontSize: 10,
    },
    jobTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
      marginBottom: 9,
    },
    specRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 9,
    },
    specPill: {
      borderRadius: designTokens.radius.pill,
      backgroundColor: '#0A182E',
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    specPillText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.medium,
      fontSize: 10,
    },
    submittedText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginBottom: designTokens.spacing.md,
    },
    actionRow: { flexDirection: 'row', gap: 9 },
    rejectButton: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: designTokens.radius.md,
      borderWidth: 1.5,
      borderColor: colors.destructive,
    },
    rejectButtonText: {
      color: colors.destructive,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    approveButton: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primary,
    },
    approveButtonText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    ghostButton: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ghostButtonText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    rejectBlock: { gap: 9 },
    reasonInput: {
      minHeight: 70,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      padding: 12,
      textAlignVertical: 'top',
    },
    fullButton: {
      minHeight: 44,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullButtonText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    fullGhostButton: {
      minHeight: 44,
      borderRadius: designTokens.radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullGhostButtonText: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    notWiredText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      marginTop: 6,
    },
  });
}
