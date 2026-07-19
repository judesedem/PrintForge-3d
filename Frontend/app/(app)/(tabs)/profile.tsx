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
import { useToast } from "../../../src/ToastContext";
import { fetchMyPayments, Payment } from "../../../src/api/payments";
// TODO(backend): no fetchUserStats / fetchUserDesigns endpoints exist yet.
// GET /api/users/{id}/stats and GET /api/users/{id}/designs are on the
// "not wired" list — swap the mock data below for real calls once those
// land. Keeping the imports commented so it's a one-line swap later.
// import { fetchUserStats } from "../../../src/api/users";
// import { fetchUserDesigns } from "../../../src/api/marketplace";

const NAVY = "#0A182E";
const NAVY_LIGHT = "#152544";
const ORANGE = "#FF6A00";
const WHITE = "#FFFFFF";
const WHITE_50 = "rgba(255,255,255,0.5)";
const WHITE_30 = "rgba(255,255,255,0.3)";
const WHITE_15 = "rgba(255,255,255,0.15)";
const WHITE_10 = "rgba(255,255,255,0.1)";
const WHITE_8 = "rgba(255,255,255,0.08)";
const EMERALD = "#34D399";
const EMERALD_BG = "rgba(16,185,129,0.2)";
const RED = "#EF4444";
const GRAY = "#6B7280";
const GRAY_LIGHT = "#D1D5DB";
const ORANGE_10 = "rgba(255,106,0,0.1)";
const ORANGE_20 = "rgba(255,106,0,0.2)";

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

function paymentStatusVisual(status: Payment["status"]): BadgeVisual {
  switch (status) {
    case "COMPLETED":
      return { bg: EMERALD_BG, text: EMERALD, label: "Ready for Pickup" };
    case "FAILED":
      return { bg: WHITE_10, text: WHITE_50, label: "Failed" };
    case "PENDING":
    default:
      return { bg: ORANGE_20, text: ORANGE, label: "Printing" };
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
}: {
  isDark: boolean;
  onToggle: () => void;
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
        { backgroundColor: isDark ? ORANGE : WHITE_15 },
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
}: {
  visible: boolean;
  onClose: () => void;
  onStartUploading: () => void;
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
            <Sparkles size={32} color={ORANGE} />
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
                    <Icon size={18} color={ORANGE} />
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
            <ChevronRight size={18} strokeWidth={2.5} color={WHITE} />
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
  const { isDark, toggleTheme } = useTheme();
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
            <ShoppingBag size={16} color={ORANGE} />
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
                const badge = paymentStatusVisual(payment.status);
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
                      color={WHITE_30}
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
              <Grid3x3 size={16} color={WHITE} />
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
              <Star size={18} color={WHITE} fill={WHITE} />
              <Text style={styles.designerBtnText}>Become a Designer</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.settingsSection}>
          <View style={styles.settingsDivider} />

          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <Moon size={18} color="rgba(255,255,255,0.6)" />
              <Text style={styles.settingsRowText}>Dark Mode</Text>
            </View>
            <DarkModeToggle isDark={isDark} onToggle={toggleTheme} />
          </View>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => showToast("Help center coming soon.")}
          >
            <View style={styles.settingsRowLeft}>
              <HelpCircle size={18} color="rgba(255,255,255,0.6)" />
              <Text style={styles.settingsRowText}>Help & Support</Text>
            </View>
            <ChevronRight size={18} color={WHITE_30} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push("/(app)/change-password")}
          >
            <View style={styles.settingsRowLeft}>
              <Lock size={18} color="rgba(255,255,255,0.6)" />
              <Text style={styles.settingsRowText}>Change Password</Text>
            </View>
            <ChevronRight size={18} color={WHITE_30} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={handleSignOut}>
            <View style={styles.settingsRowLeft}>
              <LogOut size={18} color={RED} />
              <Text style={[styles.settingsRowText, { color: RED }]}>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: NAVY,
  },
  safeTop: {
    backgroundColor: NAVY,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBarTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: WHITE,
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
    backgroundColor: NAVY_LIGHT,
    borderWidth: 2,
    borderColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: "800",
    color: ORANGE,
  },
  followingStat: {},
  followingNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: WHITE,
    lineHeight: 28,
  },
  followingLabel: {
    fontSize: 11,
    color: WHITE_50,
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
    color: WHITE,
  },
  statValueOrange: {
    color: ORANGE,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: WHITE_50,
    marginTop: 2,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "800",
    color: WHITE,
    marginTop: 16,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: WHITE_50,
    marginBottom: 16,
  },
  editProfileBtn: {
    alignSelf: "center",
    width: "100%",
    height: 40,
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
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
    color: WHITE,
    marginLeft: 8,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  orderRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: WHITE_8,
  },
  orderLeft: {
    flex: 1,
  },
  orderName: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
  },
  orderMeta: {
    fontSize: 11,
    color: WHITE_50,
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
    borderTopColor: WHITE_10,
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
    color: WHITE,
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
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
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
    color: WHITE,
  },
  settingsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: WHITE_10,
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
    color: WHITE,
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
    backgroundColor: WHITE,
  },
  versionText: {
    fontSize: 11,
    color: WHITE_30,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: WHITE,
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
    backgroundColor: GRAY_LIGHT,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: "rgba(10,24,46,0.05)",
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: ORANGE_10,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: NAVY,
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: GRAY,
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
    backgroundColor: ORANGE_10,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: NAVY,
  },
  benefitDesc: {
    fontSize: 12,
    color: GRAY,
    lineHeight: 18,
    marginTop: 2,
  },
  modalCta: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
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
    color: WHITE,
  },
  maybeLaterBtn: {
    paddingVertical: 8,
  },
  maybeLaterText: {
    fontSize: 14,
    fontWeight: "600",
    color: GRAY,
    textAlign: "center",
  },
});