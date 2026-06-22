// PrintForge 3D — ErrorBoundary
// Catches uncaught render-time errors anywhere in the tree below it and
// shows a themed fallback screen instead of a blank/crashed app. This is
// a backstop for unexpected exceptions; ordinary API failures are handled
// per-screen with try/catch + retry UI (see JobsScreen, HomeScreen, etc).

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { Button } from './UI';
import { ApiError } from '../services/api';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback renderer */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function describeError(error: Error): { title: string; message: string } {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: 'Session Expired',
        message: 'Please sign in again to continue.',
      };
    }
    if (error.status >= 500) {
      return {
        title: 'Server Error',
        message: 'The PrintForge server is having trouble. Please try again shortly.',
      };
    }
    return {
      title: 'Request Failed',
      message: error.message || 'Something went wrong talking to the server.',
    };
  }

  if (error.message?.toLowerCase().includes('network')) {
    return {
      title: 'Connection Problem',
      message: 'Could not reach the PrintForge server. Check your network and try again.',
    };
  }

  return {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. You can try again or restart the app.',
  };
}

// React requires error boundaries to be class components (no hook
// equivalent exists for getDerivedStateFromError/componentDidCatch), so
// useTheme() can't be called directly inside ErrorBoundary.render(). We
// extract the themed fallback UI into this small function component instead
// — the class below renders <ErrorFallback /> and the hook works normally.
function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  const { title, message } = describeError(error);

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Ionicons name="warning-outline" size={52} color={Colors.error} />
          <Text style={[Typography.displaySmall, { color: Colors.textPrimary, marginTop: Spacing.lg, textAlign: 'center' }]}>
            {title}
          </Text>
          <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }]}>
            {message}
          </Text>
          <View style={s.actions}>
            <Button label="Try Again" onPress={reset} />
          </View>
          {__DEV__ && (
            <View style={s.devBox}>
              <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                {error.message}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook point for crash reporting (Sentry, Bugsnag, etc.) if added later.
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return <ErrorFallback error={error} reset={this.reset} />;
  }
}

type ThemeColors = {
  background: string; surface: string; border: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  actions: { marginTop: Spacing.xl, width: '100%', maxWidth: 280 },
  devBox: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: '100%',
  },
});
