import { FlatList, Pressable, StyleSheet, Text, View, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Bell,
  Box,
  CheckCircle2,
  Inbox,
  Printer,
  Wallet,
} from 'lucide-react-native';
import { useTheme } from '../../src/ThemeContext';
import { useSession } from '../../src/SessionContext';
import { useJobs } from '../../src/JobsContext';
import { useSwipeTabs } from '../../src/SwipeTabsContext';
import { fetchMyPayments } from '../../src/api/payments';
import { Colors, designTokens } from '../../src/theme';
import GhsAmount from '../../src/components/GhsAmount';
import type { Job, JobStatus } from '../../src/data/mockData';

/**
 * Orders — Bolt redesign Pass 2. Data paths unchanged: jobs come from
 * JobsContext, PAID pills from GET /api/payments/my-payments (see the
 * long note in the previous version — payment CREATES jobs via webhook,
 * there is no pay-an-existing-job flow, which is why there's no Pay
 * button here).
 *
 * Timeline mapping — the design's 5 stages vs the backend's real
 * JobStatus values:
 *   Submitted → SUBMITTED
 *   Approved  → APPROVED or QUEUED
 *   Printing  → PRINTING or IN_PROGRESS (pulsing dot)
 *   Ready     → COMPLETED (backend has no separate READY status)
 *   Collected → no backend status exists yet — always rendered future
 * FAILED/REJECTED show a red badge and a dimmed timeline.
 *
 * Job has no image/thumbnail field on the backend response, so the
 * thumbnail slot always renders the Box-icon placeholder.
 */

const STAGES = ['Subm', 'Appr', 'Print', 'Ready', 'Coll'] as const;
const STATUS_ORDER = ['SUBMITTED', 'APPROVED', 'PRINTING', 'READY', 'COLLECTED'] as const;

type StatusVisual = {
  label: string;
  stage: number; // index into STAGES; -1 = terminal failure, no progress
  fg: string;
  bg: string;
  pulsing?: boolean;
};

function statusVisual(status: JobStatus, colors: Colors): StatusVisual {
  switch (status) {
    case 'SUBMITTED':
      return { label: 'Submitted', stage: 0, fg: colors.mutedFg, bg: colors.muted };
    case 'APPROVED':
      return { label: 'Approved', stage: 1, fg: '#5B8DEF', bg: 'rgba(37, 99, 235, 0.18)' };
    case 'QUEUED':
      return { label: 'Queued', stage: 1, fg: '#5B8DEF', bg: 'rgba(37, 99, 235, 0.18)' };
    case 'PRINTING':
    case 'IN_PROGRESS':
      return { label: 'Printing', stage: 2, fg: colors.primary, bg: colors.primarySoft, pulsing: true };
    case 'COMPLETED':
      return { label: 'Ready for Pickup', stage: 3, fg: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' };
    case 'FAILED':
      return { label: 'Failed', stage: -1, fg: colors.statusFailed.text, bg: colors.statusFailed.bg };
    case 'REJECTED':
      return { label: 'Rejected', stage: -1, fg: colors.statusRejected.text, bg: colors.statusRejected.bg };
    default:
      return { label: status, stage: 0, fg: colors.mutedFg, bg: colors.muted };
  }
}

function formatDate(submittedAt: string): string {
  if (!submittedAt) return '';
  const d = new Date(submittedAt);
  return Number.isNaN(d.getTime()) ? submittedAt : d.toLocaleDateString();
}

function decodeName(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/** Orange dot that pulses — used for the in-flight PRINTING stage. */
function PulsingDot({ color, size }: { color: string; size: number }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }}
    />
  );
}

export default function JobsList() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token } = useSession();
  const { jobs } = useJobs();
  // No-ops harmlessly when this renders as the standalone /jobs stack
  // route (outside the tabs pager) — the context default is a no-op.
  const { goToTab } = useSwipeTabs();
  const s = makeStyles(colors);

  const [paidJobIds, setPaidJobIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) {
      setPaidJobIds(new Set());
      return;
    }
    // Best-effort, supplementary data — the jobs list itself doesn't
    // depend on this, so a failure here just means no PAID pills show up
    // rather than blocking or erroring the whole screen.
    fetchMyPayments(token)
      .then(payments => {
        const ids = payments
          .filter(p => p.status === 'COMPLETED' && p.printJobId)
          .map(p => p.printJobId as string);
        setPaidJobIds(new Set(ids));
      })
      .catch(() => {});
  }, [token]);

  const activeJobs = jobs.filter(job =>
    ['SUBMITTED', 'APPROVED', 'QUEUED', 'PRINTING', 'IN_PROGRESS'].includes(job.status),
  );
  const completedJobs = jobs.filter(job => job.status === 'COMPLETED');
  const totalSpent = jobs.reduce((sum, job) => sum + job.cost, 0);

  const renderCard = ({ item }: { item: Job }) => {
    const visual = statusVisual(item.status, colors);
    const failed = visual.stage === -1;
    return (
      <View style={s.card}>
        <View style={s.cardTopRow}>
          <View style={s.thumb}>
            <Box size={26} color={colors.primary} strokeWidth={1.8} />
          </View>
          <View style={s.cardCopy}>
            <Text style={s.cardTitle} numberOfLines={1}>{decodeName(item.title)}</Text>
            <Text style={s.cardMeta}>
              {item.material} · {item.quality} · Qty {item.qty}
            </Text>
            <Text style={s.cardDate}>{formatDate(item.submittedAt)}</Text>
          </View>
          <View style={s.badgeColumn}>
            <View style={[s.statusBadge, { backgroundColor: visual.bg }]}>
              {visual.pulsing ? <PulsingDot color={visual.fg} size={6} /> : null}
              <Text style={[s.statusBadgeText, { color: visual.fg }]}>{visual.label}</Text>
            </View>
            {paidJobIds.has(item.id) ? (
              <View style={s.paidPill}>
                <Text style={s.paidPillText}>PAID</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={s.timeline}>
          {STAGES.map((stage, i) => {
            const stageIndex = STATUS_ORDER.indexOf(item.status as any);
            const done = i < stageIndex;
            const current = i === stageIndex;
            return (
              <View key={stage} style={s.timelineItem}>
                <View
                  style={[
                    s.timelinePill,
                    done && s.timelinePillDone,
                    current && s.timelinePillCurrent,
                  ]}
                />
                <Text style={s.timelineLabel}>{stage}</Text>
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/jobs/${item.id}`)}
          style={({ pressed }) => [s.detailsLink, pressed && s.pressed]}
        >
          <Text style={s.detailsLinkText}>View Details</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={s.screen}>
      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        renderItem={renderCard}
        ListHeaderComponent={(
          <>
            <View style={s.headerRow}>
              <Text style={s.title}>My Orders</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
                onPress={() => router.push('/notifications')}
                style={({ pressed }) => [s.iconButton, pressed && s.pressed]}
              >
                <Bell size={20} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Printer size={18} color={colors.primary} />
                <Text style={s.statValue}>{activeJobs.length}</Text>
                <Text style={s.statLabel}>Active</Text>
              </View>
              <View style={s.statCard}>
                <CheckCircle2 size={18} color="#22C55E" />
                <Text style={s.statValue}>{completedJobs.length}</Text>
                <Text style={s.statLabel}>Completed</Text>
              </View>
              <View style={s.statCard}>
                <Wallet size={18} color={colors.foreground} />
                <GhsAmount amount={totalSpent} size="sm" style={s.statAmount} />
                <Text style={s.statLabel}>Total spent</Text>
              </View>
            </View>
          </>
        )}
        ListEmptyComponent={(
          <View style={s.emptyState}>
            <Inbox size={56} color={colors.mutedFg} strokeWidth={1.4} />
            <Text style={s.emptyTitle}>No print orders yet</Text>
            <Text style={s.emptyBody}>Upload a design to get your first print started.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => goToTab('submit')}
              style={({ pressed }) => [s.emptyButton, pressed && s.pressed]}
            >
              <Text style={s.emptyButtonText}>Upload Now →</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    list: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.md,
      paddingBottom: 48,
    },
    pressed: { opacity: 0.72 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: designTokens.spacing.lg,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 26,
      letterSpacing: -0.5,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 9,
      marginBottom: designTokens.spacing.xl,
    },
    statCard: {
      flex: 1,
      minHeight: 88,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      padding: 10,
    },
    statValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
    },
    statAmount: { color: colors.foreground, fontSize: 14 },
    statLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
    },

    card: {
      borderRadius: 16,
      backgroundColor: colors.card,
      padding: designTokens.spacing.md,
      marginBottom: designTokens.spacing.md,
    },
    cardTopRow: {
      flexDirection: 'row',
      gap: designTokens.spacing.md,
      marginBottom: designTokens.spacing.md,
    },
    thumb: {
      width: 60,
      height: 60,
      borderRadius: designTokens.radius.md,
      backgroundColor: '#0A182E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardCopy: { flex: 1, minWidth: 0 },
    cardTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
    },
    cardMeta: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 3,
    },
    cardDate: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      marginTop: 3,
    },
    badgeColumn: { alignItems: 'flex-end', gap: 5 },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    statusBadgeText: {
      fontFamily: designTokens.type.heading,
      fontSize: 10,
    },
    paidPill: {
      borderRadius: designTokens.radius.pill,
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    paidPillText: {
      color: '#22C55E',
      fontFamily: designTokens.type.heading,
      fontSize: 8,
      letterSpacing: 0.6,
    },

    timeline: {
      flexDirection: 'row',
      gap: 4,
      marginTop: 12,
      marginBottom: 4,
    },
    timelineItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    timelinePill: {
      height: 4,
      width: '100%',
      borderRadius: 99,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    timelinePillDone: {
      backgroundColor: '#22C55E',
    },
    timelinePillCurrent: {
      backgroundColor: '#FF6A00',
    },
    timelineLabel: {
      color: 'rgba(255,255,255,0.4)',
      fontSize: 9,
      fontFamily: designTokens.type.body,
    },

    detailsLink: { alignSelf: 'flex-end', paddingTop: 4, paddingHorizontal: 2 },
    detailsLinkText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 11,
    },

    emptyState: {
      alignItems: 'center',
      paddingTop: 48,
      paddingHorizontal: designTokens.spacing.xl,
      gap: 8,
    },
    emptyTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
      marginTop: 6,
    },
    emptyBody: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      textAlign: 'center',
    },
    emptyButton: {
      marginTop: designTokens.spacing.md,
      minHeight: 46,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primary,
      paddingHorizontal: designTokens.spacing.xxl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyButtonText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
  });
}
