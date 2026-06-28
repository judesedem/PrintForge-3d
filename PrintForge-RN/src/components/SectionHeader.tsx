import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';

type Props = { label: string; actionLabel?: string; onAction?: () => void };

export default function SectionHeader({ label, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.mutedFg }]}>{label.toUpperCase()}</Text>
      {actionLabel ? <Pressable onPress={onAction}><Text style={[styles.action, { color: colors.primary }]}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  label: { fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  action: { fontSize: 13, fontWeight: '600' },
});
