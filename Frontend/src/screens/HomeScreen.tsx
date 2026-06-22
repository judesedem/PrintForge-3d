import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { SectionHeader, StatCard, Card } from '../components/UI';
import { JobCard } from '../components/JobCard';
import { apiGetJobs, apiGetNotifications } from '../services/api';
import { User, PrintJob } from '../types';

interface HomeScreenProps {
  user: User;
  onNewJob: () => void;
  onJobPress: (job: PrintJob) => void;
  onViewAll: () => void;
  onNotifications: () => void;
}

export default function HomeScreen({ user, onNewJob, onJobPress, onViewAll, onNotifications }: HomeScreenProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  const [myJobs, setMyJobs] = useState<PrintJob[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [jobs, notifications] = await Promise.all([
        apiGetJobs({ userId: user.user_id }),
        apiGetNotifications().catch(() => []), // non-critical — don't block the screen
      ]);
      setMyJobs(jobs);
      setUnreadCount(notifications.filter(n => !n.is_read).length);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load your dashboard');
    } finally {
      setLoading(false);
    }
  }, [user.user_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeJobs = myJobs.filter(j => ['submitted', 'approved', 'queued', 'printing'].includes(j.status));
  const completedCount = myJobs.filter(j => j.status === 'completed').length;
  const printingJob = myJobs.find(j => j.status === 'printing');

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 12 }]}>
          Loading your dashboard…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.container, s.center]}>
        <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
        <Ionicons name="alert-circle" size={44} color={Colors.error} />
        <Text style={[Typography.bodyMedium, { color: Colors.error, marginTop: 12, textAlign: 'center' }]}>
          {error}
        </Text>
        <TouchableOpacity style={s.retryBtn} onPress={loadData}>
          <Text style={[Typography.labelLarge, { color: Colors.accent }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Top bar */}
          <View style={s.topBar}>
            <View>
              <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>{greeting()},</Text>
              <Text style={[Typography.displaySmall, { color: Colors.textPrimary }]}>
                {user.full_name.split(' ')[0]}
              </Text>
            </View>
            <TouchableOpacity style={s.notifBtn} onPress={onNotifications}>
              <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
              {unreadCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Active print banner */}
          {printingJob && (
            <TouchableOpacity
              style={s.activeBanner}
              onPress={() => onJobPress(printingJob)}
              activeOpacity={0.85}
            >
              <View style={s.activePulse} />
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelSmall, { color: Colors.accent, marginBottom: 4 }]}>NOW PRINTING</Text>
                <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]} numberOfLines={1}>
                  {printingJob.file_name}
                </Text>
                <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 3 }]}>
                  {printingJob.printer_name} · Tap to view details
                </Text>
              </View>
              <Ionicons name="print" size={26} color={Colors.accent} />
            </TouchableOpacity>
          )}

          {/* Quick stats */}
          <View style={s.statsRow}>
            <StatCard label="Active Jobs" value={activeJobs.length} color={Colors.accent} icon={<Ionicons name="layers-outline" size={22} color={Colors.accent} />} />
            <StatCard label="Completed" value={completedCount} color={Colors.success} icon={<Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />} />
            <StatCard label="Unread" value={unreadCount} color={Colors.warning} icon={<Ionicons name="notifications-outline" size={22} color={Colors.warning} />} />
          </View>

          {/* New job CTA */}
          <TouchableOpacity style={s.newJobBtn} onPress={onNewJob} activeOpacity={0.85}>
            <View style={s.newJobInner}>
              <View style={s.newJobIcon}>
                <Ionicons name="add" size={26} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]}>Submit a Print Request</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
                  Upload your STL file and choose materials
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.accent} />
            </View>
          </TouchableOpacity>

          {/* Recent jobs */}
          <View style={{ marginTop: Spacing.lg }}>
            <SectionHeader title="Recent Jobs" action="View All" onAction={onViewAll} />
            {myJobs.length === 0 ? (
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                No jobs yet — submit your first print request above.
              </Text>
            ) : (
              myJobs.slice(0, 3).map(job => (
                <JobCard key={job.job_id} job={job} onPress={() => onJobPress(job)} />
              ))
            )}
          </View>

          {/* Quick links */}
          <View style={{ marginTop: Spacing.lg }}>
            <SectionHeader title="Quick Access" />
            <View style={s.quickLinks}>
              <QuickLink icon="cube-outline" label="Materials" />
              <QuickLink icon="print-outline" label="Printers" />
              <QuickLink icon="bar-chart-outline" label="History" />
              <QuickLink icon="chatbubble-ellipses-outline" label="Support" />
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function QuickLink({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  return (
    <TouchableOpacity style={s.quickLink} activeOpacity={0.75}>
      <Ionicons name={icon} size={24} color={Colors.accent} />
      <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

type ThemeColors = {
  background: string; surface: string; border: string; accent: string;
  accentGlow: string; error: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  retryBtn: {
    marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.accent,
    borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 110, paddingTop: Spacing.md },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.lg,
  },
  notifBtn: { padding: Spacing.sm, position: 'relative' },
  badge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: Colors.error, borderRadius: 8,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  activeBanner: {
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.accent + '55',
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    marginBottom: Spacing.lg, gap: Spacing.md,
  },
  activePulse: {
    position: 'absolute', left: 16, top: '50%',
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent,
    marginTop: -4,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  newJobBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  newJobInner: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: Spacing.md,
    borderLeftWidth: 3, borderLeftColor: Colors.accent,
  },
  newJobIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center',
  },
  quickLinks: {
    flexDirection: 'row', gap: Spacing.sm,
  },
  quickLink: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'center',
  },
});
