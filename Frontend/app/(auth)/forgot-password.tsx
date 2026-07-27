import { useRouter } from "expo-router";
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
} from "react-native";
import { ArrowLeft, Mail, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { useToast } from "../../src/ToastContext";
import { ApiError } from "../../src/api/client";
import { forgotPassword } from "../../src/api/auth";
import { designTokens } from "../../src/theme";

/**
 * Forgot Password — same hero/card visual shell as login.tsx.
 * Calls the backend to issue a password reset token via email.
 */

const HERO_IMAGE =
  "https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=800";

const CARD_FG = "#0A182E";
const CARD_MUTED = "rgba(10, 24, 46, 0.55)";
const CARD_BORDER = "rgba(10, 24, 46, 0.12)";
const CARD_INPUT_BG = "#F6F7F9";
const ORANGE = "#FF6A00";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      showToast("Reset link sent if account exists.");
      setTimeout(() => router.back(), 2000);
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
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [s.backButton, pressed && s.pressed]}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>

          <ScrollView keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.card}>
              <Text style={s.heading}>Forgot Password</Text>
              <Text style={s.subtitle}>
                Enter your email and we&apos;ll send you a reset
                link.
              </Text>

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
                  placeholder="Email"
                  placeholderTextColor={CARD_MUTED}
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  editable={!submitting}
                  onSubmitEditing={handleSubmit}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={handleSubmit}
                style={[s.primaryButton, submitting && s.disabled]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.primaryButtonText}>Send Reset Link</Text>
                )}
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
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: CARD_FG,
    fontFamily: designTokens.type.body,
    fontSize: 15,
    paddingVertical: 0,
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
  disabled: { opacity: 0.6 },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: designTokens.type.heading,
    fontSize: 16,
  },
});
