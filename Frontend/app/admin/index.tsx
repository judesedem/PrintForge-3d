import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../src/ThemeContext';
import { useSession } from '../../src/SessionContext';
import { designTokens, Colors } from '../../src/theme';
import { fetchAdminDashboard, AdminDashboard } from '../../src/api/admin';
import MonoText from '../../src/components/MonoText';

const tabs = ['Users', 'Printers', 'Earnings', 'Logs'] as const;

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'Users' | 'Printers' | 'Earnings' | 'Logs'>('Users');
  const { colors } = useTheme();
  const { token, authLoading } = useSession();
  const s = makeStyles(colors);

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDashboard(token);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the admin dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  if (loading || error || !dashboard) {
    return (
      <View style={[s.screen, s.centered]}>
        <Text style={s.stateText}>
          {loading ? 'Loading admin dashboard…' : error ?? 'No dashboard data available.'}
        </Text>
        {error ? (
          <Pressable
            accessibilityRole="button"
            onPress={load}
            style={({ pressed }) => [s.retryButton, pressed && s.pressed]}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const printerStatusRows = Object.entries(dashboard.printersByStatus);
  const submittedJobs = dashboard.jobsByStatus['SUBMITTED'] ?? 0;
  const totalOwed = dashboard.designerEarnings.reduce((sum, e) => sum + e.totalOwed, 0);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Admin Panel</Text>
        <Text style={s.subtitle}>Overview of users, printers, and platform activity.</Text>
      </View>
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Total Jobs</Text>
          <Text style={s.statValue}>{dashboard.totalJobs}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Total Printers</Text>
          <Text style={s.statValue}>{dashboard.totalPrinters}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Awaiting Review</Text>
          <Text style={s.statValue}>{submittedJobs}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Owed to Designers</Text>
          <Text style={s.statValue}>GH₵ {totalOwed.toFixed(0)}</Text>
        </View>
      </View>
      <View style={s.tabRow}>
        {tabs.map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[s.tabItem, activeTab === tab && s.tabItemActive]}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'Users' ? (
        // The backend has no user-listing endpoint (only POST /api/admin/users
        // to create one) — nothing honest to show here yet.
        <View style={s.emptyState}>
          <Text style={s.sectionTitle}>User directory not available yet</Text>
          <Text style={s.smallText}>
            The backend doesn't expose a user-listing endpoint yet — only account creation
            (POST /api/admin/users). This tab will list real accounts once that exists.
          </Text>
        </View>
      ) : activeTab === 'Printers' ? (
        <FlatList
          data={printerStatusRows}
          keyExtractor={([status]) => status}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.sectionTitle}>No printers registered</Text>
              <Text style={s.smallText}>Printer status counts will appear here once printers exist.</Text>
            </View>
          }
          renderItem={({ item: [status, count] }) => (
            <View style={s.printerCard}>
              <View style={s.printerHeader}>
                <MonoText>{status}</MonoText>
              </View>
              <Text style={s.smallMono}>{count} printer{count === 1 ? '' : 's'}</Text>
            </View>
          )}
        />
      ) : activeTab === 'Earnings' ? (
        <FlatList
          data={dashboard.designerEarnings}
          keyExtractor={(item, index) => `${item.designerName}-${index}`}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.sectionTitle}>No designer earnings yet</Text>
              <Text style={s.smallText}>Payouts owed to designers will appear here once orders come in.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.rowContent}>
                <Text style={s.rowTitle}>{item.designerName}</Text>
              </View>
              <Text style={s.rowTag}>GH₵ {item.totalOwed.toFixed(2)}</Text>
            </View>
          )}
        />
      ) : (
        <View style={s.emptyState}>
          <Text style={s.sectionTitle}>Activity logs will appear here.</Text>
          <Text style={s.smallText}>Operational logs, alerts, and admin actions land here.</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, padding: 16, backgroundColor: colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    stateText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: designTokens.spacing.md,
    },
    retryButton: {
      minHeight: 42,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: designTokens.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 13 },
    pressed: { opacity: 0.72 },
    header: { marginBottom: 18 },
    title: {
      fontSize: 28,
      fontFamily: designTokens.type.heading,
      marginBottom: 6,
      color: colors.foreground,
    },
    subtitle: { color: colors.mutedFg, fontFamily: designTokens.type.body },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
    statCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      width: '48%',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    statLabel: { color: colors.mutedFg, fontFamily: designTokens.type.body, marginBottom: 6 },
    statValue: { fontSize: 20, fontFamily: designTokens.type.heading, color: colors.foreground },
    tabRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
    tabItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    tabItemActive: { borderColor: colors.primary },
    tabText: { fontFamily: designTokens.type.heading, color: colors.foreground },
    tabTextActive: { color: colors.primary },
    row: {
      marginBottom: 14,
      padding: 14,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    rowTitle: {
      fontFamily: designTokens.type.heading,
      marginVertical: 4,
      color: colors.foreground,
    },
    smallText: { color: colors.mutedFg, fontFamily: designTokens.type.body },
    printerCard: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    printerHeader: { marginBottom: 0 },
    smallMono: { color: colors.mutedFg, fontFamily: designTokens.type.mono },
    rowContent: { flex: 1, marginLeft: 0 },
    rowTag: { fontFamily: designTokens.type.heading, color: colors.primary },
    emptyState: { padding: 18, borderRadius: 16, backgroundColor: colors.card, gap: 6 },
    sectionTitle: { fontSize: 18, fontFamily: designTokens.type.heading, color: colors.foreground },
  });
}
