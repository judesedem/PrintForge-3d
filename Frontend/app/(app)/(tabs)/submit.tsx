import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  File,
  Gauge,
  Info,
  Layers3,
  Minus,
  Palette,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Slider from '@miblanchard/react-native-slider';
import { useTheme } from '@/ThemeContext';
import { Colors, designTokens, makeControlStyles } from '@/theme';
import MonoText from '@/components/MonoText';
import Card from '@/components/Card';
import GhsAmount from '@/components/GhsAmount';
import { useSwipeTabs } from '@/SwipeTabsContext';

// Slider typing workaround for this project.
const SliderComponent: any = Slider;

const materials = [
  { key: 'PLA', label: 'PLA', description: 'Easy, affordable prototyping', rate: 'Standard' },
  { key: 'RESIN', label: 'Resin', description: 'Fine detail and smooth finish', rate: 'Detail' },
  { key: 'ABS', label: 'ABS', description: 'Durable engineering parts', rate: 'Strong' },
] as const;

const qualities = [
  { key: 'DRAFT', label: 'Draft', detail: '0.30 mm' },
  { key: 'STANDARD', label: 'Standard', detail: '0.20 mm' },
  { key: 'HIGH', label: 'High', detail: '0.12 mm' },
] as const;

const printColors = [
  { value: '#16182B', label: 'Navy' },
  { value: '#FFFFFF', label: 'White' },
  { value: '#FF5803', label: 'Orange' },
  { value: '#2F80ED', label: 'Blue' },
  { value: '#27AE60', label: 'Green' },
  { value: '#EB5757', label: 'Red' },
] as const;

export default function SubmitScreen() {
  const { goToTab } = useSwipeTabs();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const controls = makeControlStyles(colors);

  const [step, setStep] = useState<0 | 1>(0);
  const [selectedPath, setSelectedPath] = useState<'upload' | 'marketplace'>('upload');
  const [fileInfo, setFileInfo] = useState<any | null>(null);
  const [material, setMaterial] = useState<'PLA' | 'RESIN' | 'ABS'>('PLA');
  const [color, setColor] = useState('#16182B');
  const [sliderValue, setSliderValue] = useState(20);
  const [quality, setQuality] = useState<'DRAFT' | 'STANDARD' | 'HIGH'>('STANDARD');
  const [qty, setQty] = useState(1);

  const matPrices = { PLA: 8.5, RESIN: 22.0, ABS: 14.0 };
  const qualMult = { DRAFT: 0.7, STANDARD: 1.0, HIGH: 1.6 };
  const infillCost = sliderValue * 0.12;
  const baseCost = matPrices[material] * qualMult[quality] + infillCost;
  const totalCost = baseCost * qty;

  const pickFile = async () => {
    const result: any = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (result && !result.canceled && result.assets?.[0]) {
      setFileInfo(result.assets[0]);
    }
  };

  if (step === 0) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.pathContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.eyebrowRow}>
          <View style={styles.brandIcon}>
            <Box size={22} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.eyebrow}>NEW PRINT REQUEST</Text>
        </View>

        <Text style={styles.title}>What would you like to print?</Text>
        <Text style={styles.subtitle}>
          Upload your own engineering model or start with a ready-to-print design from the marketplace.
        </Text>

        <View style={styles.pathList}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPath === 'upload' }}
            onPress={() => setSelectedPath('upload')}
            style={({ pressed }) => [
              styles.pathCard,
              selectedPath === 'upload' && styles.pathCardActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.pathIconWrap}>
              <CloudUpload size={26} color={colors.primary} strokeWidth={1.9} />
            </View>
            <View style={styles.pathBody}>
              <View style={styles.pathTitleRow}>
                <Text style={styles.pathLabel}>Upload your model</Text>
                <View style={styles.recommendedPill}>
                  <Text style={styles.recommendedText}>QUICK ESTIMATE</Text>
                </View>
              </View>
              <Text style={styles.pathCopy}>
                Choose an STL, OBJ, or 3MF file and configure the material, quality, and infill.
              </Text>
            </View>
            {selectedPath === 'upload' ? (
              <CheckCircle2 size={21} color={colors.primary} fill={colors.primarySoft} />
            ) : (
              <ChevronRight size={21} color={colors.mutedFg} />
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPath === 'marketplace' }}
            onPress={() => setSelectedPath('marketplace')}
            style={({ pressed }) => [
              styles.pathCard,
              selectedPath === 'marketplace' && styles.pathCardActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.pathIconWrap}>
              <ShoppingBag size={25} color={colors.primary} strokeWidth={1.9} />
            </View>
            <View style={styles.pathBody}>
              <Text style={styles.pathLabel}>Browse marketplace</Text>
              <Text style={styles.pathCopy}>
                Discover verified student designs that are already prepared for campus printing.
              </Text>
            </View>
            {selectedPath === 'marketplace' ? (
              <CheckCircle2 size={21} color={colors.primary} fill={colors.primarySoft} />
            ) : (
              <ChevronRight size={21} color={colors.mutedFg} />
            )}
          </Pressable>
        </View>

        <Card style={styles.securityCard}>
          <ShieldCheck size={20} color={colors.success} />
          <View style={styles.securityCopy}>
            <Text style={styles.securityTitle}>Private by default</Text>
            <Text style={styles.securityText}>
              Your uploaded files remain tied to your account and print request.
            </Text>
          </View>
        </Card>

        <Pressable
          onPress={() => setStep(1)}
          style={({ pressed }) => [controls.primaryButton, styles.continueButton, pressed && controls.primaryButtonPressed]}
        >
          <Text style={controls.primaryButtonText}>Continue</Text>
          <ChevronRight size={19} color={colors.onPrimary} />
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => setStep(0)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <ArrowLeft size={21} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Upload your model</Text>
            <Text style={styles.headerSubtitle}>Request a campus print estimate</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose a 3D model file"
          onPress={pickFile}
          style={({ pressed }) => [styles.uploadZone, pressed && styles.uploadZonePressed]}
        >
          <View style={styles.uploadIconWrap}>
            <CloudUpload size={34} color={colors.primary} strokeWidth={1.7} />
          </View>
          <Text style={styles.uploadTitle}>Tap to choose your 3D file</Text>
          <Text style={styles.uploadHint}>STL, OBJ, 3MF and supported CAD files up to 100 MB</Text>
          <View style={styles.browsePill}>
            <Text style={styles.browsePillText}>Browse files</Text>
          </View>
        </Pressable>

        {fileInfo ? (
          <Card style={styles.fileCard}>
            <View style={styles.fileIconWrap}>
              <File size={22} color={colors.primary} />
            </View>
            <View style={styles.fileCopy}>
              <MonoText style={styles.fileName}>
                {fileInfo.name}
              </MonoText>
              <Text style={styles.fileMeta}>
                {Math.max(1, Math.round((fileInfo.size ?? 0) / 1024))} KB · Ready for estimate
              </Text>
            </View>
            <CheckCircle2 size={20} color={colors.success} />
            <Pressable
              accessibilityLabel="Remove selected file"
              onPress={() => setFileInfo(null)}
              style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
            >
              <X size={18} color={colors.mutedFg} />
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.tipCard}>
          <Info size={19} color={colors.info} />
          <View style={styles.tipCopy}>
            <Text style={styles.tipTitle}>Upload tip</Text>
            <Text style={styles.tipText}>
              For the best estimate, use a watertight model that is correctly scaled and ready to slice.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionTitle}>Quick estimate</Text>
            <Text style={styles.sectionSubtitle}>Choose the settings your lab should price.</Text>
          </View>
          <Sparkles size={21} color={colors.primary} />
        </View>

        <Card style={styles.estimateCard}>
          <View style={styles.fieldHeader}>
            <View style={styles.fieldLabelRow}>
              <Layers3 size={18} color={colors.primary} />
              <Text style={styles.fieldLabel}>Material</Text>
            </View>
            <Text style={styles.fieldValue}>{material}</Text>
          </View>
          <View style={styles.materialGrid}>
            {materials.map(item => {
              const active = item.key === material;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setMaterial(item.key)}
                  style={({ pressed }) => [
                    styles.materialCard,
                    active && styles.materialCardActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.materialTopRow}>
                    <MonoText style={[styles.materialName, active && styles.materialNameActive]}>
                      {item.label.toUpperCase()}
                    </MonoText>
                    {active ? <CheckCircle2 size={16} color={colors.primary} /> : null}
                  </View>
                  <Text style={styles.materialDescription}>{item.description}</Text>
                  <Text style={[styles.materialRate, active && styles.materialRateActive]}>{item.rate}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldHeader}>
            <View style={styles.fieldLabelRow}>
              <Gauge size={18} color={colors.primary} />
              <Text style={styles.fieldLabel}>Print quality</Text>
            </View>
            <Text style={styles.fieldValue}>{quality}</Text>
          </View>
          <View style={styles.qualityRow}>
            {qualities.map(item => {
              const active = item.key === quality;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setQuality(item.key)}
                  style={({ pressed }) => [
                    styles.qualityChip,
                    active && styles.qualityChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.qualityLabel, active && styles.qualityLabelActive]}>{item.label}</Text>
                  <Text style={[styles.qualityDetail, active && styles.qualityDetailActive]}>{item.detail}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldHeader}>
            <View style={styles.fieldLabelRow}>
              <Box size={18} color={colors.primary} />
              <Text style={styles.fieldLabel}>Infill density</Text>
            </View>
            <Text style={styles.sliderValue}>{sliderValue}%</Text>
          </View>
          <SliderComponent
            value={sliderValue}
            minimumValue={10}
            maximumValue={80}
            step={1}
            onValueChange={(value: any) => setSliderValue(Array.isArray(value) ? value[0] : value)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.muted}
            thumbTintColor={colors.primary}
            containerStyle={styles.slider}
            trackStyle={styles.sliderTrack}
            thumbStyle={styles.sliderThumb}
          />
          <View style={styles.sliderLegend}>
            <Text style={styles.sliderLegendText}>Lightweight</Text>
            <Text style={styles.sliderLegendText}>Stronger</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.quantityColorRow}>
            <View style={styles.quantityBlock}>
              <Text style={styles.fieldLabel}>Quantity</Text>
              <View style={styles.stepperGroup}>
                <Pressable
                  accessibilityLabel="Decrease quantity"
                  onPress={() => setQty(Math.max(1, qty - 1))}
                  style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
                >
                  <Minus size={17} color={colors.foreground} />
                </Pressable>
                <MonoText style={styles.stepperValue}>{qty}</MonoText>
                <Pressable
                  accessibilityLabel="Increase quantity"
                  onPress={() => setQty(qty + 1)}
                  style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
                >
                  <Plus size={17} color={colors.foreground} />
                </Pressable>
              </View>
            </View>

            <View style={styles.colorBlock}>
              <View style={styles.fieldLabelRow}>
                <Palette size={17} color={colors.primary} />
                <Text style={styles.fieldLabel}>Color</Text>
              </View>
              <View style={styles.colorRow}>
                {printColors.map(option => (
                  <Pressable
                    key={option.value}
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: color === option.value }}
                    onPress={() => setColor(option.value)}
                    style={[
                      styles.colorDotOuter,
                      color === option.value && styles.colorDotOuterActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: option.value },
                        option.value === '#FFFFFF' && styles.whiteColorDot,
                      ]}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Card>

        <Card style={styles.estimateSummaryCard}>
          <View style={styles.estimateSummaryIcon}>
            <Sparkles size={20} color={colors.primary} />
          </View>
          <View style={styles.estimateSummaryCopy}>
            <Text style={styles.estimateSummaryLabel}>Current estimate</Text>
            <Text style={styles.estimateSummaryNote}>Based on material, quality, infill, and quantity</Text>
          </View>
          <GhsAmount amount={totalCost} size="lg" style={styles.estimateAmount} />
        </Card>
      </ScrollView>

      <View style={styles.summaryFooter}>
        <View style={styles.footerAmountWrap}>
          <Text style={styles.footerLabel}>Estimated total</Text>
          <GhsAmount amount={totalCost} size="lg" style={styles.footerAmount} />
        </View>
        <Pressable
          onPress={() => goToTab('marketplace')}
          style={({ pressed }) => [controls.primaryButton, styles.estimateButton, pressed && controls.primaryButtonPressed]}
        >
          <Sparkles size={18} color={colors.onPrimary} />
          <Text style={controls.primaryButtonText}>Get estimate</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    pathContent: {
      flexGrow: 1,
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.xl,
      paddingBottom: 120,
    },
    content: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.md,
      paddingBottom: 170,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: designTokens.spacing.xl,
    },
    brandIcon: {
      width: 42,
      height: 42,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
      letterSpacing: 1.2,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 30,
      lineHeight: 36,
      letterSpacing: -0.7,
      marginBottom: designTokens.spacing.sm,
    },
    subtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: designTokens.spacing.xxl,
    },
    pathList: {
      gap: designTokens.spacing.md,
      marginBottom: designTokens.spacing.lg,
    },
    pathCard: {
      minHeight: 132,
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: designTokens.spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: designTokens.spacing.md,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 1,
    },
    pathCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    pathIconWrap: {
      width: 48,
      height: 48,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pathBody: {
      flex: 1,
      gap: 7,
    },
    pathTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    pathLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
    },
    pathCopy: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      lineHeight: 19,
    },
    recommendedPill: {
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    recommendedText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 0.6,
    },
    securityCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: designTokens.spacing.md,
      marginBottom: designTokens.spacing.xl,
      padding: designTokens.spacing.md,
      shadowOpacity: 0,
      elevation: 0,
    },
    securityCopy: {
      flex: 1,
      gap: 3,
    },
    securityTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    securityText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 17,
    },
    continueButton: {
      marginTop: 'auto',
    },
    headerRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.lg,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCopy: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: designTokens.spacing.sm,
    },
    headerTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
      letterSpacing: -0.2,
    },
    headerSubtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginTop: 2,
    },
    headerSpacer: {
      width: 42,
    },
    uploadZone: {
      minHeight: 220,
      borderRadius: designTokens.radius.xl,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      padding: designTokens.spacing.xxl,
      marginBottom: designTokens.spacing.md,
    },
    uploadZonePressed: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
      transform: [{ scale: 0.995 }],
    },
    uploadIconWrap: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: designTokens.spacing.lg,
    },
    uploadTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
      marginBottom: 6,
      textAlign: 'center',
    },
    uploadHint: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      maxWidth: 290,
    },
    browsePill: {
      marginTop: designTokens.spacing.lg,
      minHeight: 36,
      borderRadius: designTokens.radius.pill,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    browsePillText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    fileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.md,
      padding: designTokens.spacing.md,
      marginBottom: designTokens.spacing.md,
      shadowOpacity: 0,
      elevation: 0,
    },
    fileIconWrap: {
      width: 42,
      height: 42,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileCopy: {
      flex: 1,
      minWidth: 0,
    },
    fileName: {
      color: colors.foreground,
      fontSize: 13,
    },
    fileMeta: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 4,
    },
    removeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: designTokens.spacing.md,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: designTokens.spacing.md,
      marginBottom: designTokens.spacing.xxl,
    },
    tipCopy: {
      flex: 1,
      gap: 3,
    },
    tipTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    tipText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 17,
    },
    sectionHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: designTokens.spacing.md,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 19,
      letterSpacing: -0.2,
    },
    sectionSubtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginTop: 3,
    },
    estimateCard: {
      marginBottom: designTokens.spacing.md,
    },
    fieldHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: designTokens.spacing.md,
    },
    fieldLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    fieldLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    fieldValue: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 12,
    },
    materialGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    materialCard: {
      flex: 1,
      minHeight: 116,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      padding: 11,
    },
    materialCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    materialTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 7,
    },
    materialName: {
      color: colors.foreground,
      fontSize: 12,
    },
    materialNameActive: {
      color: colors.primary,
    },
    materialDescription: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      lineHeight: 14,
      flex: 1,
    },
    materialRate: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
      marginTop: 6,
    },
    materialRateActive: {
      color: colors.primary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: designTokens.spacing.lg,
    },
    qualityRow: {
      flexDirection: 'row',
      gap: 8,
    },
    qualityChip: {
      flex: 1,
      minHeight: 58,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    qualityChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    qualityLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    qualityLabelActive: {
      color: colors.primary,
    },
    qualityDetail: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 9,
      marginTop: 3,
    },
    qualityDetailActive: {
      color: colors.primary,
    },
    sliderValue: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    slider: {
      height: 32,
      marginHorizontal: -2,
    },
    sliderTrack: {
      height: 4,
      borderRadius: 2,
    },
    sliderThumb: {
      width: 21,
      height: 21,
      borderRadius: 11,
      borderWidth: 4,
      borderColor: colors.card,
      shadowColor: colors.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    sliderLegend: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: -2,
    },
    sliderLegendText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
    },
    quantityColorRow: {
      gap: designTokens.spacing.lg,
    },
    quantityBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepperGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stepperButton: {
      width: 38,
      height: 38,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperValue: {
      color: colors.foreground,
      fontSize: 16,
      minWidth: 26,
      textAlign: 'center',
    },
    colorBlock: {
      gap: designTokens.spacing.md,
    },
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    colorDotOuter: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorDotOuterActive: {
      borderColor: colors.primary,
    },
    colorDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    whiteColorDot: {
      borderWidth: 1,
      borderColor: colors.border,
    },
    estimateSummaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.md,
      marginBottom: designTokens.spacing.lg,
      padding: designTokens.spacing.md,
      shadowOpacity: 0,
      elevation: 0,
    },
    estimateSummaryIcon: {
      width: 42,
      height: 42,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    estimateSummaryCopy: {
      flex: 1,
      minWidth: 0,
    },
    estimateSummaryLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    estimateSummaryNote: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      lineHeight: 14,
      marginTop: 2,
    },
    estimateAmount: {
      color: colors.primary,
      fontSize: 18,
    },
    summaryFooter: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      minHeight: 92,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: designTokens.spacing.lg,
      paddingVertical: designTokens.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.md,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.07,
      shadowRadius: 16,
      elevation: 10,
    },
    footerAmountWrap: {
      flex: 1,
    },
    footerLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginBottom: 2,
    },
    footerAmount: {
      color: colors.foreground,
      fontSize: 20,
    },
    estimateButton: {
      minHeight: 50,
      paddingHorizontal: designTokens.spacing.lg,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
