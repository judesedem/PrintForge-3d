import { View, Text, Pressable, StyleSheet } from 'react-native';
import StatusBadge from './StatusBadge';
import MonoText from './MonoText';
import { Job } from '../data/mockData';
import { MapPin } from 'lucide-react-native';
import { colors } from '../theme';

export default function JobCard({ job, onPress, selected }: { job: Job; onPress?: () => void; selected?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.selectedCard]}>
      <View style={styles.topRow}>
        <StatusBadge status={job.status} />
        <MonoText style={styles.jobId}>{job.id}</MonoText>
      </View>
      <Text style={styles.title}>{job.title}</Text>
      <View style={styles.metaRow}>
        <MonoText style={styles.metaMono}>{job.material} • {job.quality}</MonoText>
        <View style={styles.metaGroup}>
          <MapPin size={12} color="#94A3B8" />
          <Text style={styles.metaText}>{job.location}</Text>
        </View>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.cost}>GH₵ {job.cost.toFixed(2)}</Text>
        <Text style={styles.qty}>{job.qty} pcs</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  selectedCard: {
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.5)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  jobId: {
    color: '#E8EDF5',
    fontSize: 12,
  },
  title: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  metaMono: {
    color: '#94A3B8',
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#94A3B8',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cost: {
    color: colors.foreground,
    fontWeight: '700',
  },
  qty: {
    color: '#94A3B8',
  },
});
