import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Box,
  Clock,
  File,
  Gauge,
  Layers,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import ImageWithFallback from '@/components/ImageWithFallback';
import Card from '@/components/Card';
import GhsAmount from '@/components/GhsAmount';
import MonoText from '@/components/MonoText';
import PaystackWebView from '@/components/PaystackWebView';
import { Material, Quality } from '@/data/mockData';
import { fetchListing, fetchCustomQuote, MarketplaceListing, Quote } from '@/api/marketplace';
import { initiatePayment, Payment } from '@/api/payments';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { useJobs } from '@/JobsContext';
import { useToast } from '@/ToastContext';
import {
  Colors,
  designTokens,
  getMaterialChipColors,
  makeControlStyles,
} from '@/theme';

const MATERIALS: Material[] = ['PLA', 'ABS', 'RESIN'];
const QUALITIES: Array<{ value: Quality; label: string; detail: string }> = [
  { value: 'DRAFT', label: 'Draft', detail: 'Fastest' },
  { value: 'STANDARD', label: 'Standard', detail: 'Balanced' },
  { value: 'HIGH', label: 'High', detail: 'Detailed' },
];

export default function ListingDetail() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token, authLoading } = useSession();
  const { refetch: refetchJobs } = useJobs();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [material, setMaterial] = useState<Material>('PLA');
  const [quality, setQuality] = useState<Quality>('STANDARD');
  const [infill, setInfill] = useState(20);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<'idle' | 'initiating' | 'checkout'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [color, setColor] = useState('');
  const [notes, setNotes] = useState('');
  const [isQuoting, setIsQuoting] = useState(false);
  const hasFile = useRef<boolean | null>(null);
  const styles = makeStyles(colors);
  const controls = makeControlStyles(colors);
  const materialVisual = getMaterialChipColors(colors, material);

  const load = useCallback(async () => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchListing(token, String(id));
      setListing(data.listing);
      setQuote(data.quote);
      hasFile.current = data.quote !== null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load this listing');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    // Same rationale as everywhere else in this app: wait for
    // SessionContext to finish restoring/validating a stored token before
    // deciding there's "no token".
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  useEffect(() => {
    if (loading || !listing || !token || id == null) return;
    if (hasFile.current === false) return; // seeded listing, no file

    const timeoutId = setTimeout(async () => {
      setIsQuoting(true);
      try {
        const newQuote = await fetchCustomQuote(token, String(id), {
          quality,
          infillPercent: infill,
          quantity: qty,
          materialType: material,
        });
        setQuote(newQuote);
      } catch (err) {
        // failed to fetch custom quote
      } finally {
        setIsQuoting(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [qty, quality, infill, material, listing, token, id, loading]);

  const handlePay = async () => {
    if (!token || !listing || paymentPhase !== 'idle') return;

    if (!quote) {
      showToast('This listing does not have a 3D file attached and cannot be ordered.');
      return;
    }

    setPaymentError(null);
    setPaymentPhase('initiating');
    try {
      const created = await initiatePayment(token, {
        estimateId: quote.estimateId,
        listingId: listing.id,
        color: color.trim() ? color.trim() : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
      });
      setPayment(created);
      setPaymentPhase('checkout');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Could not start payment.');
      setPaymentPhase('idle');
    }
  };

  const handlePaymentSuccess = useCallback(() => {
    setPayment(null);
    setPaymentPhase('idle');
    // A new PrintJob now exists (created server-side by the Paystack
    // webhook once payment cleared) — refetch so the jobs list is current
    // before navigating there.
    refetchJobs();
    showToast('Your print job has been submitted!');
    // This screen is a stack route outside the (tabs) pager (reached via
    // router.push from the marketplace tab), so it has no access to
    // SwipeTabsContext/goToTab the way submit.tsx does — router.navigate to
    // the '/orders' route takes the user to the orders tab where the jobs
    // list component is re-exported.
    router.navigate('/orders');
  }, [refetchJobs, showToast, router]);

  const handlePaymentCancel = useCallback(() => {
    setPayment(null);
    setPaymentPhase('idle');
  }, []);

  const handlePaymentError = useCallback(
    (message: string) => {
      setPayment(null);
      setPaymentPhase('idle');
      setPaymentError(message);
      showToast(message);
    },
    [showToast]
  );

  if (!listing) {
    // Previously this screen used `LISTINGS.find(...) ?? LISTINGS[0]` —
    // safe with mock data (always non-empty) but wrong once listings come
    // from a real fetch that can legitimately be loading, empty, or 404.
    // Same fix already applied to app/jobs/[id].tsx for the same reason.
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.stateText}>
          {loading ? 'Loading model details…' : error ?? "This listing couldn't be found."}
        </Text>
        {!loading ? (
          <Pressable
            accessibilityRole="button"
            onPress={error ? load : () => router.back()}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            <Text style={styles.retryText}>{error ? 'Try again' : 'Go back'}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const images = [listing.thumbnailUrl, listing.thumbnailUrl, listing.thumbnailUrl];
  const selectedImage = images[selectedImageIndex];
  // The amount actually charged is whatever the backend's quote (a saved
  // Estimate row) says — GET /api/marketplace/{id} generates it with fixed
  // params (Standard/20%/qty 1/PLA; see MarketplaceController.getListing()),
  // not whatever material/quality/infill/qty is selected below. Those
  // selectors don't feed into pricing at all currently — showing the real
  // quote total here (instead of the old listing.price × qty guess) so the
  // number on screen always matches what Paystack will actually charge,
  // since this is now wired to real payment.
  const estimatedTotal = quote?.totalCost ?? (listing.price * qty);

  return (
    <View style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back to marketplace"
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <View style={styles.backIcon}>
            <ArrowLeft size={18} color={colors.foreground} />
          </View>
          <View>
            <Text style={styles.backEyebrow}>MARKETPLACE</Text>
            <Text style={styles.backText}>Model details</Text>
          </View>
        </Pressable>

        <View style={styles.heroCard}>
          <ImageWithFallback
            source={{ uri: selectedImage }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroShade} />
          <View
            style={[
              styles.materialBadge,
              { backgroundColor: materialVisual.backgroundColor },
            ]}
          >
            <Box size={13} color={materialVisual.color} />
            <Text style={[styles.materialBadgeText, { color: materialVisual.color }]}>
              {material}
            </Text>
          </View>
          <View style={styles.heroCaption}>
            <Text style={styles.heroCaptionLabel}>READY TO PRINT</Text>
            <Text style={styles.heroCaptionText}>Optimized for university lab printers</Text>
          </View>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={images}
          keyExtractor={(item, index) => `${item}-${index}`}
          contentContainerStyle={styles.thumbRow}
          renderItem={({ item, index }) => {
            const selected = selectedImageIndex === index;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View model image ${index + 1}`}
                onPress={() => setSelectedImageIndex(index)}
                style={({ pressed }) => [
                  styles.thumbItem,
                  selected && styles.thumbItemSelected,
                  pressed && styles.pressed,
                ]}
              >
                <ImageWithFallback
                  source={{ uri: item }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                />
              </Pressable>
            );
          }}
        />

        <View style={styles.titleBlock}>
          <View style={styles.titleMetaRow}>
            <View style={styles.verifiedTag}>
              <ShieldCheck size={14} color={colors.success} />
              <Text style={styles.verifiedText}>Verified designer</Text>
            </View>
            <Text style={styles.downloads}>{listing.totalOrders} orders</Text>
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.description}>
            {listing.description ||
              'A print-ready model prepared for reliable campus-lab production, clean support ' +
                'removal, and consistent finishing across common engineering materials.'}
          </Text>
        </View>

        <View style={styles.specGrid}>
          <View style={styles.specCard}>
            <View style={styles.specIcon}>
              <Clock size={18} color={colors.primary} />
            </View>
            <Text style={styles.specLabel}>Print time</Text>
            <Text style={styles.specValue}>~ 1 hr 35 min</Text>
          </View>
          <View style={styles.specCard}>
            <View style={styles.specIcon}>
              <File size={18} color={colors.primary} />
            </View>
            <Text style={styles.specLabel}>Model file</Text>
            <MonoText style={styles.specValue}>STL</MonoText>
          </View>
          <View style={styles.specCard}>
            <View style={styles.specIcon}>
              <Layers size={18} color={colors.primary} />
            </View>
            <Text style={styles.specLabel}>Layer setup</Text>
            <Text style={styles.specValue}>0.20 mm</Text>
          </View>
        </View>

        <Card style={styles.configurationCard}>
          <View style={styles.cardHeadingRow}>
            <View style={styles.cardHeadingIcon}>
              <Gauge size={20} color={colors.primary} />
            </View>
            <View style={styles.cardHeadingCopy}>
              <Text style={styles.cardEyebrow}>PRINT OPTIONS</Text>
              <Text style={styles.cardTitle}>Configure your print</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Material</Text>
          <View style={styles.chipRow}>
            {MATERIALS.map(item => {
              const selected = material === item;
              const chipVisual = getMaterialChipColors(colors, item);
              return (
                <Pressable
                  key={item}
                  onPress={() => setMaterial(item)}
                  style={({ pressed }) => [
                    controls.chip,
                    styles.optionChip,
                    selected && {
                      borderColor: chipVisual.color,
                      backgroundColor: chipVisual.backgroundColor,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.chipDot,
                      { backgroundColor: selected ? chipVisual.color : colors.border },
                    ]}
                  />
                  <Text
                    style={[
                      controls.chipText,
                      selected && { color: chipVisual.color },
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Print quality</Text>
          <View style={styles.qualityRow}>
            {QUALITIES.map(item => {
              const selected = quality === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setQuality(item.value)}
                  style={({ pressed }) => [
                    styles.qualityOption,
                    selected && styles.qualityOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.qualityLabel, selected && styles.qualityLabelSelected]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.qualityDetail, selected && styles.qualityDetailSelected]}>
                    {item.detail}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.infillHeaderRow}>
            <Text style={styles.fieldLabelNoMargin}>Infill density</Text>
            <View style={styles.infillInputWrapper}>
              <TextInput
                style={styles.infillInput}
                keyboardType="numeric"
                value={infill === 0 ? '' : String(infill)}
                onChangeText={(text) => {
                  if (text === '') {
                    setInfill(0);
                    return;
                  }
                  const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                  if (!isNaN(num)) {
                    setInfill(Math.min(100, Math.max(0, num)));
                  }
                }}
                maxLength={3}
              />
              <Text style={styles.infillPercentSign}>%</Text>
            </View>
          </View>

          <View style={styles.quantitySection}>
            <View>
              <Text style={styles.fieldLabelNoMargin}>Quantity</Text>
              <Text style={styles.quantityHelp}>Number of copies to print</Text>
            </View>
            <View style={styles.stepperRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
                disabled={qty === 1}
                style={({ pressed }) => [
                  styles.stepperButton,
                  qty === 1 && styles.stepperButtonDisabled,
                  pressed && qty > 1 && styles.pressed,
                ]}
                onPress={() => setQty(Math.max(1, qty - 1))}
              >
                <Minus size={17} color={qty === 1 ? colors.mutedFg : colors.foreground} />
              </Pressable>
              <MonoText style={styles.stepperValue}>{qty}</MonoText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
                onPress={() => setQty(qty + 1)}
              >
                <Plus size={17} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={styles.fieldLabel}>Color Preference (Optional)</Text>
            <TextInput
              style={controls.input}
              placeholder="e.g. Red, Blue, Any"
              placeholderTextColor={colors.mutedFg}
              value={color}
              onChangeText={setColor}
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={styles.fieldLabel}>Special Notes (Optional)</Text>
            <TextInput
              style={[controls.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Any specific printing instructions?"
              placeholderTextColor={colors.mutedFg}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </Card>

        <Card style={styles.quoteCard}>
          <View style={styles.quoteHeader}>
            <View style={styles.quoteIcon}>
              <Sparkles size={21} color={colors.onPrimary} />
            </View>
            <View style={styles.quoteHeadingCopy}>
              <Text style={styles.quoteEyebrow}>INSTANT QUOTE</Text>
              <Text style={styles.quoteTitle}>Ready for lab review</Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.quoteSummaryChips}>
            <View style={styles.summaryChip}>
              <Box size={13} color={colors.mutedFg} />
              <Text style={styles.summaryChipText}>{material}</Text>
            </View>
            <View style={styles.summaryChip}>
              <Gauge size={13} color={colors.mutedFg} />
              <Text style={styles.summaryChipText}>{quality}</Text>
            </View>
            <View style={styles.summaryChip}>
              <Layers size={13} color={colors.mutedFg} />
              <Text style={styles.summaryChipText}>{infill}% infill</Text>
            </View>
          </View>

          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total to pay</Text>
              <Text style={styles.totalHint}>
                {quote 
                  ? 'Reflects selected print settings and quantity' 
                  : 'Cannot order this listing (no 3D file attached)'}
              </Text>
            </View>
            <GhsAmount amount={estimatedTotal} size="xl" style={styles.totalAmount} />
          </View>
        </Card>

        {paymentError ? (
          <View style={styles.paymentErrorBanner}>
            <Text style={styles.paymentErrorText}>{paymentError}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isQuoting || paymentPhase !== 'idle'}
          style={({ pressed }) => [
            controls.primaryButton,
            styles.orderButton,
            (isQuoting || paymentPhase !== 'idle') && styles.orderButtonDisabled,
            pressed && !isQuoting && paymentPhase === 'idle' && controls.primaryButtonPressed,
          ]}
          onPress={handlePay}
        >
          <Text style={controls.primaryButtonText}>
            {paymentPhase === 'initiating' ? 'Starting payment...' : isQuoting ? 'Calculating...' : 'Pay Now'}
          </Text>
          {paymentPhase === 'idle' && !isQuoting ? (
            <Text style={styles.orderPrice}>• GH₵ {estimatedTotal.toFixed(2)}</Text>
          ) : null}
        </Pressable>

        <View style={styles.orderNote}>
          <ShieldCheck size={15} color={colors.success} />
          <Text style={styles.orderNoteText}>
            Payment is handled by Paystack. Your print job is created automatically once payment
            is confirmed — no separate approval step for marketplace orders.
          </Text>
        </View>
      </ScrollView>

      {payment && paymentPhase === 'checkout' && token ? (
        <PaystackWebView
          checkoutUrl={payment.checkoutUrl}
          paymentId={payment.id}
          token={token}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          onError={handlePaymentError}
        />
      ) : null}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: designTokens.spacing.lg,
      paddingBottom: 48,
    },
    pressed: {
      opacity: 0.72,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: designTokens.spacing.xl,
    },
    stateText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: designTokens.spacing.md,
    },
    retryButton: {
      minHeight: 42,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: designTokens.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 10,
      marginBottom: designTokens.spacing.lg,
    },
    backIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backEyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1,
    },
    backText: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
      marginTop: 2,
    },
    heroCard: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: designTokens.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    heroImage: {
      width: '100%',
      height: 260,
    },
    heroShade: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(22,24,43,0.12)',
    },
    materialBadge: {
      position: 'absolute',
      top: 14,
      left: 14,
      minHeight: 32,
      paddingHorizontal: 11,
      borderRadius: designTokens.radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    materialBadgeText: {
      fontFamily: designTokens.type.heading,
      fontSize: 11,
    },
    ratingBadge: {
      position: 'absolute',
      top: 14,
      right: 14,
      minHeight: 32,
      paddingHorizontal: 11,
      borderRadius: designTokens.radius.pill,
      backgroundColor: 'rgba(255,255,255,0.94)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    ratingBadgeText: {
      color: colors.navy,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
    },
    heroCaption: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 14,
      borderRadius: designTokens.radius.md,
      backgroundColor: 'rgba(22,24,43,0.84)',
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    heroCaptionLabel: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1,
      marginBottom: 2,
    },
    heroCaptionText: {
      color: colors.white,
      fontFamily: designTokens.type.medium,
      fontSize: 12,
    },
    thumbRow: {
      gap: 10,
      paddingVertical: designTokens.spacing.md,
    },
    thumbItem: {
      borderRadius: 13,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
      padding: 2,
    },
    thumbItemSelected: {
      borderColor: colors.primary,
    },
    thumbImage: {
      width: 72,
      height: 58,
      borderRadius: 9,
    },
    titleBlock: {
      paddingTop: 4,
      marginBottom: designTokens.spacing.lg,
    },
    titleMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    verifiedTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    verifiedText: {
      color: colors.success,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
    },
    downloads: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 11,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.7,
    },
    designer: {
      color: colors.primary,
      fontFamily: designTokens.type.medium,
      fontSize: 13,
      marginTop: 5,
    },
    description: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 13,
    },
    specGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: designTokens.spacing.lg,
    },
    specCard: {
      flex: 1,
      minHeight: 112,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 12,
    },
    specIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    specLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 10,
      marginBottom: 4,
    },
    specValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    configurationCard: {
      marginBottom: designTokens.spacing.lg,
    },
    cardHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.xl,
    },
    cardHeadingIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },
    cardHeadingCopy: {
      flex: 1,
    },
    cardEyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1,
    },
    cardTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
      marginTop: 2,
    },
    fieldLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
      marginBottom: 10,
      marginTop: 4,
    },
    fieldLabelNoMargin: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: designTokens.spacing.lg,
    },
    optionChip: {
      minWidth: 82,
      flexGrow: 1,
    },
    chipDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    qualityRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: designTokens.spacing.lg,
    },
    qualityOption: {
      flex: 1,
      minHeight: 64,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      borderRadius: designTokens.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    qualityOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    qualityLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    qualityLabelSelected: {
      color: colors.primary,
    },
    qualityDetail: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      marginTop: 3,
    },
    qualityDetailSelected: {
      color: colors.primary,
    },
    infillHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.xl,
    },
    infillInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 12,
      height: 42,
    },
    infillInput: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
      minWidth: 32,
      textAlign: 'right',
      padding: 0,
    },
    infillPercentSign: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
      marginLeft: 4,
    },
    quantitySection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: designTokens.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quantityHelp: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 3,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stepperButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperButtonDisabled: {
      backgroundColor: colors.secondary,
      opacity: 0.7,
    },
    stepperValue: {
      minWidth: 28,
      textAlign: 'center',
      color: colors.foreground,
      fontSize: 17,
    },
    quoteCard: {
      borderColor: `${colors.primary}55`,
      marginBottom: designTokens.spacing.lg,
    },
    pickerContainer: {
      borderColor: `${colors.primary}55`,
      marginBottom: designTokens.spacing.lg,
    },
    quoteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.lg,
    },
    quoteIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },
    quoteHeadingCopy: {
      flex: 1,
    },
    quoteEyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1,
    },
    quoteTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
      marginTop: 2,
    },
    livePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minHeight: 26,
      paddingHorizontal: 8,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.statusCompleted.bg,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.statusCompleted.dot,
    },
    liveText: {
      color: colors.statusCompleted.text,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 0.5,
    },
    quoteSummaryChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
    summaryChip: {
      minHeight: 30,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.secondary,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    summaryChipText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 10,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: designTokens.spacing.lg,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    priceLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
    },
    quantitySummary: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: 14,
      marginTop: 2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
    },
    totalHint: {
      maxWidth: 170,
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      marginTop: 3,
    },
    totalAmount: {
      color: colors.primary,
      fontSize: 25,
    },
    orderButton: {
      marginTop: 2,
    },
    orderButtonDisabled: {
      opacity: 0.5,
    },
    orderPrice: {
      color: colors.onPrimary,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
    },
    paymentErrorBanner: {
      padding: 12,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.statusFailed.bg,
      borderWidth: 1,
      borderColor: colors.statusFailed.dot,
      marginBottom: designTokens.spacing.md,
    },
    paymentErrorText: {
      color: colors.statusFailed.text,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 17,
    },
    orderNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
      paddingHorizontal: 5,
      marginTop: 11,
    },
    orderNoteText: {
      flex: 1,
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      lineHeight: 16,
    },
    successCard: {
      marginTop: designTokens.spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: `${colors.success}44`,
      backgroundColor: colors.statusCompleted.bg,
      borderRadius: designTokens.radius.lg,
      padding: designTokens.spacing.lg,
    },
    successIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },
    successCopy: {
      flex: 1,
    },
    successTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
      marginBottom: 4,
    },
    successText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 17,
    },
  });
}
