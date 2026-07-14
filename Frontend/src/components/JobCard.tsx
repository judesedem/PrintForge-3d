import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, MapPin } from 'lucide-react-native';
import StatusBadge from './StatusBadge';
import MonoText from './MonoText';
import GhsAmount from './GhsAmount';
import { Job } from '../data/mockData';
import { useTheme } from '../ThemeContext';
import { Colors, designTokens, getMaterialChipColors } from '../theme';

type Props = {
  job: Job;
  onPress?: () => void;
  selected?: boolean;
  /** Optional — set when this job is known to have a COMPLETED payment behind it (see jobs/index.tsx). Defaults to hidden so other callers (dashboard/student.tsx) are unaffected. */
  paid?: boolean;
};

export default function JobCard({ job, onPress, selected, paid }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const material = getMaterialChipColors(colors, job.material);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, selected && s.selectedCard, pressed && s.pressed]}
    >
      <View style={s.topRow}>
        <View style={s.topRowLeft}>
          <StatusBadge status={job.status} />
          {paid ? (
            <View style={s.paidPill}>
              <Text style={s.paidPillText}>PAID</Text>
            </View>
          ) : null}
        </View>
        <MonoText style={s.jobId}>{job.id}</MonoText>
      </View>

      <View style={s.titleRow}>
        <View style={s.titleBlock}>
          <Text style={s.title}>{job.title}</Text>
          <View style={s.locationRow}>
            <MapPin size={13} color={colors.mutedFg} />
            <Text style={s.location}>{job.location}</Text>
          </View>
        </View>
        {onPress ? <ChevronRight size={20} color={colors.mutedFg} /> : null}
      </View>

      <View style={s.divider} />

      <View style={s.bottomRow}>
        <View style={s.metaRow}>
          <View style={[s.materialChip, { backgroundColor: material.backgroundColor }]}>
            <Text style={[s.materialText, { color: material.color }]}>{job.material}</Text>
          </View>
          <Text style={s.metaText}>{job.quality}</Text>
          <Text style={s.metaDot}>•</Text>
          <Text style={s.metaText}>{job.qty} pcs</Text>
        </View>
        <GhsAmount amount={job.cost} size="sm" />
      </View>
    </Pressable>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.md,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    selectedCard: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.12,
    },
    pressed: { opacity: 0.84, transform: [{ scale: 0.995 }] },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 13,
    },
    topRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    paidPill: {
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.statusApproved.bg,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    paidPillText: {
      color: colors.statusApproved.text,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 0.4,
    },
    jobId: {
      color: colors.mutedFg,
      fontSize: 11,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    titleBlock: { flex: 1 },
    title: {
      color: colors.foreground,
      fontSize: 17,
      fontFamily: designTokens.type.heading,
      marginBottom: 5,
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    location: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, flex: 1 },
    materialChip: {
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    materialText: { fontFamily: designTokens.type.heading, fontSize: 10 },
    metaText: { color: colors.mutedFg, fontFamily: designTokens.type.medium, fontSize: 11 },
    metaDot: { color: colors.mutedFg, fontSize: 10 },
  });
}
