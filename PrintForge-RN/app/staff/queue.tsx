import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/ThemeContext';
import { JOBS, PRINTERS } from '../../src/data/mockData';
import StatusBadge from '../../src/components/StatusBadge';
import MonoText from '../../src/components/MonoText';
import PrinterDot from '../../src/components/PrinterDot';

export default function StaffQueue() {
  const router = useRouter();
  const { colors } = useTheme(); // ✅ called inside the component
  const [selectedJob, setSelectedJob] = useState(JOBS[0].id);
  const [printer, setPrinter] = useState(PRINTERS.find(p => p.status === 'AVAILABLE')?.id || 'printer-3');
  const [notes, setNotes] = useState('');
  const [sortBy, setSortBy] = useState('Date Submitted');

  const selected = JOBS.find(job => job.id === selectedJob);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Print Queue</Text>
        <Text style={styles.subtitle}>{JOBS.length} pending · 2 in progress</Text>
      </View>

      <View style={[styles.pickerCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Text style={styles.pickerLabel}>Sort by</Text>
        <Picker
          selectedValue={sortBy}
          onValueChange={value => setSortBy(value)}
          style={[styles.picker, { color: colors.foreground }]}
          dropdownIconColor={colors.foreground}
        >
          <Picker.Item label="Date Submitted" value="Date Submitted" />
          <Picker.Item label="Status" value="Status" />
          <Picker.Item label="Material" value="Material" />
        </Picker>
      </View>

      <FlatList
        data={JOBS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedJob(prev => prev === item.id ? '' : item.id)}
            style={[styles.jobRow, { backgroundColor: colors.secondary }, selectedJob === item.id && styles.jobRowSelected]}
          >
            <View>
              <MonoText style={styles.jobId}>{item.id}</MonoText>
              <Text style={[styles.jobTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.smallText}>{item.student} · {item.material}</Text>
              <Text style={styles.submitText}>Submitted {item.submittedAt}</Text>
            </View>
            <View style={styles.jobStatusArea}>
              <StatusBadge status={item.status} />
              <Text style={styles.smallMono}>{item.printer}</Text>
            </View>
          </Pressable>
        )}
        style={styles.list}
      />

      {selected ? (
        <View style={[styles.actionPanel, { backgroundColor: colors.secondary }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: colors.foreground }]}>{selected.title}</Text>
            <StatusBadge status={selected.status} />
          </View>
          <MonoText style={styles.jobId}>{selected.id}</MonoText>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Material</Text><MonoText>{selected.material}</MonoText></View>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Quality</Text><MonoText>{selected.quality}</MonoText></View>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Infill</Text><MonoText>20%</MonoText></View>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Qty</Text><MonoText>{selected.qty}</MonoText></View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cost</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>GH₵ {selected.cost.toFixed(2)}</Text>
          </View>
          <Text style={styles.detailLabel}>Assign Printer</Text>
          <Picker
            selectedValue={printer}
            onValueChange={value => setPrinter(value)}
            style={[styles.picker, { color: colors.foreground }]}
            dropdownIconColor={colors.foreground}
          >
            {PRINTERS.filter(p => p.status === 'AVAILABLE').map(pr => (
              <Picker.Item key={pr.id} label={pr.name} value={pr.id} />
            ))}
          </Picker>
          <Text style={styles.detailLabel}>Operator Notes</Text>
          <TextInput
            style={[styles.notesInput, { color: colors.foreground }]}
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes..."
            placeholderTextColor="#94A3B8"
          />
          <View style={styles.buttonRow}>
            <Pressable style={[styles.actionButton, { backgroundColor: '#10B981' }]}>
              <Text style={styles.actionButtonText}>Approve</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.actionButtonText}>Reject</Text>
            </Pressable>
          </View>
          <Pressable style={[styles.updateButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.updateButtonText}>Update Job Status</Text>
          </Pressable>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Printer Fleet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fleetRow}>
            {PRINTERS.map(pr => (
              <View key={pr.id} style={styles.printerCard}>
                <View style={styles.printerHeader}>
                  <PrinterDot status={pr.status} />
                  <MonoText>{pr.name}</MonoText>
                </View>
                <View style={styles.printerInfo}>
                  <MapPin size={14} color="#94A3B8" />
                  <Text style={styles.smallText}>{pr.location}</Text>
                </View>
                <View style={styles.printerStatusRow}>
                  <Text style={styles.smallMono}>{pr.status}</Text>
                </View>
                {pr.progress ? (
                  <View style={styles.progressBackground}>
                    <View style={[styles.progressFill, { width: `${pr.progress}%` as any, backgroundColor: colors.primary }]} />
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
          <Pressable style={styles.detailButton} onPress={() => router.push(`/jobs/${selected.id}`)}>
            <Text style={[styles.detailButtonText, { color: colors.primary }]}>View Job Details</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// ✅ Only static layout values — no colors
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  header: { marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#94A3B8' },
  pickerCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  pickerLabel: { color: '#94A3B8', marginBottom: 8 },
  picker: { backgroundColor: '#0F172A', borderRadius: 14 },
  list: { marginBottom: 16 },
  jobRow: { borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  jobRowSelected: { borderWidth: 1, borderColor: 'rgba(249,115,22,0.5)' },
  jobId: { color: '#E8EDF5', fontSize: 12, marginBottom: 6 },
  jobTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  smallText: { color: '#94A3B8' },
  smallMono: { color: '#94A3B8', fontFamily: 'JetBrainsMono_400Regular' },
  submitText: { color: '#94A3B8', marginTop: 6 },
  jobStatusArea: { alignItems: 'flex-end', gap: 6 },
  actionPanel: { borderRadius: 18, padding: 16 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  panelTitle: { fontSize: 18, fontWeight: '700', flex: 1, marginRight: 12 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 16 },
  detailItem: { backgroundColor: '#0F172A', borderRadius: 14, padding: 12, flex: 1, minWidth: '48%' },
  detailLabel: { color: '#94A3B8', marginBottom: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailValue: { fontWeight: '700' },
  notesInput: { backgroundColor: '#0F172A', borderRadius: 14, padding: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: '700' },
  updateButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 18 },
  updateButtonText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  fleetRow: { gap: 12 },
  printerCard: { width: 220, backgroundColor: '#0F172A', borderRadius: 18, padding: 16 },
  printerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  printerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  printerStatusRow: { marginBottom: 10 },
  detailButton: { backgroundColor: 'transparent', paddingVertical: 12, alignItems: 'center', borderRadius: 12, marginBottom: 12 },
  detailButtonText: { fontWeight: '700' },
  progressBackground: { width: '100%', height: 8, borderRadius: 999, backgroundColor: '#0A1124', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 999 },
});