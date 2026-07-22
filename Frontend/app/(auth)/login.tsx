import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowRight,
  Box,
  Eye,
  EyeOff,
  Lock,
  Mail,
  TriangleAlert,
} from "lucide-react-native";
import { useState } from "react";
import { useTheme } from "../../src/ThemeContext";
import { useSession } from "../../src/SessionContext";
import { useToast } from "../../src/ToastContext";
import { Dimensions } from "react-native";
import { ApiError } from "../../src/api/client";
import { designTokens } from "../../src/theme";

/**
 * Login — Bolt redesign Pass 2. Blurred 3D-printing hero behind a dark
 * navy overlay, with a fixed-white centered card (white in both themes,
 * same rationale as the Pass 1 feed cards). ALL auth logic is unchanged
 * from the previous version: login(), error handling, busy states, and
 * the concrete-leaf navigation target.
 */

const HERO_IMAGE =
  "https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=800";

// Fixed card-local colors — the card is white in both themes.
const CARD_FG = "#0A182E";
const CARD_MUTED = "rgba(10, 24, 46, 0.55)";
const CARD_BORDER = "rgba(10, 24, 46, 0.12)";
const CARD_INPUT_BG = "#F6F7F9";
const ORANGE = "#FF6A00";
const { height } = Dimensions.get("window");

const bottom_value = height / 6 - 50;

export default function LoginScreen() {
  const router = useRouter();
  // Theme hook kept for parity with the rest of the app — this screen's
  // card is deliberately theme-fixed, only the status bar area varies.
  useTheme();
  const { showToast } = useToast();
  const { signInWithGoogle, login, authLoading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Role is decided server-side from the account itself, not picked here —
  // land on the shared workspace route and let dashboard/index.tsx redirect
  // based on the real UserDto.role that comes back from the backend.
  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      // Concrete leaf route — the bare '/(app)/(tabs)' group href has an
      // empty concrete pathname ((tabs) has no index.tsx) and can resolve
      // to Unmatched Route. See register.tsx's handleCreateAccount comment.
      router.replace("/(app)/(tabs)/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
    Google Sign-In hidden for the demo — Google OAuth requires a
    development build due to expo-auth-session redirect URI instability
    in Expo Go SDK 56. Email/password login is working correctly and is
    what we're demoing instead. `signInWithGoogle` stays imported so the
    session wiring is ready when the button returns.
  */
  const handleGoogleSignIn = async () => {
    setError(null);
    const user = await signInWithGoogle();
    if (user) {
      router.replace("/(app)/(tabs)/dashboard");
    } else {
      setError("Google sign-in didn’t complete. Try again.");
    }
  };

  const busy = submitting || authLoading;

  return (
    <View style={s.root}>
      <ImageBackground
        source={{ uri: HERO_IMAGE }}
        style={s.hero}
        blurRadius={6}
      >
        <View style={s.heroOverlay} />
        <SafeAreaView style={s.safeArea}>
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.brandSection}>
              <View style={s.logoMark}>
                <Box size={26} color="#FFFFFF" strokeWidth={2.2} />
              </View>
              <Text style={s.brandTitle}>PrintForge 3D</Text>
              <Text style={s.brandSubtitle}>
                Print. Share. Build the future.
              </Text>
            </View>

            <View style={s.card}>
              {/* Log In | Sign Up switcher — separate routes, so the
                  inactive segment navigates rather than swapping state. */}
              <View style={s.segment}>
                <View style={[s.segmentTab, s.segmentTabActive]}>
                  <Text style={s.segmentTextActive}>Log In</Text>
                </View>
                <Pressable
                  accessibilityRole="tab"
                  onPress={() => router.push("/(auth)/register")}
                  style={s.segmentTab}
                >
                  <Text style={s.segmentText}>Sign Up</Text>
                </Pressable>
              </View>

              {error ? (
                <View style={s.errorBanner}>
                  <TriangleAlert size={16} color="#D92D20" strokeWidth={2} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

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
                  autoComplete="password"
                  placeholder="Password"
                  placeholderTextColor={CARD_MUTED}
                  secureTextEntry={!showPassword}
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy}
                  onSubmitEditing={handleSignIn}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={CARD_MUTED} />
                  ) : (
                    <Eye size={18} color={CARD_MUTED} />
                  )}
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(auth)/forgot-password")}
                style={s.forgotLink}
              >
                <Text style={s.forgotText}>Forgot password?</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={handleSignIn}
                style={s.primaryButton}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={s.primaryButtonText}>Log In</Text>
                    <ArrowRight size={19} color="#FFFFFF" />
                  </>
                )}
              </Pressable>



              <Pressable
                onPress={() => router.push("/(auth)/register")}
                style={s.footerLink}
                disabled={busy}
              >
                <Text style={s.footerText}>Don&apos;t have an account?</Text>
                <Text style={s.footerAction}> Sign up</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A182E" },
  hero: { flex: 1 },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 24, 46, 0.21)",
  },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  brandSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FF6A00",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
  brandSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginHorizontal: 20,
    top: bottom_value,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(10, 24, 46, 0.07)",
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
  },
  segmentTab: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentTabActive: { backgroundColor: ORANGE },
  segmentText: {
    color: CARD_MUTED,
    fontFamily: designTokens.type.heading,
    fontSize: 13,
  },
  segmentTextActive: {
    color: "#FFFFFF",
    fontFamily: designTokens.type.heading,
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D92D20",
    backgroundColor: "rgba(217, 45, 32, 0.08)",
    padding: 11,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: "#D92D20",
    fontFamily: designTokens.type.medium,
    fontSize: 12.5,
    lineHeight: 17,
  },
  inputShell: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
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
  forgotLink: { alignSelf: "flex-end", marginBottom: 16, paddingVertical: 2 },
  forgotText: {
    color: ORANGE,
    fontFamily: designTokens.type.heading,
    fontSize: 13,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonPressed: {
    backgroundColor: "#E05F00",
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: designTokens.type.heading,
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  divider: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginHorizontal: 12,
  },
  googleButton: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  googleButtonPressed: { opacity: 0.7 },
  googleLogoCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleLogoText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  disabled: { opacity: 0.55 },
  footerLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: CARD_MUTED,
    fontFamily: designTokens.type.body,
    fontSize: 13,
  },
  footerAction: {
    color: ORANGE,
    fontFamily: designTokens.type.heading,
    fontSize: 13,
  },
});
