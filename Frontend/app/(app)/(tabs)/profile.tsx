import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShoppingBag,
  Moon,
  HelpCircle,
  LogOut,
  ChevronRight,
  Star,
  X,
  Sparkles,
  UploadCloud,
  DollarSign,
  Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../../src/SessionContext';
import { useTheme } from '../../../src/ThemeContext';
import { useToast } from '../../../src/ToastContext';
import { fetchMyPayments, Payment } from '../../../src/api/payments';

const NAVY = '#0A182E';
const NAVY_LIGHT = '#152544';
const ORANGE = '#FF6A00';
const WHITE = '#FFFFFF';
const WHITE_50 = 'rgba(255,255,255,0.5)';
const WHITE_30 = 'rgba(255,255,255,0.3)';
const WHITE_15 = 'rgba(255,255,255,0.15)';
const WHITE_10 = 'rgba(255,255,255,0.1)';
const WHITE_8 = 'rgba(255,255,255,0.08)';
const EMERALD = '#34D399';
const EMERALD_BG = 'rgba(16,185,129,0.2)';
const RED = '#EF4444';
const GRAY = '#6B7280';
const GRAY_LIGHT = '#D1D5DB';
const ORANGE_10 = 'rgba(255,106,0,0.1)';
const ORANGE_20 = 'rgba(255,106,0,0.2)';

// Following count has no backend model yet — always 0 until a follow API
// exists.
const FOLLOWING_COUNT = 0;

function getInitial(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : '?';
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function orderDisplayName(payment: Payment): string {
  // Payment has no dedicated name field (src/api/payments.ts) — the
  // closest identifier is the estimate it was paid against. Decoded in
  // case it's ever a URI-encoded string; falls back to a friendly label.
  const raw = payment.estimateId ? `Estimate #${payment.estimateId}` : 'Print order';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

type BadgeVisual = { bg: string; text: string; label: string };

function paymentStatusVisual(status: Payment['status']): BadgeVisual {
  switch (status) {
    case 'COMPLETED':
      return { bg: EMERALD_BG, text: EMERALD, label: 'Ready for Pickup' };
    case 'FAILED':
      return { bg: WHITE_10, text: WHITE_50, label: 'Failed' };
    case 'PENDING':
    default:
      return { bg: ORANGE_20, text: ORANGE, label: 'Printing' };
  }
}

const BENEFITS = [
  {
    icon: UploadCloud,
    title: 'Upload & sell designs',
    desc: 'Share your 3D prints with the university community',
  },
  {
    icon: DollarSign,
    title: 'Earn from every download',
    desc: 'Set your prices and collect earnings directly',
  },
  {
    icon: Users,
    title: 'Build your following',
    desc: 'Students can follow you and get notified of new drops',
  },
];

function DarkModeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
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
      style={[styles.toggleTrack, { backgroundColor: isDark ? ORANGE : WHITE_15 }]}
    >
      <Animated.View style={[styles.toggleKnob, { transform: [{ translateX }] }]} />
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
  const slide = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slide, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slide]);

  const close = () => {
    Animated.timing(slide, {
      toValue: Dimensions.get('window').height,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={close} />
      <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slide }] }]}>
        <View style={styles.dragHandle} />
        <TouchableOpacity style={styles.modalCloseBtn} onPress={close}>
          <X size={16} color={GRAY} />
        </TouchableOpacity>

        <View style={styles.modalIconCircle}>
          <Sparkles size={32} color={ORANGE} />
        </View>

        <Text style={styles.modalTitle}>Become a Designer!</Text>
        <Text style={styles.modalSubtitle}>Unlock the full PrintForge experience.</Text>

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
          style={({ pressed }) => [styles.modalCta, pressed && styles.pressedScale]}
          onPress={() => {
            onStartUploading();
            close();
          }}
        >
          <Text style={styles.modalCtaText}>Start Uploading</Text>
          <ChevronRight size={18} strokeWidth={2.5} color={WHITE} />
        </Pressable>

        <Pressable onPress={close} style={styles.maybeLaterBtn}>
          <Text style={styles.maybeLaterText}>Maybe later</Text>
        </Pressable>
      </Animated.View>
    </View>
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
    if (!token) {
      setPayments([]);
      setPaymentsLoading(false);
      return;
    }
    loadPayments();
  }, [authLoading, token, loadPayments]);

  const name = appUser?.full_name ?? 'PrintForge user';

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
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
            <TouchableOpacity
              onPress={() => router.push('/(app)/following')}
              style={styles.followingStat}
            >
              <Text style={styles.followingNumber}>{FOLLOWING_COUNT}</Text>
              <Text style={styles.followingLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.displayName}>{name}</Text>
          <Text style={styles.subtitle}>University print account</Text>

          <Pressable
            style={({ pressed }) => [styles.editProfileBtn, pressed && styles.pressedScale]}
            onPress={() => showToast('Profile editing is coming soon.')}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </Pressable>
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
                      <Text style={styles.orderName}>{orderDisplayName(payment)}</Text>
                      <Text style={styles.orderMeta}>
                        {formatShortDate(payment.initiatedAt)} · GH₵ {payment.amount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={WHITE_30} style={styles.orderChevron} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {role === 'student' && (
          <View style={styles.designerSection}>
            <Pressable
              style={({ pressed }) => [styles.designerBtn, pressed && styles.pressedScale]}
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
            onPress={() => showToast('Help center coming soon.')}
          >
            <View style={styles.settingsRowLeft}>
              <HelpCircle size={18} color="rgba(255,255,255,0.6)" />
              <Text style={styles.settingsRowText}>Help & Support</Text>
            </View>
            <ChevronRight size={18} color={WHITE_30} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={handleSignOut}>
            <View style={styles.settingsRowLeft}>
              <LogOut size={18} color={RED} />
              <Text style={[styles.settingsRowText, { color: RED }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.versionText}>PrintForge 3D · v1.0.0</Text>
        </View>
      </ScrollView>

      <BecomeDesignerModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onStartUploading={() => showToast('Designer upgrade coming soon')}
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
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: NAVY_LIGHT,
    borderWidth: 2,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: ORANGE,
  },
  followingStat: {},
  followingNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: WHITE,
    lineHeight: 28,
  },
  followingLabel: {
    fontSize: 11,
    color: WHITE_50,
    marginTop: 4,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '800',
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
    alignSelf: 'center',
    width: '60%',
    height: 40,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },
  ordersSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  ordersHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ordersHeadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
    marginLeft: 8,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  orderChevron: {
    marginLeft: 8,
  },
  designerSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  designerBtn: {
    alignSelf: 'center',
    width: '80%',
    height: 48,
    borderRadius: 12,
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  designerBtnText: {
    fontSize: 14,
    fontWeight: '700',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: WHITE,
    marginLeft: 12,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 9999,
    padding: 2,
    justifyContent: 'center',
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
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: 'rgba(10,24,46,0.05)',
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: ORANGE_10,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: GRAY,
    textAlign: 'center',
    marginBottom: 24,
  },
  benefitsContainer: {
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: ORANGE_10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  benefitDesc: {
    fontSize: 12,
    color: GRAY,
    lineHeight: 18,
    marginTop: 2,
  },
  modalCta: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 8,
  },
  modalCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },
  maybeLaterBtn: {
    paddingVertical: 8,
  },
  maybeLaterText: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAY,
    textAlign: 'center',
  },
});