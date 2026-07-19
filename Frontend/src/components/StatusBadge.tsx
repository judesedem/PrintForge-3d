import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import { JobStatus } from '../data/mockData';
import { Colors, designTokens } from '../theme';

export default function StatusBadge({ status }: { status: JobStatus }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const statusMap: Record<JobStatus, { bg: string; text: string; dot: string }> = {
    SUBMITTED: colors.statusSubmitted,
    APPROVED: colors.statusApproved,
    QUEUED: colors.statusQueued,
    PRINTING: colors.statusPrinting,
    IN_PROGRESS: colors.statusInProgress,
    READY: colors.statusReady,
    COMPLETED: colors.statusCompleted,
    COLLECTED: colors.statusCollected,
    FAILED: colors.statusFailed,
    REJECTED: colors.statusRejected,
  };

  const visual = statusMap[status];
  const label = status === 'IN_PROGRESS' ? 'PRINTING' : status.replace(/_/g, ' ');

  return (
    <View style={[s.badge, { backgroundColor: visual.bg }]}>
      <View style={[s.dot, { backgroundColor: visual.dot }]} />
      <Text style={[s.text, { color: visual.text }]}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    badge: {
      minHeight: 28,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: designTokens.radius.pill,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    text: {
      fontSize: 10,
      fontFamily: designTokens.type.heading,
      letterSpacing: 0.5,
    },
  });
}
