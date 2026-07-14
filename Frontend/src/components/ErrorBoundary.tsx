import { Component, ReactNode } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { usePathname, router } from 'expo-router';
import { colors, designTokens } from '../theme';

type ClassProps = {
  children: ReactNode;
  onRetry: () => void;
};

type ClassState = {
  hasError: boolean;
};

// React error boundaries must be class components — there's no hook
// equivalent (getDerivedStateFromError/componentDidCatch have no
// functional-component counterpart). Colors come from theme.ts's static
// fallback export (always the dark palette) rather than useTheme(), since
// a class component can't call hooks — Navy/Warm Orange are brand
// constants that don't vary between light/dark anyway.
class ErrorBoundaryClass extends Component<ClassProps, ClassState> {
  state: ClassState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Caught by ErrorBoundary:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. Try again — if it keeps happening, restart the app.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={this.handleRetry}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ErrorBoundaryClass onRetry={() => router.replace(pathname as never)}>
      {children}
    </ErrorBoundaryClass>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: designTokens.spacing.xl,
  },
  title: {
    color: colors.primary,
    fontFamily: designTokens.type.heading,
    fontSize: 24,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
  },
  body: {
    color: colors.offWhite,
    fontFamily: designTokens.type.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: designTokens.spacing.xl,
    opacity: 0.85,
  },
  button: {
    minHeight: 50,
    minWidth: 160,
    borderRadius: designTokens.radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: designTokens.spacing.xl,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.offWhite,
    fontFamily: designTokens.type.heading,
    fontSize: 15,
  },
});
