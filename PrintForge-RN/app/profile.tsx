import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, CreditCard, Calendar, Bell, Moon, LogOut, MessageCircle, HeadphonesIcon, ChevronRight, FileText, Scale } from 'lucide-react-native';
import { useTheme } from '../src/ThemeContext';
import { JOBS } from '../src/data/mockData';

const user = {
  name: 'Kwame Mensah',
  initials: 'KM',
  role: 'Student',
  email: 'kwame@knust.edu.gh',
  studentId: '20910034',
  joined: 'Jan 2024',
};

const APP_VERSION = '1.0.0';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();

  const totalJobs = JOBS.length;
  const activeJobs = JOBS.filter(j => ['IN_PROGRESS', 'APPROVED', 'SUBMITTED'].includes(j.status)).length;
  const totalSpent = JOBS.reduce((sum, j) => sum + j.cost, 0);

  const s = makeStyles(colors);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user.initials}</Text>
          </View>
          <Text style={s.userName}>{user.name}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{user.role}</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statVal}>{totalJobs}</Text>
            <Text style={s.statLabel}>Total jobs</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>GH₵{totalSpent.toFixed(0)}</Text>
            <Text style={s.statLabel}>Total spent</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>{activeJobs}</Text>
            <Text style={s.statLabel}>Active</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>Account details</Text>
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Mail size={16} color={colors.mutedFg} />
            <Text style={s.infoLabel}>Email</Text>
            <Text style={s.infoVal}>{user.email}</Text>
          </View>
          <View style={[s.infoRow, s.infoRowBorder]}>
            <CreditCard size={16} color={colors.mutedFg} />
            <Text style={s.infoLabel}>Student ID</Text>
            <Text style={[s.infoVal, s.monoVal]}>{user.studentId}</Text>
          </View>
          <View style={[s.infoRow, s.infoRowBorder]}>
            <Calendar size={16} color={colors.mutedFg} />
            <Text style={s.infoLabel}>Joined</Text>
            <Text style={s.infoVal}>{user.joined}</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>Preferences</Text>
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Bell size={16} color={colors.mutedFg} />
            <Text style={s.infoLabel}>Notifications</Text>
            <Switch
              value={true}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[s.infoRow, s.infoRowBorder]}>
            <Moon size={16} color={colors.mutedFg} />
            <Text style={s.infoLabel}>Dark mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={s.sectionLabel}>Support</Text>
        <View style={s.infoCard}>
          <Pressable style={s.infoRow} onPress={() => Linking.openURL('mailto:support@printforge.app')}>
            <MessageCircle size={16} color={colors.mutedFg} />
            <Text style={s.infoLabel}>Contact us</Text>
            <ChevronRight size={16} color={colors.mutedFg} />
          </Pressable>
          <Pressable style={[s.infoRow, s.infoRowBorder]} onPress={() => Linking.openURL('https://printforge.app/support')}>
            <HeadphonesIcon size={16} color={colors.mutedFg} />
            <Text style={s.infoLabel}>Support center</Text>
            <ChevronRight size={16} color={colors.mutedFg} />
          </Pressable>
        </View>

        <Text style={s.sectionLabel}>Legal</Text>
        <View style={s.infoCard}>
          <Pressable style={s.infoRow} onPress={() => Linking.openURL('https://printforge.app/terms')}>
            <FileText size={16} color={colors.mutedFg} />
            <Text style={s.infoLabel}>Terms and conditions</Text>
            <ChevronRight size={16} color={colors.mutedFg} />
          </Pressable>
          <Pressable style={[s.infoRow, s.infoRowBorder]} onPress={() => Linking.openURL('https://printforge.app/privacy')}>
            <Scale size={16} color={colors.mutedFg} />
            <Text style={s.infoLabel}>Privacy policy</Text>
            <ChevronRight size={16} color={colors.mutedFg} />
          </Pressable>
        </View>

        <Pressable style={s.signOutBtn} onPress={() => router.replace('/(auth)/login')}>
          <LogOut size={18} color={colors.destructive} />
          <Text style={s.signOutText}>Sign out</Text>
        </Pressable>

        <Text style={s.versionText}>PrintForge v{APP_VERSION}</Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.sidebar, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.sidebarBorder, gap: 10 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText: { color: colors.primary, fontSize: 14 },
    headerTitle: { color: colors.foreground, fontSize: 16, fontWeight: '500' },
    content: { paddingBottom: 40 },
    avatarSection: { alignItems: 'center', paddingVertical: 28 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(249,115,22,0.3)' },
    avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
    userName: { color: colors.foreground, fontSize: 20, fontWeight: '600', marginBottom: 8 },
    roleBadge: { backgroundColor: 'rgba(249,115,22,0.15)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4 },
    roleText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, alignItems: 'center' },
    statVal: { color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: 4 },
    statLabel: { color: colors.mutedFg, fontSize: 10 },
    sectionLabel: { color: colors.mutedFg, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 8 },
    infoCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 16, marginBottom: 20, overflow: 'hidden' },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    infoRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    infoLabel: { color: colors.mutedFg, fontSize: 13, flex: 1 },
    infoVal: { color: colors.foreground, fontSize: 13 },
    monoVal: { fontFamily: 'JetBrainsMono_400Regular' },
    signOutBtn: { marginHorizontal: 16, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    signOutText: { color: colors.destructive, fontSize: 15, fontWeight: '600' },
    versionText: { textAlign: 'center', color: colors.mutedFg, fontSize: 12, marginTop: 24 },
  });
}