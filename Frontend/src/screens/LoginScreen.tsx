import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { Button, Input } from '../components/UI';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: () => void;
  onBack: () => void;
}

export default function LoginScreen({ onLogin, onRegister, onBack }: LoginScreenProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Make Android's hardware/gesture back button do the same thing as
  // the visible "← Back" button, instead of the OS default (which could
  // exit the screen unpredictably and feel inconsistent with the UI).
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true; // we handled it — don't let Android do its default behavior
    });
    return () => subscription.remove();
  }, [onBack]);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    const ok = await onLogin(email, password);
    setLoading(false);
    if (!ok) setError('Invalid credentials. Try any email with @.');
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

            {/* Back */}
            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Text style={{ color: Colors.accent, fontSize: 20 }}>←</Text>
              <Text style={[Typography.labelMedium, { color: Colors.accent, marginLeft: 6 }]}>Back</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={s.header}>
              <View style={s.logoSmall}>
                <Text style={s.logoIcon}>◈</Text>
              </View>
              <Text style={[Typography.displayLarge, { color: Colors.textPrimary, marginTop: 20 }]}>Welcome back</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 6 }]}>
                Sign in to your PrintForge 3D account
              </Text>
            </View>

            {/* Demo hint */}
            <View style={s.demoHint}>
              <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                💡 Demo: use any email with @ · add "staff" or "admin" for different roles
              </Text>
            </View>

            {/* Form */}
            <View style={s.form}>
              {error ? (
                <View style={s.errorBox}>
                  <Text style={[Typography.bodySmall, { color: Colors.error }]}>{error}</Text>
                </View>
              ) : null}

              <Input
                label="Email address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@knust.edu.gh"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
              />

              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.showPass}>
                <Text style={[Typography.caption, { color: Colors.accent }]}>
                  {showPassword ? 'Hide password' : 'Show password'}
                </Text>
              </TouchableOpacity>

              <Button
                label="Sign In"
                onPress={handleLogin}
                loading={loading}
                size="lg"
                style={{ marginTop: Spacing.md }}
              />

              <TouchableOpacity style={s.forgotBtn}>
                <Text style={[Typography.labelMedium, { color: Colors.textSecondary }]}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Register link */}
            <View style={s.registerRow}>
              <Text style={[Typography.bodyMedium, { color: Colors.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={onRegister}>
                <Text style={[Typography.labelLarge, { color: Colors.accent }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

type ThemeColors = {
  background: string; surface: string; surfaceElevated: string; border: string;
  accent: string; textPrimary: string; textSecondary: string; textMuted: string;
  error: string; errorBg: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  header: { alignItems: 'flex-start', marginBottom: Spacing.lg },
  logoSmall: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { fontSize: 26, color: Colors.accent },
  demoHint: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  form: { gap: 0 },
  errorBox: {
    backgroundColor: Colors.errorBg, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.error + '44',
  },
  showPass: { alignItems: 'flex-end', marginTop: -8, marginBottom: Spacing.sm },
  forgotBtn: { alignItems: 'center', marginTop: Spacing.md },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
});
