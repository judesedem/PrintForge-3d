// PrintForge 3D — About Modal
// Holds the app/competition/team credits that used to live in the personal
// Profile header. Opened from Profile → Support → "About PrintForge 3D".

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: AboutModalProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <SafeAreaView style={s.sheet}>
          <View style={s.handle} />

          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <View style={s.logoMark}>
              <Text style={s.logoIcon}>◈</Text>
            </View>

            <Text style={[Typography.displayMedium, { color: Colors.textPrimary, textAlign: 'center', marginTop: Spacing.md }]}>
              PrintForge 3D
            </Text>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              Version 1.0.0
            </Text>

            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 22 }]}>
              A 3D print job management platform — submit jobs, track their progress through the queue, and manage lab printers all in one place.
            </Text>

            <View style={s.divider} />

            <Text style={[Typography.labelSmall, { color: Colors.textMuted, marginBottom: Spacing.sm }]}>
              BUILT FOR
            </Text>
            <Text style={[Typography.bodyMedium, { color: Colors.textPrimary }]}>
              CodeQuest 2026
            </Text>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
              KNUST — Kwame Nkrumah University of Science and Technology
            </Text>

            <View style={s.divider} />

            <Text style={[Typography.labelSmall, { color: Colors.textMuted, marginBottom: Spacing.sm }]}>
              TEAM
            </Text>
            <Text style={[Typography.bodyMedium, { color: Colors.textPrimary }]}>
              Group 42
            </Text>

            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={[Typography.labelLarge, { color: Colors.background }]}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

type ThemeColors = {
  background: string; surface: string; border: string; accent: string; accentGlow: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  logoMark: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1.5, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { fontSize: 28, color: Colors.accent },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    width: '100%',
    marginVertical: Spacing.lg,
  },
  closeBtn: {
    marginTop: Spacing.xl,
    width: '100%',
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
