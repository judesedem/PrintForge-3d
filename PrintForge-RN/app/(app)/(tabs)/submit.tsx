import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Upload, ShoppingBag, X, Zap } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Slider from '@miblanchard/react-native-slider';
import { colors } from '@/theme';
import MonoText from '@/components/MonoText';
import Card from '@/components/Card';

// Slider typing workaround for this project
const SliderComponent: any = Slider;

const materials = [
  { key: 'PLA', label: 'PLA', emoji: '🌿', description: 'Eco-friendly standard', price: 8.5 },
  { key: 'RESIN', label: 'Resin', emoji: '💎', description: 'High-detail parts', price: 22.0 },
  { key: 'ABS', label: 'ABS', emoji: '⚙️', description: 'Durable engineering', price: 14.0 },
] as const;

const qualities = ['DRAFT', 'STANDARD', 'HIGH'] as const;

export default function SubmitScreen() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const [selectedPath, setSelectedPath] = useState<'upload' | 'marketplace'>('upload');
  const [fileInfo, setFileInfo] = useState<any | null>(null);
  const [material, setMaterial] = useState<'PLA' | 'RESIN' | 'ABS'>('PLA');
  const [color, setColor] = useState('#2563EB');
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
    if (result && result.type === 'success') {
      setFileInfo(result);
    }
  };

  return (
    <View style={styles.screen}>
      {step === 0 ? (
        <View style={styles.content}>
          <Text style={styles.title}>Choose your path</Text>
          <Text style={styles.subtitle}>Start a new print job or browse marketplace designs.</Text>
          <Pressable style={[styles.pathCard, selectedPath === 'upload' && styles.pathCardActive]} onPress={() => setSelectedPath('upload')}>
            <View style={styles.pathIconRow}>
              <Upload size={24} color={colors.primary} />
              <Text style={styles.pathLabel}>Upload Your File</Text>
            </View>
            <Text style={styles.pathCopy}>Pick a file from your device and configure your print settings.</Text>
            <View style={styles.linkRow}>
              <Text style={styles.linkText}>Get started →</Text>
            </View>
          </Pressable>
          <Pressable style={[styles.pathCard, selectedPath === 'marketplace' && styles.pathCardActive]} onPress={() => setSelectedPath('marketplace')}>
            <View style={styles.pathIconRow}>
              <ShoppingBag size={24} color="#22D3EE" />
              <Text style={styles.pathLabel}>Browse Marketplace</Text>
            </View>
            <Text style={styles.pathCopy}>Choose an existing design from our curated library.</Text>
            <View style={styles.linkRow}>
              <Text style={styles.linkText}>Get started →</Text>
            </View>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => setStep(1)}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.screen}>
          <ScrollView contentContainerStyle={styles.content}>
            <Pressable style={styles.backRow} onPress={() => setStep(0)}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            <Text style={styles.title}>Configure your print</Text>
            <Text style={styles.subtitle}>Upload a file and choose materials, color, and print settings.</Text>
            <Pressable style={styles.uploadZone} onPress={pickFile}>
              <Text style={styles.uploadTitle}>Tap to select file</Text>
              <Text style={styles.uploadHint}>STL, OBJ or supported CAD export</Text>
            </Pressable>
            {fileInfo ? (
              <View style={styles.fileRow}>
                <View>
                  <MonoText>{fileInfo.name}</MonoText>
                  <Text style={styles.fileMeta}>Size: {Math.round((fileInfo.size ?? 0) / 1024)} KB • 12,420 tris</Text>
                </View>
                <Pressable onPress={() => setFileInfo(null)}>
                  <X size={20} color="#94A3B8" />
                </Pressable>
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>Material</Text>
            <View style={styles.optionRow}>
              {materials.map(item => {
                const active = item.key === material;
                return (
                  <Pressable key={item.key} style={[styles.materialCard, active && styles.materialCardActive]} onPress={() => setMaterial(item.key)}>
                    <Text style={styles.materialEmoji}>{item.emoji}</Text>
                    <MonoText style={styles.materialMono}>{item.label}</MonoText>
                    <Text style={styles.materialText}>{item.description}</Text>
                    <Text style={styles.materialPrice}>GH₵ {item.price.toFixed(2)} / unit</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.sectionTitle}>Color</Text>
            <View style={styles.colorRow}>
              {['#2563EB', '#DC2626', '#16A34A', '#9333EA', '#FFFFFF', '#000000', '#F97316', '#0EA5E9'].map(colorOption => (
                <Pressable key={colorOption} style={[styles.colorDot, { backgroundColor: colorOption }, color === colorOption && styles.colorDotSelected]} onPress={() => setColor(colorOption)} />
              ))}
            </View>
            <Card style={styles.settingsCard}>
              <Text style={styles.sectionTitle}>Print Settings</Text>
              <Text style={styles.settingLabel}>Infill density: {sliderValue}%</Text>
              <SliderComponent value={sliderValue} minimumValue={10} maximumValue={80} step={1} onValueChange={(value: any) => setSliderValue(Array.isArray(value) ? value[0] : value)} minimumTrackTintColor={colors.primary} maximumTrackTintColor="#475569" thumbTintColor={colors.primary} />
              <View style={styles.toggleRow}>
                {qualities.map(q => (
                  <Pressable key={q} style={[styles.qualityButton, quality === q && styles.qualityButtonActive]} onPress={() => setQuality(q)}>
                    <MonoText style={[styles.qualityText, quality === q && { color: colors.primary }]}>{q}</MonoText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.stepperRow}>
                <Text style={styles.settingLabel}>Quantity</Text>
                <View style={styles.stepperGroup}>
                  <Pressable style={styles.stepperButton} onPress={() => setQty(Math.max(1, qty - 1))}><Text style={styles.stepperButtonText}>−</Text></Pressable>
                  <MonoText style={styles.stepperValue}>{qty}</MonoText>
                  <Pressable style={styles.stepperButton} onPress={() => setQty(qty + 1)}><Text style={styles.stepperButtonText}>+</Text></Pressable>
                </View>
              </View>
            </Card>
          </ScrollView>
          <View style={styles.summaryFooter}>
            <View>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryAmount}>GH₵ {totalCost.toFixed(2)}</Text>
            </View>
            <Pressable style={styles.payButton} onPress={() => router.push('/(app)/marketplace/index')}>
              <Zap size={18} color="#fff" />
              <Text style={styles.payText}>Pay with Paystack</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    marginBottom: 24,
  },
  pathCard: {
    backgroundColor: colors.secondary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pathCardActive: {
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderColor: 'rgba(249,115,22,0.5)',
  },
  pathIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  pathLabel: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
  },
  pathCopy: {
    color: '#94A3B8',
    marginBottom: 14,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  backRow: {
    marginBottom: 18,
  },
  backText: {
    color: colors.primary,
    fontWeight: '700',
  },
  uploadZone: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    padding: 20,
    marginBottom: 16,
  },
  uploadTitle: {
    color: colors.foreground,
    fontWeight: '700',
    marginBottom: 6,
  },
  uploadHint: {
    color: '#94A3B8',
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  fileMeta: {
    color: '#94A3B8',
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  materialCard: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  materialCardActive: {
    borderColor: 'rgba(249,115,22,0.5)',
    backgroundColor: 'rgba(249,115,22,0.08)',
  },
  materialEmoji: {
    fontSize: 22,
    marginBottom: 10,
  },
  materialMono: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.foreground,
    marginBottom: 6,
  },
  materialText: {
    color: '#94A3B8',
    marginBottom: 10,
  },
  materialPrice: {
    color: colors.foreground,
    fontWeight: '700',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#475569',
  },
  colorDotSelected: {
    borderColor: colors.primary,
    width: 40,
    height: 40,
  },
  settingsCard: {
    marginBottom: 24,
  },
  settingLabel: {
    color: '#94A3B8',
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  qualityButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    alignItems: 'center',
  },
  qualityButtonActive: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  qualityText: {
    color: '#E8EDF5',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    color: colors.foreground,
    fontSize: 24,
    lineHeight: 24,
  },
  stepperValue: {
    color: colors.foreground,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 18,
    minWidth: 30,
    textAlign: 'center',
  },
  summaryFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#94A3B8',
  },
  summaryAmount: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
  },
  payText: {
    color: '#fff',
    fontWeight: '700',
  },
});
