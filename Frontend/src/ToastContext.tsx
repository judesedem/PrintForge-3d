import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, designTokens } from './theme';

type ToastContextType = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

/**
 * Imperative bridge — lets non-component code (src/api/client.ts, a plain
 * fetch wrapper with no access to React context) trigger a toast without
 * being inside the component tree. ToastProvider is the only subscriber.
 * This is the "don't add a new library" version of a global toast queue.
 */
type Listener = (message: string) => void;
let listener: Listener | null = null;
export function emitToast(message: string) {
  listener?.(message);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setMessage(null), 3500);
  }, []);

  useEffect(() => {
    listener = showToast;
    return () => {
      listener = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <View
          style={[styles.overlay, { bottom: Math.max(24, insets.bottom + 12) }]}
          pointerEvents="none"
        >
          <View style={styles.toast}>
            <Text style={styles.text}>{message}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// Uses the static `colors`/`dark`-theme export rather than useTheme(),
// since this overlay sits above ToastProvider's own children and is meant
// to read consistently regardless of where in the tree it's triggered from.
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
  },
  toast: {
    maxWidth: '92%',
    backgroundColor: colors.navy,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  text: {
    color: colors.offWhite,
    fontFamily: designTokens.type.body,
    fontSize: 13,
    textAlign: 'center',
  },
});
