import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowLeft, KeyRound, Lock, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { useToast } from "../../src/ToastContext";
import { ApiError, apiFetch } from "../../src/api/client";
import { designTokens } from "../../src/theme";
import KeyboardAwareScreen from "../../src/components/KeyboardAwareScreen";

const HERO_IMAGE =
  "https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=800";

const CARD_FG = "#0A182E";
const CARD_MUTED = "rgba(10, 24, 46, 0.55)";
const CARD_BORDER = "rgba(10, 24, 46, 0.12)";
const CARD_INPUT_BG = "#F6F7F9";
const ORANGE = "#FF6A00";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  // The code is typed in by hand from the reset email, not carried in a
  // deep link. A `printforge://` link can't open the app under Expo Go
  // (custom schemes need a dev or production build), so a link-based flow
  // is untestable for anyone running the project the usual way.
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmedCode = code.trim();

  const handleSubmit = async () => {
    if (trimmedCode.length !== 6) {
      setError("Enter the 6-character code from your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setError(null);
    setSubmitting(true);
    
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: { token: trimmedCode.toUpperCase(), newPassword: password },
      });
      showToast("Password reset successfully. You can now log in.");
      setTimeout(() => router.replace("/(auth)/login"), 2000);
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

  return (
    <View style={s.root}>
      <ImageBackground
        source={{ uri: HERO_IMAGE }}
        style={s.hero}
        blurRadius={6}
      >
        <View style={s.heroOverlay} />
        <SafeAreaView style={s.safeArea}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back to login"
            onPress={() => router.replace("/(auth)/login")}
            style={({ pressed }) => [s.backButton, pressed && s.pressed]}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>

          <KeyboardAwareScreen contentContainerStyle={s.scrollContent}>
              <View style={s.card}>
                <Text style={s.heading}>Set New Password</Text>
                <Text style={s.subtitle}>
                  Enter the 6-character code we emailed you, then choose a new
                  password.
                </Text>

                {error ? (
                  <View style={s.errorBanner}>
                    <TriangleAlert size={16} color="#D92D20" strokeWidth={2} />
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={s.inputShell}>
                  <KeyRound size={18} color={CARD_MUTED} strokeWidth={1.9} />
                  <TextInput
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={6}
                    placeholder="6-character code"
                    placeholderTextColor={CARD_MUTED}
                    style={[s.input, s.codeInput]}
                    value={code}
                    onChangeText={setCode}
                    editable={!submitting}
                  />
                </View>

                <View style={s.inputShell}>
                  <Lock size={18} color={CARD_MUTED} strokeWidth={1.9} />
                  <TextInput
                    autoCapitalize="none"
                    secureTextEntry
                    placeholder="New password (min 6 chars)"
                    placeholderTextColor={CARD_MUTED}
                    style={s.input}
                    value={password}
                    onChangeText={setPassword}
                    editable={!submitting}
                  />
                </View>

                <View style={s.inputShell}>
                  <Lock size={18} color={CARD_MUTED} strokeWidth={1.9} />
                  <TextInput
                    autoCapitalize="none"
                    secureTextEntry
                    placeholder="Confirm new password"
                    placeholderTextColor={CARD_MUTED}
                    style={s.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!submitting}
                    onSubmitEditing={handleSubmit}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={submitting || trimmedCode.length !== 6}
                  onPress={handleSubmit}
                  style={[
                    s.primaryButton,
                    (submitting || trimmedCode.length !== 6) && s.disabled,
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={s.primaryButtonText}>Reset Password</Text>
                  )}
                </Pressable>
              </View>
          </KeyboardAwareScreen>
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
    backgroundColor: "rgba(10, 24, 46, 0.55)",
  },
  safeArea: { flex: 1 },
  pressed: { opacity: 0.72 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    marginTop: 4,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginHorizontal: 20,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
  },
  heading: {
    color: CARD_FG,
    fontFamily: designTokens.type.heading,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: CARD_MUTED,
    fontFamily: designTokens.type.body,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
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
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: CARD_FG,
    fontFamily: designTokens.type.body,
    fontSize: 15,
    paddingVertical: 0,
  },
  // Wide tracking and a larger size so the six characters are easy to
  // check against the email while typing.
  codeInput: {
    fontSize: 20,
    letterSpacing: 6,
    fontWeight: "600",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  disabled: { opacity: 0.6 },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: designTokens.type.heading,
    fontSize: 16,
  },
});
