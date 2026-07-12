import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { ArrowRight, Box, Circle, Lock, Mail, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { useTheme } from '../../src/ThemeContext';
import { useSession } from '../../src/SessionContext';
import { ApiError } from '../../src/api/client';
import { Colors, designTokens, makeControlStyles } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signInWithGoogle, login, authLoading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const s = makeStyles(colors);
  const controls = makeControlStyles(colors);

  // Role is decided server-side from the account itself, not picked here —
  // land on the shared workspace route and let dashboard/index.tsx redirect
  // based on the real UserDto.role that comes back from the backend.
  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      router.replace('/(app)/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const user = await signInWithGoogle();
    if (user) {
      router.replace('/(app)/(tabs)');
    } else {
      setError('Google sign-in didn\u2019t complete. Try again.');
    }
  };

  const busy = submitting || authLoading;

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.brandBlock}>
          <View style={s.brandMark}>
            <Box size={31} color={colors.primary} strokeWidth={2.2} />
            <View style={s.brandMarkLine} />
          </View>
          <View style={s.brandCopy}>
            <View style={s.brandNameRow}>
              <Text style={s.brandName}>PrintForge</Text>
              <Text style={s.brand3d}>3D</Text>
            </View>
            <Text style={s.brandTagline}>DESIGN \u00b7 PRINT \u00b7 BUILD</Text>
          </View>
        </View>

        <View style={s.headingBlock}>
          <Text style={s.eyebrow}>WELCOME BACK</Text>
          <Text style={s.title}>Sign in to your workspace.</Text>
          <Text style={s.subtitle}>
            Your role (student, designer, lab staff, or admin) is tied to your account and
            decided by the backend after you sign in.
          </Text>
        </View>

        <View style={s.formCard}>
          {error ? (
            <View style={s.errorBanner}>
              <TriangleAlert size={16} color={colors.destructive} strokeWidth={2} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>University email</Text>
            <View style={s.inputShell}>
              <Mail size={18} color={colors.mutedFg} strokeWidth={1.9} />
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="name@university.edu"
                placeholderTextColor={colors.mutedFg}
                style={s.input}
                value={email}
                onChangeText={setEmail}
                editable={!busy}
              />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <View style={s.fieldLabelRow}>
              <Text style={s.fieldLabel}>Password</Text>
            </View>
            <View style={s.inputShell}>
              <Lock size={18} color={colors.mutedFg} strokeWidth={1.9} />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                placeholder="Enter your password"
                placeholderTextColor={colors.mutedFg}
                secureTextEntry
                style={s.input}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                onSubmitEditing={handleSignIn}
              />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={handleSignIn}
            style={({ pressed }) => [
              controls.primaryButton,
              pressed && controls.primaryButtonPressed,
              busy && s.disabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Text style={controls.primaryButtonText}>Sign in</Text>
                <ArrowRight size={19} color={colors.onPrimary} />
              </>
            )}
          </Pressable>

          <View style={s.dividerRow}>
            <View style={s.divider} />
            <Text style={s.dividerText}>OR</Text>
            <View style={s.divider} />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={handleGoogleSignIn}
            style={({ pressed }) => [
              controls.secondaryButton,
              pressed && controls.secondaryButtonPressed,
              busy && s.disabled,
            ]}
          >
            <Circle size={18} color={colors.primary} />
            <Text style={controls.secondaryButtonText}>
              {authLoading ? 'Connecting\u2026' : 'Continue with Google'}
            </Text>
          </Pressable>

          {Platform.OS === 'ios' ? (
            <Pressable style={[controls.secondaryButton, s.disabled]} disabled>
              <Text style={controls.secondaryButtonText}>Continue with Apple \u2014 coming soon</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable onPress={() => router.push('/(auth)/register')} style={s.footerLink}>
          <Text style={s.footerText}>New to PrintForge 3D?</Text>
          <Text style={s.footerAction}> Create an account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 36,
    },
    brandBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 30,
    },
    brandMark: {
      width: 54,
      height: 54,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.navy,
      position: 'relative',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 3,
    },
    brandMarkLine: {
      position: 'absolute',
      bottom: 9,
      width: 22,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    brandCopy: { gap: 3 },
    brandNameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
    brandName: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 21,
      letterSpacing: -0.45,
    },
    brand3d: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
    brandTagline: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 9,
      letterSpacing: 1.7,
    },
    headingBlock: { marginBottom: 22 },
    eyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
      letterSpacing: 1.5,
      marginBottom: 9,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 32,
      lineHeight: 37,
      letterSpacing: -0.8,
    },
    subtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 10,
    },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: designTokens.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 17,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.07,
      shadowRadius: 24,
      elevation: 4,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.destructive,
      backgroundColor: 'rgba(217, 45, 32, 0.08)',
      padding: 11,
    },
    errorText: {
      flex: 1,
      color: colors.destructive,
      fontFamily: designTokens.type.medium,
      fontSize: 12.5,
      lineHeight: 17,
    },
    fieldGroup: { gap: 8 },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fieldLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    inputShell: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
    },
    input: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 15,
      paddingVertical: 0,
    },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    divider: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
      letterSpacing: 1.2,
    },
    disabled: { opacity: 0.55 },
    footerLink: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 22,
      paddingVertical: 10,
    },
    footerText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 14,
    },
    footerAction: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
  });
}
