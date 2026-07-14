import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Bell,
  ClipboardList,
  PackageCheck,
  Printer,
  WalletCards,
} from 'lucide-react-native';
import { useTheme } from '../../src/ThemeContext';
import { useSession } from '../../src/SessionContext';
import { useJobs } from '../../src/JobsContext';
import { fetchMyPayments } from '../../src/api/payments';
import { Colors, designTokens } from '../../src/theme';
import Card from '../../src/components/Card';
import JobCard from '../../src/components/JobCard';
import GhsAmount from '../../src/components/GhsAmount';

// NOTE on why there's no "Pay Now" button here: the backend's payment
// flow doesn't attach to an existing PrintJob at all — POST
// /api/payments/initiate takes an estimateId (+ optional listingId), and
// paying is what CREATES a new PrintJob via the Paystack webhook (status
// SUBMITTED), not something you do to an already-APPROVED one. There is
// no backend field or endpoint linking a payment to a pre-existing job,
// and PrintJobApiResponse (src/api/jobs.ts) doesn't expose an estimateId
// to pay against even if there were. The real payment trigger is wired
// into app/(app)/marketplace/[id].tsx instead, where a real estimateId
// exists (the listing's auto-generated quote). See Handoff.md's Payments
// batch entry for the full reasoning.
//
// What IS wired here: cross-referencing GET /api/payments/my-payments
// against this job list by printJobId, to show a "PAID" pill on jobs that
// resulted from a completed payment — real data, no backend changes
// needed, since Payment.printJobId and Job.id are both already exposed.
export default function JobsList() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token } = useSession();
  const { jobs } = useJobs();
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

  return (
    <View style={s.screen}>
      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListHeaderComponent={(
          <>
            <View style={s.headerRow}>
              <View style={s.headerCopy}>
                <Text style={s.eyebrow}>PRINT QUEUE</Text>
                <Text style={s.title}>My orders</Text>
                <Text style={s.subtitle}>Track every model from submission to campus pickup.</Text>
              </View>
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
              <Card style={s.statCard}>
                <View style={s.statIconOrange}>
                  <Printer size={18} color={colors.primary} />
                </View>
                <Text style={s.statValue}>{activeJobs.length}</Text>
                <Text style={s.statLabel}>Active prints</Text>
              </Card>
              <Card style={s.statCard}>
                <View style={s.statIconGreen}>
                  <PackageCheck size={18} color={colors.success} />
                </View>
                <Text style={s.statValue}>{completedJobs.length}</Text>
                <Text style={s.statLabel}>Completed</Text>
              </Card>
              <Card style={s.statCard}>
                <View style={s.statIconBlue}>
                  <WalletCards size={18} color={colors.info} />
                </View>
                <GhsAmount amount={totalSpent} size="sm" style={s.statAmount} />
                <Text style={s.statLabel}>Total spend</Text>
              </Card>
            </View>

            <View style={s.sectionRow}>
              <View>
                <Text style={s.sectionEyebrow}>ORDER HISTORY</Text>
                <Text style={s.sectionTitle}>All print jobs</Text>
              </View>
              <View style={s.countPill}>
                <ClipboardList size={14} color={colors.primary} />
                <Text style={s.countText}>{jobs.length}</Text>
              </View>
            </View>
          </>
        )}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            paid={paidJobIds.has(item.id)}
            onPress={() => router.push(`/jobs/${item.id}`)}
          />
        )}
        ListEmptyComponent={(
          <Card style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <ClipboardList size={26} color={colors.primary} />
            </View>
            <Text style={s.emptyTitle}>No print orders yet</Text>
            <Text style={s.emptyBody}>Your marketplace and uploaded-model orders will appear here.</Text>
          </Card>
        )}
      />
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.lg,
      paddingBottom: designTokens.spacing.section,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: designTokens.spacing.md,
      marginBottom: designTokens.spacing.xl,
    },
    headerCopy: {
      minWidth: 0,
      flex: 1,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
      letterSpacing: 1.2,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 29,
      marginTop: 3,
    },
    subtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.98 }],
    },
    statsRow: {
      flexDirection: 'row',
      gap: designTokens.spacing.sm,
      marginBottom: designTokens.spacing.section,
    },
    statCard: {
      minWidth: 0,
      flex: 1,
      padding: designTokens.spacing.md,
      alignItems: 'flex-start',
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    statIconOrange: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 11,
    },
    statIconGreen: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.statusCompleted.bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 11,
    },
    statIconBlue: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.statusApproved.bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 11,
    },
    statValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 20,
    },
    statAmount: {
      color: colors.foreground,
      fontSize: 15,
    },
    statLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      marginTop: 3,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: designTokens.spacing.md,
    },
    sectionEyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1.1,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 19,
      marginTop: 2,
    },
    countPill: {
      minHeight: 32,
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primarySoft,
    },
    countText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
    },
    emptyBody: {
      maxWidth: 260,
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 5,
    },
  });
}
