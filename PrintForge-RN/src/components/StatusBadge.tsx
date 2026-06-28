import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import { JobStatus } from '../data/mockData';

export default function StatusBadge({ status }: { status: JobStatus }) {
  const { colors } = useTheme();

  const statusMap: Record<JobStatus, { bg: string; text: string }> = {
    SUBMITTED:   colors.statusSubmitted,
    APPROVED:    colors.statusApproved,
    IN_PROGRESS: colors.statusInProgress,
    COMPLETED:   colors.statusCompleted,
    FAILED:      colors.statusFailed,
    REJECTED:    colors.statusRejected,
  };

  const style = statusMap[status];

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '700' },
});
