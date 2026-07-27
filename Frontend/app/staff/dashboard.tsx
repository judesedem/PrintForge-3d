/**
 * Lab staff dashboard.
 *
 * This screen used to render <AdminPanel /> verbatim, so lab technicians
 * saw the admin panel — user creation, designer payouts, moderation
 * reports — none of which is their job (and most of whose actions the
 * backend rejects for LAB_STAFF anyway: POST/DELETE /api/admin/users and
 * DELETE /api/admin/jobs are @PreAuthorize("hasRole('ADMIN')")).
 *
 * It now shows the lab's own shift view, built from the two endpoints
 * LAB_STAFF genuinely owns: GET /api/print-jobs/queue (grouped queue) and
 * GET /api/printers. Read-only by design — every state-changing action
 * lives on the Print Queue / Queue Board screens that already implement
 * it, and each row here deep-links there.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import {
  ChevronRight,
  ClipboardList,
  Columns3,
  Menu,
  PackageCheck,
  Printer as PrinterIcon,
  RefreshCw,
} from 'lucide-react-native';

import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { useJobs } from '@/JobsContext';
import { fetchGroupedQueue, groupJobsByStatus, GroupedQueue } from '@/api/jobs';
import { fetchPrinters, Printer } from '@/api/admin';
import { Job } from '@/data/mockData';
import { Colors, designTokens } from '@/theme';

const openDrawer = (nav: any) => nav.dispatch({ type: 'OPEN_DRAWER' });

const EMPTY_QUEUE: GroupedQueue = {
  SUBMITTED: [], APPROVED: [], PRINTING: [], READY: [], COLLECTED: [], FAILED: [],
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstNameOf(fullName?: string | null): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0];
  return first || 'there';
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function waitingFor(submittedAt: string): string {
  if (!submittedAt) return '';
  const d = new Date(submittedAt);
  if (Number.isNaN(d.getTime())) return '';
  const hours = Math.max(0, Math.floor((Date.now() - d.getTime()) / 3_600_000));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Backend printer status vocabulary — see PrinterService. */
function printerPill(status: string, colors: Colors): { fg: string; bg: string } {
  switch ((status || '').toUpperCase()) {
    case 'AVAILABLE':
      return { fg: '#22C55E', bg: 'rgba(34,197,94,0.15)' };
    case 'BUSY':
    case 'PRINTING':
      return { fg: colors.primary, bg: colors.primarySoft };
    case 'MAINTENANCE':
    case 'OFFLINE':
      return { fg: '#EF4444', bg: 'rgba(239,68,68,0.2)' };
    default:
      return { fg: colors.mutedFg, bg: colors.muted };
  }
}

export default function StaffDashboard() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { token, authLoading, appUser } = useSession();
  const { jobs, refetch } = useJobs();
  const s = makeStyles(colors);

  const [queue, setQueue] = useState<GroupedQueue | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const grouped = await fetchGroupedQueue(token);
      setQueue(grouped);
    } catch {
      // Same fallback the Print Queue screen uses: if /api/print-jobs/queue
      // is unavailable, group the flat list JobsContext already loaded
      // rather than blanking a shift-critical screen.
      setQueue(groupJobsByStatus(jobs));
    }
    try {
      setPrinters(await fetchPrinters(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load printers');
    } finally {
      setLoading(false);
    }
    // `jobs` is read only inside the catch, intentionally not a dependency —
    // otherwise JobsContext polling would retrigger this on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refetch()]);
    setRefreshing(false);
  };

  const q = queue ?? EMPTY_QUEUE;
  const awaitingReview = q.SUBMITTED.length;
  const inProgress = q.APPROVED.length + q.PRINTING.length;
  const readyForPickup = q.READY.length;
  const availablePrinters = printers.filter(
    p => (p.status || '').toUpperCase() === 'AVAILABLE',
  ).length;

  const renderJobRow = (job: Job, trailing: string) => (
    <TouchableOpacity
      key={job.id}
      accessibilityRole="button"
      onPress={() => router.push(`/jobs/${job.id}`)}
      style={s.jobRow}
      activeOpacity={0.7}
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initialsOf(job.student)}</Text>
      </View>
      <View style={s.jobRowBody}>
        <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
        <Text style={s.jobMeta} numberOfLines={1}>
          {job.student} · {job.material} · Qty {job.qty}
        </Text>
      </View>
      {trailing ? <Text style={s.jobTrailing}>{trailing}</Text> : null}
      <ChevronRight size={16} color={colors.mutedFg} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[s.safeArea, s.centered]} edges={['top']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          onPress={() => openDrawer(navigation)}
          style={s.iconButton}
          activeOpacity={0.7}
        >
          <Menu size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Lab Dashboard</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Refresh"
          onPress={onRefresh}
          style={s.iconButton}
          activeOpacity={0.7}
        >
          <RefreshCw size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={s.greeting}>{greeting()}, {firstNameOf(appUser?.full_name)}</Text>
        <Text style={s.greetingSub}>
          {awaitingReview === 0
            ? 'Nothing waiting on you right now.'
            : `${awaitingReview} job${awaitingReview === 1 ? '' : 's'} waiting on your review.`}
        </Text>

        {error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.statsGrid}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push('/staff/queue')}
            style={s.statCard}
            activeOpacity={0.7}
          >
            <View style={[s.statIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
              <ClipboardList size={18} color="#F59E0B" />
            </View>
            <Text style={s.statValue}>{awaitingReview}</Text>
            <Text style={s.statLabel}>Awaiting review</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push('/staff/board')}
            style={s.statCard}
            activeOpacity={0.7}
          >
            <View style={[s.statIcon, { backgroundColor: colors.primarySoft }]}>
              <Columns3 size={18} color={colors.primary} />
            </View>
            <Text style={s.statValue}>{inProgress}</Text>
            <Text style={s.statLabel}>In progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push('/staff/queue')}
            style={s.statCard}
            activeOpacity={0.7}
          >
            <View style={[s.statIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
              <PackageCheck size={18} color="#22C55E" />
            </View>
            <Text style={s.statValue}>{readyForPickup}</Text>
            <Text style={s.statLabel}>Ready for pickup</Text>
          </TouchableOpacity>

          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
              <PrinterIcon size={18} color="#3B82F6" />
            </View>
            <Text style={s.statValue}>{availablePrinters}/{printers.length}</Text>
            <Text style={s.statLabel}>Printers free</Text>
          </View>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Needs your review</Text>
          {awaitingReview > 0 ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push('/staff/queue')}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Text style={s.sectionLink}>Open queue</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={s.card}>
          {q.SUBMITTED.length === 0 ? (
            <Text style={s.emptyText}>No jobs pending review. Queue is clear.</Text>
          ) : (
            q.SUBMITTED.slice(0, 4).map(job => renderJobRow(job, waitingFor(job.submittedAt)))
          )}
          {q.SUBMITTED.length > 4 ? (
            <Text style={s.moreText}>+{q.SUBMITTED.length - 4} more in the queue</Text>
          ) : null}
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Ready for pickup</Text>
        </View>
        <View style={s.card}>
          {q.READY.length === 0 ? (
            <Text style={s.emptyText}>Nothing waiting for collection.</Text>
          ) : (
            q.READY.slice(0, 4).map(job => renderJobRow(job, ''))
          )}
          {q.READY.length > 4 ? (
            <Text style={s.moreText}>+{q.READY.length - 4} more ready</Text>
          ) : null}
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Printers</Text>
        </View>
        <View style={s.card}>
          {printers.length === 0 ? (
            <Text style={s.emptyText}>No printers registered.</Text>
          ) : (
            printers.map(p => {
              const pill = printerPill(p.status, colors);
              return (
                <View key={p.id} style={s.printerRow}>
                  <View style={s.jobRowBody}>
                    <Text style={s.jobTitle} numberOfLines={1}>{p.printerName}</Text>
                    <Text style={s.jobMeta} numberOfLines={1}>{p.labLocation || 'No location set'}</Text>
                  </View>
                  <View style={[s.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[s.pillText, { color: pill.fg }]}>{p.status}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={s.quickRow}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push('/staff/queue')}
            style={s.quickButton}
            activeOpacity={0.7}
          >
            <ClipboardList size={16} color="#FFFFFF" />
            <Text style={s.quickButtonText}>Print Queue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push('/staff/board')}
            style={s.quickGhostButton}
            activeOpacity={0.7}
          >
            <Columns3 size={16} color={colors.foreground} />
            <Text style={s.quickGhostText}>Queue Board</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    topBar: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: designTokens.spacing.lg,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitle: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 19,
      textAlign: 'center',
    },
    content: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.sm,
      paddingBottom: 44,
    },
    greeting: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 22,
    },
    greetingSub: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      marginTop: 4,
      marginBottom: designTokens.spacing.lg,
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
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      width: '48%',
      flexGrow: 1,
      borderRadius: 16,
      backgroundColor: colors.card,
      padding: designTokens.spacing.md,
      gap: 6,
    },
    statIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    statValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 22,
    },
    statLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.sm,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
    },
    sectionLink: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    card: {
      borderRadius: 16,
      backgroundColor: colors.card,
      paddingHorizontal: designTokens.spacing.md,
      paddingVertical: 4,
    },
    jobRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    printerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    jobRowBody: { flex: 1 },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    jobTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.medium,
      fontSize: 14,
    },
    jobMeta: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 2,
    },
    jobTrailing: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
    },
    pill: {
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    pillText: {
      fontFamily: designTokens.type.heading,
      fontSize: 10,
    },
    emptyText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      paddingVertical: 14,
    },
    moreText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      paddingBottom: 12,
    },
    quickRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: designTokens.spacing.lg,
    },
    quickButton: {
      flex: 1,
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primary,
    },
    quickButtonText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    quickGhostButton: {
      flex: 1,
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: designTokens.radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    quickGhostText: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
  });
}
