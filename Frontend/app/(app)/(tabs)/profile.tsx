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
  Linking,
  TextInput,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
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
  Briefcase,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useSession } from "../../../src/SessionContext";
import { useTheme } from "../../../src/ThemeContext";
import { Colors } from "../../../src/theme";
import { useToast } from "../../../src/ToastContext";
import { fetchMyPayments, Payment, initiatePayment, fetchPayment } from "../../../src/api/payments";
import { fetchMyListings } from "../../../src/api/marketplace";
import { fetchAcceptedRequests, deliverDesignRequest, DesignRequest } from "../../../src/api/design-requests";
import { uploadFile } from "../../../src/api/files";
import { upgradeToPremium, deleteAccount } from "../../../src/api/auth";
// TODO(backend): no fetchUserStats endpoint exists yet.
// GET /api/users/{id}/stats is on the "not wired" list.
// import { fetchUserStats } from "../../../src/api/users";


// Following count has no backend model yet — always 0 until a follow API
// exists.
const FOLLOWING_COUNT = 0;

// TODO(backend): fetchUserStats endpoint does not exist yet.
// Shaped to match what those endpoints will likely return.
type DesignerStats = {
  designCount: number;
  followerCount: number;
  earnings: number;
};

type DesignThumb = {
  id: string;
  imageUrl: string;
};

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
      return { bg: colors.statusCompleted.bg, text: colors.statusCompleted.text, label: "Paid" };
    case "FAILED":
      return { bg: colors.statusFailed.bg, text: colors.statusFailed.text, label: "Payment Failed" };
    case "PENDING":
    default:
      return { bg: colors.statusPrinting.bg, text: colors.statusPrinting.text, label: "Payment Pending" };
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
  const { appUser, role, signOut, token, authLoading, updateUser } = useSession();
  const { isDark, toggleTheme, colors } = useTheme();
  const styles = getStyles(colors);
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [designerStats, setDesignerStats] = useState<DesignerStats>({ designCount: 0, followerCount: 0, earnings: 0 });
  const [designs, setDesigns] = useState<DesignThumb[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<DesignRequest[]>([]);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);

  const isDesigner = role === "designer";

  const loadData = useCallback(async () => {
    if (!token) {
      setPayments([]);
      setPaymentsLoading(false);
      return;
    }
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const [paymentsData, listingsData, requestsData] = await Promise.all([
        fetchMyPayments(token),
        isDesigner ? fetchMyListings(token) : Promise.resolve([]),
        isDesigner ? fetchAcceptedRequests(token) : Promise.resolve([]),
      ]);
      
      setPayments(paymentsData);
      setAcceptedRequests(requestsData);
      
      if (isDesigner) {
        const totalEarnings = listingsData.reduce((sum, l) => sum + l.totalEarnings, 0);
        setDesignerStats({
          designCount: listingsData.length,
          followerCount: 0,
          earnings: totalEarnings,
        });
        setDesigns(
          listingsData
            .filter((l) => !!l.thumbnailUrl)
            .map((l) => ({ id: l.id, imageUrl: l.thumbnailUrl }))
        );
      }
    } catch (err) {
      setPaymentsError(
        err instanceof Error ? err.message : "Failed to load data",
      );
    } finally {
      setPaymentsLoading(false);
    }
  }, [token, isDesigner]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setPayments([]);
      setPaymentsLoading(false);
      return;
    }
    loadData();
  }, [authLoading, token, loadData]);

  const name = appUser?.full_name ?? "PrintForge user";

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const handleUploadDeliver = async (req: DesignRequest) => {
    if (!token) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      setUploadingRequestId(req.id);
      
      showToast("Uploading file...");
      const fileRes = await uploadFile(token, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });

      showToast("File uploaded, marking as delivered...");
      await deliverDesignRequest(token, req.id, fileRes.id);
      
      showToast("Design successfully delivered!");
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to deliver file");
    } finally {
      setUploadingRequestId(null);
    }
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

          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 16, marginBottom: 2 }}>
            <Text style={[styles.displayName, { marginTop: 0, marginBottom: 0 }]}>{name}</Text>
            {appUser?.is_premium && (
              <View style={[styles.badge, { backgroundColor: 'rgba(34,197,94,0.15)', marginLeft: 8 }]}>
                <Text style={[styles.badgeText, { color: '#22C55E' }]}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            {isDesigner ? "PrintForge designer" : "University print account"}
          </Text>

          {!appUser?.is_premium && isDesigner && (
            <TouchableOpacity
              style={[styles.editProfileBtn, { marginBottom: 12, backgroundColor: colors.primary, borderColor: colors.primary }]}
              activeOpacity={0.7}
              onPress={async () => {
                if (token) {
                  const openPaymentUrl = async (url: string, id: string) => {
                    await WebBrowser.openBrowserAsync(url);
                    try {
                      // Fetching the payment auto-verifies it if pending
                      await fetchPayment(token, id);
                    } catch (e) {
                      // ignore
                    }
                    // Refresh data after payment attempt
                    loadData();
                  };

                  const existing = payments.find(p => p.isPremiumUpgrade && p.status === 'PENDING');
                  if (existing && existing.checkoutUrl) {
                    await openPaymentUrl(existing.checkoutUrl, existing.id);
                    return;
                  }
                  try {
                    showToast("Initiating secure payment...");
                    const payment = await initiatePayment(token, { isPremiumUpgrade: true });
                    if (payment.checkoutUrl) {
                      await openPaymentUrl(payment.checkoutUrl, payment.id);
                    }
                  } catch (e: any) {
                    showToast(e.message || "Failed to initiate payment");
                  }
                }
              }}
            >
              <Text style={[styles.editProfileText, { color: colors.onPrimary }]}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.editProfileBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/edit-profile")}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.editProfileBtn, { marginTop: 12, backgroundColor: 'transparent', borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/design-requests")}
          >
            <Text style={[styles.editProfileText, { color: colors.foreground }]}>My Design Requests</Text>
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
            
            <View style={styles.ordersSection}>
              <View style={styles.ordersHeading}>
                <Briefcase size={16} color={colors.primary} />
                <Text style={styles.ordersHeadingText}>Accepted Requests</Text>
              </View>

              {acceptedRequests.length === 0 ? (
                <Text style={styles.orderMeta}>No accepted requests yet</Text>
              ) : (
                <View>
                  {acceptedRequests.map((req, idx) => {
                    const isLast = idx === acceptedRequests.length - 1;
                    return (
                      <View
                        key={req.id}
                        style={[styles.orderRow, !isLast && styles.orderRowBorder]}
                      >
                        <View style={styles.orderLeft}>
                          <Text style={styles.orderName}>{req.title}</Text>
                          <Text style={styles.orderMeta}>
                            Requested by {req.userName}
                          </Text>
                          <Text style={styles.orderMeta}>
                            Status: {req.status}
                          </Text>
                        </View>
                        {req.status === 'ACCEPTED' && (
                          <TouchableOpacity
                            style={[styles.badge, { backgroundColor: colors.primary }]}
                            onPress={() => handleUploadDeliver(req)}
                            disabled={uploadingRequestId === req.id}
                          >
                            <Text style={[styles.badgeText, { color: colors.onPrimary }]}>
                              {uploadingRequestId === req.id ? "Uploading..." : "Upload & Deliver"}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {req.status === 'FULFILLED' && (
                          <View style={[styles.badge, { backgroundColor: colors.statusCompleted.bg }]}>
                            <Text style={[styles.badgeText, { color: colors.statusCompleted.text }]}>Delivered</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

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

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setShowDeleteModal(true)}
          >
            <View style={styles.settingsRowLeft}>
              <X size={18} color={colors.destructive} />
              <Text style={[styles.settingsRowText, { color: colors.destructive }]}>Delete Account</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.versionText}>PrintForge 3D · v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="slide" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Delete Account</Text>
              <Pressable onPress={() => setShowDeleteModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={colors.mutedFg} />
              </Pressable>
            </View>
            <Text style={[styles.modalSubtitle, { marginBottom: 16 }]}>
              Enter your password to confirm account deletion. This action is permanent.
            </Text>
            <TextInput
              style={[styles.input, { marginBottom: 24 }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedFg}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
            />
            <TouchableOpacity
              style={[styles.modalCta, { backgroundColor: colors.destructive, shadowColor: colors.destructive }]}
              activeOpacity={0.8}
              disabled={deletingAccount}
              onPress={async () => {
                if (!deletePassword) {
                  showToast("Password is required");
                  return;
                }
                if (token) {
                  setDeletingAccount(true);
                  try {
                    await deleteAccount(token, deletePassword);
                    showToast("Account deleted successfully");
                    signOut();
                  } catch (e: any) {
                    showToast(e.message || "Failed to delete account");
                  } finally {
                    setDeletingAccount(false);
                    setShowDeleteModal(false);
                    setDeletePassword("");
                  }
                }
              }}
            >
              <Text style={styles.modalCtaText}>
                {deletingAccount ? "Deleting..." : "Confirm Delete"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.maybeLaterBtn}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.maybeLaterText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.foreground,
    backgroundColor: colors.background,
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