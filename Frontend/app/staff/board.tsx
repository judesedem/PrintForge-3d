/**
 * BoardScreen — Lab Queue Kanban board.
 * Expo SDK 56 / expo-router v4 compatible.
 *
 * Layout:
 *   Header (52px) — logo | active count | printer pills | refresh + avatar
 *   Board  (flex)  — horizontal ScrollView of 5 KanbanColumns, each vertically scrollable
 *
 * EXPO-ROUTER NOTE:
 *   This screen lives inside a Drawer layout. To open the drawer use the
 *   expo-router useNavigation hook (same API as @react-navigation/native)
 *   because expo-router v4 re-exports it. No separate @react-navigation/drawer
 *   package is needed — expo-router/drawer provides the Drawer navigator.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  useWindowDimensions, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap, RefreshCw } from 'lucide-react-native';
import { useNavigation } from 'expo-router';
// DrawerActions is re-exported by @react-navigation/native which is a
// transitive dep of expo-router/drawer. If TS cannot resolve the types,
// we define our own minimal helper instead.
const openDrawer = (nav: any) => nav.dispatch({ type: 'OPEN_DRAWER' });

import { T } from '@/constants/theme';
import {
  BOARD_COLUMNS,
  INITIAL_BOARD_JOBS,
  BOARD_PRINTERS,
  LOCATION_MAP,
  type BoardJob,
  type JobStatus,
} from '@/constants/boardData';

import { KanbanColumn } from '@/components/board/KanbanColumn';
import { PrinterPill } from '@/components/board/BoardChips';
import { ApproveModal } from '@/components/board/ApproveModal';
import { RejectModal } from '@/components/board/RejectModal';
import { BoardToast } from '@/components/board/BoardToast';

const HEADER_H   = 52;
const COLUMN_GAP = 12;
const BOARD_PAD  = 16;

type ModalState =
  | { type: 'approve'; job: BoardJob }
  | { type: 'reject';  job: BoardJob }
  | null;

interface ToastState {
  visible: boolean;
  message: string;
  jobId:   string;
}

export default function BoardScreen() {
  const { height }  = useWindowDimensions();
  const insets      = useSafeAreaInsets();
  const navigation  = useNavigation();

  const [jobs,       setJobs]       = useState<BoardJob[]>(INITIAL_BOARD_JOBS);
  const [modal,      setModal]      = useState<ModalState>(null);
  const [toast,      setToast]      = useState<ToastState>({ visible: false, message: '', jobId: '' });
  const [refreshing, setRefreshing] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, jobId: string) => {
    setToast({ visible: true, message, jobId });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3200);
  }, []);

  const jobsByStatus = (status: JobStatus) =>
    jobs.filter(j => j.status === status);

  const totalActive = jobs.filter(j => j.status !== 'COLLECTED').length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApprove = useCallback((job: BoardJob) => {
    setModal({ type: 'approve', job });
  }, []);

  const handleReject = useCallback((job: BoardJob) => {
    setModal({ type: 'reject', job });
  }, []);

  const handleAdvance = useCallback((job: BoardJob, to: JobStatus) => {
    const labels: Record<JobStatus, string> = {
      SUBMITTED: 'Submitted',
      APPROVED:  'Approved',
      PRINTING:  'Printing',
      READY:     'Ready for Pickup',
      COLLECTED: 'Collected',
    };
    setJobs(prev =>
      prev.map(j => {
        if (j.id !== job.id) return j;
        return {
          ...j,
          status: to,
          pickupLocation:
            to === 'READY'
              ? j.assignedPrinter
                ? (LOCATION_MAP[j.assignedPrinter] ?? 'Design Studio')
                : 'Design Studio'
              : j.pickupLocation,
        };
      })
    );
    showToast(`Moved to ${labels[to]}`, job.id);
  }, [showToast]);

  const confirmApprove = useCallback((printerName: string) => {
    if (!modal || modal.type !== 'approve') return;
    const job = modal.job;
    setJobs(prev =>
      prev.map(j =>
        j.id !== job.id
          ? j
          : { ...j, status: 'APPROVED', assignedPrinter: printerName || undefined }
      )
    );
    setModal(null);
    showToast('Job approved', job.id);
  }, [modal, showToast]);

  const confirmReject = useCallback((_reason: string) => {
    if (!modal || modal.type !== 'reject') return;
    const job = modal.job;
    setJobs(prev => prev.filter(j => j.id !== job.id));
    setModal(null);
    showToast('Job rejected', job.id);
  }, [modal, showToast]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: refetch from GET /api/print-jobs/queue
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  // ── Layout ────────────────────────────────────────────────────────────────

  const boardH  = height - HEADER_H - insets.top;
  const columnH = boardH - BOARD_PAD * 2;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>

        {/* Logo / drawer trigger */}
        <TouchableOpacity
          onPress={() => openDrawer(navigation)}
          style={s.logoRow}
          activeOpacity={0.7}
        >
          <View style={s.logoBox}>
            <Zap size={13} color="#fff" strokeWidth={2.5} />
          </View>
          <Text style={s.logoName}>PrintForge</Text>
          <View style={s.vDivider} />
          <Text style={s.logoSub}>Queue Board</Text>
        </TouchableOpacity>

        <View style={s.vDivider} />

        {/* Active count */}
        <View style={s.activeRow}>
          <Text style={s.activeLabel}>Active</Text>
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeText}>{totalActive}</Text>
          </View>
        </View>

        <View style={s.vDivider} />

        {/* Printer pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.pillsScroll}
          contentContainerStyle={s.pillsContent}
        >
          {BOARD_PRINTERS.map(p => (
            <PrinterPill key={p.id} printer={p} />
          ))}
        </ScrollView>

        {/* Refresh + avatar */}
        <View style={s.headerRight}>
          <TouchableOpacity
            onPress={handleRefresh}
            style={s.refreshBtn}
            activeOpacity={0.7}
          >
            {refreshing
              ? <ActivityIndicator size={11} color={T.mutedForeground} />
              : <RefreshCw size={11} color={T.mutedForeground} />
            }
            <Text style={s.refreshText}>Refresh</Text>
          </TouchableOpacity>

          <View style={s.avatar}>
            <Text style={s.avatarText}>A</Text>
          </View>
        </View>
      </View>

      {/* ── Board ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={Platform.OS === 'web'}
        style={s.boardScroll}
        contentContainerStyle={[
          s.boardContent,
          { paddingBottom: insets.bottom + BOARD_PAD },
        ]}
      >
        {BOARD_COLUMNS.map(col => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            jobs={jobsByStatus(col.status)}
            height={columnH}
            onApprove={handleApprove}
            onReject={handleReject}
            onAdvance={handleAdvance}
          />
        ))}
      </ScrollView>

      {/* ── Modals ── */}
      {modal?.type === 'approve' && (
        <ApproveModal
          visible
          job={modal.job}
          printers={BOARD_PRINTERS}
          onConfirm={confirmApprove}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'reject' && (
        <RejectModal
          visible
          job={modal.job}
          onConfirm={confirmReject}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Toast ── */}
      <BoardToast {...toast} />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.background,
  },

  // Header
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#0A0D14',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  logoBox: {
    width: 24,
    height: 24,
    borderRadius: T.radius,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoName: {
    fontFamily: T.fontBold,
    fontSize: 14,
    color: T.foreground,
    letterSpacing: -0.3,
  },
  logoSub: {
    fontFamily: T.fontRegular,
    fontSize: 11,
    color: T.mutedForeground,
  },
  vDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  activeLabel: {
    fontFamily: T.fontRegular,
    fontSize: 11,
    color: T.mutedForeground,
  },
  activeBadge: {
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.20)',
    borderRadius: T.radius,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: T.monoRegular,
    fontSize: 11,
    fontWeight: '700',
    color: T.primary,
  },
  pillsScroll: { flex: 1 },
  pillsContent: {
    gap: 6,
    alignItems: 'center',
    paddingVertical: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: T.radius,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  refreshText: {
    fontFamily: T.fontRegular,
    fontSize: 11,
    color: T.mutedForeground,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: T.fontBold,
    fontSize: 12,
    color: '#fff',
  },

  // Board
  boardScroll: { flex: 1 },
  boardContent: {
    padding: BOARD_PAD,
    gap: COLUMN_GAP,
    flexDirection: 'row',
  },
});
