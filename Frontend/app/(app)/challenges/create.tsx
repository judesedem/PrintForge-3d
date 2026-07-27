import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Info,
  Trophy,
} from 'lucide-react-native';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { createChallenge } from '@/api/challenges';
import { Colors, designTokens, makeControlStyles } from '@/theme';

export default function CreateChallengeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token, role } = useSession();
  const s = makeStyles(colors);
  const controls = makeControlStyles(colors);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prize, setPrize] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user somehow gets here without correct role, show a placeholder error or block submission.
  const canCreate = role === 'admin' || role === 'lab_staff';

  const numericPrize = Number.parseFloat(prize || '0');
  const isReady = Boolean(title.trim() && description.trim() && canCreate);

  const handleSubmit = async () => {
    if (!isReady) {
      Alert.alert(
        'Complete the required fields',
        'Add a title and description before creating the challenge.',
      );
      return;
    }
    if (!token) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await createChallenge(token, {
        title: title.trim(),
        description: description.trim(),
        prize: numericPrize > 0 ? numericPrize : undefined,
        deadline: deadline.trim() ? new Date(deadline.trim()).toISOString() : undefined,
      });

      router.back();
    } catch (err) {
      console.error('Challenge creation failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && s.backBtnPressed]}
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={s.headerTitle}>Post New Challenge</Text>
      </View>

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!canCreate && (
            <View style={s.errorBanner}>
              <Info size={16} color="#DC2626" style={s.errorIcon} />
              <Text style={s.errorText}>Only Lab Staff and Admins can post challenges.</Text>
            </View>
          )}

          {submitError && (
            <View style={s.errorBanner}>
              <Info size={16} color="#DC2626" style={s.errorIcon} />
              <Text style={s.errorText}>{submitError}</Text>
            </View>
          )}

          {/* Title */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Title *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Sustainable Campus Design"
              placeholderTextColor={colors.mutedFg}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              editable={canCreate}
            />
          </View>

          {/* Description */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Description *</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="Detail the rules and goals of the challenge..."
              placeholderTextColor={colors.mutedFg}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              editable={canCreate}
            />
          </View>

          {/* Prize */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Prize Amount (Optional)</Text>
            <View style={s.priceInputWrap}>
              <View style={s.currencyPrefix}>
                <Text style={s.currencyPrefixText}>GH₵</Text>
              </View>
              <TextInput
                style={[s.input, s.priceInput]}
                placeholder="0.00"
                placeholderTextColor={colors.mutedFg}
                value={prize}
                onChangeText={setPrize}
                keyboardType="decimal-pad"
                editable={canCreate}
              />
            </View>
          </View>

          {/* Deadline */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Deadline (Optional)</Text>
            <View style={s.dateInputWrap}>
              <View style={s.currencyPrefix}>
                <Calendar size={18} color={colors.mutedFg} />
              </View>
              <TextInput
                style={[s.input, s.priceInput]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedFg}
                value={deadline}
                onChangeText={setDeadline}
                editable={canCreate}
              />
            </View>
          </View>
        </ScrollView>

        <View style={s.bottomArea}>
          <Pressable
            accessibilityRole="button"
            disabled={!isReady || isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              s.submitBtn,
              !isReady && s.submitBtnDisabled,
              pressed && isReady && s.submitBtnPressed,
            ]}
          >
            <Text style={s.submitBtnText}>
              {isSubmitting ? 'Posting...' : 'Post Challenge'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex1: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    backBtn: {
      padding: 8,
    },
    backBtnPressed: {
      opacity: 0.5,
    },
    headerTitle: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 40,
      gap: 24,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#F87171',
      padding: 12,
      borderRadius: 8,
    },
    errorIcon: {
      marginRight: 8,
    },
    errorText: {
      flex: 1,
      color: '#B91C1C',
      fontFamily: designTokens.type.body,
      fontSize: 14,
    },
    section: {
      gap: 8,
    },
    sectionLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
    },
    textArea: {
      minHeight: 120,
      paddingTop: 12,
    },
    priceInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    currencyPrefix: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.cardElevated,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
      zIndex: 1,
    },
    currencyPrefixText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    priceInput: {
      flex: 1,
      paddingLeft: 60,
    },
    bottomArea: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
    },
    submitBtn: {
      backgroundColor: '#3B82F6', // Blue theme for staff
      borderColor: '#3B82F6',
    },
    submitBtnDisabled: {
      backgroundColor: colors.cardElevated,
      borderColor: colors.border,
    },
    submitBtnPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
    input: {
      minHeight: 48,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.cardElevated,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 15,
      paddingHorizontal: 16,
    },
  });
}
