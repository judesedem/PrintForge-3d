import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Filter,
  Layers3,
  MapPin,
  MoreHorizontal,
  Printer,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Wrench,
  XCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { useJobs } from '@/JobsContext';
import { useSession } from '@/SessionContext';
import { approveJob, rejectJob } from '@/api/jobs';
import {
  Job,
  Printer as PrinterModel,
  PrinterStatus,
  PRINTERS,
} from '@/data/mockData';
import {
  Colors,
  designTokens,
  getMaterialChipColors,
  makeControlStyles,
} from '@/theme';
import Card from '@/components/Card';
import MonoText from '@/components/MonoText';
import PrinterDot from '@/components/PrinterDot';
import StatusBadge from '@/components/StatusBadge';

type PrinterFilter = 'ALL' | PrinterStatus;

const printerFilters: Array<{ label: string; value: PrinterFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Busy', value: 'BUSY' },
  { label: 'Offline', value: 'OFFLINE' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
];

const printerCapabilities = [
  ['PLA', 'PETG', 'TPU'],
  ['RESIN', 'ABS'],
  ['PLA', 'PETG'],
  ['PLA', 'ABS'],
  ['PLA', 'PETG', 'TPU'],
  ['RESIN'],
];

function getStatusLabel(status: PrinterStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getWaitLabel(printer: PrinterModel) {
  if (printer.status === 'AVAILABLE') return 'Ready now';
  if (printer.status === 'BUSY') return printer.progress === 100 ? 'Finishing now' : 'Est. 1h 15m';
  if (printer.status === 'MAINTENANCE') return 'Back tomorrow';
  return 'Unavailable';
}

export default function StaffQueue() {
  const router = useRouter();
  const { colors } = useTheme();
  const { jobs, refetch } = useJobs();
  const { token } = useSession();
  const s = makeStyles(colors);
  const controls = makeControlStyles(colors);

  const [selectedJob, setSelectedJob] = useState(jobs[0]?.id ?? '');
  const [printer, setPrinter] = useState(
    PRINTERS.find(item => item.status === 'AVAILABLE')?.id || 'printer-3',
  );
  const [notes, setNotes] = useState('');
  const [sortBy, setSortBy] = useState('Date Submitted');
  const [printerFilter, setPrinterFilter] = useState<PrinterFilter>('ALL');
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selected = jobs.find(job => job.id === selectedJob);

  // Reuses the existing "operator notes" field as the reject reason —
  // there's no separate reject-reason UI anywhere in this screen, and the
  // field's own placeholder ("Add setup, support, or pickup notes...") is
  // generic enough to double as one rather than inventing a new modal/input.
  const handleApprove = async () => {
    if (!selected || !token || actionLoading) return;
    setActionLoading('approve');
    setActionError(null);
    try {
      await approveJob(token, selected.id, { printerId: printer });
      await refetch();
      setNotes('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selected || !token || actionLoading) return;
    setActionLoading('reject');
    setActionError(null);
    try {
      await rejectJob(token, selected.id, notes.trim() || undefined);
      await refetch();
      setNotes('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject job');
    } finally {
      setActionLoading(null);
    }
  };
  const availablePrinters = PRINTERS.filter(item => item.status === 'AVAILABLE');
  const busyPrinters = PRINTERS.filter(item => item.status === 'BUSY');
  const filteredPrinters = useMemo(
    () =>
      printerFilter === 'ALL'
        ? PRINTERS
        : PRINTERS.filter(item => item.status === printerFilter),
    [printerFilter],
  );

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        style={s.screen}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [s.iconButton, pressed && s.pressed]}
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>

          <View style={s.topBarCopy}>
            <Text style={s.eyebrow}>LAB OPERATIONS</Text>
            <Text style={s.pageTitle}>Engineering Lab A</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh printer and queue data"
            onPress={() => {}}
            style={({ pressed }) => [s.iconButton, pressed && s.pressed]}
          >
            <RefreshCw size={19} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <View style={[s.summaryIcon, { backgroundColor: colors.statusCompleted.bg }]}>
              <Printer size={18} color={colors.printerAvailable} />
            </View>
            <Text style={s.summaryValue}>{availablePrinters.length}</Text>
            <Text style={s.summaryLabel}>Available</Text>
          </View>

          <View style={s.summaryCard}>
            <View style={[s.summaryIcon, { backgroundColor: colors.statusPrinting.bg }]}>
              <Clock3 size={18} color={colors.printerBusy} />
            </View>
            <Text style={s.summaryValue}>{busyPrinters.length}</Text>
            <Text style={s.summaryLabel}>Printing</Text>
          </View>

          <View style={s.summaryCard}>
            <View style={[s.summaryIcon, { backgroundColor: colors.statusSubmitted.bg }]}>
              <Layers3 size={18} color={colors.statusSubmitted.dot} />
            </View>
            <Text style={s.summaryValue}>{jobs.length}</Text>
            <Text style={s.summaryLabel}>Queue jobs</Text>
          </View>
        </View>

        <View style={s.sectionHeadingRow}>
          <View>
            <Text style={s.sectionTitle}>Lab printers</Text>
            <Text style={s.sectionSubtitle}>Select a printer or review live availability.</Text>
          </View>
          <View style={s.smallIconButton}>
            <SlidersHorizontal size={17} color={colors.mutedFg} />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {printerFilters.map(filter => {
            const active = printerFilter === filter.value;
            const count =
              filter.value === 'ALL'
                ? PRINTERS.length
                : PRINTERS.filter(item => item.status === filter.value).length;

            return (
              <Pressable
                key={filter.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setPrinterFilter(filter.value)}
                style={({ pressed }) => [
                  s.filterChip,
                  active && s.filterChipActive,
                  pressed && s.pressed,
                ]}
              >
                <Text style={[s.filterText, active && s.filterTextActive]}>{filter.label}</Text>
                <View style={[s.filterCount, active && s.filterCountActive]}>
                  <Text style={[s.filterCountText, active && s.filterCountTextActive]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.printerList}>
          {filteredPrinters.map((item, index) => (
            <PrinterFleetCard
              key={item.id}
              printer={item}
              materials={printerCapabilities[PRINTERS.indexOf(item)] || ['PLA']}
              selected={printer === item.id}
              onPress={() => setPrinter(item.id)}
              colors={colors}
              styles={s}
            />
          ))}
        </View>

        <View style={s.sectionHeadingRow}>
          <View>
            <Text style={s.sectionTitle}>Print queue</Text>
            <Text style={s.sectionSubtitle}>{jobs.length} jobs waiting for staff review or printing.</Text>
          </View>
          <View style={s.sortShell}>
            <Filter size={14} color={colors.mutedFg} />
            <Picker
              selectedValue={sortBy}
              onValueChange={value => setSortBy(value)}
              style={s.sortPicker}
              dropdownIconColor={colors.mutedFg}
            >
              <Picker.Item label="Date Submitted" value="Date Submitted" />
              <Picker.Item label="Status" value="Status" />
              <Picker.Item label="Material" value="Material" />
            </Picker>
          </View>
        </View>

        <View style={s.jobList}>
          {jobs.map(item => (
            <QueueJobCard
              key={item.id}
              job={item}
              selected={selectedJob === item.id}
              onPress={() => setSelectedJob(previous => (previous === item.id ? '' : item.id))}
              colors={colors}
              styles={s}
            />
          ))}
        </View>

        {selected ? (
          <Card style={s.actionPanel}>
            <View style={s.panelHeader}>
              <View style={s.panelHeaderCopy}>
                <Text style={s.panelEyebrow}>SELECTED JOB</Text>
                <Text style={s.panelTitle}>{selected.title}</Text>
                <MonoText style={s.panelId}>{selected.id}</MonoText>
              </View>
              <StatusBadge status={selected.status} />
            </View>

            <View style={s.detailsGrid}>
              <DetailCell label="Student" value={selected.student} icon="student" colors={colors} styles={s} />
              <DetailCell label="Material" value={selected.material} icon="material" colors={colors} styles={s} />
              <DetailCell label="Quality" value={selected.quality} icon="quality" colors={colors} styles={s} />
              <DetailCell label="Quantity" value={String(selected.qty)} icon="quantity" colors={colors} styles={s} />
            </View>

            <View style={s.costRow}>
              <View>
                <Text style={s.fieldLabel}>ESTIMATED COST</Text>
                <Text style={s.costValue}>GH₵ {selected.cost.toFixed(2)}</Text>
              </View>
              <View style={s.locationPill}>
                <MapPin size={14} color={colors.primary} />
                <Text style={s.locationPillText}>{selected.location}</Text>
              </View>
            </View>

            <Text style={s.fieldLabel}>ASSIGN PRINTER</Text>
            <View style={s.pickerShell}>
              <Printer size={18} color={colors.primary} />
              <Picker
                selectedValue={printer}
                onValueChange={value => setPrinter(value)}
                style={s.printerPicker}
                dropdownIconColor={colors.mutedFg}
              >
                {availablePrinters.map(item => (
                  <Picker.Item key={item.id} label={`${item.name} · ${item.location}`} value={item.id} />
                ))}
              </Picker>
              <ChevronDown size={17} color={colors.mutedFg} />
            </View>

            <Text style={s.fieldLabel}>OPERATOR NOTES</Text>
            <TextInput
              style={s.notesInput}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Add setup, support, or pickup notes..."
              placeholderTextColor={colors.mutedFg}
            />

            {selected.status !== 'SUBMITTED' ? (
              <View style={s.reviewedNote}>
                <Text style={s.reviewedNoteText}>
                  This job has already been reviewed (status: {selected.status}).
                </Text>
              </View>
            ) : null}

            <View style={s.decisionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={selected.status !== 'SUBMITTED' || actionLoading !== null}
                onPress={handleReject}
                style={({ pressed }) => [
                  s.rejectButton,
                  (selected.status !== 'SUBMITTED' || actionLoading !== null) && s.actionButtonDisabled,
                  pressed && s.pressed,
                ]}
              >
                <XCircle size={18} color={colors.destructive} />
                <Text style={s.rejectButtonText}>
                  {actionLoading === 'reject' ? 'Rejecting…' : 'Reject'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={selected.status !== 'SUBMITTED' || actionLoading !== null}
                onPress={handleApprove}
                style={({ pressed }) => [
                  s.approveButton,
                  (selected.status !== 'SUBMITTED' || actionLoading !== null) && s.actionButtonDisabled,
                  pressed && s.pressed,
                ]}
              >
                <CheckCircle2 size={18} color={colors.success} />
                <Text style={s.approveButtonText}>
                  {actionLoading === 'approve' ? 'Approving…' : 'Approve'}
                </Text>
              </Pressable>
            </View>

            {actionError ? <Text style={s.actionErrorText}>{actionError}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/jobs/${selected.id}`)}
              style={({ pressed }) => [s.viewDetailsButton, pressed && s.pressed]}
            >
              <Text style={s.viewDetailsText}>View full job details</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={s.securityNote}>
          <ShieldCheck size={18} color={colors.success} />
          <Text style={s.securityText}>
            Printer assignment and job-status changes are limited to lab staff and administrators.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type FleetCardProps = {
  printer: PrinterModel;
  materials: string[];
  selected: boolean;
  onPress: () => void;
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
};

function PrinterFleetCard({
  printer,
  materials,
  selected,
  onPress,
  colors,
  styles,
}: FleetCardProps) {
  const statusColor: Record<PrinterStatus, string> = {
    AVAILABLE: colors.printerAvailable,
    BUSY: colors.printerBusy,
    OFFLINE: colors.printerOffline,
    MAINTENANCE: colors.printerMaintenance,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${printer.name}, ${getStatusLabel(printer.status)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.printerCard,
        selected && styles.printerCardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.printerVisual}>
        {printer.status === 'MAINTENANCE' ? (
          <Wrench size={30} color={colors.printerMaintenance} strokeWidth={1.8} />
        ) : (
          <Printer size={34} color={colors.foreground} strokeWidth={1.7} />
        )}
      </View>

      <View style={styles.printerBody}>
        <View style={styles.printerTitleRow}>
          <Text style={styles.printerName} numberOfLines={1}>{printer.name}</Text>
          <Pressable accessibilityRole="button" onPress={() => {}} style={styles.moreButton}>
            <MoreHorizontal size={18} color={colors.mutedFg} />
          </Pressable>
        </View>

        <View style={styles.printerLocationRow}>
          <MapPin size={13} color={colors.mutedFg} />
          <Text style={styles.printerLocation}>{printer.location}</Text>
        </View>

        <View style={styles.statusLine}>
          <PrinterDot status={printer.status} />
          <Text style={[styles.printerStatusText, { color: statusColor[printer.status] }]}>
            {getStatusLabel(printer.status)}
          </Text>
        </View>

        <View style={styles.materialRow}>
          {materials.map(material => {
            const chip = getMaterialChipColors(colors, material);
            return (
              <View key={material} style={[styles.materialChip, { backgroundColor: chip.backgroundColor }]}>
                <Text style={[styles.materialText, { color: chip.color }]}>{material}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.printerMetaRow}>
          <Text style={styles.printerMetaText}>
            {printer.currentJob ? `Job: ${printer.currentJob}` : 'Queue: 0 jobs'}
          </Text>
          <Text style={styles.printerMetaText}>{getWaitLabel(printer)}</Text>
        </View>

        {typeof printer.progress === 'number' ? (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(printer.progress, 100)}%` as `${number}%`,
                  backgroundColor: statusColor[printer.status],
                },
              ]}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

type QueueJobCardProps = {
  job: Job;
  selected: boolean;
  onPress: () => void;
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
};

function QueueJobCard({ job, selected, onPress, colors, styles }: QueueJobCardProps) {
  const materialColors = getMaterialChipColors(colors, job.material);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Open ${job.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.jobCard,
        selected && styles.jobCardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.jobIcon}>
        <Layers3 size={22} color={colors.primary} strokeWidth={1.9} />
      </View>

      <View style={styles.jobBody}>
        <View style={styles.jobTopRow}>
          <MonoText style={styles.jobId}>{job.id}</MonoText>
          <StatusBadge status={job.status} />
        </View>
        <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
        <View style={styles.jobStudentRow}>
          <UserRound size={13} color={colors.mutedFg} />
          <Text style={styles.jobStudent}>{job.student}</Text>
        </View>
        <View style={styles.jobMetaRow}>
          <View style={[styles.jobMaterialChip, { backgroundColor: materialColors.backgroundColor }]}>
            <Text style={[styles.jobMaterialText, { color: materialColors.color }]}>{job.material}</Text>
          </View>
          <Text style={styles.jobMetaText}>{job.quality}</Text>
          <Text style={styles.jobMetaDivider}>•</Text>
          <Text style={styles.jobMetaText}>Qty {job.qty}</Text>
          <Text style={styles.jobMetaDivider}>•</Text>
          <Text style={styles.jobMetaText}>{job.submittedAt}</Text>
        </View>
      </View>

      <ChevronRight size={19} color={selected ? colors.primary : colors.mutedFg} />
    </Pressable>
  );
}

type DetailCellProps = {
  label: string;
  value: string;
  icon: 'student' | 'material' | 'quality' | 'quantity';
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
};

function DetailCell({ label, value, icon, colors, styles }: DetailCellProps) {
  const Icon =
    icon === 'student'
      ? UserRound
      : icon === 'quality'
        ? SlidersHorizontal
        : icon === 'quantity'
          ? Layers3
          : Printer;

  return (
    <View style={styles.detailCell}>
      <View style={styles.detailIcon}>
        <Icon size={16} color={colors.primary} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingBottom: 44,
    },
    topBar: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.lg,
    },
    topBarCopy: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: designTokens.spacing.sm,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
      letterSpacing: 1.2,
      marginBottom: 2,
    },
    pageTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 20,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.99 }],
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: designTokens.spacing.section,
    },
    summaryCard: {
      flex: 1,
      minHeight: 116,
      backgroundColor: colors.card,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 1,
    },
    summaryIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 11,
    },
    summaryValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 22,
      lineHeight: 26,
    },
    summaryLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 12,
      marginTop: 2,
    },
    sectionHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 19,
    },
    sectionSubtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginTop: 3,
      maxWidth: 260,
    },
    smallIconButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterRow: {
      gap: 8,
      paddingRight: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.lg,
    },
    filterChip: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 13,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 12,
    },
    filterTextActive: {
      color: colors.onPrimary,
    },
    filterCount: {
      minWidth: 21,
      height: 21,
      paddingHorizontal: 5,
      borderRadius: 11,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterCountActive: {
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    filterCountText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
    },
    filterCountTextActive: {
      color: colors.onPrimary,
    },
    printerList: {
      gap: 12,
      marginBottom: designTokens.spacing.section,
    },
    printerCard: {
      flexDirection: 'row',
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 1,
    },
    printerCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    printerVisual: {
      width: 68,
      height: 82,
      borderRadius: 16,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    printerBody: {
      flex: 1,
      minWidth: 0,
    },
    printerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    printerName: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
    },
    moreButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    printerLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 7,
    },
    printerLocation: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
    },
    statusLine: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    printerStatusText: {
      fontFamily: designTokens.type.heading,
      fontSize: 11,
    },
    materialRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
      marginBottom: 10,
    },
    materialChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: designTokens.radius.pill,
    },
    materialText: {
      fontFamily: designTokens.type.heading,
      fontSize: 9,
    },
    printerMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 7,
    },
    printerMetaText: {
      flex: 1,
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
    },
    progressTrack: {
      height: 5,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.muted,
      overflow: 'hidden',
    },
    progressFill: {
      height: 5,
      borderRadius: designTokens.radius.pill,
    },
    sortShell: {
      width: 142,
      height: 40,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 10,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    sortPicker: {
      flex: 1,
      height: 40,
      color: colors.foreground,
      marginLeft: -4,
      marginRight: -8,
      fontSize: 10,
    },
    jobList: {
      gap: 10,
      marginBottom: designTokens.spacing.xl,
    },
    jobCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 13,
    },
    jobCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    jobIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    jobBody: {
      flex: 1,
      minWidth: 0,
    },
    jobTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 4,
    },
    jobId: {
      color: colors.mutedFg,
      fontSize: 9,
      flex: 1,
    },
    jobTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
      marginBottom: 4,
    },
    jobStudentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 7,
    },
    jobStudent: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
    },
    jobMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 5,
    },
    jobMaterialChip: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: designTokens.radius.pill,
    },
    jobMaterialText: {
      fontFamily: designTokens.type.heading,
      fontSize: 9,
    },
    jobMetaText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 9,
    },
    jobMetaDivider: {
      color: colors.border,
      fontSize: 10,
    },
    actionPanel: {
      padding: 16,
      marginBottom: designTokens.spacing.lg,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 18,
    },
    panelHeaderCopy: {
      flex: 1,
    },
    panelEyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1,
      marginBottom: 4,
    },
    panelTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
      marginBottom: 4,
    },
    panelId: {
      color: colors.mutedFg,
      fontSize: 10,
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 18,
    },
    detailCell: {
      width: '48%',
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderRadius: 14,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailCopy: {
      flex: 1,
      minWidth: 0,
    },
    detailLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 9,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    detailValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    costRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 15,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      marginBottom: 18,
    },
    fieldLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
      letterSpacing: 0.7,
      marginBottom: 8,
    },
    costValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 22,
    },
    locationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.primarySoft,
    },
    locationPillText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
    },
    pickerShell: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingLeft: 13,
      paddingRight: 12,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 17,
      overflow: 'hidden',
    },
    printerPicker: {
      flex: 1,
      height: 52,
      color: colors.foreground,
      marginHorizontal: -8,
    },
    notesInput: {
      minHeight: 96,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 14,
      padding: 14,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    decisionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    rejectButton: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.statusRejected.bg,
      borderWidth: 1,
      borderColor: colors.statusRejected.dot,
    },
    rejectButtonText: {
      color: colors.destructive,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    approveButton: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.statusCompleted.bg,
      borderWidth: 1,
      borderColor: colors.statusCompleted.dot,
    },
    approveButtonText: {
      color: colors.success,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    reviewedNote: {
      padding: 12,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    reviewedNoteText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
    },
    actionErrorText: {
      color: colors.destructive,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginBottom: 10,
    },
    viewDetailsButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      marginTop: 4,
    },
    viewDetailsText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    securityNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 14,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.statusCompleted.bg,
      borderWidth: 1,
      borderColor: colors.statusCompleted.dot,
    },
    securityText: {
      flex: 1,
      color: colors.statusCompleted.text,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}
