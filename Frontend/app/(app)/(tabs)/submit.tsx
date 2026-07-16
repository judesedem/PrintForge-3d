import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Slider } from '@miblanchard/react-native-slider';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { useJobs } from '@/JobsContext';
import { useToast } from '@/ToastContext';
import { Colors, designTokens, makeControlStyles } from '@/theme';
import MonoText from '@/components/MonoText';
import Card from '@/components/Card';
import GhsAmount from '@/components/GhsAmount';
import PaystackWebView from '@/components/PaystackWebView';
import { useSwipeTabs } from '@/SwipeTabsContext';
import { fetchMaterials, Material } from '@/api/materials';
import { uploadFile } from '@/api/files';
import { createEstimate, Estimate } from '@/api/estimates';
import { initiatePayment, Payment } from '@/api/payments';


console.log('🔥🔥🔥 SUBMIT.TSX LOADED 🔥🔥🔥');
// Slider typing workaround for this project.
const SliderComponent: any = Slider;

// Quality is a fixed backend enum (EstimateService.VALID_QUALITIES) with
// no listing endpoint — hardcoded here on purpose, unlike material below.
const qualities: Array<{ key: 'DRAFT' | 'STANDARD' | 'HIGH'; label: string; detail: string }> = [
  { key: 'DRAFT', label: 'Draft', detail: 'Fastest' },
  { key: 'STANDARD', label: 'Standard', detail: 'Balanced' },
  { key: 'HIGH', label: 'High', detail: 'Detailed' },
];

// GET /api/materials returns color *names* per material, not hex values —
// this is purely a display convenience, not backend data. Color has no
// effect on cost or job creation at all (checked EstimateService and the
// webhook's job-creation code) — it's cosmetic only.
const COLOR_SWATCHES: Record<string, string> = {
  White: '#FFFFFF',
  Black: '#16182B',
  Grey: '#9CA3AF',
  Gray: '#9CA3AF',
  Red: '#EB5757',
  Blue: '#2F80ED',
  Green: '#27AE60',
  Yellow: '#F2C94C',
  Orange: '#FF5803',
  Clear: '#E5E5E5',
};
function colorSwatch(name: string): string {
  return COLOR_SWATCHES[name] ?? '#9CA3AF';
}

type PickedAsset = DocumentPicker.DocumentPickerAsset;
type Step = 'configure' | 'estimate';
type EstimatePhase = 'idle' | 'uploading' | 'estimating';
type PaymentPhase = 'idle' | 'initiating' | 'checkout';

export default function SubmitScreen() {
  const { goToTab } = useSwipeTabs();
  const { colors } = useTheme();
  const { token } = useSession();
  const { refetch: refetchJobs } = useJobs();
  const { showToast } = useToast();
  const styles = makeStyles(colors);
  const controls = makeControlStyles(colors);

  const [step, setStep] = useState<Step>('configure');
  const [modelFile, setModelFile] = useState<PickedAsset | null>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [quality, setQuality] = useState<'DRAFT' | 'STANDARD' | 'HIGH'>('STANDARD');
  const [infill, setInfill] = useState(20);
  const [qty, setQty] = useState(1);

  const [estimatePhase, setEstimatePhase] = useState<EstimatePhase>('idle');
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  const [payment, setPayment] = useState<Payment | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const loadMaterials = () => {
    if (!token) return;
    setMaterialsLoading(true);
    setMaterialsError(null);
    fetchMaterials(token)
      .then(data => {
        setMaterials(data);
        setMaterialName(prev => prev || data[0]?.name || '');
      })
      .catch(err => setMaterialsError(err instanceof Error ? err.message : 'Failed to load materials'))
      .finally(() => setMaterialsLoading(false));
  };

  useEffect(loadMaterials, [token]);

  const selectedMaterial = materials.find(m => m.name === materialName) ?? null;

  // Keep the selected color valid whenever the material changes.
  useEffect(() => {
    const available = selectedMaterial?.colors ?? [];
    if (available.length === 0) {
      setColor(null);
    } else if (!color || !available.includes(color)) {
      setColor(available[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialName]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets?.[0]) {
      setModelFile(result.assets[0]);
    }
  };

  const isReadyForEstimate = Boolean(modelFile && materialName && !materialsLoading);

  const handleGetEstimate = async () => {
    console.log('[Submit] tapped, token:', !!token, 'modelFile:', !!modelFile, 'materialName:', materialName, 'phase:', estimatePhase);
    if (!token || !modelFile || !materialName || estimatePhase !== 'idle') return;
    setEstimateError(null);
    try {
      setEstimatePhase('uploading');

      // Upload has its own try/catch so a failure here is logged as an
      // UPLOAD failure specifically (and rethrown to the outer handler for
      // the UI error state) — distinct from an estimate-call failure below.
      let uploaded;
      try {
        console.log('[Submit] Uploading file...');
        uploaded = await uploadFile(token, {
          uri: modelFile.uri,
          name: modelFile.name,
          mimeType: modelFile.mimeType,
        });
        console.log('[Submit] File uploaded, fileId:', uploaded.id);
      } catch (error) {
        console.log('[Submit] Upload failed:', error);
        throw error;
      }

      setEstimatePhase('estimating');
      console.log('[Submit] Calling estimate with fileId:', uploaded.id);
      const created = await createEstimate(token, {
        fileId: uploaded.id,
        quality,
        infillPercent: infill,
        quantity: qty,
        materialType: materialName,
      });

      setEstimate(created);
      setStep('estimate');
    } catch (err) {
      setEstimateError(err instanceof Error ? err.message : 'Could not calculate an estimate.');
    } finally {
      setEstimatePhase('idle');
    }
  };

  const handlePay = async () => {
    if (!token || !estimate || paymentPhase !== 'idle') return;
    setPaymentError(null);
    setPaymentPhase('initiating');
    try {
      // Upload flow — estimateId only, no listingId (that's the marketplace
      // flow's job, wired in marketplace/[id].tsx).
      const created = await initiatePayment(token, { estimateId: estimate.id });
      setPayment(created);
      setPaymentPhase('checkout');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Could not start payment.');
      setPaymentPhase('idle');
    }
  };

  const handlePaymentSuccess = () => {
    setPayment(null);
    setPaymentPhase('idle');
    // A new PrintJob now exists (created server-side by the Paystack
    // webhook once payment cleared) — refetch so the orders tab is
    // current, then switch to it. This screen is itself one of the
    // swipeable tab pages, so goToTab (not a stack navigation) is the
    // right tool here — unlike marketplace/[id].tsx, which is a separate
    // stack screen outside the tabs pager and has no access to this
    // context (it uses router.replace('/jobs') instead).
    refetchJobs();
    showToast('Your print job has been submitted!');
    goToTab('orders');
  };

  const handlePaymentCancel = () => {
    setPayment(null);
    setPaymentPhase('idle');
    // Deliberately stay on the estimate step with the same `estimate` —
    // it's still valid server-side, no need to re-upload or re-estimate.
  };

  const handlePaymentError = (message: string) => {
    setPayment(null);
    setPaymentPhase('idle');
    setPaymentError(message);
    showToast(message);
  };

  const estimatingBusy = estimatePhase !== 'idle';

  if (step === 'estimate' && estimate) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable
              accessibilityLabel="Back to configuration"
              onPress={() => setStep('configure')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <ArrowLeft size={21} color={colors.foreground} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Your estimate</Text>
              <Text style={styles.headerSubtitle}>Review before you pay</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <Card style={styles.totalCard}>
            <Text style={styles.totalLabel}>TOTAL COST</Text>
            <GhsAmount amount={estimate.totalCost} size="xl" style={styles.totalAmount} />
            <View style={styles.totalMetaRow}>
              <Text style={styles.totalMetaText}>
                ~{Math.round(estimate.estimatedGrams)}g of {estimate.materialType}
              </Text>
              <Text style={styles.totalMetaDivider}>•</Text>
              <Text style={styles.totalMetaText}>
                ~{Math.round(estimate.durationMinutes)} min print time
              </Text>
            </View>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Quality</Text>
              <Text style={styles.summaryValue}>{estimate.quality}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Infill</Text>
              <Text style={styles.summaryValue}>{estimate.infillPercent}%</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Quantity</Text>
              <Text style={styles.summaryValue}>{estimate.quantity}</Text>
            </View>
          </Card>

          {paymentError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{paymentError}</Text>
            </View>
          ) : null}

          <View style={styles.orderNote}>
            <ShieldCheck size={15} color={colors.success} />
            <Text style={styles.orderNoteText}>
              Payment is handled by Paystack. Your print job is created automatically once
              payment is confirmed.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.summaryFooter}>
          <Pressable
            accessibilityRole="button"
            disabled={paymentPhase !== 'idle'}
            onPress={() => setStep('configure')}
            style={({ pressed }) => [
              controls.secondaryButton,
              styles.backButton,
              pressed && controls.secondaryButtonPressed,
            ]}
          >
            <Text style={controls.secondaryButtonText}>Back</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={paymentPhase !== 'idle'}
            onPress={handlePay}
            style={({ pressed }) => [
              controls.primaryButton,
              styles.payButton,
              paymentPhase !== 'idle' && styles.payButtonDisabled,
              pressed && paymentPhase === 'idle' && controls.primaryButtonPressed,
            ]}
          >
            {paymentPhase === 'initiating' ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={controls.primaryButtonText}>Pay Now</Text>
            )}
          </Pressable>
        </View>

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

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.eyebrowRow}>
          <View style={styles.brandIcon}>
            <Box size={22} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.eyebrow}>NEW PRINT REQUEST</Text>
        </View>
        <Text style={styles.title}>Upload your model</Text>
        <Text style={styles.subtitle}>
          Choose an STL, OBJ, or 3MF file and configure the material, quality, and infill.
        </Text>

        <Pressable onPress={() => goToTab('marketplace')} style={styles.marketplaceLink}>
          <Text style={styles.marketplaceLinkText}>
            Looking for a ready-made design instead? Browse the marketplace
          </Text>
          <ChevronRight size={15} color={colors.primary} />
        </Pressable>

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

        {modelFile ? (
          <Card style={styles.fileCard}>
            <View style={styles.fileIconWrap}>
              <File size={22} color={colors.primary} />
            </View>
            <View style={styles.fileCopy}>
              <MonoText style={styles.fileName}>{modelFile.name}</MonoText>
              <Text style={styles.fileMeta}>
                {Math.max(1, Math.round((modelFile.size ?? 0) / 1024))} KB · Ready to upload
              </Text>
            </View>
            <CheckCircle2 size={20} color={colors.success} />
            <Pressable
              accessibilityLabel="Remove selected file"
              onPress={() => setModelFile(null)}
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
            <Text style={styles.sectionTitle}>Configure your print</Text>
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
            <Text style={styles.fieldValue}>{materialName || '—'}</Text>
          </View>

          {materialsLoading ? (
            <View style={styles.materialsStateRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.materialsStateText}>Loading materials…</Text>
            </View>
          ) : materialsError ? (
            <View style={styles.materialsStateRow}>
              <Text style={styles.materialsStateText}>{materialsError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={loadMaterials}
                style={({ pressed }) => [styles.materialsRetryButton, pressed && styles.pressed]}
              >
                <Text style={styles.materialsRetryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.materialGrid}>
              {materials.map(item => {
                const active = item.name === materialName;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setMaterialName(item.name)}
                    style={({ pressed }) => [
                      styles.materialCard,
                      active && styles.materialCardActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.materialTopRow}>
                      <MonoText style={[styles.materialName, active && styles.materialNameActive]}>
                        {item.name}
                      </MonoText>
                      {active ? <CheckCircle2 size={16} color={colors.primary} /> : null}
                    </View>
                    <Text style={styles.materialDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text style={[styles.materialRate, active && styles.materialRateActive]}>
                      GH₵{item.costPerGram.toFixed(2)}/g
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

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
            <Text style={styles.sliderValue}>{infill}%</Text>
          </View>
          <SliderComponent
            value={infill}
            minimumValue={0}
            maximumValue={100}
            step={1}
            onValueChange={(value: any) => setInfill(Array.isArray(value) ? value[0] : value)}
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
                  disabled={qty <= 1}
                  onPress={() => setQty(Math.max(1, qty - 1))}
                  style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
                >
                  <Minus size={17} color={qty <= 1 ? colors.mutedFg : colors.foreground} />
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

            {selectedMaterial && selectedMaterial.colors.length > 0 ? (
              <View style={styles.colorBlock}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Color</Text>
                </View>
                <View style={styles.colorRow}>
                  {selectedMaterial.colors.map(name => (
                    <Pressable
                      key={name}
                      accessibilityLabel={name}
                      accessibilityState={{ selected: color === name }}
                      onPress={() => setColor(name)}
                      style={[styles.colorDotOuter, color === name && styles.colorDotOuterActive]}
                    >
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: colorSwatch(name) },
                          colorSwatch(name).toUpperCase() === '#FFFFFF' && styles.whiteColorDot,
                        ]}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </Card>

        {estimateError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{estimateError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.summaryFooter}>
        <Pressable
          disabled={!isReadyForEstimate || estimatingBusy}
          onPress={handleGetEstimate}
          style={({ pressed }) => [
            controls.primaryButton,
            styles.estimateButton,
            (!isReadyForEstimate || estimatingBusy) && styles.payButtonDisabled,
            pressed && isReadyForEstimate && !estimatingBusy && controls.primaryButtonPressed,
          ]}
        >
          {estimatingBusy ? (
            <>
              <ActivityIndicator color={colors.onPrimary} />
              <Text style={controls.primaryButtonText}>
                {estimatePhase === 'uploading' ? 'Uploading file...' : 'Calculating estimate...'}
              </Text>
            </>
          ) : (
            <>
              <Sparkles size={18} color={colors.onPrimary} />
              <Text style={controls.primaryButtonText}>Get Estimate</Text>
            </>
          )}
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
    content: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.xl,
      paddingBottom: 170,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: designTokens.spacing.lg,
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
      marginBottom: designTokens.spacing.lg,
    },
    marketplaceLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: designTokens.spacing.xl,
    },
    marketplaceLinkText: {
      color: colors.primary,
      fontFamily: designTokens.type.medium,
      fontSize: 13,
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
    materialsStateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.sm,
      minHeight: 60,
    },
    materialsStateText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      flexShrink: 1,
    },
    materialsRetryButton: {
      minHeight: 34,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    materialsRetryText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
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
    errorBanner: {
      padding: 12,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.statusFailed.bg,
      borderWidth: 1,
      borderColor: colors.statusFailed.dot,
      marginBottom: designTokens.spacing.md,
    },
    errorBannerText: {
      color: colors.statusFailed.text,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 17,
    },
    totalCard: {
      alignItems: 'center',
      paddingVertical: designTokens.spacing.xl,
      marginBottom: designTokens.spacing.md,
    },
    totalLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
      letterSpacing: 1,
      marginBottom: 6,
    },
    totalAmount: {
      fontSize: 34,
    },
    totalMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: designTokens.spacing.md,
    },
    totalMetaText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
    },
    totalMetaDivider: {
      color: colors.mutedFg,
      fontSize: 10,
    },
    summaryCard: {
      marginBottom: designTokens.spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    summaryDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    summaryLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
    },
    summaryValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    orderNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
      paddingHorizontal: 5,
      marginTop: 4,
    },
    orderNoteText: {
      flex: 1,
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      lineHeight: 16,
    },
    pressed: {
      opacity: 0.72,
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
    estimateButton: {
      flex: 1,
      minHeight: 50,
      paddingHorizontal: designTokens.spacing.lg,
    },
    backButton: {
      flex: 0.8,
      minHeight: 50,
    },
    payButton: {
      flex: 1.2,
      minHeight: 50,
    },
    payButtonDisabled: {
      opacity: 0.5,
    },
  });
}
