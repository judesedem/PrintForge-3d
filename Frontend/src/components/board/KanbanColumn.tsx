// components/board/KanbanColumn.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { T } from '@/constants/theme';
import { JOB_STATUS_COLOR } from './BoardChips';
import { JobCard } from './JobCard';
import type { BoardJob, JobStatus } from '@/constants/boardData';

const COLUMN_W = 240;

interface KanbanColumnProps {
  status:    JobStatus;
  label:     string;
  jobs:      BoardJob[];
  height:    number;
  onApprove: (job: BoardJob) => void;
  onReject:  (job: BoardJob) => void;
  onAdvance: (job: BoardJob, to: JobStatus) => void;
}

export function KanbanColumn({
  status, label, jobs, height, onApprove, onReject, onAdvance,
}: KanbanColumnProps) {
  const colors = JOB_STATUS_COLOR[status];

  return (
    <View style={[s.column, { height }]}>
      {/* Column header */}
      <View style={s.header}>
        <View style={[s.dot, { backgroundColor: colors.text }]} />
        <Text style={s.label}>{label}</Text>
        <View style={[s.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[s.badgeText, { color: colors.text }]}>{jobs.length}</Text>
        </View>
      </View>

      {/* Cards */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {jobs.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No jobs</Text>
          </View>
        ) : (
          jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onApprove={onApprove}
              onReject={onReject}
              onAdvance={onAdvance}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  column: {
    width: COLUMN_W,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: T.radius,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    flex: 1,
    fontFamily: T.fontMedium,
    fontSize: 12,
    color: T.foreground,
    fontWeight: '500',
  },
  badge: {
    borderWidth: 1,
    borderRadius: T.radius,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: T.monoRegular,
    fontSize: 11,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 8,
    gap: 8,
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: T.fontRegular,
    fontSize: 12,
    color: T.mutedForeground,
  },
});
