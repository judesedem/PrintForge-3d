import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Circle, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../src/ThemeContext';
import { Colors } from '../../src/theme';
import { JOBS } from '../../src/data/mockData';
import StatusBadge from '../../src/components/StatusBadge';
import MonoText from '../../src/components/MonoText';
import Card from '../../src/components/Card';

const timeline = [
  { label: 'Submitted', key: 'SUBMITTED' },
  { label: 'Approved', key: 'APPROVED' },
  { label: 'Printing', key: 'IN_PROGRESS' },
  { label: 'Quality Check', key: 'COMPLETED' },
  { label: 'Ready', key: 'COMPLETED' },
];

export default function JobDetail() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const job = JOBS.find(item => item.id === String(id)) ?? JOBS[0];
  const s = makeStyles(colors);

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <Pressable style={s.backRow} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.primary} />
          <Text style={s.backText}>Back to overview</Text>
        </Pressable>
        <View style={s.topCard}>
          <StatusBadge status={job.status} />
          <MonoText style={s.jobId}>{job.id}</MonoText>
          <Text style={s.title}>{job.title}</Text>
          <Text style={s.cost}>GH₵ {job.cost.toFixed(2)}</Text>
        </View>
        <Card style={s.timelineCard}>
          <Text style={s.sectionTitle}>Timeline</Text>
          {timeline.map((step, index) => {
            const done = step.key === 'SUBMITTED' || step.key === 'APPROVED' || (job.status === 'IN_PROGRESS' && step.key === 'IN_PROGRESS') || (job.status === 'COMPLETED' && step.key === 'COMPLETED');
            const active = job.status === 'IN_PROGRESS' && step.key === 'IN_PROGRESS';
            return (
              <View key={step.label} style={s.stepRow}>
                <View style={s.stepMarkerRow}>
                  <View style={[s.stepCircle, done ? { backgroundColor: colors.statusCompleted.text } : active ? { borderColor: colors.primary, backgroundColor: 'rgba(249,115,22,0.12)' } : { borderColor: colors.mutedFg }]}>
                    {done ? <Check size={12} color="#fff" /> : active ? <RefreshCw size={12} color={colors.primary} /> : <Circle size={12} color={colors.mutedFg} />}
                  </View>
                  {index < timeline.length - 1 ? <View style={[s.stepLine, done ? { backgroundColor: colors.statusCompleted.text } : { backgroundColor: colors.muted }]} /> : null}
                </View>
                <Text style={s.stepLabel}>{step.label}</Text>
              </View>
            );
          })}
        </Card>
        {job.notes ? (
          <Card style={s.noteCard}>
            <View style={s.noteHeader}>
              <AlertCircle size={18} color="#F59E0B" />
              <Text style={s.noteTitle}>Operator Notes</Text>
            </View>
            <Text style={s.noteBody}>{job.notes}</Text>
          </Card>
        ) : null}
        <Card>
          <Text style={s.sectionTitle}>Print Details</Text>
          {[['Material', job.material], ['Quality', job.quality], ['Infill', '20%'], ['Quantity', String(job.qty)]].map(([label, val]) => (
            <View key={label} style={s.detailRow}>
              <Text style={s.detailLabel}>{label}</Text>
              <MonoText style={{ color: colors.foreground }}>{val}</MonoText>
            </View>
          ))}
        </Card>
        <Card>
          <Text style={s.sectionTitle}>Assignment</Text>
          <View style={s.detailRow}><Text style={s.detailLabel}>Printer</Text><MonoText style={{ color: colors.foreground }}>{job.printer}</MonoText></View>
          <View style={s.detailRow}><Text style={s.detailLabel}>Location</Text><Text style={s.detailValue}>{job.location}</Text></View>
          <View style={s.detailRow}><Text style={s.detailLabel}>Tracking</Text><MonoText style={{ color: colors.primary }}>{job.tracking}</MonoText></View>
        </Card>
        {job.status === 'COMPLETED' ? (
          <Pressable style={s.receiptButton}><Text style={s.receiptText}>Download Receipt</Text></Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
    backText: { color: colors.primary, fontWeight: '700' },
    topCard: { backgroundColor: colors.secondary, borderRadius: 16, padding: 16, marginBottom: 16 },
    jobId: { marginTop: 10 },
    title: { color: colors.foreground, fontSize: 22, fontWeight: '700', marginTop: 12 },
    cost: { color: colors.primary, fontSize: 20, fontWeight: '700', marginTop: 10 },
    timelineCard: { marginBottom: 16 },
    sectionTitle: { color: colors.foreground, fontWeight: '700', marginBottom: 12 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    stepMarkerRow: { alignItems: 'center' },
    stepCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    stepLine: { width: 2, height: 40, marginTop: 4 },
    stepLabel: { color: colors.mutedFg, fontWeight: '700' },
    noteCard: { backgroundColor: 'rgba(252,211,77,0.12)', borderColor: 'rgba(252,211,77,0.35)' },
    noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    noteTitle: { color: '#F59E0B', fontWeight: '700' },
    noteBody: { color: colors.foreground },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    detailLabel: { color: colors.mutedFg },
    detailValue: { color: colors.foreground, fontWeight: '700' },
    receiptButton: { marginTop: 16, backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    receiptText: { color: '#fff', fontWeight: '700' },
  });
}
