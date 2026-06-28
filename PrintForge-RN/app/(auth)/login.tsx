import { useRouter } from 'expo-router';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Mail, Lock, Printer } from 'lucide-react-native';
import { useState } from 'react';
import { useTheme } from '../../src/ThemeContext';
import { Colors } from '../../src/theme';

const roles = ['Student', 'Designer', 'Lab Staff', 'Admin'] as const;

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [selectedRole, setSelectedRole] = useState('Student');
  const s = makeStyles(colors);

  const targetRoute = selectedRole === 'Designer'
    ? '/(app)/dashboard?role=designer'
    : selectedRole === 'Lab Staff'
      ? '/staff/queue'
      : selectedRole === 'Admin'
        ? '/admin'
        : '/(app)/dashboard?role=student';

  return (
    <View style={s.container}>
      <View style={s.card}>
        <View style={s.logoRow}>
          <Printer size={24} color={colors.primary} />
          <Text style={s.logoText}>PrintForge</Text>
        </View>
        <View style={s.inputGroup}>
          <View style={s.fieldRow}>
            <Mail size={18} color={colors.mutedFg} style={s.fieldIcon} />
            <TextInput placeholder="Email" placeholderTextColor={colors.mutedFg} style={s.input} keyboardType="email-address" />
          </View>
          <View style={s.fieldRow}>
            <Lock size={18} color={colors.mutedFg} style={s.fieldIcon} />
            <TextInput placeholder="Password" placeholderTextColor={colors.mutedFg} style={s.input} secureTextEntry />
          </View>
        </View>
        <View style={s.rolesGrid}>
          {roles.map(role => {
            const active = role === selectedRole;
            return (
              <Pressable key={role} onPress={() => setSelectedRole(role)} style={[s.roleTile, active && s.roleTileActive]}>
                <Text style={[s.roleText, active && { color: colors.primary }]}>{role}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={s.button} onPress={() => router.replace(targetRoute as any)}>
          <Text style={s.buttonText}>Sign In</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(auth)/register')} style={s.linkRow}>
          <Text style={s.linkText}>No account? Create one</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 16 },
    card: { width: '100%', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 24, gap: 16 },
    logoRow: { alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
    logoText: { color: colors.foreground, fontSize: 28, fontWeight: '700' },
    inputGroup: { gap: 12 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
    fieldIcon: { marginRight: 10 },
    input: { flex: 1, color: colors.foreground, height: 48 },
    rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    roleTile: { width: '48%', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary },
    roleTileActive: { backgroundColor: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.5)' },
    roleText: { color: colors.foreground, fontSize: 15, textAlign: 'center' },
    button: { backgroundColor: colors.primary, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: '700' },
    linkRow: { marginTop: 6, alignSelf: 'center' },
    linkText: { color: colors.primary },
  });
}
