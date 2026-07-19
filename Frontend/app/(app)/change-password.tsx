import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Eye, EyeOff, Lock, TriangleAlert } from "lucide-react-native";
import { useTheme } from "../../src/ThemeContext";
import { useToast } from "../../src/ToastContext";
import { useSession } from "../../src/SessionContext";
import { ApiError } from "../../src/api/client";
import { changePassword } from "../../src/api/auth";
import { Colors, designTokens } from "../../src/theme";

/**
 * Change Password — Stack screen (no bottom nav), reached from Settings
 * on the profile tab. PATCH /api/auth/change-password doesn't exist on
 * the backend yet — a 404 degrades gracefully to a "coming soon" toast
 * (per forgot-password.tsx's same pattern); any other failure (wrong
 * current password from a real future implementation, network error,
 * etc.) shows inline instead.
 */

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token } = useSession();
  const { showToast } = useToast();
  const s = makeStyles(colors);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (!token) return;

    setError(null);
    setSubmitting(true);
    try {
      await changePassword(token, currentPassword, newPassword);
      showToast("Password updated");
      router.back();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        showToast("Password change coming soon");
        router.back();
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong. Try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.screen}>
      <SafeAreaView edges={["top"]} style={s.safeTop}>
        <View style={s.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [s.backButton, pressed && s.pressed]}
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
          <Text style={s.topBarTitle}>Change Password</Text>
          <View style={s.topSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>
          {error ? (
            <View style={s.errorBanner}>
              <TriangleAlert size={16} color={colors.statusFailed.text} strokeWidth={2} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={s.fieldLabel}>CURRENT PASSWORD</Text>
          <View style={s.inputShell}>
            <Lock size={18} color={colors.mutedFg} strokeWidth={1.9} />
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              placeholder="Current password"
              placeholderTextColor={colors.mutedFg}
              secureTextEntry={!showCurrent}
              style={s.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!submitting}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showCurrent ? "Hide password" : "Show password"}
              onPress={() => setShowCurrent((v) => !v)}
              hitSlop={8}
            >
              {showCurrent ? (
                <EyeOff size={18} color={colors.mutedFg} />
              ) : (
                <Eye size={18} color={colors.mutedFg} />
              )}
            </Pressable>
          </View>

          <Text style={s.fieldLabel}>NEW PASSWORD</Text>
          <View style={s.inputShell}>
            <Lock size={18} color={colors.mutedFg} strokeWidth={1.9} />
            <TextInput
              autoCapitalize="none"
              autoComplete="password-new"
              placeholder="New password"
              placeholderTextColor={colors.mutedFg}
              secureTextEntry={!showNew}
              style={s.input}
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!submitting}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showNew ? "Hide password" : "Show password"}
              onPress={() => setShowNew((v) => !v)}
              hitSlop={8}
            >
              {showNew ? (
                <EyeOff size={18} color={colors.mutedFg} />
              ) : (
                <Eye size={18} color={colors.mutedFg} />
              )}
            </Pressable>
          </View>

          <Text style={s.fieldLabel}>CONFIRM NEW PASSWORD</Text>
          <View style={s.inputShell}>
            <Lock size={18} color={colors.mutedFg} strokeWidth={1.9} />
            <TextInput
              autoCapitalize="none"
              autoComplete="password-new"
              placeholder="Confirm new password"
              placeholderTextColor={colors.mutedFg}
              secureTextEntry={!showConfirm}
              style={s.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!submitting}
              onSubmitEditing={handleSubmit}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showConfirm ? "Hide password" : "Show password"}
              onPress={() => setShowConfirm((v) => !v)}
              hitSlop={8}
            >
              {showConfirm ? (
                <EyeOff size={18} color={colors.mutedFg} />
              ) : (
                <Eye size={18} color={colors.mutedFg} />
              )}
            </Pressable>
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
              <Text style={s.primaryButtonText}>Update Password</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    safeTop: { backgroundColor: colors.background },
    pressed: { opacity: 0.72 },
    topBar: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: designTokens.spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: -8,
    },
    topBarTitle: {
      flex: 1,
      textAlign: "center",
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
    },
    topSpacer: { width: 40 },
    content: {
      padding: designTokens.spacing.lg,
      paddingBottom: 48,
    },
    card: {
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      padding: designTokens.spacing.lg,
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.statusFailed.dot,
      backgroundColor: colors.statusFailed.bg,
      padding: 11,
      marginBottom: designTokens.spacing.lg,
    },
    errorText: {
      flex: 1,
      color: colors.statusFailed.text,
      fontFamily: designTokens.type.medium,
      fontSize: 12.5,
      lineHeight: 17,
    },
    fieldLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    inputShell: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      marginBottom: designTokens.spacing.lg,
    },
    input: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 15,
      paddingVertical: 0,
    },
    primaryButton: {
      minHeight: 52,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: designTokens.spacing.sm,
    },
    disabled: { opacity: 0.6 },
    primaryButtonText: {
      color: "#FFFFFF",
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
  });
}
