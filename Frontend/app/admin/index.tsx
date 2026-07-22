import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../src/ThemeContext';
import { useSession } from '../../src/SessionContext';
import { designTokens, Colors } from '../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchAdminDashboard, AdminDashboard, fetchUsers, AdminUserDto } from '../../src/api/admin';
import { Briefcase, Printer, Clock, DollarSign, LogOut } from 'lucide-react-native';
import MonoText from '../../src/components/MonoText';

const tabs = ['Users', 'Printers', 'Earnings', 'Logs'] as const;

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'Users' | 'Printers' | 'Earnings' | 'Logs'>('Users');
  const { colors } = useTheme();
  const { token, authLoading, signOut } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = makeStyles(colors, insets);

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
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
      const [dashData, usersData] = await Promise.all([
        fetchAdminDashboard(token),
        fetchUsers(token)
      ]);
      setDashboard(dashData);
      setUsers(usersData);
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
        <View style={s.titleRow}>
          <Text style={s.title}>Admin Panel</Text>
          <Pressable 
            onPress={async () => {
              await signOut();
              router.replace('/(auth)/login');
            }} 
            style={({ pressed }) => [s.logoutButton, pressed && s.pressed]}
          >
            <LogOut size={16} color={colors.destructive ?? '#ff4444'} style={{ marginRight: 6 }} />
            <Text style={s.logoutText}>Logout</Text>
          </Pressable>
        </View>
        <Text style={s.subtitle}>Overview of users, printers, and platform activity.</Text>
      </View>
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <View style={s.statIconWrapper}>
            <Briefcase size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={s.statLabel}>Total Jobs</Text>
            <Text style={s.statValue}>{dashboard.totalJobs}</Text>
          </View>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Printer size={20} color="#3b82f6" />
          </View>
          <View>
            <Text style={s.statLabel}>Total Printers</Text>
            <Text style={s.statValue}>{dashboard.totalPrinters}</Text>
          </View>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Clock size={20} color="#f59e0b" />
          </View>
          <View>
            <Text style={s.statLabel}>Awaiting Review</Text>
            <Text style={s.statValue}>{submittedJobs}</Text>
          </View>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <DollarSign size={20} color="#10b981" />
          </View>
          <View>
            <Text style={s.statLabel}>Owed to Designers</Text>
            <Text style={s.statValue}>GH₵ {totalOwed.toFixed(0)}</Text>
          </View>
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
        <FlatList
          data={users}
          keyExtractor={u => u.user_id.toString()}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.sectionTitle}>No users found</Text>
              <Text style={s.smallText}>Users will appear here once they register.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.rowContent}>
                <Text style={s.rowTitle}>{item.full_name || 'No Name'}</Text>
                <Text style={s.smallText}>{item.email}</Text>
              </View>
              <Text style={s.rowTag}>{item.role}</Text>
            </View>
          )}
        />
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

function makeStyles(colors: Colors, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    screen: { flex: 1, padding: 16, paddingTop: Math.max(16, insets.top + 16), backgroundColor: colors.background },
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
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    title: {
      fontSize: 28,
      fontFamily: designTokens.type.heading,
      color: colors.foreground,
    },
    logoutButton: { 
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8, 
      paddingHorizontal: 14, 
      backgroundColor: 'rgba(255, 68, 68, 0.1)', 
      borderRadius: 12, 
      borderWidth: 1, 
      borderColor: 'rgba(255, 68, 68, 0.2)' 
    },
    logoutText: { color: colors.destructive ?? '#ff4444', fontFamily: designTokens.type.heading, fontSize: 13 },
    subtitle: { color: colors.mutedFg, fontFamily: designTokens.type.body },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    statCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
      width: '48%',
      backgroundColor: colors.card,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    statIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    statLabel: { color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 12, marginBottom: 2 },
    statValue: { fontSize: 22, fontFamily: designTokens.type.heading, color: colors.foreground },
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
