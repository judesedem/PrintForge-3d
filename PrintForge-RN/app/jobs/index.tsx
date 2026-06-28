import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { JOBS } from '../../src/data/mockData';
import { colors } from '../../src/theme';
import StatusBadge from '../../src/components/StatusBadge';
import MonoText from '../../src/components/MonoText';
import Card from '../../src/components/Card';

export default function JobsList() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Print Jobs</Text>
        <Text style={styles.subtitle}>Browse all active queue items and completed work.</Text>
      </View>
      <FlatList
        data={JOBS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/jobs/${item.id}`)}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View>
                  <MonoText style={styles.jobId}>{item.id}</MonoText>
                  <Text style={styles.jobTitle}>{item.title}</Text>
                  <Text style={styles.jobMeta}>{item.student} · {item.material}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={styles.bottomRow}>
                <Text style={styles.cost}>GH₵ {item.cost.toFixed(2)}</Text>
                <Text style={styles.qty}>{item.qty} pcs</Text>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  jobId: {
    color: '#94A3B8',
    marginBottom: 6,
  },
  jobTitle: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  jobMeta: {
    color: '#94A3B8',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  cost: {
    color: colors.foreground,
    fontWeight: '700',
  },
  qty: {
    color: '#94A3B8',
  },
});