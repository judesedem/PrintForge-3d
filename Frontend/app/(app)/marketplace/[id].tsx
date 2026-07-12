import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Box,
  CheckCircle,
  Clock,
  File,
  Gauge,
  Layers,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react-native';
import ImageWithFallback from '@/components/ImageWithFallback';
import Card from '@/components/Card';
import GhsAmount from '@/components/GhsAmount';
import MonoText from '@/components/MonoText';
import { LISTINGS, Material, Quality } from '@/data/mockData';
import { useTheme } from '@/ThemeContext';
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
const INFILL_LEVELS = [10, 20, 40, 60];

export default function ListingDetail() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const listing = LISTINGS.find(item => item.id === String(id)) ?? LISTINGS[0];
  const [qty, setQty] = useState(1);
  const [material, setMaterial] = useState<Material>(listing.material);
  const [quality, setQuality] = useState<Quality>('STANDARD');
  const [infill, setInfill] = useState(20);
  const [isPurchased, setIsPurchased] = useState(false);
  const images = [listing.image, listing.image, listing.image];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImage = images[selectedImageIndex];
  const styles = makeStyles(colors);
  const controls = makeControlStyles(colors);
  const materialVisual = getMaterialChipColors(colors, material);
  const estimatedTotal = listing.price * qty;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <View style={styles.ratingBadge}>
            <Star size={13} color="#D9A11A" fill="#D9A11A" />
            <Text style={styles.ratingBadgeText}>{listing.rating}</Text>
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
            <Text style={styles.downloads}>{listing.downloads} orders</Text>
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.designer}>Designed by {listing.designer}</Text>
          <Text style={styles.description}>
            A print-ready model prepared for reliable campus-lab production, clean support
            removal, and consistent finishing across common engineering materials.
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

          <Text style={styles.fieldLabel}>Infill density</Text>
          <View style={styles.infillRow}>
            {INFILL_LEVELS.map(value => {
              const selected = infill === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setInfill(value)}
                  style={({ pressed }) => [
                    styles.infillOption,
                    selected && styles.infillOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.infillText, selected && styles.infillTextSelected]}>
                    {value}%
                  </Text>
                </Pressable>
              );
            })}
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
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Estimated price per copy</Text>
            <GhsAmount amount={listing.price} size="md" />
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Quantity</Text>
            <MonoText style={styles.quantitySummary}>× {qty}</MonoText>
          </View>
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Estimated total</Text>
              <Text style={styles.totalHint}>Final price confirmed by lab staff</Text>
            </View>
            <GhsAmount amount={estimatedTotal} size="xl" style={styles.totalAmount} />
          </View>
        </Card>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            controls.primaryButton,
            styles.orderButton,
            pressed && controls.primaryButtonPressed,
          ]}
          onPress={() => setIsPurchased(true)}
        >
          <Text style={controls.primaryButtonText}>Order this print</Text>
          <Text style={styles.orderPrice}>• GH₵ {estimatedTotal.toFixed(2)}</Text>
        </Pressable>

        <View style={styles.orderNote}>
          <ShieldCheck size={15} color={colors.success} />
          <Text style={styles.orderNoteText}>
            Your order is sent to lab staff for approval before it enters the print queue.
          </Text>
        </View>

        {isPurchased ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <CheckCircle size={22} color={colors.success} />
            </View>
            <View style={styles.successCopy}>
              <Text style={styles.successTitle}>Order submitted</Text>
              <Text style={styles.successText}>
                Your order now has the backend-aligned SUBMITTED status and is waiting for lab
                approval.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
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
    infillRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: designTokens.spacing.xl,
    },
    infillOption: {
      flex: 1,
      minHeight: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infillOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    infillText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    infillTextSelected: {
      color: colors.primary,
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
    orderPrice: {
      color: colors.onPrimary,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
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
