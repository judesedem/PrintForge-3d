import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Upload } from 'lucide-react-native';
import { colors } from '@/theme';
import { LISTINGS } from '@/data/mockData';
import ListingCard from '@/components/ListingCard';

const stats = [
  { label: 'Active Listings', value: '3', color: '#A78BFA' },
  { label: 'Total Orders', value: '18', color: '#F97316' },
  { label: 'Earnings June', value: 'GH₵ 4,220', color: '#10B981' },
  { label: 'Avg Rating', value: '4.8 ★', color: '#FBBF24' },
];

export default function DesignerDashboard() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}> 
        <View>
          <Text style={styles.title}>Designer Studio</Text>
          <Text style={styles.subtitle}>Manage your listings and earnings.</Text>
        </View>
        <Pressable style={styles.uploadButton}>
          <Upload size={18} color="#fff" />
          <Text style={styles.uploadText}>Upload New Design</Text>
        </Pressable>
      </View>
      <FlatList
        data={stats}
        keyExtractor={item => item.label}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
        renderItem={({ item }) => (
          <View style={[styles.statCard, { borderColor: colors.border }]}> 
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          </View>
        )}
      />
      <Text style={styles.sectionTitle}>My Listings</Text>
      <FlatList
        data={LISTINGS.slice(0, 6)}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ListingCard listing={item} />
        )}
      />
      <View style={styles.earningsCard}>
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
        {LISTINGS.slice(0, 4).map(item => (
          <View key={item.id} style={styles.earningRow}>
            <Text style={styles.earningTitle}>{item.title}</Text>
            <Text style={styles.earningAmount}>GH₵ {item.price * 8}</Text>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${Math.min(100, item.downloads / 3.5)}%`}]} />
            </View>
          </View>
        ))}
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  uploadText: {
    color: '#fff',
    fontWeight: '700',
  },
  statsRow: {
    gap: 14,
    paddingBottom: 18,
  },
  statCard: {
    width: 180,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  statLabel: {
    color: '#94A3B8',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  list: {
    marginBottom: 18,
    gap: 12,
  },
  earningsCard: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  earningRow: {
    marginBottom: 14,
  },
  earningTitle: {
    color: colors.foreground,
    fontWeight: '700',
    marginBottom: 6,
  },
  earningAmount: {
    color: '#94A3B8',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
});
