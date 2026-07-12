import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  Headphones,
  LogOut,
  Mail,
  Moon,
  PackageCheck,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  WalletCards,
} from 'lucide-react-native';
import { useTheme } from '../src/ThemeContext';
import { useJobs } from '../src/JobsContext';
import { useSession } from '../src/SessionContext';
import { Colors, designTokens } from '../src/theme';
import Card from '../src/components/Card';
import GhsAmount from '../src/components/GhsAmount';

const user = {
  name: 'Kwame Mensah',
  initials: 'KM',
  role: 'STUDENT',
  email: 'kwame@knust.edu.gh',
  studentId: '20910034',
  joined: 'January 2024',
};

const APP_VERSION = '1.0.0';

export function ProfileContent({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { jobs } = useJobs();
  const { signOut } = useSession();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(job =>
    ['IN_PROGRESS', 'PRINTING', 'QUEUED', 'APPROVED', 'SUBMITTED'].includes(job.status),
  ).length;
  const completedJobs = jobs.filter(job => job.status === 'COMPLETED').length;
  const totalSpent = jobs.reduce((sum, job) => sum + job.cost, 0);

  const s = makeStyles(colors);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={s.screen} edges={embedded ? [] : ['top']}>
      <View style={s.header}>
        {embedded ? (
          <View style={s.headerMark}>
            <UserRound size={20} color={colors.primary} />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [s.iconButton, pressed && s.iconButtonPressed]}
          >
            <ArrowLeft size={21} color={colors.foreground} />
          </Pressable>
        )}
        <View style={s.headerCopy}>
          <Text style={s.eyebrow}>ACCOUNT</Text>
          <Text style={s.headerTitle}>Profile & settings</Text>
        </View>
        {embedded ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => router.push('/notifications')}
            style={({ pressed }) => [s.iconButton, pressed && s.iconButtonPressed]}
          >
            <Bell size={20} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={s.headerMark}>
            <UserRound size={20} color={colors.primary} />
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <Card style={s.profileCard}>
          <View style={s.profileTop}>
            <View style={s.avatarWrap}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{user.initials}</Text>
              </View>
              <View style={s.verifiedDot}>
                <ShieldCheck size={13} color={colors.white} />
              </View>
            </View>

            <View style={s.profileCopy}>
              <Text style={s.userName}>{user.name}</Text>
              <View style={s.roleRow}>
                <View style={s.roleBadge}>
                  <Text style={s.roleText}>{user.role}</Text>
                </View>
                <Text style={s.campusText}>University print account</Text>
              </View>
            </View>
          </View>

          <View style={s.profileDivider} />

          <View style={s.profileMetaRow}>
            <View style={s.profileMetaItem}>
              <Mail size={15} color={colors.mutedFg} />
              <Text style={s.profileMetaText} numberOfLines={1}>{user.email}</Text>
            </View>
            <View style={s.profileMetaItemRight}>
              <CalendarDays size={15} color={colors.mutedFg} />
              <Text style={s.profileMetaText}>Since {user.joined}</Text>
            </View>
          </View>
        </Card>

        <View style={s.statsRow}>
          <Card style={s.statCard}>
            <View style={s.statIconOrange}>
              <PackageCheck size={18} color={colors.primary} />
            </View>
            <Text style={s.statValue}>{totalJobs}</Text>
            <Text style={s.statLabel}>Total orders</Text>
          </Card>
          <Card style={s.statCard}>
            <View style={s.statIconBlue}>
              <Sparkles size={18} color={colors.info} />
            </View>
            <Text style={s.statValue}>{activeJobs}</Text>
            <Text style={s.statLabel}>Active prints</Text>
          </Card>
          <Card style={s.statCard}>
            <View style={s.statIconGreen}>
              <ShieldCheck size={18} color={colors.success} />
            </View>
            <Text style={s.statValue}>{completedJobs}</Text>
            <Text style={s.statLabel}>Completed</Text>
          </Card>
        </View>

        <Card style={s.spendCard}>
          <View style={s.spendIcon}>
            <WalletCards size={21} color={colors.primary} />
          </View>
          <View style={s.spendCopy}>
            <Text style={s.spendLabel}>TOTAL PRINT SPEND</Text>
            <GhsAmount amount={totalSpent} size="lg" style={s.spendAmount} />
          </View>
          <View style={s.spendPill}>
            <Text style={s.spendPillText}>{totalJobs} orders</Text>
          </View>
        </Card>

        <SectionTitle label="ACCOUNT DETAILS" title="Your information" styles={s} />
        <View style={s.settingsCard}>
          <SettingsRow
            icon={<Mail size={18} color={colors.primary} />}
            iconStyle={s.rowIconOrange}
            label="Email address"
            value={user.email}
            styles={s}
          />
          <SettingsRow
            icon={<CreditCard size={18} color={colors.info} />}
            iconStyle={s.rowIconBlue}
            label="Student ID"
            value={user.studentId}
            styles={s}
            bordered
          />
          <SettingsRow
            icon={<CalendarDays size={18} color={colors.success} />}
            iconStyle={s.rowIconGreen}
            label="Member since"
            value={user.joined}
            styles={s}
            bordered
          />
        </View>

        <SectionTitle label="PREFERENCES" title="App experience" styles={s} />
        <View style={s.settingsCard}>
          <View style={s.settingRow}>
            <View style={s.rowIconOrange}>
              <Bell size={18} color={colors.primary} />
            </View>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>Order notifications</Text>
              <Text style={s.settingDescription}>Lab updates and pickup alerts</Text>
            </View>
            <Switch
              accessibilityLabel="Toggle order notifications"
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.muted}
            />
          </View>
          <View style={[s.settingRow, s.settingBorder]}>
            <View style={s.rowIconPurple}>
              {isDark ? (
                <Moon size={18} color="#7F56D9" />
              ) : (
                <Sun size={18} color="#7F56D9" />
              )}
            </View>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>Dark mode</Text>
              <Text style={s.settingDescription}>{isDark ? 'Dark appearance enabled' : 'Light appearance enabled'}</Text>
            </View>
            <Switch
              accessibilityLabel="Toggle dark mode"
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.muted}
            />
          </View>
        </View>

        <SectionTitle label="HELP" title="Support & legal" styles={s} />
        <View style={s.settingsCard}>
          <LinkRow
            icon={<CircleHelp size={18} color={colors.primary} />}
            iconStyle={s.rowIconOrange}
            label="Contact PrintForge"
            description="Email our support team"
            onPress={() => Linking.openURL('mailto:support@printforge.app')}
            styles={s}
            colors={colors}
          />
          <LinkRow
            icon={<Headphones size={18} color={colors.info} />}
            iconStyle={s.rowIconBlue}
            label="Support center"
            description="Answers for orders and lab access"
            onPress={() => Linking.openURL('https://printforge.app/support')}
            styles={s}
            colors={colors}
            bordered
          />
          <LinkRow
            icon={<FileText size={18} color={colors.success} />}
            iconStyle={s.rowIconGreen}
            label="Terms and conditions"
            description="Review the service terms"
            onPress={() => Linking.openURL('https://printforge.app/terms')}
            styles={s}
            colors={colors}
            bordered
          />
          <LinkRow
            icon={<Scale size={18} color="#7F56D9" />}
            iconStyle={s.rowIconPurple}
            label="Privacy policy"
            description="How your account data is handled"
            onPress={() => Linking.openURL('https://printforge.app/privacy')}
            styles={s}
            colors={colors}
            bordered
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [s.signOutButton, pressed && s.signOutButtonPressed]}
        >
          <LogOut size={19} color={colors.destructive} />
          <Text style={s.signOutText}>Sign out</Text>
        </Pressable>

        <View style={s.footerBrand}>
          <View style={s.footerLogo}>
            <Sparkles size={14} color={colors.primary} />
          </View>
          <Text style={s.versionText}>PrintForge 3D · v{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


export default function ProfileScreen() {
  return <ProfileContent />;
}

type ScreenStyles = ReturnType<typeof makeStyles>;

function SectionTitle({
  label,
  title,
  styles,
}: {
  label: string;
  title: string;
  styles: ScreenStyles;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionEyebrow}>{label}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  iconStyle,
  label,
  value,
  styles,
  bordered = false,
}: {
  icon: React.ReactNode;
  iconStyle: object;
  label: string;
  value: string;
  styles: ScreenStyles;
  bordered?: boolean;
}) {
  return (
    <View style={[styles.settingRow, bordered && styles.settingBorder]}>
      <View style={iconStyle}>{icon}</View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function LinkRow({
  icon,
  iconStyle,
  label,
  description,
  onPress,
  styles,
  colors,
  bordered = false,
}: {
  icon: React.ReactNode;
  iconStyle: object;
  label: string;
  description: string;
  onPress: () => void;
  styles: ScreenStyles;
  colors: Colors;
  bordered?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        bordered && styles.settingBorder,
        pressed && styles.linkRowPressed,
      ]}
    >
      <View style={iconStyle}>{icon}</View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <ChevronRight size={18} color={colors.mutedFg} />
    </Pressable>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      minHeight: 70,
      paddingHorizontal: designTokens.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.sidebar,
      borderBottomWidth: 1,
      borderBottomColor: colors.sidebarBorder,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonPressed: {
      backgroundColor: colors.secondary,
      transform: [{ scale: 0.98 }],
    },
    headerCopy: {
      flex: 1,
      marginHorizontal: designTokens.spacing.md,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1.3,
    },
    headerTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 19,
      marginTop: 2,
    },
    headerMark: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: designTokens.spacing.lg,
      paddingBottom: 46,
    },
    profileCard: {
      padding: designTokens.spacing.xl,
      borderColor: colors.primary,
      borderWidth: 1.25,
      marginBottom: designTokens.spacing.md,
    },
    profileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.lg,
    },
    avatarWrap: {
      position: 'relative',
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: colors.navy,
      borderWidth: 3,
      borderColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.white,
      fontFamily: designTokens.type.display,
      fontSize: 24,
    },
    verifiedDot: {
      position: 'absolute',
      right: -5,
      bottom: -4,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.success,
      borderWidth: 3,
      borderColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileCopy: {
      minWidth: 0,
      flex: 1,
    },
    userName: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 23,
      lineHeight: 27,
    },
    roleRow: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
    },
    roleBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    roleText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 0.8,
    },
    campusText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
    },
    profileDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: designTokens.spacing.lg,
    },
    profileMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'space-between',
    },
    profileMetaItem: {
      minWidth: 0,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    profileMetaItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    profileMetaText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
    },
    statsRow: {
      flexDirection: 'row',
      gap: designTokens.spacing.sm,
      marginBottom: designTokens.spacing.md,
    },
    statCard: {
      minWidth: 0,
      flex: 1,
      padding: designTokens.spacing.md,
      alignItems: 'flex-start',
    },
    statIconOrange: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    statIconBlue: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.statusApproved.bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    statIconGreen: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.statusCompleted.bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    statValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 20,
    },
    statLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      marginTop: 3,
    },
    spendCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.md,
      backgroundColor: colors.navy,
      borderColor: colors.navy,
      marginBottom: designTokens.spacing.xl,
    },
    spendIcon: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: 'rgba(255,88,3,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    spendCopy: {
      flex: 1,
    },
    spendLabel: {
      color: '#A8B0C0',
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1,
      marginBottom: 4,
    },
    spendAmount: {
      color: '#FFFFFF',
    },
    spendPill: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: designTokens.radius.pill,
      backgroundColor: 'rgba(255,255,255,0.09)',
    },
    spendPillText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.medium,
      fontSize: 10,
    },
    sectionHeading: {
      marginTop: designTokens.spacing.sm,
      marginBottom: designTokens.spacing.md,
    },
    sectionEyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1.2,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 20,
      marginTop: 3,
    },
    settingsCard: {
      overflow: 'hidden',
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: designTokens.spacing.xl,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 1,
    },
    settingRow: {
      minHeight: 72,
      paddingHorizontal: designTokens.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.md,
      backgroundColor: colors.card,
    },
    settingBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    linkRowPressed: {
      backgroundColor: colors.secondary,
    },
    rowIconOrange: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIconBlue: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.statusApproved.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIconGreen: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.statusCompleted.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIconPurple: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.materialTpu,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingCopy: {
      minWidth: 0,
      flex: 1,
    },
    settingLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.medium,
      fontSize: 14,
    },
    settingDescription: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 3,
    },
    signOutButton: {
      minHeight: 52,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.statusFailed.dot,
      backgroundColor: colors.statusFailed.bg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    signOutButtonPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.99 }],
    },
    signOutText: {
      color: colors.destructive,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
    },
    footerBrand: {
      marginTop: designTokens.spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    footerLogo: {
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    versionText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
    },
  });
}
