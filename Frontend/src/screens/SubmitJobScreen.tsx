// PrintForge 3D — SubmitJobScreen (real file picker + API)
// Replaces simulateFilePick() with expo-document-picker.
// On submit, calls POST /api/print-jobs (multipart) via apiSubmitJob().
// Materials are fetched live from /api/materials with a mock fallback.

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, TextInput, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { Button, Input, Divider } from '../components/UI';
import { MOCK_MATERIALS } from '../constants/mockData';
import { Material } from '../types';
import { apiGetMaterials, apiSubmitJob } from '../services/api';

interface SubmitJobScreenProps {
  onBack: () => void;
  onSubmit: (data: any) => void;
}

const STEPS = ['File', 'Material', 'Options', 'Review'];

const INFILL_OPTIONS = ['10%', '20%', '30%', '50%', '75%', '100%'];
const QUALITY_OPTIONS = [
  { label: 'Draft',    desc: '0.3mm · Fast',     icon: '⚡' },
  { label: 'Standard', desc: '0.2mm · Balanced', icon: '⚖️' },
  { label: 'Fine',     desc: '0.1mm · Slow',     icon: '💎' },
];

// Allowed file extensions for the document picker
const ALLOWED_TYPES = [
  'application/sla',          // .stl (official MIME)
  'model/stl',
  'model/obj',
  'application/octet-stream', // generic binary — many STL files come as this
  'model/3mf',
];

export default function SubmitJobScreen({ onBack, onSubmit }: SubmitJobScreenProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  const [step, setStep] = useState(0);

  // File state
  const [pickedFile, setPickedFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
  } | null>(null);

  // Material / options state
  const [materials, setMaterials] = useState<Material[]>(MOCK_MATERIALS);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [infill, setInfill] = useState('20%');
  const [quality, setQuality] = useState('Standard');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch live material list (fall back to mock if API unavailable)
  useEffect(() => {
    apiGetMaterials()
      .then(setMaterials)
      .catch(() => setMaterials(MOCK_MATERIALS));
  }, []);

  // ── File picking ────────────────────────────────────────────────────────────

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,  // needed so we can read/upload the URI
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const name = asset.name ?? 'model.stl';
      const ext = name.split('.').pop()?.toLowerCase() ?? '';

      if (!['stl', 'obj', '3mf'].includes(ext)) {
        Alert.alert(
          'Unsupported Format',
          'Please select a .STL, .OBJ, or .3MF file.',
        );
        return;
      }

      setPickedFile({
        uri: asset.uri,
        name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not open file picker.');
    }
  };

  // ── Submission ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!pickedFile || !selectedMaterial) return;
    setSubmitting(true);
    try {
      const job = await apiSubmitJob(pickedFile, {
        material: selectedMaterial.material_name,
        color: selectedColor,
        quantity: parseInt(quantity, 10),
        infill,
        quality,
        notes,
      });
      onSubmit(job);
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = () => {
    if (step === 0) return !!pickedFile;
    if (step === 1) return !!selectedMaterial && !!selectedColor;
    if (step === 2) return !!quantity && parseInt(quantity, 10) > 0;
    return true;
  };

  const fileSizeLabel = pickedFile?.size
    ? pickedFile.size > 1_048_576
      ? `${(pickedFile.size / 1_048_576).toFixed(1)} MB`
      : `${Math.round(pickedFile.size / 1024)} KB`
    : null;

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
            <Text style={{ color: Colors.accent, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={[Typography.labelLarge, { color: Colors.textPrimary, marginLeft: 8 }]}>
            New Print Request
          </Text>
        </View>

        {/* Step indicators */}
        <View style={s.stepRow}>
          {STEPS.map((step_, i) => (
            <React.Fragment key={step_}>
              <View style={s.stepItem}>
                <View style={[s.stepDot, i <= step && s.stepDotActive, i < step && s.stepDotDone]}>
                  <Text style={[Typography.labelSmall, { color: i <= step ? Colors.background : Colors.textMuted, fontSize: 11 }]}>
                    {i < step ? '✓' : String(i + 1)}
                  </Text>
                </View>
                <Text style={[Typography.caption, { color: i === step ? Colors.accent : Colors.textMuted, marginTop: 4 }]}>
                  {step_}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[s.stepLine, i < step && s.stepLineDone]} />
              )}
            </React.Fragment>
          ))}
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── STEP 0: File upload ─────────────────────────────────────────── */}
          {step === 0 && (
            <View>
              <Text style={[Typography.displaySmall, { color: Colors.textPrimary, marginBottom: 4 }]}>Upload 3D Model</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginBottom: Spacing.lg }]}>
                Supported formats: .STL, .OBJ, .3MF
              </Text>

              <TouchableOpacity
                style={[s.dropzone, !!pickedFile && s.dropzoneDone]}
                onPress={handlePickFile}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>
                  {pickedFile ? '✅' : '📁'}
                </Text>
                {pickedFile ? (
                  <>
                    <Text style={[Typography.labelLarge, { color: Colors.success }]} numberOfLines={1}>
                      {pickedFile.name}
                    </Text>
                    <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 4 }]}>
                      Tap to replace
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]}>Tap to select file</Text>
                    <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 4 }]}>
                      .STL · .OBJ · .3MF
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {pickedFile && (
                <View style={s.fileInfoCard}>
                  <Text style={{ fontSize: 22 }}>📐</Text>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text style={[Typography.labelMedium, { color: Colors.textPrimary }]} numberOfLines={1}>
                      {pickedFile.name}
                    </Text>
                    <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                      {pickedFile.name.split('.').pop()?.toUpperCase()} · {fileSizeLabel ?? 'Unknown size'} · Ready for review
                    </Text>
                  </View>
                </View>
              )}

              <View style={s.tipBox}>
                <Text style={[Typography.labelSmall, { color: Colors.accent, marginBottom: 4 }]}>💡 TIP</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                  Make sure your model is watertight (manifold) and all normals face outward. Lab staff will check the file before approval.
                </Text>
              </View>
            </View>
          )}

          {/* ── STEP 1: Material ────────────────────────────────────────────── */}
          {step === 1 && (
            <View>
              <Text style={[Typography.displaySmall, { color: Colors.textPrimary, marginBottom: 4 }]}>Choose Material</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginBottom: Spacing.lg }]}>
                Select material type and color
              </Text>

              {materials.map(mat => (
                <TouchableOpacity
                  key={mat.material_id}
                  style={[s.materialCard, selectedMaterial?.material_id === mat.material_id && s.materialCardActive,
                    mat.availability_status === 'out_of_stock' && { opacity: 0.4 }]}
                  onPress={() => {
                    if (mat.availability_status === 'out_of_stock') return;
                    setSelectedMaterial(mat);
                    setSelectedColor('');
                  }}
                  activeOpacity={0.8}
                  disabled={mat.availability_status === 'out_of_stock'}
                >
                  <View style={{ flex: 1 }}>
                    <View style={s.materialHeader}>
                      <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]}>{mat.material_name}</Text>
                      <View style={[s.availBadge, {
                        backgroundColor: mat.availability_status === 'available' ? Colors.successBg :
                          mat.availability_status === 'low' ? Colors.warningBg : Colors.errorBg
                      }]}>
                        <Text style={[Typography.caption, {
                          color: mat.availability_status === 'available' ? Colors.success :
                            mat.availability_status === 'low' ? Colors.warning : Colors.error
                        }]}>
                          {mat.availability_status === 'out_of_stock' ? 'Out of stock' :
                            mat.availability_status === 'low' ? 'Low stock' : 'In stock'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>{mat.description}</Text>
                    <Text style={[Typography.labelMedium, { color: Colors.accent, marginTop: 6 }]}>
                      GH₵ {mat.cost_per_unit.toFixed(2)} / unit
                    </Text>
                  </View>
                  {selectedMaterial?.material_id === mat.material_id && (
                    <Text style={{ fontSize: 20, marginLeft: 8 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}

              {selectedMaterial && (
                <View style={{ marginTop: Spacing.lg }}>
                  <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginBottom: Spacing.sm }]}>
                    Color
                  </Text>
                  <View style={s.colorRow}>
                    {selectedMaterial.colors.map(c => (
                      <TouchableOpacity
                        key={c}
                        style={[s.colorChip, selectedColor === c && s.colorChipActive]}
                        onPress={() => setSelectedColor(c)}
                      >
                        <Text style={[Typography.caption, { color: selectedColor === c ? Colors.accent : Colors.textSecondary }]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── STEP 2: Options ─────────────────────────────────────────────── */}
          {step === 2 && (
            <View>
              <Text style={[Typography.displaySmall, { color: Colors.textPrimary, marginBottom: 4 }]}>Print Options</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginBottom: Spacing.lg }]}>
                Configure quantity, infill, and quality
              </Text>

              <Input
                label="Quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                placeholder="1"
              />

              <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginBottom: Spacing.sm }]}>Infill Density</Text>
              <View style={s.optionRow}>
                {INFILL_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[s.optionChip, infill === opt && s.optionChipActive]}
                    onPress={() => setInfill(opt)}
                  >
                    <Text style={[Typography.labelMedium, { color: infill === opt ? Colors.accent : Colors.textSecondary }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm }]}>
                Print Quality
              </Text>
              <View style={s.qualityRow}>
                {QUALITY_OPTIONS.map(q => (
                  <TouchableOpacity
                    key={q.label}
                    style={[s.qualityCard, quality === q.label && s.qualityCardActive]}
                    onPress={() => setQuality(q.label)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 22 }}>{q.icon}</Text>
                    <Text style={[Typography.labelMedium, { color: quality === q.label ? Colors.accent : Colors.textPrimary, marginTop: 4 }]}>
                      {q.label}
                    </Text>
                    <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2, textAlign: 'center' }]}>{q.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[Typography.labelMedium, { color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm }]}>
                Notes (optional)
              </Text>
              <TextInput
                style={s.textarea}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. special instructions, orientation preference..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* ── STEP 3: Review ──────────────────────────────────────────────── */}
          {step === 3 && (
            <View>
              <Text style={[Typography.displaySmall, { color: Colors.textPrimary, marginBottom: 4 }]}>Review & Submit</Text>
              <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginBottom: Spacing.lg }]}>
                Confirm your request details before submitting
              </Text>

              <View style={s.reviewCard}>
                <ReviewRow icon="📐" label="File" value={pickedFile?.name ?? ''} />
                <Divider style={{ marginVertical: 8 }} />
                <ReviewRow icon="🧱" label="Material" value={selectedMaterial?.material_name || ''} />
                <Divider style={{ marginVertical: 8 }} />
                <ReviewRow icon="🎨" label="Color" value={selectedColor} />
                <Divider style={{ marginVertical: 8 }} />
                <ReviewRow icon="🔢" label="Quantity" value={quantity} />
                <Divider style={{ marginVertical: 8 }} />
                <ReviewRow icon="⚙️" label="Infill" value={infill} />
                <Divider style={{ marginVertical: 8 }} />
                <ReviewRow icon="💎" label="Quality" value={quality} />
                {notes ? (
                  <>
                    <Divider style={{ marginVertical: 8 }} />
                    <ReviewRow icon="📝" label="Notes" value={notes} />
                  </>
                ) : null}
              </View>

              <View style={s.tipBox}>
                <Text style={[Typography.labelSmall, { color: Colors.warning, marginBottom: 4 }]}>ℹ️ WHAT HAPPENS NEXT</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                  Lab staff will review your file and estimate the cost and print time. You'll be notified once approved.
                </Text>
              </View>

              <Button
                label="Submit Print Request"
                onPress={handleSubmit}
                loading={submitting}
                size="lg"
                style={{ marginTop: Spacing.lg }}
              />
            </View>
          )}

        </ScrollView>

        {/* Navigation */}
        {step < 3 && (
          <View style={s.navBar}>
            {step > 0 ? (
              <Button label="Back" onPress={() => setStep(s_ => s_ - 1)} variant="ghost" style={{ flex: 1 }} />
            ) : <View style={{ flex: 1 }} />}
            <Button
              label={step === 2 ? 'Review →' : 'Continue →'}
              onPress={() => setStep(s_ => s_ + 1)}
              disabled={!canNext()}
              style={{ flex: 1 }}
            />
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}

function ReviewRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { Colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <Text style={{ fontSize: 18, marginTop: 1 }}>{icon}</Text>
      <Text style={[Typography.bodySmall, { color: Colors.textSecondary, width: 80 }]}>{label}</Text>
      <Text style={[Typography.labelMedium, { color: Colors.textPrimary, flex: 1 }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

type ThemeColors = {
  background: string; surface: string; surfaceElevated: string; border: string;
  accent: string; accentGlow: string; success: string; successBg: string;
  warning: string; warningBg: string; error: string; errorBg: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { borderColor: Colors.accent, backgroundColor: Colors.accent },
  stepDotDone: { borderColor: Colors.success, backgroundColor: Colors.success },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginBottom: 14 },
  stepLineDone: { backgroundColor: Colors.success },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
  dropzone: {
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center',
    backgroundColor: Colors.surface, marginBottom: Spacing.lg,
  },
  dropzoneDone: { borderColor: Colors.success + '88', borderStyle: 'solid', backgroundColor: Colors.successBg },
  fileInfoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  tipBox: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  materialCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.sm + 2,
    flexDirection: 'row', alignItems: 'center',
  },
  materialCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  materialHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  availBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorChip: {
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  colorChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  optionChip: {
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  optionChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  qualityRow: { flexDirection: 'row', gap: Spacing.sm },
  qualityCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'center',
  },
  qualityCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  textarea: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, color: Colors.textPrimary,
    minHeight: 100, fontSize: 14,
  },
  reviewCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  navBar: {
    flexDirection: 'row', gap: Spacing.sm,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
