// components/board/JobCard.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, LayoutAnimation,
  Platform, UIManager,
} from 'react-native';
import { ChevronDown, ChevronRight, Printer, MapPin, User, FileText } from 'lucide-react-native';
import { T } from '@/constants/theme';
import { JobStatusChip, MaterialChip } from './BoardChips';
import type { BoardJob, JobStatus } from '@/constants/boardData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Which action button to show per status
const NEXT_STATUS: Partial<Record<JobStatus, { label: string; to: JobStatus }>> = {
  APPROVED:  { label: 'Start Printing', to: 'PRINTING' },
  PRINTING:  { label: 'Mark Ready',     to: 'READY' },
  READY:     { label: 'Mark Collected', to: 'COLLECTED' },
};

interface JobCardProps {
  job: BoardJob;
  onApprove:  (job: BoardJob) => void;
  onReject:   (job: BoardJob) => void;
  onAdvance:  (job: BoardJob, to: JobStatus) => void;
}

export function JobCard({ job, onApprove, onReject, onAdvance }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  const advance = NEXT_STATUS[job.status];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={toggle}
      style={s.card}
    >
      {/* Top row: job id + expand chevron */}
      <View style={s.topRow}>
        <Text style={s.jobId}>{job.id}</Text>
        {expanded
          ? <ChevronDown size={13} color={T.mutedForeground} />
          : <ChevronRight size={13} color={T.mutedForeground} />
        }
      </View>

      {/* User + file */}
      <View style={s.infoRow}>
        <User size={11} color={T.mutedForeground} strokeWidth={2} />
        <Text style={s.infoText} numberOfLines={1}>{job.user}</Text>
      </View>
      <View style={s.infoRow}>
        <FileText size={11} color={T.mutedForeground} strokeWidth={2} />
        <Text style={s.infoText} numberOfLines={1}>{job.file}</Text>
      </View>

      {/* Chips row */}
      <View style={s.chipsRow}>
        <JobStatusChip status={job.status} />
        <MaterialChip material={job.material} />
        <View style={s.colorDot}>
          <View style={[s.colorSwatch, { backgroundColor: job.color }]} />
        </View>
      </View>

      {/* Cost */}
      <Text style={s.cost}>GH₵ {job.cost.toFixed(2)}</Text>

      {/* Expanded details */}
      {expanded && (
        <View style={s.expandedSection}>
          <View style={s.divider} />

          <View style={s.detailGrid}>
            <Detail label="Quality"  value={job.quality} />
            <Detail label="Infill"   value={`${job.infill}%`} />
            <Detail label="Qty"      value={String(job.qty)} />
            <Detail label="Submitted" value={job.submitted.slice(0, 10)} />
          </View>

          {job.notes ? (
            <View style={s.notesBox}>
              <Text style={s.notesText}>{job.notes}</Text>
            </View>
          ) : null}

          {job.assignedPrinter && (
            <View style={s.infoRow}>
              <Printer size={11} color={T.mutedForeground} strokeWidth={2} />
              <Text style={s.infoText}>{job.assignedPrinter}</Text>
            </View>
          )}
          {job.pickupLocation && (
            <View style={s.infoRow}>
              <MapPin size={11} color={T.mutedForeground} strokeWidth={2} />
              <Text style={s.infoText}>{job.pickupLocation}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={s.actions}>
            {job.status === 'SUBMITTED' && (
              <>
                <TouchableOpacity
                  style={[s.actionBtn, s.approveBtn]}
                  onPress={() => onApprove(job)}
                >
                  <Text style={[s.actionText, s.approveText]}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, s.rejectBtn]}
                  onPress={() => onReject(job)}
                >
                  <Text style={[s.actionText, s.rejectText]}>Reject</Text>
                </TouchableOpacity>
              </>
            )}
            {advance && (
              <TouchableOpacity
                style={[s.actionBtn, s.advanceBtn]}
                onPress={() => onAdvance(job, advance.to)}
              >
                <Text style={[s.actionText, s.advanceText]}>{advance.label}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailItem}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius,
    padding: 10,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobId: {
    fontFamily: T.monoRegular,
    fontSize: 11,
    color: T.foreground,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontFamily: T.fontRegular,
    fontSize: 11,
    color: T.mutedForeground,
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  colorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  cost: {
    fontFamily: T.monoRegular,
    fontSize: 12,
    color: T.primary,
    fontWeight: '700',
  },

  // Expanded
  expandedSection: { gap: 6 },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 2,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: { minWidth: 80 },
  detailLabel: {
    fontFamily: T.fontRegular,
    fontSize: 10,
    color: T.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontFamily: T.fontMedium,
    fontSize: 12,
    color: T.foreground,
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: T.radius,
    padding: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  notesText: {
    fontFamily: T.fontRegular,
    fontSize: 11,
    color: T.mutedForeground,
    lineHeight: 16,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: T.radius,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionText: {
    fontFamily: T.fontMedium,
    fontSize: 11,
    fontWeight: '600',
  },
  approveBtn: {
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderColor: 'rgba(52,211,153,0.25)',
  },
  approveText: { color: '#34d399' },
  rejectBtn: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.25)',
  },
  rejectText: { color: '#f87171' },
  advanceBtn: {
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderColor: 'rgba(249,115,22,0.25)',
  },
  advanceText: { color: T.primary },
});
