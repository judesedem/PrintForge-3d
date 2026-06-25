import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme, ThemeMode } from '../hooks/useTheme';
import { User } from '../types';
import { Card, Divider } from '../components/UI';
import { AboutModal } from '../components/AboutModal';
import { MOCK_JOBS } from '../constants/mockData';

interface ProfileScreenProps {
  user: User;
  onLogout: () => void;
  onSwitchRole: (role: any) => void;
}

export default function ProfileScreen({ user, onLogout, onSwitchRole }: ProfileScreenProps) {
  const { Colors, mode, setMode } = useTheme();
  const s = styles(Colors);
  const [aboutVisible, setAboutVisible] = useState(false);

  const myJobs = MOCK_JOBS.filter(j => j.user_id === 'u1');
  const stats = {
    total: myJobs.length,
    completed: myJobs.filter(j => j.status === 'completed').length,
    active: myJobs.filter(j => ['submitted', 'approved', 'queued', 'printing'].includes(j.status)).length,
  };

  const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const roleLabel = user.role === 'lab_staff' ? 'Lab Staff' : user.role === 'admin' ? 'Administrator' : 'Student';
  const roleColor = user.role === 'admin' ? Colors.warning : user.role === 'lab_staff' ? Colors.info : Colors.accent;

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar & name */}
          <View style={s.avatarSection}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <Text style={[Typography.displayMedium, { color: Colors.textPrimary, marginTop: Spacing.md }]}>
              {user.full_name}
            </Text>
            <View style={[s.roleBadge, { backgroundColor: roleColor + '22', borderColor: roleColor + '55' }]}>
              <Text style={[Typography.labelSmall, { color: roleColor }]}>{roleLabel.toUpperCase()}</Text>
            </View>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 4 }]}>{user.email}</Text>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <StatItem label="Total Jobs" value={stats.total} />
            <View style={s.statDivider} />
            <StatItem label="Completed" value={stats.completed} />
            <View style={s.statDivider} />
            <StatItem label="Active" value={stats.active} />
          </View>

          {/* Settings list */}
          <View style={s.section}>
            <Text style={[Typography.labelSmall, { color: Colors.textMuted, marginBottom: Spacing.sm }]}>ACCOUNT</Text>
            <Card elevated style={{ flexDirection: 'column', gap: 0, padding: 0 }}>
              <SettingsRow icon="👤" label="Edit Profile" />
              <Divider style={{ marginVertical: 0 }} />
              <SettingsRow icon="🔔" label="Notification Preferences" />
              <Divider style={{ marginVertical: 0 }} />
              <SettingsRow icon="🔒" label="Change Password" />
            </Card>
          </View>

          {/* Appearance — the actual theme toggle */}
          <View style={s.section}>
            <Text style={[Typography.labelSmall, { color: Colors.textMuted, marginBottom: Spacing.sm }]}>APPEARANCE</Text>
            <Card elevated style={{ flexDirection: 'column', gap: 0, padding: Spacing.md }}>
              <Text style={[Typography.bodyMedium, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>
                Theme
              </Text>
              <View style={s.themeRow}>
                <ThemeOption label="Dark" value="dark" current={mode} onSelect={setMode} Colors={Colors} />
                <ThemeOption label="Light" value="light" current={mode} onSelect={setMode} Colors={Colors} />
              </View>
              {/* "System" mode is supported in useTheme() but hidden here —
                  Appearance.getColorScheme() is unreliable inside Expo Go
                  specifically (a known Expo Go limitation, not app code).
                  Safe to re-add this row once testing on an EAS/standalone
                  build, where the OS bridge reports correctly. */}
            </Card>
          </View>

          <View style={s.section}>
            <Text style={[Typography.labelSmall, { color: Colors.textMuted, marginBottom: Spacing.sm }]}>DEMO — SWITCH ROLE</Text>
            <Card elevated style={{ flexDirection: 'column', gap: 0, padding: 0 }}>
              <SettingsRow icon="🎓" label="Switch to Student" onPress={() => onSwitchRole('student')} />
              <Divider style={{ marginVertical: 0 }} />
              <SettingsRow icon="🔧" label="Switch to Lab Staff" onPress={() => onSwitchRole('lab_staff')} />
              <Divider style={{ marginVertical: 0 }} />
              <SettingsRow icon="⚙️" label="Switch to Admin" onPress={() => onSwitchRole('admin')} />
            </Card>
          </View>

          <View style={s.section}>
            <Text style={[Typography.labelSmall, { color: Colors.textMuted, marginBottom: Spacing.sm }]}>SUPPORT</Text>
            <Card elevated style={{ flexDirection: 'column', gap: 0, padding: 0 }}>
              <SettingsRow icon="❓" label="Help & FAQ" />
              <Divider style={{ marginVertical: 0 }} />
              <SettingsRow icon="📧" label="Contact Lab Staff" />
              <Divider style={{ marginVertical: 0 }} />
              <SettingsRow icon="ℹ️" label="About PrintForge 3D" onPress={() => setAboutVisible(true)} />
            </Card>
          </View>

          {/* Sign out */}
          <TouchableOpacity style={s.signOutBtn} onPress={onLogout} activeOpacity={0.8}>
            <Text style={{ fontSize: 18 }}>🚪</Text>
            <Text style={[Typography.labelLarge, { color: Colors.error, marginLeft: 10 }]}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={[Typography.caption, { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md }]}>
            PrintForge 3D v1.0.0
          </Text>

        </ScrollView>
      </SafeAreaView>

      <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  const { Colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[Typography.displayMedium, { color: Colors.accent }]}>{value}</Text>
      <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  return (
    <TouchableOpacity style={s.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={[Typography.bodyMedium, { color: Colors.textPrimary, flex: 1, marginLeft: Spacing.md }]}>{label}</Text>
      <Text style={{ color: Colors.textMuted, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

// Small pill-style selector used inside the Appearance card. Takes Colors
// as a prop rather than calling useTheme() itself, purely to avoid an
// extra hook call for such a tiny piece — either approach is fine.
function ThemeOption({
  label, value, current, onSelect, Colors,
}: {
  label: string; value: ThemeMode; current: ThemeMode; onSelect: (m: ThemeMode) => void; Colors: any;
}) {
  const active = current === value;
  return (
    <TouchableOpacity
      onPress={() => onSelect(value)}
      activeOpacity={0.8}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: Radius.md,
        alignItems: 'center',
        backgroundColor: active ? Colors.accent : Colors.surface,
        borderWidth: 1,
        borderColor: active ? Colors.accent : Colors.border,
        marginHorizontal: 3,
      }}
    >
      <Text style={[
        Typography.labelMedium,
        { color: active ? Colors.background : Colors.textSecondary },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type ThemeColors = {
  background: string; surface: string; border: string; accent: string;
  accentGlow: string; error: string; errorBg: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  avatarSection: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.accentGlow, borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.accent },
  roleBadge: {
    marginTop: 8, borderRadius: Radius.full, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  statDivider: { width: 1, backgroundColor: Colors.border },
  section: { marginBottom: Spacing.lg },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  themeRow: {
    flexDirection: 'row',
    marginHorizontal: -3,
  },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.error + '55',
    backgroundColor: Colors.errorBg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
});
