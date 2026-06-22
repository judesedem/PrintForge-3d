import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar, BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { Button, Input } from '../components/UI';
import { UserRole } from '../types';

interface RegisterScreenProps {
  onRegister: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  onLogin: () => void;
  onBack: () => void;
}

const ROLES: { label: string; value: UserRole; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Student', value: 'student', desc: 'Submit and track print requests', icon: 'school-outline' },
  { label: 'Lab Staff', value: 'lab_staff', desc: 'Review and manage print jobs', icon: 'construct-outline' },
  { label: 'Admin', value: 'admin', desc: 'Oversee labs and all services', icon: 'settings-outline' },
];

export default function RegisterScreen({ onRegister, onLogin, onBack }: RegisterScreenProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Make Android's hardware/gesture back button match the visible
  // "← Back" button instead of doing something inconsistent.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  const handleRegister = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    await onRegister(name, email, password, role);
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Ionicons name="arrow-back" size={18} color={Colors.accent} />
              <Text style={[Typography.labelMedium, { color: Colors.accent, marginLeft: 6 }]}>Back</Text>
            </TouchableOpacity>

            <View style={s.header}>
              <Text style={[Typography.displayLarge, { color: Colors.textPrimary }]}>Create account</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 6 }]}>
                Join PrintForge 3D at KNUST
              </Text>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Text style={[Typography.bodySmall, { color: Colors.error }]}>{error}</Text>
              </View>
            ) : null}

            <Input label="Full name" value={name} onChangeText={setName} placeholder="e.g. Kwame Asante" />
            <Input
              label="Email address" value={email} onChangeText={setEmail}
              placeholder="you@knust.edu.gh" keyboardType="email-address" autoCapitalize="none"
            />
            <Input
              label="Password" value={password} onChangeText={setPassword}
              placeholder="Minimum 6 characters" secureTextEntry
            />

            {/* Role selector */}
            <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginBottom: Spacing.sm }]}>
              I am a...
            </Text>
            <View style={s.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.value}
                  style={[s.roleCard, role === r.value && s.roleCardActive]}
                  onPress={() => setRole(r.value)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={r.icon}
                    size={22}
                    color={role === r.value ? Colors.accent : Colors.textSecondary}
                    style={{ marginBottom: 6 }}
                  />
                  <Text style={[Typography.labelMedium, { color: role === r.value ? Colors.accent : Colors.textPrimary }]}>
                    {r.label}
                  </Text>
                  <Text style={[Typography.caption, { color: Colors.textMuted, textAlign: 'center', marginTop: 3 }]}>
                    {r.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              label="Create Account"
              onPress={handleRegister}
              loading={loading}
              size="lg"
              style={{ marginTop: Spacing.lg }}
            />

            <View style={s.loginRow}>
              <Text style={[Typography.bodyMedium, { color: Colors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={onLogin}>
                <Text style={[Typography.labelLarge, { color: Colors.accent }]}>Sign In</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

type ThemeColors = {
  background: string; surface: string; border: string; accent: string; accentGlow: string;
  textPrimary: string; textSecondary: string; textMuted: string; error: string; errorBg: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  header: { marginBottom: Spacing.lg },
  errorBox: {
    backgroundColor: Colors.errorBg, borderRadius: 10,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.error + '44',
  },
  roleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  roleCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.sm + 4, alignItems: 'center',
  },
  roleCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
});
