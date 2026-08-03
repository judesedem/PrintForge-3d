// components/board/RejectModal.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Pressable, KeyboardAvoidingView,
} from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { T } from '@/constants/theme';
import type { BoardJob } from '@/constants/boardData';
import { KEYBOARD_AVOIDING_BEHAVIOR } from '@/components/KeyboardAwareScreen';

interface RejectModalProps {
  visible:   boolean;
  job:       BoardJob;
  onConfirm: (reason: string) => void;
  onClose:   () => void;
}

export function RejectModal({ visible, job, onConfirm, onClose }: RejectModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.iconTile}>
              <AlertTriangle size={14} color="#f87171" strokeWidth={2.5} />
            </View>
            <View style={s.headerText}>
              <Text style={s.title}>Reject job</Text>
              <Text style={s.sub}>{job.id} · {job.user}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={16} color={T.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Reason input */}
          <View style={s.body}>
            <Text style={s.label}>Reason (optional)</Text>
            <TextInput
              style={s.input}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Non-manifold geometry detected. Fix and resubmit."
              placeholderTextColor={T.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              selectionColor={T.primary}
              maxLength={500}
            />
            <Text style={s.charCount}>{reason.length} / 500</Text>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onClose}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.rejectBtn]} onPress={handleConfirm}>
              <Text style={s.rejectText}>Reject job</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.20)',
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
  body: {
    padding: 16,
    gap: 8,
  },
  label: {
    fontFamily: T.fontRegular,
    fontSize: 10,
    color: T.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius,
    padding: 10,
    color: T.foreground,
    fontFamily: T.fontRegular,
    fontSize: 13,
    minHeight: 80,
  },
  charCount: {
    fontFamily: T.fontRegular,
    fontSize: 10,
    color: T.mutedForeground,
    textAlign: 'right',
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: T.radius,
    borderWidth: 1,
  },
  cancelBtn: { borderColor: T.border },
  cancelText: { fontFamily: T.fontRegular, fontSize: 12, color: T.mutedForeground },
  rejectBtn: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.25)',
  },
  rejectText: {
    fontFamily: T.fontMedium,
    fontSize: 12,
    color: '#f87171',
    fontWeight: '600',
  },
});
