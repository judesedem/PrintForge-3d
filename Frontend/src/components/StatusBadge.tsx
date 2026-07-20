import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import { JobStatus } from '../data/mockData';
import { Colors, designTokens } from '../theme';

// label is an optional override for the displayed text — the underlying
// `status` still drives color/dot via statusMap regardless. Added so a
// customer-facing screen can show "QUEUED" for a job that's actually
// SUBMITTED (matching the user story's "Ama checks Orders, sees the job
// as Queued" step — see app/jobs/[id].tsx's usage) without changing what
// staff/queue.tsx (via JobCard, the other consumer of this component)
// shows, where SUBMITTED vs QUEUED is an operationally meaningful
// distinction (needs-approval vs already-approved-and-waiting-to-print)
// that must stay visible. Undefined (the default) preserves the exact
// prior behavior for every other caller.
export default function StatusBadge({ status, label: labelOverride }: { status: JobStatus; label?: string }) {
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
  const label = labelOverride ?? (status === 'IN_PROGRESS' ? 'PRINTING' : status.replace(/_/g, ' '));

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
