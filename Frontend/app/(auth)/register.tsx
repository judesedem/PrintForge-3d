import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowRight,
  Box,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Paintbrush,
  TriangleAlert,
  User,
} from 'lucide-react-native';
import { ComponentType, useState } from 'react';
import { useSession } from '../../src/SessionContext';
import { ApiError } from '../../src/api/client';
import type { SelfRegisterRole } from '../../src/api/types';
import { designTokens } from '../../src/theme';

/**
 * Sign Up — Bolt redesign Pass 2. Same hero + fixed-white card as
 * login.tsx. ALL registration logic is unchanged: the same
 * register() payload (full_name, email, password, confirm_password,
 * role), the same validation rules, and the same concrete-leaf
 * navigation target.
 *
 * Layout deltas from the previous version, both deliberate:
 * - One "Full name" input instead of first/last — the API takes a single
 *   full_name string; the old screen just concatenated the two fields.
 * - Confirm password stays even though the Bolt card omits it — it's
 *   validated client-side AND required in the backend payload
 *   (confirm_password), so dropping it would be a functional change.
 */

const HERO_IMAGE =
  'https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=800';

const CARD_FG = '#0A182E';
const CARD_MUTED = 'rgba(10, 24, 46, 0.55)';
const CARD_BORDER = 'rgba(10, 24, 46, 0.12)';
const CARD_INPUT_BG = '#F6F7F9';
const ORANGE = '#FF6A00';

type RoleIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type RoleOption = {
  label: 'Student' | 'Designer';
  backendRole: SelfRegisterRole;
  icon: RoleIcon;
};

// Lab Staff and Admin are deliberately absent here — AuthService.resolveRole()
// rejects self-registration for those roles server-side (403/400). Those
// accounts can only be created by an existing admin via POST /api/admin/users.
const roleOptions: RoleOption[] = [
  { label: 'Student', backendRole: 'STUDENT', icon: GraduationCap },
  { label: 'Designer', backendRole: 'DESIGNER', icon: Paintbrush },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register, authLoading } = useSession();
  const [selectedRole, setSelectedRole] = useState<'Student' | 'Designer'>('Student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting || authLoading;
  const selectedBackendRole = roleOptions.find(r => r.label === selectedRole)!.backendRole;

  const handleCreateAccount = async () => {
    const name = fullName.trim();
    if (!name) {
      setError('Enter your full name.');
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
      setError('Passwords don’t match.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await register({
        full_name: name,
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        role: selectedBackendRole,
      });
      // Must target a concrete leaf route, not the bare '/(app)/(tabs)'
      // group: (app) and (tabs) are both pathless groups and (tabs) has no
      // index.tsx, so the group href's concrete pathname is the empty
      // string — when resolution fails, expo-router shows Unmatched Route
      // at exp://<host>/--/ (createURL of that empty path). dashboard's
      // index.tsx redirects staff/admin to the right screen from there.
      router.replace('/(app)/(tabs)/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.root}>
      <ImageBackground source={{ uri: HERO_IMAGE }} style={s.hero} blurRadius={6}>
        <View style={s.heroOverlay} />
        <SafeAreaView style={s.safeArea}>
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.card}>
              <View style={s.logoMark}>
                <Box size={30} color="#FFFFFF" strokeWidth={2.2} />
              </View>
              <Text style={s.brandTitle}>PrintForge 3D</Text>
              <Text style={s.brandSubtitle}>Print. Share. Build the future.</Text>

              <View style={s.segment}>
                <Pressable
                  accessibilityRole="tab"
                  onPress={() => router.push('/(auth)/login')}
                  style={s.segmentTab}
                >
                  <Text style={s.segmentText}>Log In</Text>
                </Pressable>
                <View style={[s.segmentTab, s.segmentTabActive]}>
                  <Text style={s.segmentTextActive}>Sign Up</Text>
                </View>
              </View>

              {error ? (
                <View style={s.errorBanner}>
                  <TriangleAlert size={16} color="#D92D20" strokeWidth={2} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={s.inputShell}>
                <User size={18} color={CARD_MUTED} strokeWidth={1.9} />
                <TextInput
                  autoComplete="name"
                  placeholder="Full name"
                  placeholderTextColor={CARD_MUTED}
                  style={s.input}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!busy}
                />
              </View>

              <View style={s.inputShell}>
                <Mail size={18} color={CARD_MUTED} strokeWidth={1.9} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="University email"
                  placeholderTextColor={CARD_MUTED}
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  editable={!busy}
                />
              </View>

              <View style={s.inputShell}>
                <Lock size={18} color={CARD_MUTED} strokeWidth={1.9} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  placeholder="Password"
                  placeholderTextColor={CARD_MUTED}
                  secureTextEntry={!showPassword}
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={CARD_MUTED} />
                  ) : (
                    <Eye size={18} color={CARD_MUTED} />
                  )}
                </Pressable>
              </View>

              <View style={s.inputShell}>
                <Lock size={18} color={CARD_MUTED} strokeWidth={1.9} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  placeholderTextColor={CARD_MUTED}
                  secureTextEntry={!showPassword}
                  style={s.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!busy}
                  onSubmitEditing={handleCreateAccount}
                />
              </View>

              <Text style={s.roleLabel}>I want to join as</Text>
              <View style={s.roleRow}>
                {roleOptions.map(({ label, icon: Icon }) => {
                  const active = selectedRole === label;
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => setSelectedRole(label)}
                      style={[s.roleCard, active && s.roleCardActive]}
                    >
                      <Icon size={22} color={active ? ORANGE : CARD_MUTED} strokeWidth={2} />
                      <Text style={[s.roleText, active && s.roleTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={handleCreateAccount}
                style={[s.primaryButton, busy && s.disabled]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={s.primaryButtonText}>Sign Up</Text>
                    <ArrowRight size={19} color="#FFFFFF" />
                  </>
                )}
              </Pressable>

              <View style={s.dividerRow}>
                <View style={s.divider} />
                <Text style={s.dividerText}>or</Text>
                <View style={s.divider} />
              </View>

              <Pressable
                onPress={() => router.push('/(auth)/login')}
                style={s.footerLink}
                disabled={busy}
              >
                <Text style={s.footerText}>Already have an account?</Text>
                <Text style={s.footerAction}> Log in</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A182E' },
  hero: { flex: 1 },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 24, 46, 0.85)',
  },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
  },
  logoMark: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FF6A00',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    color: CARD_FG,
    fontFamily: designTokens.type.display,
    fontSize: 26,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: CARD_MUTED,
    fontFamily: designTokens.type.body,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 22,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 24, 46, 0.07)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
  },
  segmentTab: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabActive: { backgroundColor: ORANGE },
  segmentText: {
    color: CARD_MUTED,
    fontFamily: designTokens.type.heading,
    fontSize: 13,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontFamily: designTokens.type.heading,
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D92D20',
    backgroundColor: 'rgba(217, 45, 32, 0.08)',
    padding: 11,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: '#D92D20',
    fontFamily: designTokens.type.medium,
    fontSize: 12.5,
    lineHeight: 17,
  },
  inputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD_INPUT_BG,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: CARD_FG,
    fontFamily: designTokens.type.body,
    fontSize: 15,
    paddingVertical: 0,
  },
  roleLabel: {
    color: CARD_FG,
    fontFamily: designTokens.type.heading,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 10,
  },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  roleCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  roleCardActive: {
    borderColor: ORANGE,
    backgroundColor: 'rgba(255, 106, 0, 0.08)',
  },
  roleText: {
    color: CARD_MUTED,
    fontFamily: designTokens.type.heading,
    fontSize: 13,
  },
  roleTextActive: { color: ORANGE },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonPressed: { backgroundColor: '#E05F00', transform: [{ scale: 0.99 }] },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: designTokens.type.heading,
    fontSize: 16,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  divider: { flex: 1, height: 1, backgroundColor: CARD_BORDER },
  dividerText: { color: CARD_MUTED, fontFamily: designTokens.type.body, fontSize: 12 },
  disabled: { opacity: 0.55 },
  footerLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: CARD_MUTED, fontFamily: designTokens.type.body, fontSize: 13 },
  footerAction: { color: ORANGE, fontFamily: designTokens.type.heading, fontSize: 13 },
});
