// components/board/ApproveModal.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Pressable,
} from 'react-native';
import { Check, X, Printer } from 'lucide-react-native';
import { T } from '@/constants/theme';
import type { BoardJob, BoardPrinter } from '@/constants/boardData';

interface ApproveModalProps {
  visible:   boolean;
  job:       BoardJob;
  printers:  BoardPrinter[];
  onConfirm: (printerName: string) => void;
  onClose:   () => void;
}

export function ApproveModal({ visible, job, printers, onConfirm, onClose }: ApproveModalProps) {
  const [selected, setSelected] = useState('');
  const available = printers.filter(p => p.status === 'AVAILABLE' || p.status === 'BUSY');

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.iconTile}>
              <Check size={14} color="#34d399" strokeWidth={2.5} />
            </View>
            <View style={s.headerText}>
              <Text style={s.title}>Approve job</Text>
              <Text style={s.sub}>{job.id} · {job.user}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={16} color={T.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Printer picker */}
          <Text style={s.sectionLabel}>Assign printer (optional)</Text>
          <ScrollView style={s.printerList} showsVerticalScrollIndicator={false}>
            {available.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[s.printerRow, selected === p.name && s.printerRowSelected]}
                onPress={() => setSelected(p.name === selected ? '' : p.name)}
                activeOpacity={0.8}
              >
                <Printer size={13} color={selected === p.name ? T.primary : T.mutedForeground} />
                <View style={s.printerInfo}>
                  <Text style={[s.printerName, selected === p.name && s.printerNameSelected]}>
                    {p.name}
                  </Text>
                  <Text style={s.printerLocation}>{p.location}</Text>
                </View>
                {selected === p.name && (
                  <Check size={13} color={T.primary} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onClose}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.confirmBtn]}
              onPress={() => onConfirm(selected)}
            >
              <Check size={13} color="#34d399" strokeWidth={2.5} />
              <Text style={s.confirmText}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: T.card,
    borderRadius: T.radius,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  iconTile: {
    width: 32, height: 32,
    borderRadius: T.radius,
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: T.fontMedium,
    fontSize: 14,
    color: T.foreground,
    fontWeight: '600',
  },
  sub: {
    fontFamily: T.monoRegular,
    fontSize: 11,
    color: T.mutedForeground,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: T.fontRegular,
    fontSize: 10,
    color: T.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  printerList: { maxHeight: 200, paddingHorizontal: 12 },
  printerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: T.radius,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  printerRowSelected: {
    backgroundColor: 'rgba(249,115,22,0.06)',
    borderColor: 'rgba(249,115,22,0.20)',
  },
  printerInfo: { flex: 1 },
  printerName: {
    fontFamily: T.fontMedium,
    fontSize: 12,
    color: T.foreground,
    fontWeight: '500',
  },
  printerNameSelected: { color: T.primary },
  printerLocation: {
    fontFamily: T.fontRegular,
    fontSize: 11,
    color: T.mutedForeground,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: T.radius,
    borderWidth: 1,
  },
  cancelBtn: { borderColor: T.border },
  cancelText: { fontFamily: T.fontRegular, fontSize: 12, color: T.mutedForeground },
  confirmBtn: {
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderColor: 'rgba(52,211,153,0.25)',
  },
  confirmText: { fontFamily: T.fontMedium, fontSize: 12, color: '#34d399', fontWeight: '600' },
});
