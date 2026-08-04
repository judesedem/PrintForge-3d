import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  KeyboardAvoidingView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { KEYBOARD_AVOIDING_BEHAVIOR } from "../../../src/components/KeyboardAwareScreen";
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
  Briefcase,
  Pencil,
  UserRound,
  FileText,
  Trash2,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useSession } from "../../../src/SessionContext";
import { useTheme } from "../../../src/ThemeContext";
import { Colors, designTokens } from "../../../src/theme";
import { useToast } from "../../../src/ToastContext";
import { fetchMyPayments, Payment, initiatePayment, fetchPayment, fetchWallet, withdrawFunds, WalletInfo } from "../../../src/api/payments";
import { fetchMyListings, fetchFavorites, MarketplaceListing } from "../../../src/api/marketplace";
import { fetchAcceptedRequests, fetchMyRequests, deliverDesignRequest, DesignRequest } from "../../../src/api/design-requests";
import { uploadFile } from "../../../src/api/files";
import { upgradeToDesigner, deleteAccount } from "../../../src/api/auth";
import { ApiError } from "../../../src/api/client";
import { fetchUserStats, UserStats } from "../../../src/api/users";
import { fetchJobs } from "../../../src/api/jobs";
import type { Job } from "../../../src/data/mockData";
import StatusBadge from "../../../src/components/StatusBadge";
import ImageWithFallback from "../../../src/components/ImageWithFallback";
import MonoText from "../../../src/components/MonoText";

// Following count has no backend model yet — always 0 until a follow API
// exists.
const FOLLOWING_COUNT = 0;

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
      accessibilityRole="switch"
      accessibilityLabel="Dark mode"
      accessibilityState={{ checked: isDark }}
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

  // Kept purely to check for an existing pending premium-upgrade payment
  // (see the Upgrade to Premium button below) — no longer used to render
  // "My Orders", which now comes from real job data instead (jobs.ts).
  const [payments, setPayments] = useState<Payment[]>([]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [favorites, setFavorites] = useState<MarketplaceListing[]>([]);
  const [myRequests, setMyRequests] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [designerStats, setDesignerStats] = useState<UserStats | null>(null);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<DesignRequest[]>([]);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);

  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBankCode, setWithdrawBankCode] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  const BANK_CODES = [
    { label: "MTN Mobile Money", value: "MTN" },
    { label: "Telecel / Vodafone Cash", value: "VOD" },
    { label: "AirtelTigo Money", value: "ATL" },
  ];

  const isDesigner = role === "designer";

  const loadData = useCallback(async () => {
    if (!token) {
      setJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [paymentsData, jobsData, favoritesData, myRequestsData, listingsData, requestsData, walletData, statsData] = await Promise.all([
        fetchMyPayments(token),
        fetchJobs(token),
        fetchFavorites(token),
        !isDesigner ? fetchMyRequests(token) : Promise.resolve([]),
        isDesigner ? fetchMyListings(token) : Promise.resolve([]),
        isDesigner ? fetchAcceptedRequests(token) : Promise.resolve([]),
        isDesigner ? fetchWallet(token).catch(() => null) : Promise.resolve(null),
        isDesigner && appUser?.user_id ? fetchUserStats(token, appUser.user_id).catch(() => null) : Promise.resolve(null),
      ]);

      setPayments(paymentsData);
      setJobs(jobsData);
      setFavorites(favoritesData);
      setMyRequests(myRequestsData);
      setAcceptedRequests(requestsData);
      setWalletInfo(walletData);

      if (isDesigner) {
        if (statsData) setDesignerStats(statsData);
        setMyListings(listingsData);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load data",
      );
    } finally {
      setLoading(false);
    }
  }, [token, isDesigner, appUser?.user_id]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setJobs([]);
      setLoading(false);
      return;
    }
    loadData();
  }, [authLoading, token, loadData]);

  const publishedDesigns = useMemo(
    () => myListings.filter((l) => l.status === "PUBLISHED"),
    [myListings]
  );

  const name = appUser?.full_name ?? "PrintForge user";

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  // A role change is a one-way action a user might not expect to be
  // instant/permanent — same lightweight Alert.alert confirm pattern as
  // handleSignOut above, rather than the heavier password-confirmation
  // Modal the delete-account flow uses (that one's justified by deleting
  // data; this one isn't destructive enough to need re-entering a
  // password).
  const handleBecomeDesigner = () => {
    Alert.alert(
      "Become a Designer",
      "This upgrades your account to a Designer, unlocking design uploads and the marketplace studio.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Upgrade",
          onPress: async () => {
            if (!token) return;
            try {
              const updated = await upgradeToDesigner(token);
              updateUser(updated);
              showToast("You're now a Designer! Welcome to the studio.");
            } catch (err) {
              showToast(
                err instanceof ApiError ? err.message : "Failed to upgrade to designer",
              );
            }
          },
        },
      ]
    );
  };

  const handleWithdrawal = async () => {
    if (!token) return;
    if (!withdrawAmount || isNaN(Number(withdrawAmount))) {
      showToast("Please enter a valid amount");
      return;
    }
    if (!withdrawBankCode || !withdrawAccount) {
      showToast("Please enter bank code and account number");
      return;
    }

    setWithdrawing(true);
    try {
      await withdrawFunds(token, {
        amount: Number(withdrawAmount),
        bankCode: withdrawBankCode,
        accountNumber: withdrawAccount,
      });
      showToast("Withdrawal requested successfully!");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawBankCode("");
      setWithdrawAccount("");
      loadData();
    } catch (e: any) {
      Alert.alert("Withdrawal Failed", e.message || "Failed to withdraw funds");
    } finally {
      setWithdrawing(false);
    }
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

      <ScrollView keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity ─────────────────────────────────────────────────── */}
        <View style={styles.identity}>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Edit profile picture"
            onPress={() => router.push("/(app)/edit-profile")}
            style={styles.avatarWrap}
          >
            {appUser?.profile_picture_url ? (
              <Image source={{ uri: appUser.profile_picture_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{getInitial(name)}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Pencil size={12} color={colors.onPrimary} strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          <View style={styles.identityCopy}>
            <View style={styles.nameLine}>
              <Text style={styles.name}>{name}</Text>
              {appUser?.is_premium && (
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedDot}>✓</Text>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            {/* No bio/location field exists on User/UpdateProfileRequest —
                flagged in Handoff.md rather than inventing one. This role
                line is static descriptive copy, not user data. */}
            <Text style={styles.role}>
              {isDesigner ? "Designer" : "Student · Print account"}
            </Text>
          </View>
        </View>

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {isDesigner ? (
            <>
              <View style={styles.statItem}>
                <MonoText style={styles.statValue}>{designerStats?.designCount ?? 0}</MonoText>
                <Text style={styles.statLabel}>Designs</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="View followers"
                onPress={() => router.push("/(app)/following")}
                style={styles.statItem}
              >
                <MonoText style={styles.statValue}>{formatFollowerCount(designerStats?.followerCount ?? 0)}</MonoText>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <View style={styles.statItem}>
                <MonoText style={styles.statValue}>{formatFollowerCount(designerStats?.totalLikes ?? 0)}</MonoText>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.statItem}>
                <MonoText style={styles.statValue}>{jobs.length}</MonoText>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statItem}>
                <MonoText style={styles.statValue}>{favorites.length}</MonoText>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
              <View style={styles.statItem}>
                <MonoText style={styles.statValue}>{myRequests.length}</MonoText>
                <Text style={styles.statLabel}>Requests</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Primary actions ──────────────────────────────────────────── */}
        <View style={styles.primaryActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => router.push("/(app)/edit-profile")}
            style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
          >
            {isDesigner ? (
              <Pencil color={colors.primary} size={16} />
            ) : (
              <UserRound color={colors.primary} size={16} />
            )}
            <Text style={styles.outlineText}>Edit Profile</Text>
          </Pressable>

          {!isDesigner && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="My design requests"
              onPress={() => router.push("/(app)/design-requests")}
              style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
            >
              <FileText color={colors.primary} size={16} />
              <Text style={styles.outlineText}>My Design Requests</Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="My favorites"
            // No dedicated favorites screen exists yet — flagged in
            // Handoff.md as a gap, same treatment as Help & Support below
            // rather than navigating somewhere that would 404.
            onPress={() => showToast("Favorites view coming soon.")}
            style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
          >
            <Star color={colors.primary} size={16} fill={colors.primary} />
            <Text style={styles.outlineText}>My Favorites</Text>
            <View style={styles.countBadge}>
              <MonoText style={styles.countText}>{favorites.length}</MonoText>
            </View>
          </Pressable>
        </View>

        {isDesigner ? (
          <>
            {/* ── Studio ───────────────────────────────────────────────── */}
            <View style={styles.studioHeading}>
              <View>
                <Text style={styles.kicker}>CREATOR SPACE</Text>
                <Text style={styles.sectionTitleLg}>Studio</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Manage designs"
                // No design-management screen exists yet — flagged in
                // Handoff.md as a gap rather than linking somewhere that
                // would 404.
                onPress={() => showToast("Design management coming soon.")}
                style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}
              >
                <Text style={styles.manageText}>Manage</Text>
                <ChevronRight color={colors.primary} size={15} />
              </Pressable>
            </View>

            <View style={styles.earnings}>
              <View style={styles.moneyIcon}>
                <DollarSign color={colors.primary} size={20} />
              </View>
              <View style={styles.earningsCopy}>
                <Text style={styles.earningsLabel}>Total earnings</Text>
                <MonoText style={styles.earningsValue}>
                  GH₵ {designerStats?.totalEarnings?.toFixed(2) ?? "0.00"}
                </MonoText>
              </View>
              {/* Decorative only — there's no websocket/real-time push for
                  earnings, this doesn't imply one. Kept as static UI per
                  Handoff.md. */}
              <Text style={styles.liveTag}>LIVE</Text>
            </View>

            <View style={styles.listingHeader}>
              <Text style={styles.listingTitle}>Published designs</Text>
              <MonoText style={styles.listingCount}>{publishedDesigns.length} live</MonoText>
            </View>
            {publishedDesigns.length === 0 ? (
              <Text style={styles.emptyStudioText}>
                {loading ? "Loading your designs…" : "No published designs yet."}
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listings}
              >
                {publishedDesigns.map((listing) => (
                  <Pressable
                    key={listing.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${listing.title}`}
                    onPress={() => router.push(`/(app)/marketplace/${listing.id}`)}
                    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                  >
                    <ImageWithFallback source={{ uri: listing.thumbnailUrl }} style={styles.cardImage} />
                    <View style={styles.cardCopy}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{listing.title}</Text>
                      <MonoText style={styles.cardPrice}>
                        {listing.price > 0 ? `GH₵ ${listing.price.toFixed(2)}` : "Free"}
                      </MonoText>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </>
        ) : (
          <>
            {/* ── My Orders (student) ──────────────────────────────────── */}
            <View style={styles.sectionLabel}>
              <FileText color={colors.primary} size={17} />
              <Text style={styles.sectionTitle}>My Orders</Text>
            </View>

            {loading ? (
              <Text style={styles.orderMeta}>Loading orders...</Text>
            ) : loadError ? (
              <Text style={styles.orderMeta}>{loadError}</Text>
            ) : jobs.length === 0 ? (
              <Text style={styles.orderMeta}>No orders yet</Text>
            ) : (
              <View style={styles.orderList}>
                {jobs.map((job, idx) => (
                  <Pressable
                    key={job.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open order ${job.title}`}
                    onPress={() => router.push(`/jobs/${job.id}`)}
                    style={({ pressed }) => [
                      styles.orderRow,
                      idx !== jobs.length - 1 && styles.orderRowBorder,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.orderLeft}>
                      <MonoText style={styles.orderTitle}>{job.title}</MonoText>
                      <Text style={styles.orderMeta}>
                        {formatShortDate(job.submittedAt)} · GH₵ {job.cost.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.orderRight}>
                      <StatusBadge status={job.status} />
                      <ChevronRight color={colors.mutedFg} size={17} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Preserved existing sections (not covered by the mockups) ──── */}

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
                        style={[styles.legacyOrderRow, !isLast && styles.orderRowBorder]}
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

            <View style={styles.ordersSection}>
              <View style={styles.ordersHeading}>
                <DollarSign size={16} color={colors.primary} />
                <Text style={styles.ordersHeadingText}>Wallet & Earnings</Text>
              </View>

              {walletInfo ? (
                <View style={styles.legacyOrderRow}>
                  <View style={styles.orderLeft}>
                    <Text style={styles.orderName}>Available Balance</Text>
                    <Text style={[styles.orderMeta, { fontSize: 16, color: colors.primary, fontWeight: '600', marginTop: 4 }]}>
                      GH₵ {(walletInfo.walletBalance ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.legacyButton, { backgroundColor: colors.primary, borderColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8 }]}
                    activeOpacity={0.7}
                    onPress={() => setShowWithdrawModal(true)}
                  >
                    <Text style={[styles.legacyButtonText, { color: colors.onPrimary }]}>Withdraw</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.orderMeta}>Loading wallet...</Text>
              )}
            </View>
          </>
        )}

        {isDesigner && !appUser?.is_premium && (
          <View style={styles.premiumSection}>
            <TouchableOpacity
              style={[styles.legacyButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
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
              <Text style={[styles.legacyButtonText, { color: colors.onPrimary }]}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
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

        {/* ── Settings ─────────────────────────────────────────────────── */}
        <View style={styles.divider} />

        <View style={styles.settingsSection}>
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
              <Trash2 size={18} color={colors.destructive} />
              <Text style={[styles.settingsRowText, { color: colors.destructive }]}>Delete Account</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.versionText}>PrintForge 3D · v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="slide" onRequestClose={() => setShowDeleteModal(false)}>
        <KeyboardAvoidingView style={styles.modalKeyboardView} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
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
                if (!token) return;

                setDeletingAccount(true);
                let deleted = false;
                try {
                  await deleteAccount(token, deletePassword);
                  deleted = true;
                  showToast("Account deleted successfully");
                } catch (e: any) {
                  showToast(e.message || "Failed to delete account");
                } finally {
                  setDeletingAccount(false);
                  setShowDeleteModal(false);
                  setDeletePassword("");
                }

                // Tear the session down only after the modal state has settled,
                // otherwise we'd be setting state on a screen that's unmounting.
                if (deleted) {
                  await signOut();
                  router.replace("/(auth)/login");
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Withdrawal Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide" onRequestClose={() => setShowWithdrawModal(false)}>
        <KeyboardAvoidingView style={styles.modalKeyboardView} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowWithdrawModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Withdraw Funds</Text>
              <Pressable onPress={() => setShowWithdrawModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={colors.mutedFg} />
              </Pressable>
            </View>
            <Text style={[styles.modalSubtitle, { marginBottom: 16 }]}>
              Available to withdraw: GH₵ {(walletInfo?.walletBalance ?? 0).toFixed(2)}
            </Text>

            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="Amount (e.g. 50)"
              placeholderTextColor={colors.mutedFg}
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            <Pressable
              style={[styles.input, { marginBottom: 12, justifyContent: 'center' }]}
              onPress={() => setShowBankPicker(!showBankPicker)}
            >
              <Text style={{ color: withdrawBankCode ? colors.foreground : colors.mutedFg }}>
                {BANK_CODES.find(b => b.value === withdrawBankCode)?.label || "Select Mobile Money Network"}
              </Text>
            </Pressable>

            {showBankPicker && (
              <View style={{ backgroundColor: colors.background, borderRadius: 8, borderColor: colors.border, borderWidth: 1, marginBottom: 12, padding: 8 }}>
                {BANK_CODES.map(b => (
                  <TouchableOpacity
                    key={b.value}
                    style={{ paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: b.value !== 'ATL' ? 1 : 0, borderBottomColor: colors.border }}
                    onPress={() => {
                      setWithdrawBankCode(b.value);
                      setShowBankPicker(false);
                    }}
                  >
                    <Text style={{ color: colors.foreground }}>{b.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={[styles.input, { marginBottom: 24 }]}
              placeholder="Account Number (Mobile Money)"
              placeholderTextColor={colors.mutedFg}
              keyboardType="numeric"
              value={withdrawAccount}
              onChangeText={setWithdrawAccount}
            />

            <Pressable
              style={styles.modalCta}
              disabled={withdrawing}
              onPress={handleWithdrawal}
            >
              <Text style={styles.modalCtaText}>{withdrawing ? "Processing..." : "Confirm Withdrawal"}</Text>
              {!withdrawing && <ChevronRight size={18} strokeWidth={2.5} color={colors.onPrimary} />}
            </Pressable>

            <Pressable onPress={() => setShowWithdrawModal(false)} style={styles.maybeLaterBtn}>
              <Text style={styles.maybeLaterText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <BecomeDesignerModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onStartUploading={handleBecomeDesigner}
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
    fontSize: 18,
    fontFamily: designTokens.type.heading,
    color: colors.foreground,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 96,
  },
  pressed: {
    opacity: 0.85,
  },

  // ── Identity ──────────────────────────────────────────────────────────
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 16,
  },
  avatarWrap: {
    width: 72,
    height: 72,
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
  },
  avatarInitials: {
    fontSize: 20,
    fontFamily: designTokens.type.heading,
    color: colors.primary,
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  identityCopy: {
    flex: 1,
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontFamily: designTokens.type.heading,
    color: colors.foreground,
  },
  role: {
    fontSize: 13,
    color: colors.mutedFg,
    marginTop: 5,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.verified.bg,
    borderRadius: designTokens.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  verifiedDot: {
    color: colors.verified.text,
    fontSize: 11,
    fontFamily: designTokens.type.heading,
  },
  verifiedText: {
    color: colors.verified.text,
    fontSize: 10,
    fontFamily: designTokens.type.medium,
  },

  // ── Stats ─────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginTop: 18,
    paddingVertical: 15,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    color: colors.foreground,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 11,
    color: colors.mutedFg,
    marginTop: 4,
    textAlign: "center",
  },

  // ── Primary actions ───────────────────────────────────────────────────
  primaryActions: {
    gap: 8,
    marginTop: 20,
  },
  outlineButton: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: designTokens.radius.sm,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  outlineText: {
    flex: 1,
    fontSize: 13,
    fontFamily: designTokens.type.medium,
    color: colors.foreground,
  },
  countBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: designTokens.radius.sm,
  },
  countText: {
    color: colors.primary,
    fontSize: 11,
  },

  // ── Studio (designer) ─────────────────────────────────────────────────
  studioHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 30,
    marginBottom: 12,
  },
  kicker: {
    color: colors.primary,
    fontSize: 10,
    fontFamily: designTokens.type.heading,
    letterSpacing: 1.5,
  },
  sectionTitleLg: {
    fontSize: 20,
    fontFamily: designTokens.type.heading,
    color: colors.foreground,
    marginTop: 3,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  manageText: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: designTokens.type.medium,
  },
  earnings: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: designTokens.radius.sm,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  moneyIcon: {
    width: 38,
    height: 38,
    borderRadius: designTokens.radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  earningsCopy: {
    marginLeft: 12,
    flex: 1,
  },
  earningsLabel: {
    color: colors.mutedFg,
    fontSize: 11,
  },
  earningsValue: {
    color: colors.foreground,
    fontSize: 19,
    marginTop: 3,
  },
  liveTag: {
    color: colors.verified.text,
    fontSize: 10,
    fontFamily: designTokens.type.heading,
  },
  listingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 10,
  },
  listingTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontFamily: designTokens.type.medium,
  },
  listingCount: {
    color: colors.mutedFg,
    fontSize: 11,
  },
  emptyStudioText: {
    color: colors.mutedFg,
    fontSize: 13,
  },
  listings: {
    gap: 10,
    paddingBottom: 4,
  },
  card: {
    width: 142,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: designTokens.radius.sm,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  cardImage: {
    width: 142,
    height: 104,
    backgroundColor: colors.cardElevated,
  },
  cardCopy: {
    padding: 10,
  },
  cardTitle: {
    color: colors.foreground,
    fontSize: 12,
    fontFamily: designTokens.type.medium,
  },
  cardPrice: {
    color: colors.primary,
    fontSize: 11,
    marginTop: 6,
  },

  // ── My Orders (student) ───────────────────────────────────────────────
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 30,
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontFamily: designTokens.type.medium,
  },
  orderList: {
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  orderRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderLeft: {
    flex: 1,
  },
  orderTitle: {
    color: colors.foreground,
    fontSize: 14,
  },
  orderMeta: {
    fontSize: 11,
    color: colors.mutedFg,
    marginTop: 5,
  },
  orderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  // ── Preserved legacy sections (Accepted Requests / Wallet) ────────────
  ordersSection: {
    marginTop: 24,
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
  legacyOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  orderName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
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
  legacyButton: {
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
  legacyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  premiumSection: {
    marginTop: 20,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 20,
    marginBottom: 12,
  },
  designerSection: {
    marginTop: 12,
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

  // ── Settings ──────────────────────────────────────────────────────────
  settingsSection: {
    marginTop: 4,
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

  // ── Modals (unchanged from the previous version) ──────────────────────
  modalKeyboardView: {
    flex: 1,
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
