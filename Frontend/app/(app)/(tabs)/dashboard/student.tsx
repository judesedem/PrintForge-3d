import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import {
  Bell,
  Boxes,
  ChevronRight,
  ClipboardList,
  CloudUpload,
  FileSearch,
  Search,
  Sparkles,
  WalletCards,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { Colors, designTokens } from '@/theme';
import SectionHeader from '@/components/SectionHeader';
import { useSwipeTabs } from '@/SwipeTabsContext';
import { useJobs } from '@/JobsContext';
import JobCard from '@/components/JobCard';
import GhsAmount from '@/components/GhsAmount';

const notifications = [
  { id: 'n1', title: 'Order approved', body: 'PF-2024-0047 is now queued for printing.', unread: true },
  { id: 'n2', title: 'Print ready for pickup', body: 'Your completed model is waiting at Lab C.', unread: true },
];

export default function StudentDashboard() {
  const router = useRouter();
  const { goToTab } = useSwipeTabs();
  const { colors } = useTheme();
  const { jobs } = useJobs();
  const s = makeStyles(colors);

  const activeJobs = jobs.filter(job => !['COMPLETED', 'FAILED', 'REJECTED'].includes(job.status));
  const completedJobs = jobs.filter(job => job.status === 'COMPLETED');
  const totalSpent = jobs.reduce((total, job) => total + job.cost, 0);

  const quickActions = [
    {
      label: 'Upload Model',
      detail: 'STL, OBJ or 3MF',
      icon: CloudUpload,
      onPress: () => goToTab('submit'),
    },
    {
      label: 'Instant Quote',
      detail: 'Price before printing',
      icon: Sparkles,
      onPress: () => goToTab('submit'),
    },
    {
      label: 'My Orders',
      detail: `${activeJobs.length} active prints`,
      icon: ClipboardList,
      onPress: () => goToTab('orders'),
    },
    {
      label: 'Browse Models',
      detail: 'Student-made designs',
      icon: Boxes,
      onPress: () => goToTab('marketplace'),
    },
  ];

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <View style={s.brandGreeting}>
            <View style={s.brandMark}>
              <Boxes size={21} color={colors.onPrimary} strokeWidth={2.4} />
            </View>
            <View>
              <Text style={s.greeting}>Hello, Engineer!</Text>
              <Text style={s.subtitle}>What are we building today?</Text>
            </View>
          </View>

          <View style={s.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              onPress={() => router.push('/notifications')}
              style={({ pressed }) => [s.iconButton, pressed && s.pressed]}
            >
              <Bell size={20} color={colors.foreground} />
              <View style={s.unreadDot} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => goToTab('profile')}
              style={({ pressed }) => [s.avatar, pressed && s.pressed]}
            >
              <Text style={s.avatarText}>K</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.searchBar}>
          <Search size={19} color={colors.mutedFg} />
          <TextInput
            editable={false}
            pointerEvents="none"
            style={s.searchInput}
            placeholder="Search models, categories or labs..."
            placeholderTextColor={colors.mutedFg}
          />
          <View style={s.searchShortcut}>
            <FileSearch size={16} color={colors.primary} />
          </View>
        </View>

        <View style={s.quickHeader}>
          <Text style={s.sectionEyebrow}>QUICK ACTIONS</Text>
          <Pressable onPress={() => goToTab('marketplace')} style={({ pressed }) => pressed && s.pressed}>
            <Text style={s.inlineAction}>Explore all</Text>
          </Pressable>
        </View>

        <View style={s.quickGrid}>
          {quickActions.map(({ label, detail, icon: Icon, onPress }) => (
            <Pressable
              key={label}
              onPress={onPress}
              style={({ pressed }) => [s.quickCard, pressed && s.quickCardPressed]}
            >
              <View style={s.quickIcon}>
                <Icon size={24} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={s.quickLabel}>{label}</Text>
              <Text style={s.quickDetail} numberOfLines={1}>{detail}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sectionEyebrow}>YOUR PRINTING AT A GLANCE</Text>
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: colors.primarySoft }]}>
              <ClipboardList size={18} color={colors.primary} />
            </View>
            <Text style={s.statValue}>{activeJobs.length}</Text>
            <Text style={s.statLabel}>Active orders</Text>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: colors.statusCompleted.bg }]}>
              <Boxes size={18} color={colors.statusCompleted.dot} />
            </View>
            <Text style={s.statValue}>{completedJobs.length}</Text>
            <Text style={s.statLabel}>Completed</Text>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: colors.statusApproved.bg }]}>
              <WalletCards size={18} color={colors.statusApproved.dot} />
            </View>
            <GhsAmount amount={totalSpent} size="sm" style={s.statAmount} />
            <Text style={s.statLabel}>Total spent</Text>
          </View>
        </View>

        <SectionHeader
          label="Active print jobs"
          actionLabel="View all"
          onAction={() => goToTab('orders')}
        />
        {activeJobs.length > 0 ? (
          activeJobs.slice(0, 2).map(job => (
            <JobCard key={job.id} job={job} onPress={() => router.push(`/jobs/${job.id}`)} />
          ))
        ) : (
          <View style={s.emptyCard}>
            <CloudUpload size={28} color={colors.primary} />
            <Text style={s.emptyTitle}>No active print jobs</Text>
            <Text style={s.emptyBody}>Upload a model or order one from the marketplace.</Text>
          </View>
        )}

        <SectionHeader
          label="Recent activity"
          actionLabel="See all"
          onAction={() => router.push('/notifications')}
        />
        <View style={s.activityCard}>
          {notifications.map((note, index) => (
            <Pressable
              key={note.id}
              onPress={() => router.push('/notifications')}
              style={({ pressed }) => [
                s.activityRow,
                index < notifications.length - 1 && s.activityDivider,
                pressed && s.activityPressed,
              ]}
            >
              <View style={s.activityIconWrap}>
                <Bell size={17} color={colors.primary} />
              </View>
              <View style={s.activityCopy}>
                <View style={s.activityTitleRow}>
                  <Text style={s.activityTitle}>{note.title}</Text>
                  {note.unread ? <View style={s.activityUnread} /> : null}
                </View>
                <Text style={s.activityBody}>{note.body}</Text>
              </View>
              <ChevronRight size={17} color={colors.mutedFg} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.lg,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.lg,
      gap: 12,
    },
    brandGreeting: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 },
    brandMark: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    greeting: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 20,
      letterSpacing: -0.35,
    },
    subtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginTop: 2,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    unreadDot: {
      position: 'absolute',
      right: 8,
      top: 7,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.card,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.white, fontFamily: designTokens.type.heading, fontSize: 15 },
    pressed: { opacity: 0.66 },
    searchBar: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingLeft: 14,
      paddingRight: 8,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: designTokens.spacing.xl,
      shadowColor: colors.shadow,
      shadowOpacity: 0.035,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1,
    },
    searchInput: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 14,
    },
    searchShortcut: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionEyebrow: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
      letterSpacing: 0.7,
      marginBottom: 10,
    },
    inlineAction: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 12 },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: designTokens.spacing.xxl,
    },
    quickCard: {
      width: '48%',
      flexGrow: 1,
      minHeight: 116,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
    },
    quickCardPressed: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
      transform: [{ scale: 0.985 }],
    },
    quickIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    quickLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
      marginBottom: 3,
    },
    quickDetail: { color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 11 },
    statsRow: { flexDirection: 'row', gap: 9, marginBottom: designTokens.spacing.xxl },
    statCard: {
      flex: 1,
      minHeight: 122,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      backgroundColor: colors.card,
      padding: 11,
    },
    statIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    statValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 22,
      lineHeight: 26,
      marginBottom: 4,
    },
    statAmount: { fontSize: 16, lineHeight: 26, marginBottom: 4 },
    statLabel: { color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 11 },
    emptyCard: {
      alignItems: 'center',
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: designTokens.spacing.xxl,
      marginBottom: designTokens.spacing.xl,
    },
    emptyTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
      marginTop: 10,
    },
    emptyBody: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 4,
    },
    activityCard: {
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    activityRow: {
      minHeight: 78,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingHorizontal: 13,
      paddingVertical: 12,
    },
    activityDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    activityPressed: { backgroundColor: colors.secondary },
    activityIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityCopy: { flex: 1 },
    activityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    activityTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    activityUnread: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    activityBody: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },
  });
}
