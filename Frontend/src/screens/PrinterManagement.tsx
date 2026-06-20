// PrintForge 3D — PrinterManagement screen
// Admin: view all printers, update status, add new printers, delete.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { Button, Card, Divider } from '../components/UI';
import {
  apiGetPrinters,
  apiUpdatePrinterStatus,
  apiCreatePrinter,
  apiDeletePrinter,
} from '../services/api';
import { Printer } from '../types';

const ALL_STATUSES: Printer['printer_status'][] = ['idle', 'printing', 'maintenance', 'offline'];

// ─── Printer Card ────────────────────────────────────────────────────────────

interface PrinterCardProps {
  printer: Printer;
  onStatusChange: (id: string, status: Printer['printer_status']) => void;
  onDelete: (id: string, name: string) => void;
}

function PrinterCard({ printer, onStatusChange, onDelete }: PrinterCardProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  // Built per-render (was module-level before) since it reads the current
  // theme's palette rather than a fixed import.
  const STATUS_CONFIG: Record<Printer['printer_status'], { icon: string; color: string; label: string }> = {
    idle:        { icon: '🟢', color: Colors.success,   label: 'Idle' },
    printing:    { icon: '🔵', color: Colors.accent,    label: 'Printing' },
    maintenance: { icon: '🟡', color: Colors.warning,   label: 'Maintenance' },
    offline:     { icon: '⚫', color: Colors.textMuted, label: 'Offline' },
  };

  const cfg = STATUS_CONFIG[printer.printer_status];
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={s.printerCard} accentLeft={cfg.color}>
      <TouchableOpacity
        style={s.printerHeader}
        onPress={() => setExpanded(p => !p)}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]}>
            {printer.printer_name}
          </Text>
          <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
            📍 {printer.lab_location}
          </Text>
          {printer.current_job && (
            <Text style={[Typography.caption, { color: Colors.accent, marginTop: 2 }]}>
              ▶ {printer.current_job}
            </Text>
          )}
        </View>
        <View style={[s.statusPillBase, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '40' }]}>
          <Text style={{ fontSize: 12 }}>{cfg.icon}</Text>
          <Text style={[Typography.labelSmall, { color: cfg.color, marginLeft: 4 }]}>
            {cfg.label}
          </Text>
        </View>
        <Text style={{ color: Colors.textMuted, marginLeft: Spacing.sm, fontSize: 16 }}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <>
          <Divider />
          <View style={s.expandedSection}>
            <Text style={[Typography.labelSmall, { color: Colors.textMuted, marginBottom: Spacing.sm }]}>
              CHANGE STATUS
            </Text>
            <View style={s.statusRow}>
              {ALL_STATUSES.map(st => {
                const c = STATUS_CONFIG[st];
                const active = printer.printer_status === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[s.statusBtn, active && { borderColor: c.color, backgroundColor: c.color + '18' }]}
                    onPress={() => !active && onStatusChange(printer.printer_id, st)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14 }}>{c.icon}</Text>
                    <Text style={[Typography.caption, { color: active ? c.color : Colors.textMuted, marginTop: 2 }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={s.deleteBtn}
              onPress={() => onDelete(printer.printer_id, printer.printer_name)}
            >
              <Text style={[Typography.labelMedium, { color: Colors.error }]}>
                🗑 Remove Printer
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </Card>
  );
}

// ─── Add Printer Modal ───────────────────────────────────────────────────────

interface AddPrinterModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: Omit<Printer, 'printer_id'>) => Promise<void>;
}

function AddPrinterModal({ visible, onClose, onAdd }: AddPrinterModalProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => { setName(''); setLocation(''); };

  const handleAdd = async () => {
    if (!name.trim() || !location.trim()) {
      Alert.alert('Missing Fields', 'Please fill in both printer name and location.');
      return;
    }
    setLoading(true);
    try {
      await onAdd({
        printer_name: name.trim(),
        lab_location: location.trim(),
        printer_status: 'idle',
      });
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to add printer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={[Typography.displaySmall, { color: Colors.textPrimary, marginBottom: Spacing.lg }]}>
            Add New Printer
          </Text>

          <Text style={s.inputLabel}>Printer Name</Text>
          <TextInput
            style={s.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Bambu Lab P1S"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={[s.inputLabel, { marginTop: Spacing.md }]}>Lab Location</Text>
          <TextInput
            style={s.textInput}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Bay E — Engineering Lab"
            placeholderTextColor={Colors.textMuted}
          />

          <View style={s.modalActions}>
            <Button label="Cancel" variant="ghost" onPress={() => { reset(); onClose(); }} style={{ flex: 1 }} />
            <Button label="Add Printer" onPress={handleAdd} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

interface PrinterManagementProps {
  onBack: () => void;
}

export default function PrinterManagement({ onBack }: PrinterManagementProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  // Same per-render config as PrinterCard, needed here for the summary row.
  const STATUS_CONFIG: Record<Printer['printer_status'], { icon: string; color: string; label: string }> = {
    idle:        { icon: '🟢', color: Colors.success,   label: 'Idle' },
    printing:    { icon: '🔵', color: Colors.accent,    label: 'Printing' },
    maintenance: { icon: '🟡', color: Colors.warning,   label: 'Maintenance' },
    offline:     { icon: '⚫', color: Colors.textMuted, label: 'Offline' },
  };

  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const loadPrinters = useCallback(async () => {
    try {
      setError(null);
      const data = await apiGetPrinters();
      setPrinters(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load printers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrinters(); }, [loadPrinters]);

  // ── Status change ─────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    async (id: string, status: Printer['printer_status']) => {
      // Optimistic update
      setPrinters(prev => prev.map(p => p.printer_id === id ? { ...p, printer_status: status } : p));
      try {
        await apiUpdatePrinterStatus(id, status);
      } catch (e: any) {
        Alert.alert('Error', e.message ?? 'Status update failed.');
        loadPrinters(); // revert
      }
    },
    [loadPrinters],
  );

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        'Remove Printer',
        `Are you sure you want to remove "${name}" from the system?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await apiDeletePrinter(id);
                setPrinters(prev => prev.filter(p => p.printer_id !== id));
              } catch (e: any) {
                Alert.alert('Error', e.message ?? 'Could not delete printer.');
              }
            },
          },
        ],
      );
    },
    [],
  );

  // ── Add new ───────────────────────────────────────────────────────────────

  const handleAdd = useCallback(async (data: Omit<Printer, 'printer_id'>) => {
    const created = await apiCreatePrinter(data);
    setPrinters(prev => [...prev, created]);
  }, []);

  // ── Summary counts ────────────────────────────────────────────────────────

  const counts = printers.reduce(
    (acc, p) => { acc[p.printer_status] = (acc[p.printer_status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Text style={{ color: Colors.accent, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.displaySmall, { color: Colors.textPrimary }]}>
              🖨️ Printers
            </Text>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
              {printers.length} printer{printers.length !== 1 ? 's' : ''} registered
            </Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={[Typography.labelLarge, { color: Colors.background }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Status summary row */}
        <View style={s.summaryRow}>
          {ALL_STATUSES.map(st => {
            const cfg = STATUS_CONFIG[st];
            return (
              <View key={st} style={s.summaryChip}>
                <Text style={{ fontSize: 14 }}>{cfg.icon}</Text>
                <Text style={[Typography.caption, { color: cfg.color, marginLeft: 4 }]}>
                  {counts[st] ?? 0} {cfg.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Content */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : error ? (
          <View style={s.center}>
            <Text style={{ fontSize: 40 }}>⚠️</Text>
            <Text style={[Typography.bodyMedium, { color: Colors.error, marginTop: 12 }]}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadPrinters}>
              <Text style={[Typography.labelLarge, { color: Colors.accent }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: Spacing.md, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {printers.map(p => (
              <PrinterCard
                key={p.printer_id}
                printer={p}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
            {printers.length === 0 && (
              <View style={s.center}>
                <Text style={{ fontSize: 48 }}>🖨️</Text>
                <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 12 }]}>
                  No printers registered yet.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <AddPrinterModal visible={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAdd} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

type ThemeColors = {
  background: string; surface: string; surfaceElevated: string; border: string;
  accent: string; error: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  backBtn: { padding: Spacing.xs, marginRight: Spacing.xs },
  addBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  retryBtn: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },

  // Printer card
  printerCard: { marginVertical: Spacing.xs },
  printerHeader: { flexDirection: 'row', alignItems: 'center' },
  // Was a style-factory function taking `color` before (statusPillFactory);
  // now a static base style, with the color-dependent bits applied inline
  // via the array-style syntax at each call site (see PrinterCard above).
  statusPillBase: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  expandedSection: { paddingTop: Spacing.md },
  statusRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  statusBtn: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 64,
  },
  deleteBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  inputLabel: { ...Typography.labelMedium, color: Colors.textSecondary, marginBottom: Spacing.xs },
  textInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    ...Typography.bodyMedium,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
});
