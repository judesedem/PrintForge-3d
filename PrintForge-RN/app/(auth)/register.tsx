import { useRouter } from 'expo-router';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Mail, Lock, Printer } from 'lucide-react-native';
import { useState } from 'react';
import { useTheme } from '../../src/ThemeContext';
import { Colors } from '../../src/theme';

const roles = ['Student', 'Designer', 'Lab Staff', 'Admin'] as const;
const roleDesc: Record<string, string> = {
  Student: 'Access print services and history',
  Designer: 'Manage studio listings',
  'Lab Staff': 'Review and dispatch jobs',
  Admin: 'Admin controls for platform operations',
};

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [selectedRole, setSelectedRole] = useState('Student');
  const s = makeStyles(colors);

  const targetRoute = selectedRole === 'Designer'
    ? '/(app)/dashboard?role=designer'
    : selectedRole === 'Lab Staff' ? '/staff/queue'
    : selectedRole === 'Admin' ? '/admin'
    : '/(app)/dashboard?role=student';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={s.container}>
      <View style={s.card}>
        <View style={s.logoRow}>
          <Printer size={24} color={colors.primary} />
          <Text style={s.logoText}>PrintForge</Text>
        </View>
        <View style={s.nameRow}>
          <TextInput placeholder="First Name" placeholderTextColor={colors.mutedFg} style={[s.input, s.nameInput]} />
          <TextInput placeholder="Last Name" placeholderTextColor={colors.mutedFg} style={[s.input, s.nameInput]} />
        </View>
        <View style={s.fieldRow}>
          <Mail size={18} color={colors.mutedFg} style={s.fieldIcon} />
          <TextInput placeholder="University Email" placeholderTextColor={colors.mutedFg} style={s.input} keyboardType="email-address" />
        </View>
        <View style={s.fieldRow}>
          <Lock size={18} color={colors.mutedFg} style={s.fieldIcon} />
          <TextInput placeholder="Student/Staff ID" placeholderTextColor={colors.mutedFg} style={s.input} />
        </View>
        <View style={s.roleList}>
          {roles.map(role => {
            const active = role === selectedRole;
            return (
              <Pressable key={role} onPress={() => setSelectedRole(role)} style={[s.roleCard, active && s.roleCardActive]}>
                <Text style={[s.roleCardTitle, active && { color: colors.primary }]}>{role}</Text>
                <Text style={s.roleCardSubtitle}>{roleDesc[role]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={s.button} onPress={() => router.replace(targetRoute as any)}>
          <Text style={s.buttonText}>Create Account</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(auth)/login')} style={s.linkRow}>
          <Text style={s.linkText}>Already have an account? Sign in</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { justifyContent: 'center', alignItems: 'center', padding: 16, paddingVertical: 40 },
    card: { width: '100%', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 24, gap: 16 },
    logoRow: { alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
    logoText: { color: colors.foreground, fontSize: 28, fontWeight: '700' },
    nameRow: { flexDirection: 'row', gap: 12 },
    input: { flex: 1, color: colors.foreground, height: 48, paddingHorizontal: 12 },
    nameInput: { backgroundColor: colors.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    fieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
    fieldIcon: { marginRight: 10 },
    roleList: { gap: 10 },
    roleCard: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary },
    roleCardActive: { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.5)' },
    roleCardTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
    roleCardSubtitle: { color: colors.mutedFg, marginTop: 6, lineHeight: 20 },
    button: { backgroundColor: colors.primary, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: '700' },
    linkRow: { marginTop: 6, alignSelf: 'center' },
    linkText: { color: colors.primary },
  });
}
