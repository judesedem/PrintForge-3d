import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../src/ThemeContext';
import { useSession } from '../../src/SessionContext';
import { designTokens, Colors } from '../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  fetchAdminDashboard, AdminDashboard, fetchUsers, AdminUserDto,
  createUser, deleteUser, AdminCreatableRole, Printer, fetchPrinters, createPrinter, deletePrinter,
  Report, fetchReports, updateReportStatus, deleteReport, AdminJobDto, fetchJobs, deleteJob
} from '../../src/api/admin';
import { Briefcase, Printer as PrinterIcon, Clock, DollarSign, LogOut, Trash2, AlertCircle, Box } from 'lucide-react-native';
import MonoText from '../../src/components/MonoText';

const tabs = ['Users', 'Printers', 'Jobs', 'Analytics', 'Reports'] as const;

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'Users' | 'Printers' | 'Jobs' | 'Analytics' | 'Reports'>('Users');
  const { colors } = useTheme();
  const { token, authLoading, signOut } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = makeStyles(colors, insets);

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [jobs, setJobs] = useState<AdminJobDto[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User Filter State
  const [userSearch, setUserSearch] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Forms State
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'STUDENT' as AdminCreatableRole });
  const [newPrinter, setNewPrinter] = useState({ printer_name: '', lab_location: '' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [creatingPrinter, setCreatingPrinter] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dashData = await fetchAdminDashboard(token);
      setDashboard(dashData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the admin dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadTabData = useCallback(async () => {
    if (!token) return;
    try {
      if (activeTab === 'Users') setUsers(await fetchUsers(token));
      else if (activeTab === 'Printers') setPrinters(await fetchPrinters(token));
      else if (activeTab === 'Jobs') setJobs(await fetchJobs(token));
      else if (activeTab === 'Reports') {
        const page = await fetchReports(token);
        setReports(page.content);
      }
    } catch (err) {
      console.warn("Failed to load tab data", err);
    }
  }, [token, activeTab]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  if (loading || error || !dashboard) {
    return (
      <View style={[s.screen, s.centered]}>
        <Text style={s.stateText}>
          {loading ? 'Loading admin dashboard…' : error ?? 'No dashboard data available.'}
        </Text>
        {error ? (
          <Pressable accessibilityRole="button" onPress={load} style={({ pressed }) => [s.retryButton, pressed && s.pressed]}>
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const submittedJobs = dashboard.jobsByStatus['SUBMITTED'] ?? 0;
  const printingJobs = dashboard.jobsByStatus['PRINTING'] ?? 0;
  const totalOwed = dashboard.designerEarnings.reduce((sum, e) => sum + e.totalOwed, 0);

  const handleCreateUser = async () => {
    if (!token || !newUser.email || !newUser.password) return;
    setCreatingUser(true);
    try {
      await createUser(token, { ...newUser, confirm_password: newUser.password });
      setNewUser({ full_name: '', email: '', password: '', role: 'STUDENT' });
      setUsers(await fetchUsers(token));
    } catch (e) {
      alert("Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = (id: number) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this user? All their associated data will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await deleteUser(token, id);
              setUsers(await fetchUsers(token));
            } catch (e) {
              alert("Failed to delete user. Make sure they don't have constraints or cascade delete is configured.");
            }
          }
        }
      ]
    );
  };

  const handleCreatePrinter = async () => {
    if (!token || !newPrinter.printer_name) return;
    setCreatingPrinter(true);
    try {
      await createPrinter(token, newPrinter);
      setNewPrinter({ printer_name: '', lab_location: '' });
      setPrinters(await fetchPrinters(token));
    } catch (e) {
      alert("Failed to create printer");
    } finally {
      setCreatingPrinter(false);
    }
  };

  const handleDeletePrinter = (id: number) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this printer?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await deletePrinter(token, id);
              setPrinters(await fetchPrinters(token));
            } catch (e) {
              alert("Failed to delete printer");
            }
          }
        }
      ]
    );
  };

  const handleDeleteJob = (id: number) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this print job?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await deleteJob(token, id);
              setJobs(await fetchJobs(token));
            } catch (e) {
              alert("Failed to delete job");
            }
          }
        }
      ]
    );
  };

  const handleDeleteReport = (id: number) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this report?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await deleteReport(token, id);
              const page = await fetchReports(token);
              setReports(page.content);
            } catch (e) {
              alert("Failed to delete report");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text style={s.title}>Admin Panel</Text>
          <Pressable 
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                      await signOut();
                      router.replace('/(auth)/login');
                    },
                  },
                ]
              );
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
            <PrinterIcon size={20} color="#3b82f6" />
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
        <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
          {tabs.map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.tabItem, activeTab === tab && s.tabItemActive]}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'Users' ? (
          <View>
            <View style={s.formContainer}>
              <Text style={s.sectionTitle}>Add New User</Text>
              <TextInput style={s.input} placeholderTextColor={colors.mutedFg} placeholder="Full Name" value={newUser.full_name} onChangeText={t => setNewUser(p => ({ ...p, full_name: t }))} />
              <TextInput style={s.input} placeholderTextColor={colors.mutedFg} placeholder="Email" value={newUser.email} onChangeText={t => setNewUser(p => ({ ...p, email: t }))} autoCapitalize="none" />
              <TextInput style={s.input} placeholderTextColor={colors.mutedFg} placeholder="Password" value={newUser.password} onChangeText={t => setNewUser(p => ({ ...p, password: t }))} secureTextEntry />
              <View style={s.roleRow}>
                {['STUDENT', 'DESIGNER', 'LAB_STAFF', 'ADMIN'].map(role => (
                  <Pressable key={role} onPress={() => setNewUser(p => ({ ...p, role: role as AdminCreatableRole }))} style={[s.roleChip, newUser.role === role && s.roleChipActive]}>
                    <Text style={[s.roleText, newUser.role === role && s.roleTextActive]}>{role}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={handleCreateUser} style={s.primaryButton}>
                {creatingUser ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryButtonText}>Create User</Text>}
              </Pressable>
            </View>

            <TextInput
              style={[s.input, { marginBottom: 16 }]}
              placeholderTextColor={colors.mutedFg}
              placeholder="Search users..."
              value={userSearch}
              onChangeText={setUserSearch}
            />

            {(() => {
              const filtered = users.filter(u =>
                (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || false) ||
                (u.email?.toLowerCase().includes(userSearch.toLowerCase()) || false)
              );
              const displayUsers = (!showAllUsers && userSearch === '') ? filtered.slice(0, 5) : filtered;

              return (
                <View>
                  {displayUsers.length === 0 ? (
                    <View style={s.emptyState}><Text style={s.smallText}>No users found.</Text></View>
                  ) : (
                    displayUsers.map(u => (
                      <View key={u.user_id} style={s.row}>
                        <View style={s.rowContent}>
                          <Text style={s.rowTitle}>{u.full_name || 'No Name'}</Text>
                          <Text style={s.smallText}>{u.email}</Text>
                        </View>
                        <View style={[s.badge, { backgroundColor: u.suspended ? 'rgba(239,68,68,0.2)' : colors.primarySoft }]}>
                          <Text style={[s.badgeText, { color: u.suspended ? '#EF4444' : colors.primary }]}>{u.role}</Text>
                        </View>
                        {(u.role !== 'ADMIN' && u.role !== 'LAB_STAFF') && (
                          <Pressable onPress={() => handleDeleteUser(u.user_id)} style={{ marginLeft: 12, padding: 8 }}>
                            <Trash2 size={16} color={colors.destructive} />
                          </Pressable>
                        )}
                      </View>
                    ))
                  )}

                  {!showAllUsers && userSearch === '' && users.length > 5 && (
                    <Pressable onPress={() => setShowAllUsers(true)} style={[s.primaryButton, { marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                      <Text style={[s.primaryButtonText, { color: colors.foreground }]}>Show All Users</Text>
                    </Pressable>
                  )}
                  {showAllUsers && userSearch === '' && users.length > 5 && (
                    <Pressable onPress={() => setShowAllUsers(false)} style={[s.primaryButton, { marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                      <Text style={[s.primaryButtonText, { color: colors.foreground }]}>Show Less</Text>
                    </Pressable>
                  )}
                </View>
              );
            })()}
          </View>
        ) : activeTab === 'Printers' ? (
          <View>
            <View style={s.formContainer}>
              <Text style={s.sectionTitle}>Register Printer</Text>
              <TextInput style={s.input} placeholderTextColor={colors.mutedFg} placeholder="Printer Name (e.g. PRN-01)" value={newPrinter.printer_name} onChangeText={t => setNewPrinter(p => ({ ...p, printer_name: t }))} />
              <TextInput style={s.input} placeholderTextColor={colors.mutedFg} placeholder="Lab Location" value={newPrinter.lab_location} onChangeText={t => setNewPrinter(p => ({ ...p, lab_location: t }))} />
              <Pressable onPress={handleCreatePrinter} style={s.primaryButton}>
                {creatingPrinter ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryButtonText}>Add Printer</Text>}
              </Pressable>
            </View>

            {printers.length === 0 ? (
              <View style={s.emptyState}><Text style={s.smallText}>No printers registered yet.</Text></View>
            ) : (
              printers.map(p => (
                <View key={p.id} style={s.printerCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{p.printerName}</Text>
                    <Text style={s.smallText}>{p.labLocation}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: p.status === 'AVAILABLE' ? 'rgba(34,197,94,0.15)' : colors.inputBg }]}>
                    <Text style={[s.badgeText, { color: p.status === 'AVAILABLE' ? '#22C55E' : colors.mutedFg }]}>{p.status}</Text>
                  </View>
                  <Pressable onPress={() => handleDeletePrinter(p.id)} style={{ marginLeft: 12, padding: 8 }}>
                    <Trash2 size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : activeTab === 'Jobs' ? (
          <View>
            {jobs.length === 0 ? (
              <View style={s.emptyState}><Text style={s.smallText}>No print jobs found.</Text></View>
            ) : (
              jobs.map(j => (
                <View key={j.id} style={s.printerCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>Job #{j.id}</Text>
                    <Text style={s.smallText}>Material: {j.material} | Qty: {j.qty}</Text>
                    <Text style={s.smallText}>Cost: GH₵ {j.cost?.toFixed(2)}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: colors.inputBg }]}>
                    <Text style={[s.badgeText, { color: colors.mutedFg }]}>{j.status}</Text>
                  </View>
                  <Pressable onPress={() => handleDeleteJob(j.id)} style={{ marginLeft: 12, padding: 8 }}>
                    <Trash2 size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : activeTab === 'Analytics' ? (
          <View>
            <View style={s.analyticsSection}>
              <Text style={s.sectionTitle}>Material Usage Trends</Text>
              {Object.entries(dashboard.materialUsage || {}).length === 0 ? (
                <Text style={s.smallText}>No material usage data available.</Text>
              ) : (
                <View style={s.chipsRow}>
                  {Object.entries(dashboard.materialUsage).map(([mat, count]) => (
                    <View key={mat} style={s.materialChip}>
                      <Box size={16} color={colors.primary} />
                      <Text style={s.materialLabel}>{mat}</Text>
                      <Text style={s.materialCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={s.analyticsSection}>
              <Text style={s.sectionTitle}>System Bottlenecks</Text>
              {submittedJobs > 10 && (
                <View style={s.alertBox}>
                  <AlertCircle size={18} color="#f59e0b" />
                  <Text style={s.alertText}>High queue of {submittedJobs} jobs awaiting review!</Text>
                </View>
              )}
              {printingJobs > dashboard.totalPrinters && (
                <View style={[s.alertBox, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                  <AlertCircle size={18} color="#EF4444" />
                  <Text style={[s.alertText, { color: '#EF4444' }]}>Printing jobs ({printingJobs}) exceed registered printers ({dashboard.totalPrinters}). System may be overloaded.</Text>
                </View>
              )}
              {submittedJobs <= 10 && printingJobs <= dashboard.totalPrinters && (
                <Text style={s.smallText}>No critical bottlenecks detected in the printing pipeline.</Text>
              )}
            </View>

            <View style={s.analyticsSection}>
              <Text style={s.sectionTitle}>Designer Payouts</Text>
              {dashboard.designerEarnings.map((item, i) => (
                <View key={i} style={s.row}>
                  <Text style={s.rowTitle}>{item.designerName}</Text>
                  <Text style={s.rowTag}>GH₵ {item.totalOwed.toFixed(2)}</Text>
                </View>
              ))}
              {dashboard.designerEarnings.length === 0 && (
                <Text style={s.smallText}>No designer payouts currently pending.</Text>
              )}
            </View>
          </View>
        ) : (
          <View>
            {reports.length === 0 ? (
              <View style={s.emptyState}><Text style={s.smallText}>No moderation reports found.</Text></View>
            ) : (
              reports.map(r => (
                <View key={r.id} style={s.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={s.rowTitle}>Report #{r.id}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[s.badge, { backgroundColor: r.status === 'RESOLVED' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                        <Text style={[s.badgeText, { color: r.status === 'RESOLVED' ? '#22C55E' : '#f59e0b' }]}>{r.status}</Text>
                      </View>
                      <Pressable onPress={() => handleDeleteReport(r.id)} style={{ marginLeft: 12, padding: 4 }}>
                        <Trash2 size={16} color={colors.destructive} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={s.smallText}>Target: {r.targetType} #{r.targetId}</Text>
                  <Text style={[s.smallText, { marginTop: 4 }]}>Reason: {r.reason}</Text>
                  {r.status === 'PENDING' && (
                    <Pressable onPress={async () => {
                      if(token) {
                        await updateReportStatus(token, r.id, 'RESOLVED');
                        loadTabData();
                      }
                    }} style={[s.primaryButton, { marginTop: 12, paddingVertical: 8 }]}>
                      <Text style={s.primaryButtonText}>Mark as Resolved</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: Colors, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    screen: { flex: 1, padding: 16, paddingTop: Math.max(16, insets.top + 16), backgroundColor: colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    stateText: { color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 13, textAlign: 'center', marginBottom: designTokens.spacing.md },
    retryButton: { minHeight: 42, borderRadius: designTokens.radius.md, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: designTokens.spacing.lg, alignItems: 'center', justifyContent: 'center' },
    retryText: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 13 },
    pressed: { opacity: 0.72 },
    header: { marginBottom: 18 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    title: { fontSize: 28, fontFamily: designTokens.type.heading, color: colors.foreground },
    logoutButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, backgroundColor: 'rgba(255, 68, 68, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.2)' },
    logoutText: { color: colors.destructive ?? '#ff4444', fontFamily: designTokens.type.heading, fontSize: 13 },
    subtitle: { color: colors.mutedFg, fontFamily: designTokens.type.body },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    statCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 16, width: '48%', backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    statIconWrapper: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    statLabel: { color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 12, marginBottom: 2 },
    statValue: { fontSize: 22, fontFamily: designTokens.type.heading, color: colors.foreground },
    tabRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
    tabItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: 'transparent' },
    tabItemActive: { borderColor: colors.primary },
    tabText: { fontFamily: designTokens.type.heading, color: colors.foreground },
    tabTextActive: { color: colors.primary },
    row: { marginBottom: 14, padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card },
    rowTitle: { fontFamily: designTokens.type.heading, marginVertical: 4, color: colors.foreground },
    smallText: { color: colors.mutedFg, fontFamily: designTokens.type.body },
    rowContent: { flex: 1, marginLeft: 0 },
    rowTag: { fontFamily: designTokens.type.heading, color: colors.primary },
    emptyState: { padding: 18, borderRadius: 16, backgroundColor: colors.card, gap: 6, alignItems: 'center' },
    sectionTitle: { fontSize: 18, fontFamily: designTokens.type.heading, color: colors.foreground, marginBottom: 12 },
    formContainer: { backgroundColor: colors.card, padding: 16, borderRadius: 16, marginBottom: 20 },
    input: { backgroundColor: colors.inputBg, color: colors.foreground, padding: 14, borderRadius: 12, marginBottom: 10, fontFamily: designTokens.type.body },
    primaryButton: { backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    primaryButtonText: { color: '#fff', fontFamily: designTokens.type.heading },
    roleRow: { flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap' },
    roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
    roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    roleText: { color: colors.mutedFg, fontSize: 12, fontFamily: designTokens.type.heading },
    roleTextActive: { color: colors.primary },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontFamily: designTokens.type.heading },
    printerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 16, marginBottom: 12 },
    analyticsSection: { marginBottom: 24, backgroundColor: colors.card, padding: 16, borderRadius: 16 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    materialChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, padding: 12, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: colors.border },
    materialLabel: { color: colors.foreground, fontFamily: designTokens.type.medium },
    materialCount: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 16 },
    alertBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(245,158,11,0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', marginBottom: 12 },
    alertText: { color: '#f59e0b', fontFamily: designTokens.type.medium, flex: 1 },
    card: { backgroundColor: colors.card, padding: 16, borderRadius: 16, marginBottom: 12 },
  });
}
