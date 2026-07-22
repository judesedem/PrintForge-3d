import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShoppingBag,
  Moon,
  HelpCircle,
  Lock,
  LogOut,
  ChevronRight,
  Star,
  X,
  Sparkles,
  UploadCloud,
  DollarSign,
  Users,
  Grid3x3,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSession } from "../../../src/SessionContext";
import { useTheme } from "../../../src/ThemeContext";
import { Colors } from "../../../src/theme";
import { useToast } from "../../../src/ToastContext";
import { fetchMyPayments, Payment } from "../../../src/api/payments";
// TODO(backend): no fetchUserStats / fetchUserDesigns endpoints exist yet.
// GET /api/users/{id}/stats and GET /api/users/{id}/designs are on the
// "not wired" list — swap the mock data below for real calls once those
// land. Keeping the imports commented so it's a one-line swap later.
// import { fetchUserStats } from "../../../src/api/users";
// import { fetchUserDesigns } from "../../../src/api/marketplace";


// Following count has no backend model yet — always 0 until a follow API
// exists.
const FOLLOWING_COUNT = 0;

// TODO(backend): mock designer stats + designs until stats/designs
// endpoints exist. Shaped to match what those endpoints will likely
// return so swapping in real data later is a drop-in replacement.
type DesignerStats = {
  designCount: number;
  followerCount: number;
  earnings: number;
};

type DesignThumb = {
  id: string;
  imageUrl: string;
};

const MOCK_DESIGNER_STATS: DesignerStats = {
  designCount: 24,
  followerCount: 1200,
  earnings: 340,
};

const MOCK_DESIGNS: DesignThumb[] = [
  { id: "1", imageUrl: "https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=300" },
  { id: "2", imageUrl: "https://images.pexels.com/photos/3825586/pexels-photo-3825586.jpeg?auto=compress&cs=tinysrgb&w=300" },
  { id: "3", imageUrl: "https://images.pexels.com/photos/4488649/pexels-photo-4488649.jpeg?auto=compress&cs=tinysrgb&w=300" },
  { id: "4", imageUrl: "https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=300" },
  { id: "5", imageUrl: "https://images.pexels.com/photos/4488626/pexels-photo-4488626.jpeg?auto=compress&cs=tinysrgb&w=300" },
  { id: "6", imageUrl: "https://images.pexels.com/photos/4488637/pexels-photo-4488637.jpeg?auto=compress&cs=tinysrgb&w=300" },
];

function formatFollowerCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

function getInitial(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : "?";
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function orderDisplayName(payment: Payment): string {
  // Payment has no dedicated name field (src/api/payments.ts) — the
  // closest identifier is the estimate it was paid against. Decoded in
  // case it's ever a URI-encoded string; falls back to a friendly label.
  const raw = payment.estimateId
    ? `Estimate #${payment.estimateId}`
    : "Print order";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

type BadgeVisual = { bg: string; text: string; label: string };

function paymentStatusVisual(status: Payment["status"], colors: Colors): BadgeVisual {
  switch (status) {
    case "COMPLETED":
      return { bg: colors.statusCompleted.bg, text: colors.statusCompleted.text, label: "Ready for Pickup" };
    case "FAILED":
      return { bg: colors.statusFailed.bg, text: colors.statusFailed.text, label: "Failed" };
    case "PENDING":
    default:
      return { bg: colors.statusPrinting.bg, text: colors.statusPrinting.text, label: "Printing" };
  }
}

const BENEFITS = [
  {
    icon: UploadCloud,
    title: "Upload & sell designs",
    desc: "Share your 3D prints with the university community",
  },
  {
    icon: DollarSign,
    title: "Earn from every download",
    desc: "Set your prices and collect earnings directly",
  },
  {
    icon: Users,
    title: "Build your following",
    desc: "Students can follow you and get notified of new drops",
  },
];

function DarkModeToggle({
  isDark,
  onToggle,
  colors,
  styles,
}: {
  isDark: boolean;
  onToggle: () => void;
  colors: Colors;
  styles: ReturnType<typeof getStyles>;
}) {
  const translateX = useRef(new Animated.Value(isDark ? 20 : 0)).current;

  const toggle = () => {
    Animated.timing(translateX, {
      toValue: isDark ? 0 : 20,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    onToggle();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={toggle}
      style={[
        styles.toggleTrack,
        { backgroundColor: isDark ? colors.primary : colors.border },
      ]}
    >
      <Animated.View
        style={[styles.toggleKnob, { transform: [{ translateX }] }]}
      />
    </TouchableOpacity>
  );
}

function BecomeDesignerModal({
  visible,
  onClose,
  onStartUploading,
  colors,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  onStartUploading: () => void;
  colors: Colors;
  styles: ReturnType<typeof getStyles>;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={styles.modalSheet}
        >
          <View style={styles.dragHandle} />
          <View style={styles.modalIconCircle}>
            <Sparkles size={32} color={colors.primary} />
          </View>

          <Text style={styles.modalTitle}>Become a Designer!</Text>
          <Text style={styles.modalSubtitle}>
            Unlock the full PrintForge experience.
          </Text>

          <View style={styles.benefitsContainer}>
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <View key={i} style={styles.benefitRow}>
                  <View style={styles.benefitIconCircle}>
                    <Icon size={18} color={colors.primary} />
                  </View>
                  <View style={styles.benefitTextCol}>
                    <Text style={styles.benefitTitle}>{b.title}</Text>
                    <Text style={styles.benefitDesc}>{b.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Pressable
            style={styles.modalCta}
            onPress={() => {
              onStartUploading();
              onClose();
            }}
          >
            <Text style={styles.modalCtaText}>Start Uploading</Text>
            <ChevronRight size={18} strokeWidth={2.5} color={colors.onPrimary} />
          </Pressable>

          <Pressable onPress={onClose} style={styles.maybeLaterBtn}>
            <Text style={styles.maybeLaterText}>Maybe later</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { appUser, role, signOut, token, authLoading } = useSession();
  const { isDark, toggleTheme, colors } = useTheme();
  const styles = getStyles(colors);
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  // TODO(backend): replace with real fetchUserStats(token) /
  // fetchUserDesigns(token) once those endpoints exist. Left as static
  // mock data + no loading/error state since there's nothing to fetch yet.
  const [designerStats] = useState<DesignerStats>(MOCK_DESIGNER_STATS);
  const [designs] = useState<DesignThumb[]>(MOCK_DESIGNS);

  const isDesigner = role === "designer";

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
      setPaymentsError(
        err instanceof Error ? err.message : "Failed to load payment history",
      );
    } finally {
      setPaymentsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setPayments([]);
      setPaymentsLoading(false);
      return;
    }
    loadPayments();
  }, [authLoading, token, loadPayments]);

  const name = appUser?.full_name ?? "PrintForge user";

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.safeTop}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>My Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{getInitial(name)}</Text>
            </View>

            {isDesigner ? (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {designerStats.designCount}
                  </Text>
                  <Text style={styles.statLabel}>Designs</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatFollowerCount(designerStats.followerCount)}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/(app)/following")}
                  style={styles.statItem}
                >
                  <Text style={styles.statValue}>{FOLLOWING_COUNT}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, styles.statValueOrange]}>
                    GH₵ {designerStats.earnings}
                  </Text>
                  <Text style={styles.statLabel}>Earnings</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/(app)/following")}
                style={styles.followingStat}
              >
                <Text style={styles.followingNumber}>{FOLLOWING_COUNT}</Text>
                <Text style={styles.followingLabel}>Following</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.displayName}>{name}</Text>
          <Text style={styles.subtitle}>
            {isDesigner ? "PrintForge designer" : "University print account"}
          </Text>

          <TouchableOpacity
            style={styles.editProfileBtn}
            activeOpacity={0.7}
            onPress={() => showToast("Profile editing is coming soon.")}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ordersSection}>
          <View style={styles.ordersHeading}>
            <ShoppingBag size={16} color={colors.primary} />
            <Text style={styles.ordersHeadingText}>My Orders</Text>
          </View>

          {paymentsLoading ? (
            <Text style={styles.orderMeta}>Loading orders...</Text>
          ) : paymentsError ? (
            <Text style={styles.orderMeta}>{paymentsError}</Text>
          ) : payments.length === 0 ? (
            <Text style={styles.orderMeta}>No orders yet</Text>
          ) : (
            <View>
              {payments.map((payment, idx) => {
                const badge = paymentStatusVisual(payment.status, colors);
                const isLast = idx === payments.length - 1;
                return (
                  <TouchableOpacity
                    key={payment.id}
                    style={[styles.orderRow, !isLast && styles.orderRowBorder]}
                  >
                    <View style={styles.orderLeft}>
                      <Text style={styles.orderName}>
                        {orderDisplayName(payment)}
                      </Text>
                      <Text style={styles.orderMeta}>
                        {formatShortDate(payment.initiatedAt)} · GH₵{" "}
                        {payment.amount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                    <ChevronRight
                      size={16}
                      color={colors.mutedFg}
                      style={styles.orderChevron}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {isDesigner && (
          <>
            <View style={styles.divider} />
            <View style={styles.gridHeaderRow}>
              <Grid3x3 size={16} color={colors.foreground} />
              <Text style={styles.gridHeaderText}>My Designs</Text>
            </View>
            <View style={styles.grid}>
              {designs.map((d) => (
                <Image
                  key={d.id}
                  source={{ uri: d.imageUrl }}
                  style={styles.gridImage}
                />
              ))}
            </View>
          </>
        )}

        {role === "student" && (
          <View style={styles.designerSection}>
            <Pressable
              style={styles.designerBtn}
              onPress={() => setShowModal(true)}
            >
              <Star size={18} color={colors.onPrimary} fill={colors.onPrimary} />
              <Text style={styles.designerBtnText}>Become a Designer</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.settingsSection}>
          <View style={styles.settingsDivider} />

          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <Moon size={18} color={colors.mutedFg} />
              <Text style={styles.settingsRowText}>Dark Mode</Text>
            </View>
            <DarkModeToggle isDark={isDark} onToggle={toggleTheme} colors={colors} styles={styles} />
          </View>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => showToast("Help center coming soon.")}
          >
            <View style={styles.settingsRowLeft}>
              <HelpCircle size={18} color={colors.mutedFg} />
              <Text style={styles.settingsRowText}>Help & Support</Text>
            </View>
            <ChevronRight size={18} color={colors.mutedFg} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push("/(app)/change-password")}
          >
            <View style={styles.settingsRowLeft}>
              <Lock size={18} color={colors.mutedFg} />
              <Text style={styles.settingsRowText}>Change Password</Text>
            </View>
            <ChevronRight size={18} color={colors.mutedFg} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={handleSignOut}>
            <View style={styles.settingsRowLeft}>
              <LogOut size={18} color={colors.destructive} />
              <Text style={[styles.settingsRowText, { color: colors.destructive }]}>
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.versionText}>PrintForge 3D · v1.0.0</Text>
        </View>
      </ScrollView>

      <BecomeDesignerModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onStartUploading={() => showToast("Designer upgrade coming soon")}
        colors={colors}
        styles={styles}
      />
    </View>
  );
}

const getStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeTop: {
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBarTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: colors.foreground,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  followingStat: {},
  followingNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.foreground,
    lineHeight: 28,
  },
  followingLabel: {
    fontSize: 11,
    color: colors.mutedFg,
    marginTop: 4,
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.foreground,
  },
  statValueOrange: {
    color: colors.primary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.mutedFg,
    marginTop: 2,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.foreground,
    marginTop: 16,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedFg,
    marginBottom: 16,
  },
  editProfileBtn: {
    alignSelf: "center",
    width: "100%",
    height: 40,
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  ordersSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  ordersHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ordersHeadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
    marginLeft: 8,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  orderRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderLeft: {
    flex: 1,
  },
  orderName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  orderMeta: {
    fontSize: 11,
    color: colors.mutedFg,
    marginTop: 2,
  },
  badge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  orderChevron: {
    marginLeft: 8,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 20,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  gridHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  gridHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 4,
  },
  gridImage: {
    width: "33.333%",
    aspectRatio: 1,
    marginBottom: 2,
  },
  designerSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  designerBtn: {
    alignSelf: "center",
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  designerBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onPrimary,
  },
  settingsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsRowText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
    marginLeft: 12,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 9999,
    padding: 2,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 9999,
    backgroundColor: colors.background,
  },
  versionText: {
    fontSize: 11,
    color: colors.mutedFg,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 9999,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: colors.muted,
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: colors.primarySoft,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.mutedFg,
    textAlign: "center",
    marginBottom: 24,
  },
  benefitsContainer: {
    gap: 12,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  benefitIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  benefitDesc: {
    fontSize: 12,
    color: colors.mutedFg,
    lineHeight: 18,
    marginTop: 2,
  },
  modalCta: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 8,
  },
  modalCtaText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onPrimary,
  },
  maybeLaterBtn: {
    paddingVertical: 8,
  },
  maybeLaterText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.mutedFg,
    textAlign: "center",
  },
});