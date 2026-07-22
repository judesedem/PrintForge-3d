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
  DollarSign,
  Info,
} from 'lucide-react-native';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { createDesignRequest } from '@/api/design-requests';
import { Colors, designTokens, makeControlStyles } from '@/theme';

export default function CreateDesignRequestScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token } = useSession();
  const s = makeStyles(colors);
  const controls = makeControlStyles(colors);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericBudget = Number.parseFloat(budget || '0');
  const isReady = Boolean(title.trim() && description.trim());

  const handleSubmit = async () => {
    if (!isReady) {
      Alert.alert(
        'Complete the required fields',
        'Add a title and description before creating the request.',
      );
      return;
    }
    if (!token) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await createDesignRequest(token, {
        title: title.trim(),
        description: description.trim(),
        budget: numericBudget > 0 ? numericBudget : undefined,
        deadline: deadline.trim() ? new Date(deadline.trim()).toISOString() : undefined,
      });

      router.back();
    } catch (err) {
      console.error('Request creation failed:', err);
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
        <Text style={s.headerTitle}>New Design Request</Text>
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
              placeholder="e.g. Custom Enclosure for Arduino"
              placeholderTextColor={colors.mutedFg}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Description *</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="Describe what you need designed in detail..."
              placeholderTextColor={colors.mutedFg}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Budget */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Budget (Optional)</Text>
            <View style={s.priceInputWrap}>
              <View style={s.currencyPrefix}>
                <Text style={s.currencyPrefixText}>GH₵</Text>
              </View>
              <TextInput
                style={[s.input, s.priceInput]}
                placeholder="0.00"
                placeholderTextColor={colors.mutedFg}
                value={budget}
                onChangeText={setBudget}
                keyboardType="decimal-pad"
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
              {isSubmitting ? 'Submitting...' : 'Post Request'}
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
      backgroundColor: '#FEF2F2', // Light red
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
      backgroundColor: '#FF6A00',
      borderColor: '#FF6A00',
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
