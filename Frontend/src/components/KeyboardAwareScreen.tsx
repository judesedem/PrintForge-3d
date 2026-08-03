import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

// Every form screen in this app had independently written
// `Platform.OS === 'ios' ? 'padding' : undefined` — meaning
// KeyboardAvoidingView was a silent no-op on Android everywhere, which is
// why the keyboard covers the focused input (and everything below it) on
// that platform. `'height'` is the behavior React Native's own docs
// recommend for Android; this constant is the single place that decides it,
// so the bug can't be re-introduced screen-by-screen again.
export const KEYBOARD_AVOIDING_BEHAVIOR = Platform.select({
  ios: 'padding' as const,
  android: 'height' as const,
});

type KeyboardAwareScreenProps = {
  children: ReactNode;
  /** Style for the outer KeyboardAvoidingView — typically just `{ flex: 1 }`. */
  style?: StyleProp<ViewStyle>;
  /** Style for the ScrollView's contentContainerStyle. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra offset for whatever sits above this component that
   *  KeyboardAvoidingView can't see (e.g. a header rendered outside it). */
  keyboardVerticalOffset?: number;
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>;
};

/**
 * Shared keyboard-avoidance wrapper for scrollable form screens: a
 * KeyboardAvoidingView (correct behavior per platform, see above) around a
 * ScrollView (keyboardShouldPersistTaps="handled" so buttons stay tappable
 * while the keyboard is up). Every full-screen form in the app should use
 * this instead of hand-rolling the same two components.
 */
export default function KeyboardAwareScreen({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  scrollViewProps,
}: KeyboardAwareScreenProps) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex1, style]}
      behavior={KEYBOARD_AVOIDING_BEHAVIOR}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...scrollViewProps}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});
