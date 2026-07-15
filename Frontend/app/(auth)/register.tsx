import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  Circle,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react-native';
import { ComponentType, useState } from 'react';
import { useTheme } from '../../src/ThemeContext';
import { useSession } from '../../src/SessionContext';
import { ApiError } from '../../src/api/client';
import type { SelfRegisterRole } from '../../src/api/types';
import { Colors, designTokens, makeControlStyles } from '../../src/theme';

type RoleLabel = 'Student' | 'Designer';
type RoleIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type RoleOption = {
  label: RoleLabel;
  backendRole: SelfRegisterRole;
  description: string;
  icon: RoleIcon;
};

// Lab Staff and Admin are deliberately absent here — AuthService.resolveRole()
// rejects self-registration for those roles server-side (403/400). Those
// accounts can only be created by an existing admin via POST /api/admin/users.
const roleOptions: RoleOption[] = [
  {
    label: 'Student',
    backendRole: 'STUDENT',
    description: 'Browse designs, request prints, and track every order.',
    icon: GraduationCap,
  },
  {
    label: 'Designer',
    backendRole: 'DESIGNER',
    description: 'Publish 3D models and monitor orders and earnings.',
    icon: Box,
  },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signInWithGoogle, register, authLoading } = useSession();
  const [selectedRole, setSelectedRole] = useState<RoleLabel>('Student');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const s = makeStyles(colors);
  const controls = makeControlStyles(colors);

  const busy = submitting || authLoading;
  const selectedBackendRole = roleOptions.find(r => r.label === selectedRole)!.backendRole;

  const handleCreateAccount = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) {
      setError('Enter your first and last name.');
      return;
    }
    if (!email.trim()) {
      setError('Enter your university email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don\u2019t match.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      console.log('[Register] Calling session.register()');
      await register({
        full_name: fullName,
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        role: selectedBackendRole,
      });
      console.log('[Register] Success, navigating to /(app)/(tabs)/dashboard');
      // Must target a concrete leaf route, not the bare '/(app)/(tabs)'
      // group: (app) and (tabs) are both pathless groups and (tabs) has no
      // index.tsx, so the group href's concrete pathname is the empty
      // string — when resolution fails, expo-router shows Unmatched Route
      // at exp://<host>/--/ (createURL of that empty path). dashboard's
      // index.tsx redirects staff/admin to the right screen from there.
      router.replace('/(app)/(tabs)/dashboard');
      console.log('[Register] Navigation called');
    } catch (err) {
      console.log('[Register] Error:', err);
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    // Google sign-in always lands new accounts as STUDENT server-side
    // (AuthService.createFirebaseUser) — the role picker above only
    // applies to the email/password path.
    const user = await signInWithGoogle();
    if (user) {
      // Concrete leaf route — see comment in handleCreateAccount.
      router.replace('/(app)/(tabs)/dashboard');
    } else {
      setError('Google sign-in didn\u2019t complete. Try again.');
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topBar}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={s.backButton}
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={s.topBrandRow}>
            <Box size={20} color={colors.primary} />
            <Text style={s.topBrand}>PrintForge <Text style={s.topBrand3d}>3D</Text></Text>
          </View>
          <View style={s.topSpacer} />
        </View>

        <View style={s.headingBlock}>
          <Text style={s.eyebrow}>CREATE YOUR ACCOUNT</Text>
          <Text style={s.title}>Choose how you\u2019ll use PrintForge.</Text>
          <Text style={s.subtitle}>
            Lab staff and admin accounts are created by an administrator \u2014 sign up here as a
            student or designer.
          </Text>
        </View>

        <View style={s.roleList}>
          {roleOptions.map(({ label, backendRole, description, icon: Icon }) => {
            const active = selectedRole === label;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                key={label}
                onPress={() => setSelectedRole(label)}
                style={({ pressed }) => [
                  s.roleCard,
                  active && s.roleCardActive,
                  pressed && s.roleCardPressed,
                ]}
              >
                <View style={[s.roleIcon, active && s.roleIconActive]}>
                  <Icon
                    size={24}
                    color={active ? colors.onPrimary : colors.foreground}
                    strokeWidth={1.8}
                  />
                </View>
                <View style={s.roleCopy}>
                  <View style={s.roleTitleRow}>
                    <Text style={[s.roleTitle, active && s.roleTitleActive]}>{label}</Text>
                    <View style={[s.backendPill, active && s.backendPillActive]}>
                      <Text style={[s.backendPillText, active && s.backendPillTextActive]}>{backendRole}</Text>
                    </View>
                  </View>
                  <Text style={s.roleDescription}>{description}</Text>
                </View>
                {active ? (
                  <View style={s.checkCircle}>
                    <Check size={15} color={colors.onPrimary} strokeWidth={2.7} />
                  </View>
                ) : (
                  <ChevronRight size={19} color={colors.mutedFg} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={s.formCard}>
          <View style={s.sectionHeadingRow}>
            <View>
              <Text style={s.sectionTitle}>Account details</Text>
              <Text style={s.sectionSubtitle}>Use your university or lab credentials.</Text>
            </View>
            <View style={s.stepPill}>
              <Text style={s.stepPillText}>STEP 2</Text>
            </View>
          </View>

          {error ? (
            <View style={s.errorBanner}>
              <TriangleAlert size={16} color={colors.destructive} strokeWidth={2} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={s.nameRow}>
            <View style={[s.fieldGroup, s.nameField]}>
              <Text style={s.fieldLabel}>First name</Text>
              <TextInput
                autoComplete="given-name"
                placeholder="Alex"
                placeholderTextColor={colors.mutedFg}
                style={s.textInput}
                value={firstName}
                onChangeText={setFirstName}
                editable={!busy}
              />
            </View>
            <View style={[s.fieldGroup, s.nameField]}>
              <Text style={s.fieldLabel}>Last name</Text>
              <TextInput
                autoComplete="family-name"
                placeholder="Kumar"
                placeholderTextColor={colors.mutedFg}
                style={s.textInput}
                value={lastName}
                onChangeText={setLastName}
                editable={!busy}
              />
            </View>
          </View>

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
                style={s.iconInput}
                value={email}
                onChangeText={setEmail}
                editable={!busy}
              />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Password</Text>
            <View style={s.inputShell}>
              <Lock size={18} color={colors.mutedFg} strokeWidth={1.9} />
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="Create a secure password"
                placeholderTextColor={colors.mutedFg}
                secureTextEntry
                style={s.iconInput}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
              />
            </View>
            <Text style={s.passwordHint}>At least 6 characters.</Text>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Confirm password</Text>
            <View style={s.inputShell}>
              <Lock size={18} color={colors.mutedFg} strokeWidth={1.9} />
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                placeholderTextColor={colors.mutedFg}
                secureTextEntry
                style={s.iconInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!busy}
                onSubmitEditing={handleCreateAccount}
              />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={handleCreateAccount}
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
                <Text style={controls.primaryButtonText}>Create account</Text>
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

        <View style={s.securityNote}>
          <ShieldCheck size={18} color={colors.success} strokeWidth={1.9} />
          <Text style={s.securityText}>
            Role access is enforced by the backend. Staff and admin workspaces require the matching account role.
          </Text>
        </View>

        <Pressable onPress={() => router.push('/(auth)/login')} style={s.footerLink}>
          <Text style={s.footerText}>Already have an account?</Text>
          <Text style={s.footerAction}> Sign in</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 38,
    },
    topBar: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 22,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    topBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    topBrand: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
    },
    topBrand3d: { color: colors.primary },
    topSpacer: { width: 42 },
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
      fontSize: 31,
      lineHeight: 36,
      letterSpacing: -0.8,
    },
    subtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 10,
    },
    roleList: { gap: 11, marginBottom: 22 },
    roleCard: {
      minHeight: 104,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      padding: 14,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    roleCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 13,
      elevation: 2,
    },
    roleCardPressed: { opacity: 0.84 },
    roleIcon: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    roleIconActive: { backgroundColor: colors.primary },
    roleCopy: { flex: 1, gap: 7 },
    roleTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    roleTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
    roleTitleActive: { color: colors.primary },
    backendPill: {
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.secondary,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    backendPillActive: { backgroundColor: colors.card },
    backendPillText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.mono,
      fontSize: 8,
    },
    backendPillTextActive: { color: colors.primary },
    roleDescription: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 17,
    },
    checkCircle: {
      width: 27,
      height: 27,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
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
    sectionHeadingRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
    },
    sectionSubtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginTop: 4,
    },
    stepPill: {
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    stepPillText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 0.8,
    },
    nameRow: { flexDirection: 'row', gap: 10 },
    nameField: { flex: 1 },
    fieldGroup: { gap: 8 },
    fieldLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    textInput: {
      minHeight: 52,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 15,
      paddingHorizontal: 14,
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
    iconInput: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 15,
      paddingVertical: 0,
    },
    passwordHint: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
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
    securityNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 16,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 13,
    },
    securityText: {
      flex: 1,
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      lineHeight: 17,
    },
    footerLink: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 18,
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
