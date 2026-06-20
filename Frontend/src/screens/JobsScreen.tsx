import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { JobCard } from '../components/JobCard';
import { EmptyState } from '../components/UI';
import { apiGetJobs } from '../services/api';
import { PrintJob, JobStatus } from '../types';

interface JobsScreenProps {
  onJobPress: (job: PrintJob) => void;
  onNewJob: () => void;
  userId?: string;
  showAll?: boolean; // admin / staff see all jobs
}

const FILTERS: { label: string; value: JobStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'printing' },
  { label: 'Queued', value: 'queued' },
  { label: 'Pending', value: 'submitted' },
  { label: 'Done', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
];

export default function JobsScreen({ onJobPress, onNewJob, userId, showAll = false }: JobsScreenProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) setRefreshing(true);
      const data = await apiGetJobs(showAll ? {} : { userId });
      setJobs(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showAll, userId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[Typography.displayMedium, { color: Colors.textPrimary }]}>
              {showAll ? 'All Print Jobs' : 'My Jobs'}
            </Text>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
              {filtered.length} job{filtered.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {!showAll && (
            <TouchableOpacity style={s.newBtn} onPress={onNewJob} activeOpacity={0.85}>
              <Text style={[Typography.labelMedium, { color: Colors.background }]}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <View style={s.filterWrap}>
          <FlatList
            horizontal
            data={FILTERS}
            keyExtractor={f => f.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.chip, filter === item.value && s.chipActive]}
                onPress={() => setFilter(item.value)}
                activeOpacity={0.8}
              >
                <Text style={[
                  Typography.labelMedium,
                  { color: filter === item.value ? Colors.background : Colors.textSecondary }
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Content */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 12 }]}>
              Loading jobs…
            </Text>
          </View>
        ) : error ? (
          <View style={s.center}>
            <Text style={{ fontSize: 40 }}>⚠️</Text>
            <Text style={[Typography.bodyMedium, { color: Colors.error, marginTop: 12, textAlign: 'center' }]}>
              {error}
            </Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => loadJobs()}>
              <Text style={[Typography.labelLarge, { color: Colors.accent }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={j => j.job_id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => loadJobs(true)}
            ListEmptyComponent={
              <EmptyState
                icon="📋"
                title="No jobs here"
                subtitle={filter === 'all' ? "Submit your first print request to get started." : `No ${filter} jobs at the moment.`}
              />
            }
            renderItem={({ item }) => (
              <JobCard job={item} onPress={() => onJobPress(item)} />
            )}
          />
        )}

      </SafeAreaView>
    </View>
  );
}

type ThemeColors = {
  background: string; surface: string; border: string; accent: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
  },
  newBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  filterWrap: { marginBottom: Spacing.md },
  chip: {
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  retryBtn: {
    marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.accent,
    borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
});
