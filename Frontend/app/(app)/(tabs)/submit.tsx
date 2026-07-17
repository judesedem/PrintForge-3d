import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  Clock3,
  CloudUpload,
  File,
  Minus,
  Plus,
  Scale,
  Settings2,
  X,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { Slider } from "@miblanchard/react-native-slider";
import { useTheme } from "@/ThemeContext";
import { useSession } from "@/SessionContext";
import { useJobs } from "@/JobsContext";
import { useToast } from "@/ToastContext";
import { Colors, designTokens, makeControlStyles } from "@/theme";
import GhsAmount from "@/components/GhsAmount";
import PaystackWebView from "@/components/PaystackWebView";
import { useSwipeTabs } from "@/SwipeTabsContext";
import { fetchMaterials, Material } from "@/api/materials";
import { uploadFile } from "@/api/files";
import { createEstimate, Estimate } from "@/api/estimates";
import { initiatePayment, Payment } from "@/api/payments";

const SliderComponent: any = Slider;

const qualities: Array<{
  key: "DRAFT" | "STANDARD" | "HIGH";
  label: string;
  detail: string;
  badge: string;
}> = [
  {
    key: "DRAFT",
    label: "Draft",
    detail: "Fast, visible layers",
    badge: "Fastest",
  },
  {
    key: "STANDARD",
    label: "Standard",
    detail: "Balanced finish",
    badge: "Balanced",
  },
  {
    key: "HIGH",
    label: "High",
    detail: "Fine detail, slower",
    badge: "Detailed",
  },
];

const COLOR_SWATCHES: Record<string, string> = {
  White: "#FFFFFF",
  Black: "#16182B",
  Grey: "#9CA3AF",
  Gray: "#9CA3AF",
  Red: "#EB5757",
  Blue: "#2F80ED",
  Green: "#27AE60",
  Yellow: "#F2C94C",
  Orange: "#FF6A00",
  Clear: "#E5E5E5",
};

function colorSwatch(name: string): string {
  return COLOR_SWATCHES[name] ?? "#9CA3AF";
}

function strengthLabel(infill: number): string {
  if (infill < 25) return "Low";
  if (infill < 65) return "Medium";
  return "High";
}

type PickedAsset = DocumentPicker.DocumentPickerAsset;
type Step = "configure" | "estimate";
type EstimatePhase = "idle" | "uploading" | "estimating";
type PaymentPhase = "idle" | "initiating" | "checkout";
type PaymentOutcome = "success" | "cancelled" | null;

const STEPS = ["Configure", "Estimate", "Payment"] as const;

export default function SubmitScreen() {
  const { goToTab } = useSwipeTabs();
  const { colors } = useTheme();
  const { token } = useSession();
  const { refetch: refetchJobs } = useJobs();
  const { showToast } = useToast();
  const styles = makeStyles(colors);
  const controls = makeControlStyles(colors);

  const [step, setStep] = useState<Step>("configure");
  const [modelFile, setModelFile] = useState<PickedAsset | null>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [materialName, setMaterialName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [quality, setQuality] = useState<"DRAFT" | "STANDARD" | "HIGH">(
    "STANDARD",
  );
  const [infill, setInfill] = useState(20);
  const [qty, setQty] = useState(1);

  const [estimatePhase, setEstimatePhase] = useState<EstimatePhase>("idle");
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  const [payment, setPayment] = useState<Payment | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentOutcome, setPaymentOutcome] = useState<PaymentOutcome>(null);

  const loadMaterials = () => {
    if (!token) return;
    setMaterialsLoading(true);
    setMaterialsError(null);
    fetchMaterials(token)
      .then((data) => {
        setMaterials(data);
        setMaterialName((prev) => prev || data[0]?.name || "");
      })
      .catch((err) =>
        setMaterialsError(
          err instanceof Error ? err.message : "Failed to load materials",
        ),
      )
      .finally(() => setMaterialsLoading(false));
  };

  useEffect(loadMaterials, [token]);

  const selectedMaterial =
    materials.find((m) => m.name === materialName) ?? null;

  useEffect(() => {
    const available = selectedMaterial?.colors ?? [];
    if (available.length === 0) {
      setColor(null);
    } else if (!color || !available.includes(color)) {
      setColor(available[0]);
    }
  }, [materialName]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled && result.assets?.[0]) {
      setModelFile(result.assets[0]);
    }
  };

  const isReadyForEstimate = Boolean(
    modelFile && materialName && !materialsLoading,
  );

  const handleGetEstimate = async () => {
    if (!token || !modelFile || !materialName || estimatePhase !== "idle")
      return;
    setEstimateError(null);
    try {
      setEstimatePhase("uploading");
      const uploaded = await uploadFile(token, {
        uri: modelFile.uri,
        name: modelFile.name,
        mimeType: modelFile.mimeType,
      });

      setEstimatePhase("estimating");
      const created = await createEstimate(token, {
        fileId: uploaded.id,
        quality,
        infillPercent: infill,
        quantity: qty,
        materialType: materialName,
      });

      setEstimate(created);
      setStep("estimate");
    } catch (err) {
      setEstimateError(
        err instanceof Error ? err.message : "Could not calculate an estimate.",
      );
    } finally {
      setEstimatePhase("idle");
    }
  };

  const handlePay = async () => {
    if (!token || !estimate || paymentPhase !== "idle") return;
    setPaymentError(null);
    setPaymentOutcome(null);
    setPaymentPhase("initiating");
    try {
      const created = await initiatePayment(token, { estimateId: estimate.id });
      setPayment(created);
      setPaymentPhase("checkout");
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Could not start payment.",
      );
      setPaymentPhase("idle");
    }
  };

  const handlePaymentSuccess = () => {
    setPayment(null);
    setPaymentPhase("idle");
    refetchJobs();
    showToast("Your print job has been submitted!");
    setPaymentOutcome("success");
  };

  const handlePaymentCancel = () => {
    setPayment(null);
    setPaymentPhase("idle");
    setPaymentOutcome("cancelled");
  };

  const handlePaymentError = (message: string) => {
    setPayment(null);
    setPaymentPhase("idle");
    setPaymentError(message);
    showToast(message);
  };

  const resetFlow = () => {
    setPaymentOutcome(null);
    setEstimate(null);
    setModelFile(null);
    setStep("configure");
  };

  const estimatingBusy = estimatePhase !== "idle";
  const stepIndex =
    paymentOutcome === "success"
      ? 3
      : step === "configure"
        ? 0
        : paymentPhase === "idle"
          ? 1
          : 2;

  const successScale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (paymentOutcome === "success") {
      successScale.setValue(0);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }).start();
    }
  }, [paymentOutcome, successScale]);

  if (paymentOutcome === "success") {
    return (
      <View style={[styles.screen, styles.successScreen]}>
        <Animated.View
          style={[
            styles.successBadge,
            { transform: [{ scale: successScale }] },
          ]}
        >
          <CheckCircle2 size={64} color="#22C55E" strokeWidth={2} />
        </Animated.View>
        <Text style={styles.successTitle}>Order Submitted!</Text>
        <Text style={styles.successBody}>
          Payment confirmed — your print job was created and is waiting for lab
          review.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            resetFlow();
            goToTab("orders");
          }}
          style={({ pressed }) => [
            controls.primaryButton,
            styles.successButton,
            pressed && controls.primaryButtonPressed,
          ]}
        >
          <Text style={controls.primaryButtonText}>Track your order</Text>
          <ArrowRight size={19} color={colors.onPrimary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            resetFlow();
            goToTab("dashboard");
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.successLink}>Back to feed</Text>
        </Pressable>
      </View>
    );
  }

  const stepIndicator = (
    <View style={styles.stepsRow}>
      {STEPS.map((label, i) => {
        const done = i < stepIndex;
        const current = i === stepIndex;
        return (
          <View key={label} style={styles.stepItem}>
            {i > 0 ? (
              <View
                style={[styles.stepLine, i <= stepIndex && styles.stepLineDone]}
              />
            ) : null}
            <View
              style={[
                styles.stepCircle,
                (done || current) && styles.stepCircleActive,
              ]}
            >
              {done ? (
                <Check size={14} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    current && styles.stepNumberActive,
                  ]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                (done || current) && styles.stepLabelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  if (step === "estimate" && estimate) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {stepIndicator}

          {paymentOutcome === "cancelled" ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledTitle}>Payment cancelled</Text>
              <Text style={styles.cancelledBody}>
                No charge was made. Your estimate is still valid — try again
                when you're ready.
              </Text>
              <View style={styles.cancelledActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPaymentOutcome(null)}
                  style={({ pressed }) => [
                    styles.cancelledGhostButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.cancelledGhostText}>Back</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handlePay}
                  style={({ pressed }) => [
                    styles.cancelledRetryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.cancelledRetryText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Text style={styles.totalLabel}>TOTAL COST</Text>
          <GhsAmount
            amount={estimate.totalCost}
            size="xl"
            style={styles.totalAmount}
          />

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Scale size={18} color={colors.primary} />
              <Text style={styles.statValue}>
                ~{Math.round(estimate.estimatedGrams)}g
              </Text>
              <Text style={styles.statLabel}>{estimate.materialType}</Text>
            </View>
            <View style={styles.statCard}>
              <Clock3 size={18} color={colors.primary} />
              <Text style={styles.statValue}>
                ~{Math.round(estimate.durationMinutes)} min
              </Text>
              <Text style={styles.statLabel}>Print time</Text>
            </View>
            <View style={styles.statCard}>
              <Settings2 size={18} color={colors.primary} />
              <Text style={styles.statValue}>{estimate.quality}</Text>
              <Text style={styles.statLabel}>
                {estimate.infillPercent}% infill
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <SummaryRow
              label="File"
              value={modelFile?.name ?? "—"}
              styles={styles}
            />
            <View style={styles.summaryDivider} />
            <SummaryRow
              label="Material"
              value={estimate.materialType}
              styles={styles}
            />
            <View style={styles.summaryDivider} />
            <SummaryRow
              label="Quality"
              value={estimate.quality}
              styles={styles}
            />
            <View style={styles.summaryDivider} />
            <SummaryRow
              label="Infill"
              value={`${estimate.infillPercent}%`}
              styles={styles}
            />
            <View style={styles.summaryDivider} />
            <SummaryRow
              label="Quantity"
              value={String(estimate.quantity)}
              styles={styles}
            />
          </View>

          {paymentError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{paymentError}</Text>
            </View>
          ) : null}

          <Text style={styles.orderNote}>
            Payment is handled by Paystack. Your print job is created
            automatically once payment is confirmed.
          </Text>
        </ScrollView>

        <View style={styles.summaryFooter}>
          <Pressable
            accessibilityRole="button"
            disabled={paymentPhase !== "idle"}
            onPress={() => setStep("configure")}
            style={({ pressed }) => [
              controls.secondaryButton,
              styles.backButton,
              pressed && controls.secondaryButtonPressed,
            ]}
          >
            <ArrowLeft size={17} color={colors.primary} />
            <Text style={controls.secondaryButtonText}>Reconfigure</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={paymentPhase !== "idle"}
            onPress={handlePay}
            style={({ pressed }) => [
              controls.primaryButton,
              styles.payButton,
              paymentPhase !== "idle" && styles.buttonDisabled,
              pressed &&
                paymentPhase === "idle" &&
                controls.primaryButtonPressed,
            ]}
          >
            <Text style={controls.primaryButtonText}>Pay Now</Text>
            <ArrowRight size={18} color={colors.onPrimary} />
          </Pressable>
        </View>

        {paymentPhase === "initiating" ? (
          <View style={styles.redirectOverlay}>
            <View style={styles.redirectLogo}>
              <Box size={30} color={colors.primary} strokeWidth={2.2} />
            </View>
            <GhsAmount
              amount={estimate.totalCost}
              size="lg"
              style={styles.redirectAmount}
            />
            <ActivityIndicator
              color={colors.primary}
              style={styles.redirectSpinner}
            />
            <Text style={styles.redirectText}>Redirecting to payment...</Text>
          </View>
        ) : null}

        {payment && paymentPhase === "checkout" && token ? (
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

  // Configure step
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.title}>New Print Request</Text>
          <Box size={22} color={colors.primary} strokeWidth={2} />
        </View>

        {stepIndicator}

        {/* Upload zone — matches the screenshot: dashed orange border,
            dark navy bg, centered cloud icon (no circle bg),
            white title, orange "or browse files" link */}
        {modelFile ? (
          <View style={styles.fileCard}>
            <View style={styles.fileIconWrap}>
              <File size={22} color={colors.primary} />
            </View>
            <View style={styles.fileCopy}>
              <Text style={styles.fileName} numberOfLines={1}>
                {modelFile.name}
              </Text>
              <Text style={styles.fileMeta}>
                {Math.max(1, Math.round((modelFile.size ?? 0) / 1024))} KB ·
                Ready to upload
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Remove selected file"
              onPress={() => setModelFile(null)}
              style={({ pressed }) => [
                styles.removeButton,
                pressed && styles.pressed,
              ]}
            >
              <X size={18} color={colors.mutedFg} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.uploadBorderWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a 3D model file"
              onPress={pickFile}
              style={({ pressed }) => [pressed && styles.uploadZonePressed]}
            >
              <CloudUpload
                style={styles.cloudIcon}
                size={40}
                color="#FF6A00"
                strokeWidth={1.5}
              />
              <Text style={styles.uploadTitle}>
                Drop your STL, OBJ or 3MF file here
              </Text>
              <Text style={styles.uploadBrowse}>or browse files</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.fieldLabel}>MATERIAL</Text>
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
              style={({ pressed }) => [
                styles.materialsRetryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.materialsRetryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.materialPillsRow}
          >
            {materials.map((item) => {
              const active = item.name === materialName;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setMaterialName(item.name)}
                  style={[
                    styles.materialPill,
                    active && styles.materialPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.materialPillText,
                      active && styles.materialPillTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.materialPillRate,
                      active && styles.materialPillRateActive,
                    ]}
                  >
                    GH₵{item.costPerGram.toFixed(2)}/g
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.fieldLabel}>PRINT QUALITY</Text>
        <View style={styles.qualityRow}>
          {qualities.map((item) => {
            const active = item.key === quality;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setQuality(item.key)}
                style={[styles.qualityCard, active && styles.qualityCardActive]}
              >
                <Text
                  style={[
                    styles.qualityLabel,
                    active && styles.qualityLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={styles.qualityDetail}>{item.detail}</Text>
                <View
                  style={[
                    styles.qualityBadge,
                    active && styles.qualityBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.qualityBadgeText,
                      active && styles.qualityBadgeTextActive,
                    ]}
                  >
                    {item.badge}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.fieldHeaderRow}>
          <Text style={styles.fieldLabel}>INFILL DENSITY</Text>
          <Text style={styles.infillValue}>{infill}%</Text>
        </View>
        <SliderComponent
          value={infill}
          minimumValue={0}
          maximumValue={100}
          step={1}
          onValueChange={(value: any) =>
            setInfill(Array.isArray(value) ? value[0] : value)
          }
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.muted}
          thumbTintColor={colors.primary}
          containerStyle={styles.slider}
          trackStyle={styles.sliderTrack}
          thumbStyle={styles.sliderThumb}
        />
        <Text style={styles.strengthText}>
          Structural strength:{" "}
          <Text style={styles.strengthValue}>{strengthLabel(infill)}</Text>
        </Text>

        <View style={styles.qtyColorRow}>
          <View style={styles.qtyBlock}>
            <Text style={styles.fieldLabel}>QUANTITY</Text>
            <View style={styles.stepperGroup}>
              <Pressable
                onPress={() => setQty(Math.max(1, qty - 1))}
                disabled={qty <= 1}
                style={({ pressed }) => [styles.stepperMinus, qty <= 1 && { opacity: 0.4 }, pressed && styles.pressed]}
              >
                <Minus size={14} color="#FFFFFF" />
              </Pressable>

              <Text style={styles.stepperValue}>{qty}</Text>

              <Pressable
                onPress={() => setQty(qty + 1)}
                style={({ pressed }) => [styles.stepperPlus, pressed && styles.pressed]}
              >
                <Plus size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {selectedMaterial && selectedMaterial.colors.length > 0 ? (
            <View style={styles.colorBlock}>
              <Text style={styles.fieldLabel}>COLOR</Text>
              <View style={styles.colorRow}>
                {selectedMaterial.colors.map((name) => {
                  const active = color === name;
                  return (
                    <Pressable
                      key={name}
                      accessibilityLabel={name}
                      accessibilityState={{ selected: active }}
                      onPress={() => setColor(name)}
                      style={[
                        styles.colorDotOuter,
                        active && styles.colorDotOuterActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: colorSwatch(name) },
                          colorSwatch(name).toUpperCase() === "#FFFFFF" &&
                            styles.whiteColorDot,
                        ]}
                      >
                        {active ? (
                          <Check
                            size={13}
                            color={
                              colorSwatch(name).toUpperCase() === "#FFFFFF"
                                ? "#0A182E"
                                : "#FFFFFF"
                            }
                            strokeWidth={3}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {estimateError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{estimateError}</Text>
          </View>
        ) : null}

        <Pressable
          disabled={!isReadyForEstimate || estimatingBusy}
          onPress={handleGetEstimate}
          style={[
            controls.primaryButton,
            styles.estimateButton,
            (!isReadyForEstimate || estimatingBusy) && styles.buttonDisabled,
          ]}   
        >
          {estimatingBusy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={controls.primaryButtonText}>Get Estimate</Text>
          )}
        </Pressable>
      </ScrollView>



      {estimatingBusy ? (
        <View style={styles.redirectOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.redirectText}>
            {estimatePhase === "uploading"
              ? "Uploading your model..."
              : "Calculating your estimate..."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.md,
      paddingBottom: 150,
    },
    pressed: { opacity: 0.72 },

    stepsRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: designTokens.spacing.xl,
    },
    stepItem: { flexDirection: "row", alignItems: "center" },
    stepLine: {
      width: 34,
      height: 2,
      backgroundColor: colors.muted,
      marginHorizontal: 6,
      marginBottom: 18,
    },
    stepLineDone: { backgroundColor: colors.primary },
    stepCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    stepCircleActive: { backgroundColor: colors.primary },
    stepNumber: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    stepNumberActive: { color: "#FFFFFF" },
    stepLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 10,
      marginLeft: 6,
      marginRight: 2,
    },
    stepLabelActive: { color: colors.foreground },

    sectionHeadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: designTokens.spacing.lg,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 25,
      letterSpacing: -0.5,
    },
    uploadBorderWrap: {
      borderRadius: designTokens.radius.lg,
      borderWidth: 1.5,
      minHeight: 180,
      backgroundColor: "rgba(255, 106, 0, 0.08)",
      alignItems: "center",
      justifyContent: "center",
      borderStyle: "dashed",
      borderColor: "#FF6A00",
      marginBottom: designTokens.spacing.xl,
      overflow: "hidden",
    },
    // Upload zone — matches screenshot exactly
    // uploadZone: {
    //   minHeight: 180,
    //   backgroundColor: "rgba(255, 106, 0, 0.08)",
    //   alignItems: "center",
    //   justifyContent: "center",
    //   gap: 10,
    //   padding: designTokens.spacing.xl,
    //   // NO borderRadius, borderWidth, borderColor here — handled by wrapper
    // },
    cloudIcon: { position: "relative", alignSelf: "center" },
    uploadZonePressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
    uploadTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
      textAlign: "center",
    },
    uploadBrowse: {
      color: colors.primary,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      textAlign: "center",
    },

    fileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: designTokens.spacing.md,
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      padding: designTokens.spacing.md,
      marginBottom: designTokens.spacing.xl,
    },
    fileIconWrap: {
      width: 42,
      height: 42,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    fileCopy: { flex: 1, minWidth: 0 },
    fileName: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
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
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },

    fieldLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    fieldHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    materialsStateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: designTokens.spacing.sm,
      minHeight: 54,
      marginBottom: designTokens.spacing.lg,
    },
    materialsStateText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      flexShrink: 1,
    },
    materialsRetryButton: {
      minHeight: 34,
      borderRadius: designTokens.radius.pill,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    materialsRetryText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
    },
    materialPillsRow: { gap: 8, paddingBottom: designTokens.spacing.lg },
    materialPill: {
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.muted,
      paddingHorizontal: 15,
      paddingVertical: 5,
      alignItems: "center",
    },
    materialPillActive: {
      backgroundColor: colors.primary,
      borderColor: "#ffffff",
      borderWidth: 1,
    },
    materialPillText: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    materialPillTextActive: { color: "#FFFFFF" },
    materialPillRate: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      marginTop: 2,
    },
    materialPillRateActive: { color: "rgba(255,255,255,0.8)" },

    qualityRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: designTokens.spacing.xl,
    },
    qualityCard: {
      flex: 1,
      minHeight: 96,
      borderRadius: designTokens.radius.md,
      borderWidth: 1.5,
      borderColor: "transparent",
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 7,
      paddingVertical: 10,
      gap: 4,
    },
    qualityCardActive: {
      borderColor: colors.primary,
      backgroundColor: "rgba(255, 107, 0, 0.1)",
    },
    qualityLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    qualityLabelActive: { color: colors.primary },
    qualityDetail: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 9,
      textAlign: "center",
    },
    qualityBadge: {
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.muted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 2,
    },
    qualityBadgeActive: { backgroundColor: colors.primary },
    qualityBadgeText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
    },
    qualityBadgeTextActive: { color: "#FFFFFF" },

    infillValue: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
    },
    slider: { height: 32, marginHorizontal: -2 },
    sliderTrack: { height: 4, borderRadius: 2 },
    sliderThumb: {
      width: 21,
      height: 21,
      borderRadius: 11,
      borderWidth: 4,
      borderColor: colors.card,
    },
    strengthText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginBottom: designTokens.spacing.xl,
    },
    strengthValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
    },

    qtyColorRow: { gap: designTokens.spacing.lg },
    qtyBlock: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    stepperGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    stepperMinus: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: "#eef1f5b7",
      alignItems: "center",
      justifyContent: "center",
    },
    stepperPlus: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: "#FF6A00",
      alignItems: "center",
      justifyContent: "center",
    },
    stepperValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
      minWidth: 24,
      textAlign: "center",
    },
    colorBlock: {},
    colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    colorDotOuter: {
      width: 44,
      height: 44,
      borderRadius: "50%",
      borderWidth: 2,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    colorDotOuterActive: { borderColor: colors.primary },
    colorDot: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      alignItems: "center",
      justifyContent: "center",
    },
    whiteColorDot: { borderWidth: 1, borderColor: colors.border },

    errorBanner: {
      padding: 12,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.statusFailed.bg,
      borderWidth: 1,
      borderColor: colors.statusFailed.dot,
      marginTop: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.md,
    },
    errorBannerText: {
      color: colors.statusFailed.text,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 17,
    },

    totalLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
      letterSpacing: 1,
      textAlign: "center",
      marginBottom: 6,
    },
    totalAmount: {
      fontSize: 44,
      color: colors.primary,
      textAlign: "center",
      alignSelf: "center",
      marginBottom: designTokens.spacing.xl,
    },
    statRow: {
      flexDirection: "row",
      gap: 9,
      marginBottom: designTokens.spacing.lg,
    },
    statCard: {
      flex: 1,
      minHeight: 92,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      padding: 10,
    },
    statValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
      textAlign: "center",
    },
    statLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      textAlign: "center",
    },
    summaryCard: {
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      paddingHorizontal: designTokens.spacing.lg,
      paddingVertical: 4,
      marginBottom: designTokens.spacing.lg,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 12,
    },
    summaryDivider: { height: 1, backgroundColor: colors.border },
    summaryLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
    },
    summaryValue: {
      flexShrink: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
      textAlign: "right",
    },
    orderNote: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      lineHeight: 16,
      paddingHorizontal: 4,
    },

    cancelledBanner: {
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.xl,
    },
    cancelledTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
      marginBottom: 4,
    },
    cancelledBody: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: designTokens.spacing.md,
    },
    cancelledActions: { flexDirection: "row", gap: 10 },
    cancelledGhostButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelledGhostText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    cancelledRetryButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelledRetryText: {
      color: "#FFFFFF",
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },

    summaryFooter: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      minHeight: 88,
      backgroundColor: colors.sidebar,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: designTokens.spacing.lg,
      paddingVertical: designTokens.spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    estimateButton: {
      width: "80%",
      minHeight: 52,
      borderRadius: 19,
      backgroundColor: "#FF6A00",
      alignItems: "center",
      alignSelf: "center",
      marginTop: 65,
      justifyContent: "center",
    },
    backButton: { flex: 0.9, minHeight: 50 },
    payButton: { flex: 1.1, minHeight: 50 },
    buttonDisabled: { opacity: 0.5 },

    redirectOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      zIndex: 10,
    },
    redirectLogo: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    redirectAmount: { color: "#FFFFFF" },
    redirectSpinner: { marginTop: 4 },
    redirectText: {
      color: "#FFFFFF",
      fontFamily: designTokens.type.medium,
      fontSize: 14,
    },

    successScreen: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: designTokens.spacing.section,
      gap: designTokens.spacing.md,
    },
    successBadge: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: "rgba(34, 197, 94, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: designTokens.spacing.sm,
    },
    successTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 28,
      letterSpacing: -0.5,
    },
    successBody: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      maxWidth: 280,
      marginBottom: designTokens.spacing.md,
    },
    successButton: { alignSelf: "stretch" },
    successLink: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
      padding: 10,
    },
  });
}
