import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CloudUpload,
  FileBox,
  FileImage,
  ImagePlus,
  Info,
  Layers3,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { uploadFile } from '@/api/files';
import { createListing } from '@/api/marketplace';
import { Colors, designTokens, makeControlStyles } from '@/theme';
import Card from '@/components/Card';
import MonoText from '@/components/MonoText';
import { KEYBOARD_AVOIDING_BEHAVIOR } from '@/components/KeyboardAwareScreen';

type PickedAsset = DocumentPicker.DocumentPickerAsset;
type SubmitPhase = 'idle' | 'uploading' | 'creating';

const MAX_DESCRIPTION_LENGTH = 280;

export default function CreateListingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token } = useSession();
  const s = makeStyles(colors);
  const controls = makeControlStyles(colors);

  const [modelFile, setModelFile] = useState<PickedAsset | null>(null);
  const [thumbnail, setThumbnail] = useState<PickedAsset | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [ownershipAttested, setOwnershipAttested] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>('idle');

  const numericBasePrice = Number.parseFloat(basePrice || '0');
  const isReady = Boolean(modelFile && title.trim() && numericBasePrice > 0 && ownershipAttested);

  const completionItems = useMemo(
    () => [
      { label: 'Printable model attached', complete: Boolean(modelFile) },
      { label: 'Listing title added', complete: Boolean(title.trim()) },
      { label: 'Designer base price set', complete: numericBasePrice > 0 },
      { label: 'Ownership rights confirmed', complete: ownershipAttested },
      { label: 'Storefront thumbnail added', complete: Boolean(thumbnail), optional: true },
    ],
    [modelFile, numericBasePrice, thumbnail, title, ownershipAttested],
  );

  const pickModel = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled && result.assets[0]) {
      setModelFile(result.assets[0]);
    }
  };

  const pickThumbnail = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled && result.assets[0]) {
      setThumbnail(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!isReady) {
      Alert.alert(
        'Complete the required fields',
        'Attach a model, add a title, and enter a base price before creating the draft.',
      );
      return;
    }
    if (!token || !modelFile) return;

    setSubmitError(null);
    let uploadedFileId: string | null = null;
    try {
      setPhase('uploading');
      const uploaded = await uploadFile(token, {
        uri: modelFile.uri,
        name: modelFile.name,
        mimeType: modelFile.mimeType,
      });
      uploadedFileId = uploaded.id;

      setPhase('creating');
      await createListing(token, {
        fileId: Number(uploaded.id),
        title: title.trim(),
        description: description.trim() || undefined,
        basePrice: numericBasePrice,
        ownershipAttested,
        thumbnail: thumbnail
          ? { uri: thumbnail.uri, name: thumbnail.name, type: thumbnail.mimeType ?? 'image/jpeg' }
          : undefined,
      });

      // This app's tabs aren't separate routes (SwipePager + local state,
      // not URL-based — (tabs)/_layout.tsx renders the same pager
      // regardless of matched sub-route), so there's no direct route back
      // to "the marketplace tab specifically" from this stack screen
      // (reached from dashboard/designer.tsx, outside the tabs). back()
      // returns to that dashboard, which is the closest available
      // equivalent without wiring cross-stack tab-switch signaling.
      router.back();
    } catch (err) {
      if (uploadedFileId) {
        // Upload succeeded but createListing failed — the file is now
        // orphaned server-side. Logged for visibility; cleanup is out of
        // scope for this batch (would need a DELETE /api/files/{id}
        // endpoint, which doesn't exist yet).
        console.error(
          `Listing creation failed after file upload succeeded (orphaned file id ${uploadedFileId}):`,
          err
        );
      } else {
        console.error('File upload failed:', err);
      }
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPhase('idle');
    }
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={s.keyboardView}
        behavior={KEYBOARD_AVOIDING_BEHAVIOR}
      >
        <View style={s.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [s.iconButton, pressed && s.pressed]}
          >
            <ArrowLeft size={21} color={colors.foreground} />
          </Pressable>

          <View style={s.topBarCopy}>
            <Text style={s.topBarTitle}>Create listing</Text>
            <Text style={s.topBarSubtitle}>Prepare a marketplace draft</Text>
          </View>

          <View style={s.draftPill}>
            <View style={s.draftDot} />
            <Text style={s.draftPillText}>DRAFT</Text>
          </View>
        </View>

        <ScrollView
          style={s.screen}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.heroCard}>
            <View style={s.heroIcon}>
              <Layers3 size={27} color={colors.onPrimary} strokeWidth={2} />
            </View>
            <View style={s.heroCopy}>
              <Text style={s.heroEyebrow}>DESIGNER MARKETPLACE</Text>
              <Text style={s.heroTitle}>Share a print-ready model</Text>
              <Text style={s.heroText}>
                Add the model customers will order, then give it a clear storefront identity and designer fee.
              </Text>
            </View>
          </View>

          <View style={s.workflowCard}>
            <View style={s.workflowItem}>
              <View style={[s.workflowNumber, s.workflowNumberActive]}>
                <Text style={s.workflowNumberTextActive}>1</Text>
              </View>
              <View style={s.workflowCopy}>
                <Text style={s.workflowLabel}>Upload model</Text>
                <Text style={s.workflowMeta}>Creates the backend file ID</Text>
              </View>
            </View>
            <ChevronRight size={17} color={colors.mutedFg} />
            <View style={s.workflowItem}>
              <View style={s.workflowNumber}>
                <Text style={s.workflowNumberText}>2</Text>
              </View>
              <View style={s.workflowCopy}>
                <Text style={s.workflowLabel}>Create draft</Text>
                <Text style={s.workflowMeta}>Uses that file ID in the listing</Text>
              </View>
            </View>
          </View>

          <View style={s.sectionHeading}>
            <View style={s.sectionIcon}>
              <FileBox size={18} color={colors.primary} />
            </View>
            <View style={s.sectionHeadingCopy}>
              <Text style={s.sectionTitle}>1. Printable model</Text>
              <Text style={s.sectionSubtitle}>Required · uploaded before the listing is created</Text>
            </View>
          </View>

          {modelFile ? (
            <Card style={s.selectedFileCard}>
              <View style={s.fileIconWrap}>
                <FileBox size={23} color={colors.primary} />
              </View>
              <View style={s.fileCopy}>
                <MonoText style={s.fileName}>
                  {modelFile.name}
                </MonoText>
                <Text style={s.fileMeta}>
                  {formatBytes(modelFile.size)} · Ready to upload
                </Text>
              </View>
              <View style={s.readyCheck}>
                <Check size={15} color={colors.onPrimary} strokeWidth={3} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove model file"
                onPress={() => setModelFile(null)}
                style={({ pressed }) => [s.removeButton, pressed && s.pressed]}
              >
                <X size={17} color={colors.mutedFg} />
              </Pressable>
            </Card>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a printable model"
              onPress={pickModel}
              style={({ pressed }) => [s.uploadZone, pressed && s.uploadZonePressed]}
            >
              <View style={s.uploadIcon}>
                <CloudUpload size={31} color={colors.primary} strokeWidth={1.8} />
              </View>
              <Text style={s.uploadTitle}>Choose your 3D model</Text>
              <Text style={s.uploadText}>STL, OBJ, 3MF, STEP and supported files up to 100 MB</Text>
              <View style={s.uploadActionPill}>
                <Text style={s.uploadActionText}>Browse model files</Text>
              </View>
            </Pressable>
          )}

          <View style={s.infoCard}>
            <ShieldCheck size={19} color={colors.success} />
            <View style={s.infoCopy}>
              <Text style={s.infoTitle}>Ownership stays tied to your account</Text>
              <Text style={s.infoText}>
                The selected model becomes the listing’s file reference after the upload service returns its file ID.
              </Text>
            </View>
          </View>

          <View style={s.sectionHeading}>
            <View style={s.sectionIcon}>
              <Sparkles size={18} color={colors.primary} />
            </View>
            <View style={s.sectionHeadingCopy}>
              <Text style={s.sectionTitle}>2. Listing details</Text>
              <Text style={s.sectionSubtitle}>Customer-facing information for the storefront</Text>
            </View>
          </View>

          <Card style={s.formCard}>
            <View style={s.fieldGroup}>
              <View style={s.labelRow}>
                <Text style={s.label}>Listing title</Text>
                <Text style={s.requiredText}>Required</Text>
              </View>
              <TextInput
                accessibilityLabel="Listing title"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Adjustable Robotics Gripper"
                placeholderTextColor={colors.mutedFg}
                style={s.input}
                maxLength={80}
                returnKeyType="next"
              />
              <Text style={s.fieldHint}>Use a short name that explains what the model is.</Text>
            </View>

            <View style={s.fieldDivider} />

            <View style={s.fieldGroup}>
              <View style={s.labelRow}>
                <Text style={s.label}>Description</Text>
                <Text style={s.characterCount}>{description.length}/{MAX_DESCRIPTION_LENGTH}</Text>
              </View>
              <TextInput
                accessibilityLabel="Listing description"
                value={description}
                onChangeText={setDescription}
                placeholder="Explain the design, recommended use, dimensions, and any assembly notes."
                placeholderTextColor={colors.mutedFg}
                style={[s.input, s.textArea]}
                maxLength={MAX_DESCRIPTION_LENGTH}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={s.fieldDivider} />

            <View style={s.fieldGroup}>
              <View style={s.labelRow}>
                <Text style={s.label}>Designer base price</Text>
                <Text style={s.requiredText}>Required</Text>
              </View>
              <View style={s.priceInputWrap}>
                <View style={s.currencyPrefix}>
                  <Text style={s.currencyText}>GH₵</Text>
                </View>
                <TextInput
                  accessibilityLabel="Designer base price"
                  value={basePrice}
                  onChangeText={value => setBasePrice(sanitizePrice(value))}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedFg}
                  style={s.priceInput}
                  keyboardType="decimal-pad"
                />
                <Text style={s.perOrderText}>per order</Text>
              </View>
              <Text style={s.fieldHint}>
                This designer fee is added to the material and machine estimate shown to customers.
              </Text>
            </View>
          </Card>

          <View style={s.sectionHeading}>
            <View style={s.sectionIcon}>
              <FileImage size={18} color={colors.primary} />
            </View>
            <View style={s.sectionHeadingCopy}>
              <Text style={s.sectionTitle}>Storefront thumbnail</Text>
              <Text style={s.sectionSubtitle}>Optional · PNG or JPG preview for marketplace cards</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a listing thumbnail"
            onPress={pickThumbnail}
            style={({ pressed }) => [s.thumbnailCard, pressed && s.pressed]}
          >
            {thumbnail ? (
              <>
                <Image source={{ uri: thumbnail.uri }} style={s.thumbnailImage} resizeMode="cover" />
                <View style={s.thumbnailOverlay}>
                  <View style={s.thumbnailStatus}>
                    <Check size={14} color={colors.onPrimary} strokeWidth={3} />
                    <Text style={s.thumbnailStatusText}>Thumbnail selected</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove thumbnail"
                    onPress={event => {
                      event.stopPropagation();
                      setThumbnail(null);
                    }}
                    style={({ pressed }) => [s.thumbnailRemove, pressed && s.pressed]}
                  >
                    <X size={18} color={colors.foreground} />
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={s.thumbnailEmpty}>
                <View style={s.thumbnailIconWrap}>
                  <ImagePlus size={26} color={colors.primary} />
                </View>
                <View style={s.thumbnailEmptyCopy}>
                  <Text style={s.thumbnailTitle}>Add a model preview</Text>
                  <Text style={s.thumbnailText}>A clear render makes the design easier to discover.</Text>
                </View>
                <ChevronRight size={20} color={colors.mutedFg} />
              </View>
            )}
          </Pressable>

          <View style={s.sectionHeading}>
            <View style={s.sectionIcon}>
              <ShieldCheck size={18} color={colors.primary} />
            </View>
            <View style={s.sectionHeadingCopy}>
              <Text style={s.sectionTitle}>Ownership & Rights</Text>
              <Text style={s.sectionSubtitle}>Required · Confirm your authority to sell this</Text>
            </View>
          </View>

          <Card style={s.formCard}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ownershipAttested }}
              onPress={() => setOwnershipAttested(!ownershipAttested)}
              style={({ pressed }) => [s.checkboxRow, pressed && s.pressed]}
            >
              <View style={[s.checkbox, ownershipAttested && s.checkboxChecked]}>
                {ownershipAttested && <Check size={14} color={colors.onPrimary} strokeWidth={3} />}
              </View>
              <View style={s.checkboxCopy}>
                <Text style={s.checkboxLabel}>I confirm I own the rights to this design</Text>
                <Text style={s.checkboxHint}>
                  You must be the original creator or have explicit commercial distribution rights.
                </Text>
              </View>
            </Pressable>
          </Card>

          <Card style={s.readinessCard}>
            <View style={s.readinessHeader}>
              <View>
                <Text style={s.readinessEyebrow}>DRAFT READINESS</Text>
                <Text style={s.readinessTitle}>{isReady ? 'Ready to create' : 'A few details remain'}</Text>
              </View>
              <View style={[s.readinessScore, isReady && s.readinessScoreComplete]}>
                <Text style={[s.readinessScoreText, isReady && s.readinessScoreTextComplete]}>
                  {completionItems.filter(item => item.complete).length}/{completionItems.length}
                </Text>
              </View>
            </View>

            <View style={s.checklist}>
              {completionItems.map(item => (
                <View key={item.label} style={s.checklistRow}>
                  <View style={[s.checkCircle, item.complete && s.checkCircleComplete]}>
                    {item.complete ? <Check size={12} color={colors.onPrimary} strokeWidth={3} /> : null}
                  </View>
                  <Text style={[s.checklistText, item.complete && s.checklistTextComplete]}>
                    {item.label}
                  </Text>
                  {item.optional ? <Text style={s.optionalPill}>OPTIONAL</Text> : null}
                </View>
              ))}
            </View>

            <View style={s.publishNote}>
              <Info size={17} color={colors.info} />
              <Text style={s.publishNoteText}>
                New listings are created as DRAFT. Publish the listing from your dashboard after reviewing it.
              </Text>
            </View>
          </Card>

          {submitError ? (
            <View style={s.submitErrorBanner}>
              <Info size={16} color={colors.destructive} />
              <Text style={s.submitErrorText}>{submitError}</Text>
            </View>
          ) : null}

          <View style={s.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={phase !== 'idle'}
              onPress={() => router.back()}
              style={({ pressed }) => [
                controls.secondaryButton,
                s.cancelButton,
                phase !== 'idle' && s.createButtonDisabled,
                pressed && controls.secondaryButtonPressed,
              ]}
            >
              <Text style={controls.secondaryButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !isReady || phase !== 'idle' }}
              disabled={phase !== 'idle'}
              onPress={handleSubmit}
              style={({ pressed }) => [
                controls.primaryButton,
                s.createButton,
                (!isReady || phase !== 'idle') && s.createButtonDisabled,
                pressed && isReady && phase === 'idle' && controls.primaryButtonPressed,
              ]}
            >
              <Save size={18} color={colors.onPrimary} />
              <Text style={controls.primaryButtonText}>
                {phase === 'uploading'
                  ? 'Uploading...'
                  : phase === 'creating'
                    ? 'Creating listing...'
                    : 'Create draft'}
              </Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function sanitizePrice(value: string) {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const [whole = '', ...decimalParts] = sanitized.split('.');
  const decimal = decimalParts.join('').slice(0, 2);
  return decimalParts.length ? `${whole}.${decimal}` : whole;
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return 'Size unavailable';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    keyboardView: { flex: 1 },
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.md,
      paddingBottom: 44,
    },
    topBar: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: designTokens.spacing.lg,
      gap: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: { opacity: 0.68 },
    topBarCopy: { flex: 1, minWidth: 0 },
    topBarTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
      letterSpacing: -0.25,
    },
    topBarSubtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 2,
    },
    draftPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.statusSubmitted.bg,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    draftDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.statusSubmitted.dot },
    draftPillText: {
      color: colors.statusSubmitted.text,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 0.5,
    },
    heroCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      padding: 17,
      borderRadius: designTokens.radius.xl,
      backgroundColor: colors.navy,
      marginBottom: designTokens.spacing.md,
      overflow: 'hidden',
    },
    heroIcon: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    heroCopy: { flex: 1 },
    // heroCard's background is a fixed colors.navy regardless of theme —
    // text here needs fixed off-white tones, not colors.mutedFg (which
    // flips to dark navy-on-navy, nearly invisible, in light mode).
    heroEyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1,
      marginBottom: 5,
    },
    heroTitle: {
      color: colors.white,
      fontFamily: designTokens.type.display,
      fontSize: 21,
      letterSpacing: -0.35,
    },
    heroText: {
      color: 'rgba(229, 229, 229, 0.75)',
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
    },
    workflowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 13,
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: designTokens.spacing.xxl,
    },
    workflowItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
    workflowNumber: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    workflowNumberActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    workflowNumberText: { color: colors.mutedFg, fontFamily: designTokens.type.heading, fontSize: 11 },
    workflowNumberTextActive: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 11 },
    workflowCopy: { flex: 1, minWidth: 0 },
    workflowLabel: { color: colors.foreground, fontFamily: designTokens.type.heading, fontSize: 11 },
    workflowMeta: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 8.5,
      lineHeight: 12,
      marginTop: 2,
    },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 2,
      marginBottom: 10,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    sectionHeadingCopy: { flex: 1 },
    sectionTitle: { color: colors.foreground, fontFamily: designTokens.type.heading, fontSize: 15 },
    sectionSubtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      marginTop: 2,
    },
    uploadZone: {
      minHeight: 202,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      borderRadius: designTokens.radius.xl,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: colors.card,
      marginBottom: 10,
    },
    uploadZonePressed: { backgroundColor: colors.primarySoft, transform: [{ scale: 0.995 }] },
    uploadIcon: {
      width: 58,
      height: 58,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
      marginBottom: 13,
    },
    uploadTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
    uploadText: {
      maxWidth: 280,
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
      marginTop: 5,
    },
    uploadActionPill: {
      marginTop: 14,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    uploadActionText: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 11 },
    selectedFileCard: {
      minHeight: 86,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      marginBottom: 10,
      padding: 13,
    },
    fileIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    fileCopy: { flex: 1, minWidth: 0 },
    fileName: { color: colors.foreground, fontSize: 11 },
    fileMeta: { color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 10, marginTop: 4 },
    readyCheck: {
      width: 25,
      height: 25,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.success,
    },
    removeButton: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 13,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.statusCompleted.bg,
      marginBottom: designTokens.spacing.xxl,
    },
    infoCopy: { flex: 1 },
    infoTitle: { color: colors.statusCompleted.text, fontFamily: designTokens.type.heading, fontSize: 11 },
    infoText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },
    formCard: { padding: 15, marginBottom: designTokens.spacing.xxl },
    fieldGroup: { gap: 8 },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { color: colors.foreground, fontFamily: designTokens.type.heading, fontSize: 12 },
    requiredText: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 9 },
    characterCount: { color: colors.mutedFg, fontFamily: designTokens.type.medium, fontSize: 9 },
    input: {
      minHeight: 50,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    textArea: { minHeight: 116, lineHeight: 19 },
    fieldHint: { color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 9.5, lineHeight: 14 },
    fieldDivider: { height: 1, backgroundColor: colors.border, marginVertical: 17 },
    priceInputWrap: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      overflow: 'hidden',
    },
    currencyPrefix: {
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      backgroundColor: colors.primarySoft,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    currencyText: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 13 },
    priceInput: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
      paddingHorizontal: 13,
    },
    perOrderText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      paddingRight: 13,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxCopy: {
      flex: 1,
    },
    checkboxLabel: {
      color: colors.foreground,
      fontFamily: designTokens.type.medium,
      fontSize: 12,
    },
    checkboxHint: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 2,
    },
    thumbnailCard: {
      minHeight: 116,
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: designTokens.spacing.xxl,
    },
    thumbnailEmpty: { flex: 1, minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    thumbnailIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    thumbnailEmptyCopy: { flex: 1 },
    thumbnailTitle: { color: colors.foreground, fontFamily: designTokens.type.heading, fontSize: 13 },
    thumbnailText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },
    thumbnailImage: { width: '100%', height: 190 },
    thumbnailOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: 'rgba(22,24,43,0.16)',
    },
    thumbnailStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: designTokens.radius.pill,
      backgroundColor: 'rgba(22,24,43,0.88)',
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    thumbnailStatusText: { color: colors.white, fontFamily: designTokens.type.heading, fontSize: 9 },
    thumbnailRemove: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.94)',
    },
    readinessCard: { padding: 15, marginBottom: designTokens.spacing.lg },
    readinessHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    readinessEyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    readinessTitle: { color: colors.foreground, fontFamily: designTokens.type.heading, fontSize: 16 },
    readinessScore: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    readinessScoreComplete: { backgroundColor: colors.statusCompleted.bg, borderColor: colors.success },
    readinessScoreText: { color: colors.mutedFg, fontFamily: designTokens.type.heading, fontSize: 11 },
    readinessScoreTextComplete: { color: colors.statusCompleted.text },
    checklist: { gap: 10 },
    checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
    },
    checkCircleComplete: { backgroundColor: colors.success, borderColor: colors.success },
    checklistText: { flex: 1, color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 11 },
    checklistTextComplete: { color: colors.foreground, fontFamily: designTokens.type.medium },
    optionalPill: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 7.5,
      letterSpacing: 0.45,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.secondary,
    },
    publishNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingTop: 13,
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    publishNoteText: {
      flex: 1,
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      lineHeight: 15,
    },
    submitErrorBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.statusFailed.bg,
      borderWidth: 1,
      borderColor: colors.statusFailed.dot,
      marginBottom: designTokens.spacing.md,
    },
    submitErrorText: {
      flex: 1,
      color: colors.statusFailed.text,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      lineHeight: 16,
    },
    actions: { flexDirection: 'row', gap: 10 },
    cancelButton: { flex: 0.82 },
    createButton: { flex: 1.18 },
    createButtonDisabled: { opacity: 0.48 },
  });
}
