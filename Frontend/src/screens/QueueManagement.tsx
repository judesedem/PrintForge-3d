// PrintForge 3D — QueueManagement screen
// Staff / admin: view the live print queue with drag-to-reorder.
// Uses react-native-draggable-flatlist (add to package.json) for smooth
// gesture-based reordering, then calls PUT /api/queue/reorder on release.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { StatusBadge } from '../components/UI';
import { apiGetQueue, apiReorderQueue, apiRemoveFromQueue, QueueEntry } from '../services/api';
import { PrintJob } from '../types';

interface QueueManagementProps {
  onBack: () => void;
  onJobPress: (job: PrintJob) => void;
}

// ─── Queue Item Card ────────────────────────────────────────────────────────

interface QueueItemProps extends RenderItemParams<QueueEntry> {
  onRemove: (jobId: string) => void;
}

function QueueItem({ item, drag, isActive, getIndex, onRemove }: QueueItemProps) {
  const index = getIndex();
  const pos = index !== undefined ? index + 1 : item.position;

  return (
    <ScaleDecorator>
      <View
        style={[
          styles.queueCard,
          isActive && styles.queueCardDragging,
        ]}
      >
        {/* Position badge */}
        <View style={styles.positionBadge}>
          <Text style={styles.positionText}>#{pos}</Text>
        </View>

        {/* Job info */}
        <View style={{ flex: 1, marginHorizontal: Spacing.sm }}>
          <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]} numberOfLines={1}>
            {item.job.file_name}
          </Text>
          <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
            {item.job.user_name} · {item.job.material} · {item.job.color}
          </Text>
          {item.job.estimated_time && (
            <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>
              ⏱ {Math.floor(item.job.estimated_time / 60)}h {item.job.estimated_time % 60}m
            </Text>
          )}
        </View>

        <View style={styles.cardActions}>
          <StatusBadge status={item.job.status} />

          {/* Remove button */}
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => {
              Alert.alert(
                'Remove from Queue',
                `Remove "${item.job.file_name}" from the print queue?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => onRemove(item.job_id),
                  },
                ],
              );
            }}
          >
            <Text style={{ color: Colors.error, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>

          {/* Drag handle */}
          <TouchableOpacity
            style={styles.dragHandle}
            onLongPress={drag}
            delayLongPress={150}
          >
            <Text style={{ color: Colors.textMuted, fontSize: 18 }}>⠿</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScaleDecorator>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function QueueManagement({ onBack, onJobPress }: QueueManagementProps) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load queue ──────────────────────────────────────────────────────────

  const loadQueue = useCallback(async () => {
    try {
      setError(null);
      const data = await apiGetQueue();
      // Sort by current position so UI matches server order
      setQueue(data.sort((a, b) => a.position - b.position));
    } catch (e: any) {
      setError(e.message ?? 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    // Poll every 30s so staff see live updates
    const interval = setInterval(loadQueue, 30_000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  // ── Drag-to-reorder ─────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    ({ data }: { data: QueueEntry[] }) => {
      // Optimistic update
      setQueue(data);

      // Debounce: wait until user stops re-ordering before hitting server
      if (pendingSave.current) clearTimeout(pendingSave.current);
      pendingSave.current = setTimeout(async () => {
        setSaving(true);
        try {
          await apiReorderQueue(data.map(e => e.job_id));
        } catch (e: any) {
          Alert.alert('Save Failed', e.message ?? 'Could not save new order. Please try again.');
          // Revert to server order
          loadQueue();
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [loadQueue],
  );

  // ── Remove from queue ───────────────────────────────────────────────────

  const handleRemove = useCallback(
    async (jobId: string) => {
      try {
        await apiRemoveFromQueue(jobId);
        setQueue(prev => prev.filter(e => e.job_id !== jobId));
      } catch (e: any) {
        Alert.alert('Error', e.message ?? 'Could not remove job from queue.');
      }
    },
    [],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    (params: RenderItemParams<QueueEntry>) => (
      <QueueItem {...params} onRemove={handleRemove} />
    ),
    [handleRemove],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <SafeAreaView style={{ flex: 1 }}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={{ color: Colors.accent, fontSize: 22 }}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.displaySmall, { color: Colors.textPrimary }]}>
                🖨️ Print Queue
              </Text>
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                {queue.length} job{queue.length !== 1 ? 's' : ''} · long-press to reorder
              </Text>
            </View>
            {saving && (
              <View style={styles.savingPill}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <Text style={[Typography.caption, { color: Colors.accent, marginLeft: 6 }]}>
                  Saving…
                </Text>
              </View>
            )}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={[Typography.caption, { color: Colors.textMuted }]}>
              ⠿ Drag handle  ·  ✕ Remove  ·  Tap card for details
            </Text>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 12 }]}>
                Loading queue…
              </Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={{ fontSize: 40 }}>⚠️</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.error, marginTop: 12 }]}>
                {error}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadQueue}>
                <Text style={[Typography.labelLarge, { color: Colors.accent }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : queue.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 12 }]}>
                Queue is empty
              </Text>
            </View>
          ) : (
            <DraggableFlatList
              data={queue}
              keyExtractor={item => item.queue_id}
              renderItem={renderItem}
              onDragEnd={handleDragEnd}
              contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 32 }}
              // Activate drag on the handle press (150ms long press)
              activationDistance={5}
            />
          )}
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.md : 0,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  savingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  legend: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  retryBtn: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },

  // Queue card
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginVertical: Spacing.xs,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  queueCardDragging: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOpacity: 0.3,
    elevation: 12,
    transform: [{ scale: 1.02 }],
  },
  positionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: Colors.accent + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    ...Typography.labelMedium,
    color: Colors.accent,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  removeBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  dragHandle: {
    padding: Spacing.xs,
    marginLeft: 4,
  },
});
