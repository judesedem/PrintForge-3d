import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { StatCard, SectionHeader, Card, StatusBadge } from '../components/UI';
import { JobCard } from '../components/JobCard';
import { MOCK_JOBS, MOCK_PRINTERS } from '../constants/mockData';
import { PrintJob } from '../types';

interface AdminDashboardProps {
  onJobPress: (job: PrintJob) => void;
  onViewAllJobs: () => void;
  isAdmin: boolean;
  onOpenQueueManagement?: () => void;
  onOpenPrinterManagement?: () => void;
}

export default function AdminDashboard({
  onJobPress,
  onViewAllJobs,
  isAdmin,
  onOpenQueueManagement,
  onOpenPrinterManagement,
}: AdminDashboardProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  // Built per-render now (was a module-level constant before) since it
  // reads from the current theme's palette, not a fixed import.
  const PRINTER_STATUS_CONFIG: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    idle:        { color: Colors.success,   icon: 'ellipse',          label: 'Idle' },
    printing:    { color: Colors.accent,    icon: 'ellipse',          label: 'Printing' },
    maintenance: { color: Colors.warning,   icon: 'ellipse',          label: 'Maintenance' },
    offline:     { color: Colors.textMuted, icon: 'ellipse',          label: 'Offline' },
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'printers'>('overview');

  const pendingJobs = MOCK_JOBS.filter(j => j.status === 'submitted');
  const printingJobs = MOCK_JOBS.filter(j => j.status === 'printing');
  const queuedJobs = MOCK_JOBS.filter(j => j.status === 'queued');
  const todayCompleted = MOCK_JOBS.filter(j => j.status === 'completed').length;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'pending', label: `Pending (${pendingJobs.length})` },
    { id: 'printers', label: 'Printers' },
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons
              name={isAdmin ? 'settings' : 'construct'}
              size={20}
              color={Colors.textPrimary}
              style={{ marginRight: 8 }}
            />
            <View>
              <Text style={[Typography.displayMedium, { color: Colors.textPrimary }]}>
                {isAdmin ? 'Admin Dashboard' : 'Staff Panel'}
              </Text>
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
                Engineering Lab · KNUST
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[s.tab, activeTab === t.id && s.tabActive]}
              onPress={() => setActiveTab(t.id as any)}
            >
              <Text style={[Typography.labelMedium, { color: activeTab === t.id ? Colors.accent : Colors.textSecondary }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <View>
              {/* Stats grid */}
              <View style={s.statsGrid}>
                <View style={s.statsRow}>
                  <StatCard label="Pending Review" value={pendingJobs.length} color={Colors.warning} icon={<Ionicons name="time-outline" size={22} color={Colors.warning} />} />
                  <StatCard label="Now Printing" value={printingJobs.length} color={Colors.accent} icon={<Ionicons name="print-outline" size={22} color={Colors.accent} />} />
                </View>
                <View style={s.statsRow}>
                  <StatCard label="In Queue" value={queuedJobs.length} color={Colors.info} icon={<Ionicons name="hourglass-outline" size={22} color={Colors.info} />} />
                  <StatCard label="Completed Today" value={todayCompleted} color={Colors.success} icon={<Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />} />
                </View>
              </View>

              {/* Quick actions */}
              {(onOpenQueueManagement || onOpenPrinterManagement) && (
                <View style={s.quickActionsRow}>
                  {onOpenQueueManagement && (
                    <TouchableOpacity
                      style={s.quickActionBtn}
                      onPress={onOpenQueueManagement}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="print-outline" size={20} color={Colors.accent} />
                      <Text style={[Typography.labelMedium, { color: Colors.textPrimary, marginTop: 6 }]}>
                        Manage Queue
                      </Text>
                    </TouchableOpacity>
                  )}
                  {onOpenPrinterManagement && (
                    <TouchableOpacity
                      style={s.quickActionBtn}
                      onPress={onOpenPrinterManagement}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="settings-outline" size={20} color={Colors.secondary} />
                      <Text style={[Typography.labelMedium, { color: Colors.textPrimary, marginTop: 6 }]}>
                        Manage Printers
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Currently printing */}
              {printingJobs.length > 0 && (
                <View style={{ marginTop: Spacing.lg }}>
                  <SectionHeader title="Currently Printing" action="View All" onAction={onViewAllJobs} />
                  {printingJobs.map(job => (
                    <JobCard key={job.job_id} job={job} onPress={() => onJobPress(job)} />
                  ))}
                </View>
              )}

              {/* Pending */}
              {pendingJobs.length > 0 && (
                <View style={{ marginTop: Spacing.lg }}>
                  <SectionHeader title="Awaiting Review" action="View All" onAction={() => setActiveTab('pending')} />
                  {pendingJobs.slice(0, 2).map(job => (
                    <JobCard key={job.job_id} job={job} onPress={() => onJobPress(job)} />
                  ))}
                </View>
              )}

              {/* Queue summary */}
              {queuedJobs.length > 0 && (
                <View style={{ marginTop: Spacing.lg }}>
                  <SectionHeader title="Print Queue" />
                  {queuedJobs.map(job => (
                    <Card key={job.job_id} onPress={() => onJobPress(job)} style={s.queueCard}>
                      <View style={s.queuePos}>
                        <Text style={[Typography.displaySmall, { color: Colors.accent }]}>#{job.queue_position}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]} numberOfLines={1}>{job.file_name}</Text>
                        <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 2 }]}>
                          {job.user_name} · {job.material} · {job.color}
                        </Text>
                        {job.estimated_time && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
                            <Text style={[Typography.caption, { color: Colors.textMuted, marginLeft: 4 }]}>
                              {job.estimated_time}m estimated
                            </Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* PENDING TAB */}
          {activeTab === 'pending' && (
            <View>
              {pendingJobs.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="checkmark-done-circle-outline" size={56} color={Colors.success} />
                  <Text style={[Typography.displaySmall, { color: Colors.textPrimary, marginTop: 12 }]}>All clear!</Text>
                  <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
                    No jobs pending review right now.
                  </Text>
                </View>
              ) : (
                pendingJobs.map(job => (
                  <Card key={job.job_id} onPress={() => onJobPress(job)} style={s.pendingCard}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[Typography.labelLarge, { color: Colors.textPrimary, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                          {job.file_name}
                        </Text>
                        <StatusBadge status={job.status} />
                      </View>
                      <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 4 }]}>
                        By {job.user_name}
                      </Text>
                      <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>
                        {job.material} · {job.color} · Qty {job.quantity}
                      </Text>
                      <View style={s.reviewButtons}>
                        <TouchableOpacity style={s.approveBtn}>
                          <Ionicons name="checkmark" size={14} color={Colors.success} />
                          <Text style={[Typography.labelMedium, { color: Colors.success, marginLeft: 4 }]}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.rejectBtn}>
                          <Ionicons name="close" size={14} color={Colors.error} />
                          <Text style={[Typography.labelMedium, { color: Colors.error, marginLeft: 4 }]}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.viewBtn} onPress={() => onJobPress(job)}>
                          <Text style={[Typography.labelMedium, { color: Colors.accent }]}>Details</Text>
                          <Ionicons name="chevron-forward" size={14} color={Colors.accent} style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* PRINTERS TAB */}
          {activeTab === 'printers' && (
            <View>
              {MOCK_PRINTERS.map(printer => {
                const cfg = PRINTER_STATUS_CONFIG[printer.printer_status];
                return (
                  <Card key={printer.printer_id} elevated style={s.printerCard}>
                    <View style={{ flex: 1 }}>
                      <View style={s.printerHeader}>
                        <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]}>{printer.printer_name}</Text>
                        <View style={[s.printerStatus, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '55' }]}>
                          <Ionicons name={cfg.icon} size={8} color={cfg.color} style={{ marginRight: 4 }} />
                          <Text style={[Typography.caption, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                        <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginLeft: 4 }]}>
                          {printer.lab_location}
                        </Text>
                      </View>
                      {printer.current_job && (
                        <View style={s.currentJob}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="print-outline" size={12} color={Colors.accent} />
                            <Text style={[Typography.caption, { color: Colors.accent, marginLeft: 4 }]}>
                              {printer.current_job}
                            </Text>
                          </View>
                        </View>
                      )}
                      {isAdmin && (
                        <View style={s.printerActions}>
                          <TouchableOpacity style={s.smallBtn}>
                            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Set Maintenance</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.smallBtn}>
                            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                              {printer.printer_status === 'offline' ? 'Set Online' : 'Set Offline'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type ThemeColors = {
  background: string; surface: string; surfaceElevated: string; border: string;
  accent: string; accentGlow: string; success: string; successBg: string;
  warning: string; error: string; errorBg: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg, gap: Spacing.md,
  },
  tab: { paddingVertical: Spacing.md, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.accent },
  scroll: { padding: Spacing.lg, paddingBottom: 110 },
  statsGrid: { gap: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  quickActionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  quickActionBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.accent + '33',
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  queueCard: { marginBottom: Spacing.sm, gap: Spacing.md },
  queuePos: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center',
  },
  pendingCard: { marginBottom: Spacing.sm, flexDirection: 'column' },
  reviewButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  approveBtn: {
    flex: 1, backgroundColor: Colors.successBg, borderRadius: Radius.md,
    padding: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    borderWidth: 1, borderColor: Colors.success + '44',
  },
  rejectBtn: {
    flex: 1, backgroundColor: Colors.errorBg, borderRadius: Radius.md,
    padding: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    borderWidth: 1, borderColor: Colors.error + '44',
  },
  viewBtn: {
    flex: 1, backgroundColor: Colors.accentGlow, borderRadius: Radius.md,
    padding: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    borderWidth: 1, borderColor: Colors.accent + '44',
  },
  printerCard: { marginBottom: Spacing.md, flexDirection: 'column' },
  printerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  printerStatus: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1,
  },
  currentJob: {
    marginTop: 8, backgroundColor: Colors.accentGlow,
    borderRadius: Radius.sm, padding: 8,
    borderWidth: 1, borderColor: Colors.accent + '33',
  },
  printerActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  smallBtn: {
    flex: 1, backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md, padding: 8, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
});
