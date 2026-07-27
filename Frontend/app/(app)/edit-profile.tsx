import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, User, Mail, TriangleAlert } from "lucide-react-native";
import { useTheme } from "../../src/ThemeContext";
import { useToast } from "../../src/ToastContext";
import { useSession } from "../../src/SessionContext";
import { ApiError } from "../../src/api/client";
import { updateProfile } from "../../src/api/auth";
import { Colors, designTokens } from "../../src/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token, appUser, updateUser } = useSession();
  const { showToast } = useToast();
  const s = makeStyles(colors);

  const [fullName, setFullName] = useState(appUser?.full_name || "");
  const [email, setEmail] = useState(appUser?.email || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (appUser) {
      setFullName(appUser.full_name);
      setEmail(appUser.email);
    }
  }, [appUser]);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("A valid email is required.");
      return;
    }
    if (!token) return;

    setError(null);
    setSubmitting(true);
    try {
      const response = await updateProfile(token, {
        fullName: fullName.trim(),
        email: email.trim(),
      });
      updateUser(response.user);
      showToast("Profile updated successfully");
      router.back();
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
          <Text style={s.topBarTitle}>Edit Profile</Text>
          <View style={s.topSpacer} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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

            <Text style={s.fieldLabel}>FULL NAME</Text>
            <View style={s.inputShell}>
              <User size={18} color={colors.mutedFg} strokeWidth={1.9} />
              <TextInput
                autoCapitalize="words"
                placeholder="Your full name"
                placeholderTextColor={colors.mutedFg}
                style={s.input}
                value={fullName}
                onChangeText={setFullName}
                editable={!submitting}
              />
            </View>

            <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={s.inputShell}>
              <Mail size={18} color={colors.mutedFg} strokeWidth={1.9} />
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="Your email address"
                placeholderTextColor={colors.mutedFg}
                style={s.input}
                value={email}
                onChangeText={setEmail}
                editable={!submitting}
                onSubmitEditing={handleSubmit}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={submitting || (fullName === appUser?.full_name && email === appUser?.email)}
              onPress={handleSubmit}
              style={[
                s.primaryButton, 
                (submitting || (fullName === appUser?.full_name && email === appUser?.email)) && s.disabled
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.primaryButtonText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    flex1: { flex: 1 },
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
