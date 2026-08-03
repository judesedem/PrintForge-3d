import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import {
  approveJob,
  rejectJob,
  fetchGroupedQueue,
  groupJobsByStatus,
  updateJobStatus,
  GroupedQueue,
} from '@/api/jobs';
import { Job, JobStatus, PRINTERS } from '@/data/mockData';
import { Colors, designTokens } from '@/theme';
import KeyboardAwareScreen from '@/components/KeyboardAwareScreen';

/**
 * Lab queue — grouped-by-status redesign.
 *
 * Real actions kept exactly: approveJob / rejectJob (PATCH .../approve,
 * .../reject), including the printerId the approve call always sent.
 *
 * NEW: "Mark as Ready" and "Mark Collected" are now wired to
 * updateJobStatus(), which calls PATCH /api/print-jobs/{id}/transition —
 * NOT the older .../status endpoint the "fixes" prompt referenced. That
 * older endpoint takes query params (not a JSON body) and its status
 * vocabulary doesn't include READY/COLLECTED at all, so it can't actually
 * perform these transitions; /transition is the endpoint that was
 * actually built for this and enforces APPROVED→PRINTING→READY→COLLECTED
 * one step at a time. Because of that one-step-at-a-time rule, "Mark as
 * Ready" on an APPROVED job actually calls updateJobStatus(..., 'PRINTING')
 * (the only valid next step from APPROVED) — tapping it again once the
 * job shows PRINTING then calls updateJobStatus(..., 'READY'). The button
 * label stays "Mark as Ready" for both per the spec; what changes is which
 * status it requests under the hood, based on the job's current status.
 *
 * The primary data source is GET /api/print-jobs/queue (fetchGroupedQueue).
 * If that fails for any reason (including a 404, in case it isn't
 * deployed yet), this falls back to grouping the flat job list
 * JobsContext already loaded (groupJobsByStatus) rather than showing a
 * hard error.
 */

type SectionKey = keyof GroupedQueue;

const SECTION_ORDER: SectionKey[] = [
  'SUBMITTED', 'APPROVED', 'PRINTING', 'READY', 'COLLECTED', 'FAILED',
];

/** Only APPROVED and PRINTING show "Mark as Ready" — see file header comment. */
function nextTransitionStatus(status: JobStatus): 'PRINTING' | 'READY' | null {
  if (status === 'APPROVED') return 'PRINTING';
  if (status === 'PRINTING') return 'READY';
  return null;
}

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
    case 'READY':
    case 'COMPLETED':
      return { label: 'Ready', fg: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' };
    case 'COLLECTED':
      return { label: 'Collected', fg: colors.mutedFg, bg: colors.muted };
    case 'FAILED':
      return { label: 'Failed', fg: '#EF4444', bg: 'rgba(239,68,68,0.2)' };
    case 'REJECTED':
      return { label: 'Rejected', fg: colors.statusRejected.text, bg: colors.statusRejected.bg };
    default:
      return { label: status, fg: colors.mutedFg, bg: colors.muted };
  }
}

function sectionColor(key: SectionKey, colors: Colors): { fg: string; bg: string } {
  switch (key) {
    case 'SUBMITTED':
      return { fg: colors.mutedFg, bg: colors.muted };
    case 'APPROVED':
      return { fg: '#5B8DEF', bg: 'rgba(37, 99, 235, 0.18)' };
    case 'PRINTING':
      return { fg: colors.primary, bg: colors.primarySoft };
    case 'READY':
      return { fg: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' };
    case 'COLLECTED':
      return { fg: colors.mutedFg, bg: colors.muted };
    case 'FAILED':
      return { fg: '#EF4444', bg: 'rgba(239,68,68,0.2)' };
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

  // Same default the old screen used for its approve call — first
  // AVAILABLE mock printer (the fleet UI itself was mock and is gone).
  const [printer] = useState(
    PRINTERS.find(item => item.status === 'AVAILABLE')?.id || 'printer-3',
  );

  const [groupedQueue, setGroupedQueue] = useState<GroupedQueue | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);

  const [actionJob, setActionJob] = useState<
    { id: string; kind: 'approve' | 'reject' | 'ready' | 'collect' } | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadQueue = useCallback(async () => {
    if (!token) return;
    setQueueLoading(true);
    try {
      const data = await fetchGroupedQueue(token);
      setGroupedQueue(data);
    } catch {
      // GET /api/print-jobs/queue failed (404 or otherwise) — fall back
      // to grouping the flat list JobsContext already has, rather than
      // showing a hard error on a staff-critical screen.
      setGroupedQueue(groupJobsByStatus(jobs));
    } finally {
      setQueueLoading(false);
    }
    // Only re-run when the token changes — `jobs` is read inside the
    // catch branch intentionally without retriggering a refetch every
    // time JobsContext's own polling updates it (refetch()/loadQueue()
    // pairs after each action already keep both in sync).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleApprove = async (job: Job) => {
    if (!token || actionJob) return;
    setActionJob({ id: job.id, kind: 'approve' });
    setActionError(null);
    try {
      await approveJob(token, job.id, { printerId: printer });
      await refetch();
      await loadQueue();
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
      await loadQueue();
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject job');
    } finally {
      setActionJob(null);
    }
  };

  const handleMarkReady = async (job: Job) => {
    if (!token || actionJob) return;
    const nextStatus = nextTransitionStatus(job.status);
    if (!nextStatus) return;
    setActionJob({ id: job.id, kind: 'ready' });
    setActionError(null);
    try {
      await updateJobStatus(token, job.id, nextStatus);
      await refetch();
      await loadQueue();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update job status');
    } finally {
      setActionJob(null);
    }
  };

  const handleMarkCollected = async (job: Job) => {
    if (!token || actionJob) return;
    setActionJob({ id: job.id, kind: 'collect' });
    setActionError(null);
    try {
      await updateJobStatus(token, job.id, 'COLLECTED');
      await refetch();
      await loadQueue();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update job status');
    } finally {
      setActionJob(null);
    }
  };

  const renderJobCard = (job: Job, sectionKey: SectionKey) => {
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

        {sectionKey === 'SUBMITTED' ? (
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

        {sectionKey === 'APPROVED' || sectionKey === 'PRINTING' ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => handleMarkReady(job)}
            style={({ pressed }) => [s.fullButton, pressed && s.pressed, busy && s.disabled]}
          >
            {busy && actionJob?.kind === 'ready' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.fullButtonText}>Mark as Ready</Text>
            )}
          </Pressable>
        ) : null}

        {sectionKey === 'READY' ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => handleMarkCollected(job)}
            style={({ pressed }) => [s.fullGhostButton, pressed && s.pressed, busy && s.disabled]}
          >
            {busy && actionJob?.kind === 'collect' ? (
              <ActivityIndicator color={colors.foreground} size="small" />
            ) : (
              <Text style={s.fullGhostButtonText}>Mark Collected</Text>
            )}
          </Pressable>
        ) : null}

        {sectionKey === 'FAILED' ? (
          <View style={s.failedLabel}>
            <Text style={s.failedLabelText}>Failed</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const hasAnyJobs = groupedQueue
    ? SECTION_ORDER.some(key => groupedQueue[key].length > 0)
    : false;

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

      <KeyboardAwareScreen contentContainerStyle={s.content}>
        {actionError ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>{actionError}</Text>
          </View>
        ) : null}

        {queueLoading && !groupedQueue ? (
          <View style={s.emptyState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !hasAnyJobs ? (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>Queue is clear</Text>
            <Text style={s.emptyBody}>No jobs in the queue right now.</Text>
          </View>
        ) : (
          SECTION_ORDER.map(key => {
            const items = groupedQueue ? groupedQueue[key] : [];
            if (items.length === 0) return null;
            const color = sectionColor(key, colors);
            return (
              <View key={key}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionHeaderText}>{key}</Text>
                  <View style={[s.sectionCountBadge, { backgroundColor: color.bg }]}>
                    <Text style={[s.sectionCountText, { color: color.fg }]}>{items.length}</Text>
                  </View>
                </View>
                {items.map(job => renderJobCard(job, key))}
              </View>
            );
          })
        )}
      </KeyboardAwareScreen>
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
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.sm,
    },
    sectionHeaderText: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    sectionCountBadge: {
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 22,
      alignItems: 'center',
    },
    sectionCountText: {
      fontFamily: designTokens.type.heading,
      fontSize: 11,
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
    failedLabel: {
      alignSelf: 'flex-start',
      borderRadius: designTokens.radius.pill,
      backgroundColor: 'rgba(239,68,68,0.2)',
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    failedLabelText: {
      color: '#EF4444',
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
  });
}
