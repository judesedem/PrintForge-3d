import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../../src/ThemeContext';
import { JOBS, LISTINGS, PRINTERS } from '../../src/data/mockData';
import StatusBadge from '../../src/components/StatusBadge';
import MonoText from '../../src/components/MonoText';

const tabs = ['Users', 'Printers', 'Earnings', 'Logs'] as const;

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'Users' | 'Printers' | 'Earnings' | 'Logs'>('Users');
  const { colors } = useTheme(); // ✅ hook called inside the component

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Admin Panel</Text>
        <Text style={styles.subtitle}>Overview of users, printers, and platform activity.</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={styles.statLabel}>Total Users</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>128</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={styles.statLabel}>Active Printers</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>4</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={styles.statLabel}>Monthly Revenue</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>GH₵ 35,400</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={styles.statLabel}>Jobs This Month</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>84</Text>
        </View>
      </View>
      <View style={styles.tabRow}>
        {tabs.map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabItem,
              { backgroundColor: colors.secondary },
              activeTab === tab && { borderColor: colors.primary, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.foreground }]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'Users' ? (
        <FlatList
          data={[...Array(6).keys()].map(i => ({
            id: `U${i}`, name: `User ${i + 1}`, email: `user${i + 1}@printforge.com`,
            role: i % 2 === 0 ? 'Designer' : 'Student', jobs: 8 + i, spent: 120 + i * 15, joined: '2026-04-12',
          }))}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.secondary }]}>
              <MonoText>{item.id}</MonoText>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={styles.smallText}>{item.email}</Text>
              </View>
              <Text style={[styles.rowTag, { color: colors.primary }]}>{item.role}</Text>
            </View>
          )}
        />
      ) : activeTab === 'Printers' ? (
        <FlatList
          data={PRINTERS}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.printerCard, { backgroundColor: colors.secondary }]}>
              <View style={styles.printerHeader}>
                <MonoText>{item.name}</MonoText>
                <Text style={styles.smallText}>{item.location}</Text>
              </View>
              <Text style={styles.smallMono}>{item.status}</Text>
            </View>
          )}
        />
      ) : activeTab === 'Earnings' ? (
        <View style={[styles.emptyState, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>June Revenue</Text>
          <Text style={styles.smallText}>Revenue charts and payouts will display here.</Text>
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Activity logs will appear here.</Text>
          <Text style={styles.smallText}>Operational logs, alerts, and admin actions land here.</Text>
        </View>
      )}
    </View>
  );
}

// ✅ Only static/layout values here — no colors
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  header: { marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#94A3B8' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  statCard: { borderRadius: 16, borderWidth: 1, padding: 16, width: '48%' },
  statLabel: { color: '#94A3B8', marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  tabItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999 },
  tabText: { fontWeight: '700' },
  row: { marginBottom: 14, padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontWeight: '700', marginVertical: 4 },
  smallText: { color: '#94A3B8' },
  printerCard: { borderRadius: 16, padding: 16, marginBottom: 14 },
  printerHeader: { marginBottom: 8 },
  smallMono: { color: '#94A3B8', fontFamily: 'JetBrainsMono_400Regular' },
  rowContent: { flex: 1, marginLeft: 12 },
  rowTag: { fontWeight: '700' },
  emptyState: { padding: 18, borderRadius: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
});