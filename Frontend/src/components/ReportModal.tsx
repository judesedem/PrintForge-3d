import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSession } from '@/SessionContext';
import { useToast } from '@/ToastContext';
import { createReport, ReportTargetType } from '@/api/reports';
import { ApiError } from '@/api/client';
import { Colors, designTokens } from '@/theme';
import { KEYBOARD_AVOIDING_BEHAVIOR } from '@/components/KeyboardAwareScreen';

const MAX_REASON_LENGTH = 1000; // Mirrors ReportService.MAX_REASON_LENGTH server-side.

/**
 * Shared "report this listing/user" form — used by the listing detail
 * screen and the designer public profile. CreateReportRequest only has
 * one free-text field (reason), not a separate reason+details pair
 * (confirmed by reading the DTO directly), so this is a single textarea,
 * not two fields.
 */
export default function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: number;
  colors: Colors;
}) {
  const { token } = useSession();
  const { showToast } = useToast();
  const s = makeStyles(colors);

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    setReason('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!token) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      showToast('Please describe the issue before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await createReport(token, { targetType, targetId, reason: trimmed });
      showToast('Report submitted — thanks for flagging this.');
      setReason('');
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.keyboardView} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
        <Pressable style={s.overlay} onPress={handleClose}>
          <Pressable onPress={e => e.stopPropagation()} style={s.sheet}>
            <View style={s.dragHandle} />
            <View style={s.titleRow}>
              <Text style={s.title}>Report {targetType === 'USER' ? 'user' : 'listing'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose} style={s.closeBtn}>
                <X size={20} color={colors.mutedFg} />
              </Pressable>
            </View>
            <Text style={s.subtitle}>
              Tell us what's wrong. A moderator will review this before any action is taken.
            </Text>
            <TextInput
              style={s.textarea}
              placeholder="What's the issue?"
              placeholderTextColor={colors.mutedFg}
              value={reason}
              onChangeText={t => setReason(t.slice(0, MAX_REASON_LENGTH))}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!submitting}
            />
            <Text style={s.charCount}>{reason.length}/{MAX_REASON_LENGTH}</Text>
            <TouchableOpacity
              style={[s.submitBtn, submitting && s.submitBtnDisabled]}
              activeOpacity={0.8}
              disabled={submitting}
              onPress={handleSubmit}
            >
              <Text style={s.submitText}>{submitting ? 'Submitting…' : 'Submit report'}</Text>
            </TouchableOpacity>
            <Pressable onPress={handleClose} style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    keyboardView: { flex: 1 },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 32,
    },
    dragHandle: {
      width: 40,
      height: 4,
      borderRadius: 9999,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    title: {
      fontSize: 18,
      fontFamily: designTokens.type.heading,
      color: colors.foreground,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 9999,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: colors.mutedFg,
      marginBottom: 16,
    },
    textarea: {
      minHeight: 110,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.foreground,
      backgroundColor: colors.inputBg,
      fontFamily: designTokens.type.body,
      fontSize: 14,
    },
    charCount: {
      fontSize: 11,
      color: colors.mutedFg,
      textAlign: 'right',
      marginTop: 4,
      marginBottom: 16,
    },
    submitBtn: {
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: colors.destructive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitText: {
      color: colors.onPrimary,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    cancelBtn: {
      paddingVertical: 12,
    },
    cancelText: {
      fontSize: 14,
      fontFamily: designTokens.type.medium,
      color: colors.mutedFg,
      textAlign: 'center',
    },
  });
}
