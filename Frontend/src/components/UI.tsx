import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TextInput,
  TextInputProps,
} from 'react-native';
import { Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { JobStatus } from '../types';

// ─── Button ────────────────────────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', loading, disabled, style, icon }: ButtonProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    s.btn,
    size === 'sm' && s.btnSm,
    size === 'lg' && s.btnLg,
    variant === 'primary' && s.btnPrimary,
    variant === 'secondary' && s.btnSecondary,
    variant === 'ghost' && s.btnGhost,
    variant === 'danger' && s.btnDanger,
    isDisabled && s.btnDisabled,
    style as ViewStyle,
  ];

  const textColor =
    variant === 'primary' ? Colors.background :
    variant === 'secondary' ? Colors.accent :
    variant === 'ghost' ? Colors.textSecondary :
    variant === 'danger' ? Colors.error :
    Colors.textPrimary;

  return (
    <TouchableOpacity style={containerStyle} onPress={onPress} disabled={isDisabled} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={s.btnInner}>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text style={[
            Typography.labelLarge,
            { color: textColor },
            size === 'sm' && { fontSize: 12 },
            size === 'lg' && { fontSize: 16 },
          ]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  onPress?: () => void;
  accentLeft?: string;
}

export function Card({ children, style, elevated, onPress, accentLeft }: CardProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      style={[s.card, elevated && s.cardElevated, style as any]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {accentLeft && <View style={[s.cardAccent, { backgroundColor: accentLeft }]} />}
      <View style={{ flex: 1 }}>{children}</View>
    </Container>
  );
}

// ─── StatusBadge ───────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: JobStatus }) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
    submitted:  { label: 'Submitted',  color: Colors.textSecondary, bg: Colors.surfaceElevated },
    approved:   { label: 'Approved',   color: Colors.success,       bg: Colors.successBg },
    queued:     { label: 'Queued',     color: Colors.warning,       bg: Colors.warningBg },
    printing:   { label: 'Printing',   color: Colors.accent,        bg: Colors.accentGlow },
    completed:  { label: 'Completed',  color: Colors.success,       bg: Colors.successBg },
    rejected:   { label: 'Rejected',   color: Colors.error,         bg: Colors.errorBg },
  };

  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: cfg.color }]} />
      <Text style={[Typography.labelSmall, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Input ─────────────────────────────────────────────────────────────────

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
}

export function Input({ label, error, containerStyle, icon, style, ...rest }: InputProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  return (
    <View style={[{ marginBottom: Spacing.md }, containerStyle]}>
      {label && <Text style={[Typography.labelMedium, s.inputLabel]}>{label}</Text>}
      <View style={s.inputWrapper}>
        {icon && <View style={s.inputIcon}>{icon}</View>}
        <TextInput
          style={[s.input, icon && { paddingLeft: 44 }, error && s.inputError, style as TextStyle]}
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.accent}
          {...rest}
        />
      </View>
      {error && <Text style={[Typography.caption, { color: Colors.error, marginTop: 4 }]}>{error}</Text>}
    </View>
  );
}

// ─── SectionHeader ─────────────────────────────────────────────────────────

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  return (
    <View style={s.sectionHeader}>
      <Text style={[Typography.displaySmall, { color: Colors.textPrimary }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[Typography.labelMedium, { color: Colors.accent }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: ViewStyle }) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  return <View style={[s.divider, style]} />;
}

// ─── InfoRow ───────────────────────────────────────────────────────────────

export function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  return (
    <View style={s.infoRow}>
      <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>{label}</Text>
      <Text style={[Typography.labelMedium, { color: valueColor || Colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>{icon}</View>
      <Text style={[Typography.displaySmall, { color: Colors.textPrimary, marginTop: 12, textAlign: 'center' }]}>{title}</Text>
      <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>{subtitle}</Text>
    </View>
  );
}

// ─── StatCard ──────────────────────────────────────────────────────────────

export function StatCard({ label, value, color, icon }: { label: string; value: string | number; color?: string; icon?: React.ReactNode }) {
  const { Colors } = useTheme();
  const s = styles(Colors);
  return (
    <View style={[s.statCard, { borderColor: color ? color + '33' : Colors.border }]}>
      {icon && <View style={{ marginBottom: 8 }}>{icon}</View>}
      <Text style={[Typography.displayMedium, { color: color || Colors.accent }]}>{value}</Text>
      <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
// Converted to a function of the current palette — called fresh inside each
// component above via `const s = styles(Colors)`, so every style updates
// immediately when the user switches theme.

type ThemeColors = {
  background: string; surface: string; surfaceElevated: string; border: string;
  accent: string; textPrimary: string; textSecondary: string; textMuted: string;
  error: string; errorBg: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  // Button
  btn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSm: { paddingVertical: 8, paddingHorizontal: Spacing.md },
  btnLg: { paddingVertical: 18, paddingHorizontal: Spacing.xl },
  btnPrimary: { backgroundColor: Colors.accent, ...Shadow.accent },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.accent },
  btnGhost: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: Colors.errorBg, borderWidth: 1, borderColor: Colors.error },
  btnDisabled: { opacity: 0.4 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    ...Shadow.card,
  },
  cardElevated: {
    backgroundColor: Colors.surfaceElevated,
  },
  cardAccent: {
    width: 3,
    borderRadius: 3,
    marginRight: Spacing.md,
    alignSelf: 'stretch',
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Input
  inputLabel: {
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  // InfoRow
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // StatCard
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.card,
  },
});
