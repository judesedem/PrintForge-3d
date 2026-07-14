import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Box,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Layers3,
  MapPin,
  PackageCheck,
  Printer,
  RotateCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../../src/ThemeContext';
import { Colors, designTokens, makeControlStyles } from '../../src/theme';
import { useJobs } from '../../src/JobsContext';
import { JobStatus } from '../../src/data/mockData';
import StatusBadge from '../../src/components/StatusBadge';
import MonoText from '../../src/components/MonoText';
import Card from '../../src/components/Card';
import GhsAmount from '../../src/components/GhsAmount';

const ORDER_STEPS: Array<{
  label: string;
  description: string;
  status: JobStatus;
}> = [
  {
    label: 'Order submitted',
    description: 'Your model and print settings were received.',
    status: 'SUBMITTED',
  },
  {
    label: 'Lab approved',
    description: 'A lab operator reviewed the model for printing.',
    status: 'APPROVED',
  },
  {
    label: 'Added to queue',
    description: 'The job is waiting for an available printer.',
    status: 'QUEUED',
  },
  {
    label: 'Printing',
    description: 'Your model is being produced in the university lab.',
    status: 'PRINTING',
  },
  {
    label: 'Ready for pickup',
    description: 'Quality checks are complete and the order is ready.',
    status: 'COMPLETED',
  },
];

const STATUS_ORDER: Record<JobStatus, number> = {
  SUBMITTED: 0,
  APPROVED: 1,
  QUEUED: 2,
  PRINTING: 3,
  IN_PROGRESS: 3,
  COMPLETED: 4,
  FAILED: 3,
  REJECTED: 0,
};

export default function JobDetail() {
  const router = useRouter();
  const { colors } = useTheme();
  const { jobs, loading } = useJobs();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [receiptDownloaded, setReceiptDownloaded] = useState(false);
  const job = jobs.find(item => item.id === String(id));
  const s = makeStyles(colors);
  const controls = makeControlStyles(colors);

  if (!job) {
    // Previously `jobs[0]` was used as a fallback — safe with mock data
    // (always non-empty), but real data can legitimately be empty while
    // loading, or if this job id doesn't belong to the current user.
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [s.iconButton, pressed && s.iconButtonPressed]}
          >
            <ArrowLeft size={21} color={colors.foreground} strokeWidth={2} />
          </Pressable>
          <View style={s.headerCopy}>
            <Text style={s.eyebrow}>ORDER TRACKING</Text>
            <Text style={s.headerTitle}>Print progress</Text>
          </View>
          <View style={s.headerMark}>
            <Box size={20} color={colors.primary} />
          </View>
        </View>
        <View style={{ padding: designTokens.spacing.lg }}>
          <Text style={{ color: colors.mutedFg, fontFamily: designTokens.type.body }}>
            {loading ? 'Loading order…' : "This order couldn't be found."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = STATUS_ORDER[job.status];
  const isProblemState = job.status === 'FAILED' || job.status === 'REJECTED';
  const progress = useMemo(() => {
    if (job.status === 'COMPLETED') return 100;
    if (job.status === 'PRINTING' || job.status === 'IN_PROGRESS') return 72;
    if (job.status === 'QUEUED') return 48;
    if (job.status === 'APPROVED') return 28;
    return 12;
  }, [job.status]);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [s.iconButton, pressed && s.iconButtonPressed]}
        >
          <ArrowLeft size={21} color={colors.foreground} strokeWidth={2} />
        </Pressable>

        <View style={s.headerCopy}>
          <Text style={s.eyebrow}>ORDER TRACKING</Text>
          <Text style={s.headerTitle}>Print progress</Text>
        </View>

        <View style={s.headerMark}>
          <Box size={20} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <Card style={s.heroCard}>
          <View style={s.heroTopRow}>
            <View style={s.heroIdentity}>
              <View style={s.modelIcon}>
                <Layers3 size={25} color={colors.primary} />
              </View>
              <View style={s.heroTitleWrap}>
                <MonoText style={s.orderId}>{job.id}</MonoText>
                <Text style={s.title} numberOfLines={2}>{job.title}</Text>
              </View>
            </View>
            <StatusBadge status={job.status} />
          </View>

          <View style={s.progressHeader}>
            <Text style={s.progressLabel}>
              {job.status === 'COMPLETED' ? 'Order complete' : isProblemState ? 'Action needed' : 'Order progress'}
            </Text>
            <Text style={s.progressValue}>{progress}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: isProblemState ? colors.destructive : colors.primary,
                },
              ]}
            />
          </View>

          <View style={s.heroDivider} />

          <View style={s.heroFooter}>
            <View>
              <Text style={s.metaLabel}>TOTAL</Text>
              <GhsAmount amount={job.cost} size="lg" />
            </View>
            <View style={s.pickupBlock}>
              <Text style={s.metaLabel}>PICKUP</Text>
              <View style={s.inlineMeta}>
                <MapPin size={15} color={colors.primary} />
                <Text style={s.pickupText}>{job.location}</Text>
              </View>
            </View>
          </View>
        </Card>

        {isProblemState ? (
          <View style={s.problemBanner}>
            <View style={s.problemIcon}>
              <AlertCircle size={20} color={colors.destructive} />
            </View>
            <View style={s.problemCopy}>
              <Text style={s.problemTitle}>
                {job.status === 'REJECTED' ? 'This order was not approved' : 'The print needs attention'}
              </Text>
              <Text style={s.problemText}>
                Review the lab note below for the next step on this order.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={s.sectionHeadingRow}>
          <View>
            <Text style={s.sectionEyebrow}>LIVE STATUS</Text>
            <Text style={s.sectionTitle}>Order timeline</Text>
          </View>
          <View style={s.securePill}>
            <ShieldCheck size={14} color={colors.success} />
            <Text style={s.securePillText}>Lab verified</Text>
          </View>
        </View>

        <Card style={s.timelineCard}>
          {ORDER_STEPS.map((step, index) => {
            const isActive = !isProblemState && currentStep === index && job.status !== 'COMPLETED';
            const isDone = !isProblemState && (currentStep > index || job.status === 'COMPLETED');
            const isReachedBeforeProblem = isProblemState && currentStep > index;
            const completedVisual = isDone || isReachedBeforeProblem;

            return (
              <View key={step.status} style={s.timelineRow}>
                <View style={s.timelineRail}>
                  <View
                    style={[
                      s.timelineDot,
                      completedVisual && s.timelineDotDone,
                      isActive && s.timelineDotActive,
                    ]}
                  >
                    {completedVisual ? (
                      <Check size={14} color={colors.white} strokeWidth={3} />
                    ) : isActive ? (
                      <RotateCw size={13} color={colors.primary} />
                    ) : (
                      <View style={s.timelineDotInner} />
                    )}
                  </View>
                  {index < ORDER_STEPS.length - 1 ? (
                    <View
                      style={[
                        s.timelineLine,
                        completedVisual && s.timelineLineDone,
                      ]}
                    />
                  ) : null}
                </View>

                <View style={[s.timelineCopy, index === ORDER_STEPS.length - 1 && s.timelineCopyLast]}>
                  <View style={s.timelineTitleRow}>
                    <Text
                      style={[
                        s.timelineTitle,
                        (isActive || completedVisual) && s.timelineTitleActive,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {isActive ? <Text style={s.nowLabel}>NOW</Text> : null}
                  </View>
                  <Text style={s.timelineDescription}>{step.description}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        {job.notes ? (
          <Card style={s.noteCard}>
            <View style={s.noteIcon}>
              <FileText size={19} color={colors.warning} />
            </View>
            <View style={s.noteCopy}>
              <Text style={s.noteEyebrow}>LAB NOTE</Text>
              <Text style={s.noteTitle}>Operator update</Text>
              <Text style={s.noteBody}>{job.notes}</Text>
            </View>
          </Card>
        ) : null}

        <View style={s.sectionHeadingRow}>
          <View>
            <Text style={s.sectionEyebrow}>SPECIFICATIONS</Text>
            <Text style={s.sectionTitle}>Print details</Text>
          </View>
        </View>

        <View style={s.specGrid}>
          <Card style={s.specCard}>
            <View style={s.specIconOrange}>
              <Box size={19} color={colors.primary} />
            </View>
            <Text style={s.specLabel}>Material</Text>
            <Text style={s.specValue}>{job.material}</Text>
          </Card>
          <Card style={s.specCard}>
            <View style={s.specIconBlue}>
              <Sparkles size={19} color={colors.info} />
            </View>
            <Text style={s.specLabel}>Quality</Text>
            <Text style={s.specValue}>{job.quality}</Text>
          </Card>
          <Card style={s.specCard}>
            <View style={s.specIconGreen}>
              <PackageCheck size={19} color={colors.success} />
            </View>
            <Text style={s.specLabel}>Quantity</Text>
            <Text style={s.specValue}>{job.qty}</Text>
          </Card>
          <Card style={s.specCard}>
            <View style={s.specIconPurple}>
              <Layers3 size={19} color={colors.chart4} />
            </View>
            <Text style={s.specLabel}>Infill</Text>
            <Text style={s.specValue}>20%</Text>
          </Card>
        </View>

        <Card style={s.assignmentCard}>
          <View style={s.assignmentHeader}>
            <View>
              <Text style={s.sectionEyebrow}>LAB ASSIGNMENT</Text>
              <Text style={s.assignmentTitle}>Production details</Text>
            </View>
            <View style={s.printerBadge}>
              <Printer size={18} color={colors.primary} />
            </View>
          </View>

          <View style={s.assignmentRow}>
            <View style={s.assignmentIcon}>
              <Printer size={17} color={colors.mutedFg} />
            </View>
            <View style={s.assignmentCopy}>
              <Text style={s.assignmentLabel}>Assigned printer</Text>
              <Text style={s.assignmentValue}>{job.printer}</Text>
            </View>
          </View>
          <View style={s.assignmentRow}>
            <View style={s.assignmentIcon}>
              <MapPin size={17} color={colors.mutedFg} />
            </View>
            <View style={s.assignmentCopy}>
              <Text style={s.assignmentLabel}>Lab location</Text>
              <Text style={s.assignmentValue}>{job.location}</Text>
            </View>
          </View>
          <View style={[s.assignmentRow, s.assignmentRowLast]}>
            <View style={s.assignmentIcon}>
              <Clock3 size={17} color={colors.mutedFg} />
            </View>
            <View style={s.assignmentCopy}>
              <Text style={s.assignmentLabel}>Tracking reference</Text>
              <MonoText style={s.trackingValue}>{job.tracking}</MonoText>
            </View>
          </View>
        </Card>

        {job.status === 'COMPLETED' ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => setReceiptDownloaded(true)}
              style={({ pressed }) => [
                controls.primaryButton,
                s.receiptButton,
                pressed && controls.primaryButtonPressed,
              ]}
            >
              <Download size={19} color={colors.onPrimary} />
              <Text style={controls.primaryButtonText}>Download receipt</Text>
            </Pressable>

            {receiptDownloaded ? (
              <View style={s.successCard}>
                <CheckCircle2 size={21} color={colors.success} />
                <View style={s.successCopy}>
                  <Text style={s.successTitle}>Receipt ready</Text>
                  <Text style={s.successText}>
                    Your latest order summary has been queued for download.
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      minHeight: 70,
      paddingHorizontal: designTokens.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.sidebar,
      borderBottomWidth: 1,
      borderBottomColor: colors.sidebarBorder,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonPressed: {
      backgroundColor: colors.secondary,
      transform: [{ scale: 0.98 }],
    },
    headerCopy: {
      flex: 1,
      marginHorizontal: designTokens.spacing.md,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1.3,
    },
    headerTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 19,
      marginTop: 2,
    },
    headerMark: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: designTokens.spacing.lg,
      paddingBottom: 44,
    },
    heroCard: {
      padding: designTokens.spacing.xl,
      borderColor: colors.primary,
      borderWidth: 1.25,
      marginBottom: designTokens.spacing.lg,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: designTokens.spacing.md,
    },
    heroIdentity: {
      minWidth: 0,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.md,
    },
    modelIcon: {
      width: 52,
      height: 52,
      borderRadius: designTokens.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    heroTitleWrap: {
      minWidth: 0,
      flex: 1,
    },
    orderId: {
      color: colors.mutedFg,
      fontSize: 11,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 20,
      lineHeight: 24,
      marginTop: 5,
    },
    progressHeader: {
      marginTop: designTokens.spacing.xl,
      marginBottom: designTokens.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 12,
    },
    progressValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    progressTrack: {
      height: 8,
      overflow: 'hidden',
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.muted,
    },
    progressFill: {
      height: '100%',
      borderRadius: designTokens.radius.pill,
    },
    heroDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: designTokens.spacing.lg,
    },
    heroFooter: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: designTokens.spacing.lg,
    },
    metaLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1.2,
      marginBottom: 5,
    },
    pickupBlock: {
      alignItems: 'flex-end',
      minWidth: 0,
      flex: 1,
    },
    inlineMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    pickupText: {
      color: colors.foreground,
      fontFamily: designTokens.type.medium,
      fontSize: 13,
    },
    problemBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: designTokens.spacing.md,
      padding: designTokens.spacing.lg,
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.statusFailed.bg,
      borderWidth: 1,
      borderColor: colors.statusFailed.dot,
      marginBottom: designTokens.spacing.xl,
    },
    problemIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    problemCopy: {
      flex: 1,
    },
    problemTitle: {
      color: colors.statusFailed.text,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    problemText: {
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    sectionHeadingRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: designTokens.spacing.md,
      marginTop: designTokens.spacing.sm,
      marginBottom: designTokens.spacing.md,
    },
    sectionEyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1.2,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 20,
      marginTop: 3,
    },
    securePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.statusCompleted.bg,
    },
    securePillText: {
      color: colors.statusCompleted.text,
      fontFamily: designTokens.type.medium,
      fontSize: 10,
    },
    timelineCard: {
      paddingVertical: designTokens.spacing.xl,
      marginBottom: designTokens.spacing.xl,
    },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    timelineRail: {
      width: 34,
      alignItems: 'center',
    },
    timelineDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineDotDone: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    timelineDotActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    timelineDotInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.mutedFg,
      opacity: 0.55,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      minHeight: 46,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    timelineLineDone: {
      backgroundColor: colors.success,
    },
    timelineCopy: {
      flex: 1,
      paddingLeft: designTokens.spacing.md,
      paddingBottom: designTokens.spacing.xl,
    },
    timelineCopyLast: {
      paddingBottom: 0,
    },
    timelineTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    timelineTitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    timelineTitleActive: {
      color: colors.foreground,
    },
    nowLabel: {
      color: colors.primary,
      backgroundColor: colors.primarySoft,
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 7,
      paddingVertical: 3,
      overflow: 'hidden',
      fontFamily: designTokens.type.heading,
      fontSize: 8,
      letterSpacing: 0.8,
    },
    timelineDescription: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    noteCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: designTokens.spacing.md,
      backgroundColor: colors.statusSubmitted.bg,
      borderColor: colors.statusSubmitted.dot,
      marginBottom: designTokens.spacing.xl,
    },
    noteIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    noteCopy: {
      flex: 1,
    },
    noteEyebrow: {
      color: colors.statusSubmitted.text,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1.1,
    },
    noteTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
      marginTop: 2,
    },
    noteBody: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
    },
    specGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: designTokens.spacing.md,
      marginBottom: designTokens.spacing.xl,
    },
    specCard: {
      width: '48%',
      flexGrow: 1,
      minWidth: 142,
      padding: designTokens.spacing.md,
    },
    specIconOrange: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 11,
    },
    specIconBlue: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.statusApproved.bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 11,
    },
    specIconGreen: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.statusCompleted.bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 11,
    },
    specIconPurple: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.materialTpu,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 11,
    },
    specLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 11,
    },
    specValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
      marginTop: 4,
    },
    assignmentCard: {
      marginBottom: designTokens.spacing.lg,
      padding: 0,
      overflow: 'hidden',
    },
    assignmentHeader: {
      padding: designTokens.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    assignmentTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
      marginTop: 3,
    },
    printerBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assignmentRow: {
      minHeight: 68,
      paddingHorizontal: designTokens.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    assignmentRowLast: {
      borderBottomWidth: 0,
    },
    assignmentIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assignmentCopy: {
      flex: 1,
    },
    assignmentLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
    },
    assignmentValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.medium,
      fontSize: 14,
      marginTop: 2,
    },
    trackingValue: {
      color: colors.primary,
      fontSize: 12,
      marginTop: 2,
    },
    receiptButton: {
      marginTop: designTokens.spacing.sm,
    },
    successCard: {
      marginTop: designTokens.spacing.md,
      padding: designTokens.spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: designTokens.spacing.md,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.statusCompleted.dot,
      backgroundColor: colors.statusCompleted.bg,
    },
    successCopy: {
      flex: 1,
    },
    successTitle: {
      color: colors.statusCompleted.text,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    successText: {
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 3,
    },
  });
}
