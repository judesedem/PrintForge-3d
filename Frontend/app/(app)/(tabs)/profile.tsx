import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
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
  Bell,
  ChevronRight,
  CircleHelp,
  CloudUpload,
  DollarSign,
  FileText,
  Grid3x3,
  Headphones,
  LogOut,
  Moon,
  Printer,
  Scale,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Users,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../../src/ThemeContext';
import { useJobs } from '../../../src/JobsContext';
import { useSession } from '../../../src/SessionContext';
import { useToast } from '../../../src/ToastContext';
import { fetchMyPayments, Payment } from '../../../src/api/payments';
import { Colors, designTokens } from '../../../src/theme';
import GhsAmount from '../../../src/components/GhsAmount';

/**
 * Profile — Bolt redesign Pass 2.
 *
 * Real data kept: appUser (name/email/role) from SessionContext instead of
 * the old hardcoded mock user, jobs from JobsContext, payment history via
 * fetchMyPayments (same fetch/loading/error/retry trio as before), theme
 * toggle, and sign-out. The previous version's settings/support content
 * lives behind the Settings gear (collapsed by default) rather than being
 * deleted — hiding working functionality ≠ removing it.
 *
 * Mock-only (no backend yet): Designs/Followers/Following counts, the
 * designer "My Designs" grid images, Edit Profile, and the designer
 * upgrade (no endpoint exists — the modal confirms with a toast only).
 * Designer "Earnings" sums COMPLETED payments from fetchMyPayments as the
 * spec requested — note that's money the user PAID, not earned; real
 * earnings need the marketplace listings' totalEarnings in a later pass.
 */

const APP_VERSION = '1.0.0';

// Same Pexels set as the Discover mock grid.
const MOCK_DESIGN_IMAGES = [
  'https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/3825586/pexels-photo-3825586.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/4488649/pexels-photo-4488649.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/4488626/pexels-photo-4488626.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/4488637/pexels-photo-4488637.jpeg?auto=compress&cs=tinysrgb&w=300',
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function roleBio(role: string): string {
  switch (role) {
    case 'designer':
      return 'Designer · sells 3D models on PrintForge';
    case 'lab_staff':
      return 'Lab staff · runs the campus print queue';
    case 'admin':
      return 'Administrator account';
    default:
      return 'University print account';
  }
}

function paymentStatusVisual(status: Payment['status'], colors: Colors) {
  switch (status) {
    case 'COMPLETED':
      return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', label: 'Printed' };
    case 'FAILED':
      return { bg: colors.statusFailed.bg, text: colors.statusFailed.text, label: 'Failed' };
    default:
      return { bg: colors.primarySoft, text: colors.primary, label: 'Printing' };
  }
}

export function ProfileContent({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { jobs } = useJobs();
  const { appUser, role, signOut, token, authLoading } = useSession();
  const { showToast } = useToast();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    if (!token) {
      setPayments([]);
      setPaymentsLoading(false);
      return;
    }
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const data = await fetchMyPayments(token);
      setPayments(data);
    } catch (err) {
      setPaymentsError(err instanceof Error ? err.message : 'Failed to load payment history');
    } finally {
      setPaymentsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    // Explicit guard (loadPayments() already checks this internally) so
    // fetchMyPayments can never go out with a null token.
    if (!token) {
      setPayments([]);
      setPaymentsLoading(false);
      return;
    }
    loadPayments();
  }, [authLoading, token, loadPayments]);

  const s = makeStyles(colors);

  const name = appUser?.full_name ?? 'PrintForge user';
  const completedTotal = payments
    .filter(p => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={s.screen} edges={embedded ? [] : ['top']}>
      <View style={s.topBar}>
        <View style={s.topBarSpacer} />
        <Text style={s.topBarTitle}>My Profile</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={settingsOpen ? 'Hide settings' : 'Show settings'}
          onPress={() => setSettingsOpen(v => !v)}
          style={({ pressed }) => [s.topBarButton, pressed && s.pressed]}
        >
          <Settings size={21} color={settingsOpen ? colors.primary : colors.foreground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.headerRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initialsOf(name)}</Text>
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>0</Text>
              <Text style={s.statLabel}>Designs</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>0</Text>
              <Text style={s.statLabel}>Followers</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>0</Text>
              <Text style={s.statLabel}>Following</Text>
            </View>
            {role === 'designer' ? (
              <View style={s.statItem}>
                <GhsAmount amount={completedTotal} size="sm" style={s.earningsValue} />
                <Text style={s.statLabel}>Earnings</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={s.userName}>{name}</Text>
        <Text style={s.userBio}>{roleBio(role)}</Text>
        {appUser?.email ? <Text style={s.userEmail}>{appUser.email}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => showToast('Profile editing is coming soon.')}
          style={({ pressed }) => [s.editButton, pressed && s.pressed]}
        >
          <Text style={s.editButtonText}>Edit Profile</Text>
        </Pressable>

        {role === 'lab_staff' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/staff/queue')}
            style={({ pressed }) => [s.queueRow, pressed && s.pressed]}
          >
            <View style={s.queueIcon}>
              <Printer size={19} color={colors.primary} />
            </View>
            <View style={s.queueCopy}>
              <Text style={s.queueTitle}>Lab Queue</Text>
              <Text style={s.queueSubtitle}>Review and approve student print jobs</Text>
            </View>
            <ChevronRight size={19} color={colors.mutedFg} />
          </Pressable>
        ) : null}

        {/* My Orders — real payment history (same fetch as before). */}
        <View style={s.sectionHeader}>
          <ShoppingBag size={17} color={colors.primary} />
          <Text style={s.sectionTitle}>My Orders</Text>
        </View>
        {paymentsLoading ? (
          <View style={s.stateCard}>
            <Text style={s.stateText}>Loading payment history…</Text>
          </View>
        ) : paymentsError ? (
          <View style={s.stateCard}>
            <Text style={s.stateText}>{paymentsError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={loadPayments}
              style={({ pressed }) => [s.retryButton, pressed && s.pressed]}
            >
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : payments.length === 0 ? (
          <View style={s.stateCard}>
            <Text style={s.stateTitle}>No orders yet</Text>
            <Text style={s.stateText}>
              Payments for your print orders will show up here once you check out.
            </Text>
          </View>
        ) : (
          <View style={s.ordersCard}>
            {payments.map((payment, index) => {
              const visual = paymentStatusVisual(payment.status, colors);
              const date = payment.completedAt ?? payment.initiatedAt;
              return (
                <Pressable
                  key={payment.id}
                  accessibilityRole={payment.printJobId ? 'button' : undefined}
                  disabled={!payment.printJobId}
                  onPress={() =>
                    payment.printJobId && router.push(`/jobs/${payment.printJobId}`)
                  }
                  style={({ pressed }) => [
                    s.orderRow,
                    index > 0 && s.orderRowBorder,
                    pressed && s.orderRowPressed,
                  ]}
                >
                  <View style={s.orderCopy}>
                    <Text style={s.orderTitle}>
                      {date ? new Date(date).toLocaleDateString() : 'Print order'}
                    </Text>
                    <View style={[s.orderBadge, { backgroundColor: visual.bg }]}>
                      <Text style={[s.orderBadgeText, { color: visual.text }]}>{visual.label}</Text>
                    </View>
                  </View>
                  <GhsAmount amount={payment.amount} size="sm" style={s.orderAmount} />
                  <ChevronRight size={17} color={colors.mutedFg} />
                </Pressable>
              );
            })}
          </View>
        )}

        {role === 'designer' ? (
          <>
            <View style={s.sectionHeader}>
              <Grid3x3 size={17} color={colors.primary} />
              <Text style={s.sectionTitle}>My Designs</Text>
            </View>
            <View style={s.designGrid}>
              {MOCK_DESIGN_IMAGES.map(uri => (
                <Image key={uri} source={{ uri }} style={s.designThumb} />
              ))}
            </View>
          </>
        ) : null}

        {role === 'student' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setUpgradeOpen(true)}
            style={({ pressed }) => [s.upgradeButton, pressed && s.pressed]}
          >
            <Star size={18} color="#FFFFFF" />
            <Text style={s.upgradeButtonText}>Become a Designer</Text>
          </Pressable>
        ) : null}

        {settingsOpen ? (
          <>
            <View style={s.sectionHeader}>
              <Settings size={17} color={colors.primary} />
              <Text style={s.sectionTitle}>Settings</Text>
            </View>
            <View style={s.settingsCard}>
              <View style={s.settingRow}>
                <Bell size={18} color={colors.primary} />
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
                {isDark ? (
                  <Moon size={18} color={colors.primary} />
                ) : (
                  <Sun size={18} color={colors.primary} />
                )}
                <View style={s.settingCopy}>
                  <Text style={s.settingLabel}>Dark mode</Text>
                  <Text style={s.settingDescription}>
                    {isDark ? 'Dark appearance enabled' : 'Light appearance enabled'}
                  </Text>
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
              <SupportRow
                icon={<CircleHelp size={18} color={colors.primary} />}
                label="Contact PrintForge"
                onPress={() => Linking.openURL('mailto:support@printforge.app')}
                s={s}
                colors={colors}
              />
              <SupportRow
                icon={<Headphones size={18} color={colors.primary} />}
                label="Support center"
                onPress={() => Linking.openURL('https://printforge.app/support')}
                s={s}
                colors={colors}
              />
              <SupportRow
                icon={<FileText size={18} color={colors.primary} />}
                label="Terms and conditions"
                onPress={() => Linking.openURL('https://printforge.app/terms')}
                s={s}
                colors={colors}
              />
              <SupportRow
                icon={<Scale size={18} color={colors.primary} />}
                label="Privacy policy"
                onPress={() => Linking.openURL('https://printforge.app/privacy')}
                s={s}
                colors={colors}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleSignOut}
              style={({ pressed }) => [s.signOutButton, pressed && s.pressed]}
            >
              <LogOut size={19} color={colors.destructive} />
              <Text style={s.signOutText}>Sign out</Text>
            </Pressable>
          </>
        ) : null}

        <Text style={s.versionText}>PrintForge 3D · v{APP_VERSION}</Text>
      </ScrollView>

      {/* Upgrade modal — mock confirm only; there is no designer-upgrade
          endpoint on the backend yet. */}
      <Modal
        visible={upgradeOpen}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setUpgradeOpen(false)}
      >
        <View style={s.modalOverlay}>
          <Pressable style={s.modalDismiss} onPress={() => setUpgradeOpen(false)} />
          <View style={s.modalSheet}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setUpgradeOpen(false)}
              style={s.modalClose}
            >
              <X size={20} color={colors.foreground} />
            </Pressable>
            <View style={s.modalIcon}>
              <Sparkles size={30} color={colors.primary} />
            </View>
            <Text style={s.modalTitle}>Become a Designer</Text>
            <View style={s.benefitList}>
              <BenefitRow
                icon={<CloudUpload size={20} color={colors.primary} />}
                title="Upload & sell designs"
                subtitle="Publish your models to the marketplace"
                s={s}
              />
              <BenefitRow
                icon={<DollarSign size={20} color={colors.primary} />}
                title="Earn from every download"
                subtitle="Set your price, get paid per order"
                s={s}
              />
              <BenefitRow
                icon={<Users size={20} color={colors.primary} />}
                title="Build your following"
                subtitle="Grow an audience around your work"
                s={s}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setUpgradeOpen(false);
                showToast('Designer upgrade is coming soon — the backend endpoint isn’t live yet.');
              }}
              style={({ pressed }) => [s.modalCta, pressed && s.pressed]}
            >
              <Text style={s.modalCtaText}>Start Uploading →</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setUpgradeOpen(false)}
              style={({ pressed }) => pressed && s.pressed}
            >
              <Text style={s.modalLater}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function ProfileScreen() {
  return <ProfileContent />;
}

function SupportRow({
  icon,
  label,
  onPress,
  s,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  s: ReturnType<typeof makeStyles>;
  colors: Colors;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.settingRow, s.settingBorder, pressed && s.orderRowPressed]}
    >
      {icon}
      <View style={s.settingCopy}>
        <Text style={s.settingLabel}>{label}</Text>
      </View>
      <ChevronRight size={17} color={colors.mutedFg} />
    </Pressable>
  );
}

function BenefitRow({
  icon,
  title,
  subtitle,
  s,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.benefitRow}>
      <View style={s.benefitIcon}>{icon}</View>
      <View style={s.benefitCopy}>
        <Text style={s.benefitTitle}>{title}</Text>
        <Text style={s.benefitSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pressed: { opacity: 0.72 },
    topBar: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: designTokens.spacing.lg,
    },
    topBarSpacer: { width: 40 },
    topBarTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
    },
    topBarButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingBottom: 56,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.xl,
      marginBottom: designTokens.spacing.md,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primarySoft,
      borderWidth: 2,
      borderColor: 'rgba(255, 106, 0, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.primary,
      fontFamily: designTokens.type.display,
      fontSize: 26,
    },
    statsRow: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    statItem: { alignItems: 'center', gap: 2 },
    statValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
    },
    earningsValue: { color: colors.primary, fontSize: 15 },
    statLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
    },
    userName: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 19,
    },
    userBio: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginTop: 3,
    },
    userEmail: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 2,
    },
    editButton: {
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: designTokens.spacing.md,
      marginBottom: designTokens.spacing.lg,
    },
    editButtonText: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    queueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.md,
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      padding: designTokens.spacing.md,
      marginBottom: designTokens.spacing.md,
    },
    queueIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    queueCopy: { flex: 1 },
    queueTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    queueSubtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: designTokens.spacing.md,
      marginBottom: designTokens.spacing.sm,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
    stateCard: {
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      alignItems: 'center',
      padding: designTokens.spacing.xl,
      gap: 6,
    },
    stateTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    stateText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 6,
      minHeight: 36,
      borderRadius: designTokens.radius.pill,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: designTokens.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    ordersCard: {
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    orderRow: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.md,
      paddingHorizontal: designTokens.spacing.md,
    },
    orderRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    orderRowPressed: { backgroundColor: colors.secondary },
    orderCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
    orderTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.medium,
      fontSize: 13,
    },
    orderBadge: {
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    orderBadgeText: {
      fontFamily: designTokens.type.heading,
      fontSize: 9,
    },
    orderAmount: { color: colors.mutedFg },
    designGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    designThumb: {
      width: '32%',
      aspectRatio: 1,
      borderRadius: 10,
      backgroundColor: colors.cardElevated,
    },
    upgradeButton: {
      minHeight: 50,
      borderRadius: 12,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      marginTop: designTokens.spacing.xl,
    },
    upgradeButtonText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 15,
    },
    settingsCard: {
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    settingRow: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.md,
      paddingHorizontal: designTokens.spacing.md,
    },
    settingBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    settingCopy: { flex: 1, minWidth: 0 },
    settingLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.medium,
      fontSize: 13,
    },
    settingDescription: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 2,
    },
    signOutButton: {
      minHeight: 50,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.statusFailed.dot,
      backgroundColor: colors.statusFailed.bg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: designTokens.spacing.lg,
    },
    signOutText: {
      color: colors.destructive,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    versionText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      textAlign: 'center',
      marginTop: designTokens.spacing.xl,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    modalDismiss: { flex: 1 },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: designTokens.spacing.xxl,
      paddingBottom: 40,
      alignItems: 'center',
    },
    modalClose: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    modalIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: designTokens.spacing.md,
    },
    modalTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 23,
      marginBottom: designTokens.spacing.lg,
    },
    benefitList: { alignSelf: 'stretch', gap: designTokens.spacing.md, marginBottom: designTokens.spacing.xl },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: designTokens.spacing.md },
    benefitIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    benefitCopy: { flex: 1 },
    benefitTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    benefitSubtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 2,
    },
    modalCta: {
      alignSelf: 'stretch',
      minHeight: 50,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: designTokens.spacing.sm,
    },
    modalCtaText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 15,
    },
    modalLater: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
      padding: 8,
    },
  });
}
