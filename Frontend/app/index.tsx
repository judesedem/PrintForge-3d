import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Box, GraduationCap, Layers3, Printer } from 'lucide-react-native';
import { useTheme } from '../src/ThemeContext';
import { Colors, designTokens, makeControlStyles } from '../src/theme';

export default function SplashOnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const controls = makeControlStyles(colors);

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.screen}>
        <View style={s.topRow}>
          <View style={s.brandRow}>
            <BrandMark colors={colors} compact />
            <View>
              <Text style={s.brandName}>PrintForge</Text>
              <Text style={s.brandSuffix}>3D</Text>
            </View>
          </View>
          <View style={s.labPill}>
            <GraduationCap size={15} color={colors.primary} />
            <Text style={s.labPillText}>Built for campus labs</Text>
          </View>
        </View>

        <View style={s.hero}>
          <View style={s.heroGlow} />
          <View style={s.heroGrid}>
            <View style={[s.floatingCard, s.cardLeft]}>
              <Layers3 size={25} color={colors.primary} strokeWidth={1.8} />
              <Text style={s.floatingLabel}>Discover models</Text>
            </View>

            <View style={s.brandOrb}>
              <BrandMark colors={colors} />
            </View>

            <View style={[s.floatingCard, s.cardRight]}>
              <Printer size={25} color={colors.primary} strokeWidth={1.8} />
              <Text style={s.floatingLabel}>Track your print</Text>
            </View>
          </View>
        </View>

        <View style={s.copyBlock}>
          <View style={s.eyebrowRow}>
            <View style={s.eyebrowLine} />
            <Text style={s.eyebrow}>DESIGN. QUOTE. PRINT.</Text>
          </View>
          <Text style={s.title}>Turn your ideas into real things.</Text>
          <Text style={s.body}>
            Browse student-made designs, get an instant estimate, and send your model to a verified university print lab.
          </Text>
        </View>

        <View style={s.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get started with PrintForge 3D"
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [controls.primaryButton, pressed && controls.primaryButtonPressed]}
          >
            <Text style={controls.primaryButtonText}>Get started</Text>
            <ArrowRight size={19} color={colors.onPrimary} />
          </Pressable>
          <Text style={s.caption}>For students, designers, and print lab teams.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function BrandMark({ colors, compact = false }: { colors: Colors; compact?: boolean }) {
  return (
    <View style={[styles.mark, compact && styles.markCompact, { backgroundColor: colors.navy }]}>
      <Box size={compact ? 19 : 40} color={colors.primary} strokeWidth={2.2} />
      {!compact ? <View style={[styles.markAccent, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  markCompact: {
    width: 42,
    height: 42,
    borderRadius: 13,
  },
  markAccent: {
    position: 'absolute',
    bottom: 18,
    width: 34,
    height: 5,
    borderRadius: 3,
  },
});

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    screen: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: 12,
      paddingBottom: 20,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    brandName: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
      lineHeight: 19,
      letterSpacing: -0.3,
    },
    brandSuffix: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
      letterSpacing: 1.3,
    },
    labPill: {
      minHeight: 34,
      paddingHorizontal: 11,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.primarySoft,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    labPillText: {
      color: colors.primary,
      fontFamily: designTokens.type.medium,
      fontSize: 11,
    },
    hero: {
      flex: 1,
      minHeight: 300,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    heroGlow: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: colors.primarySoft,
      opacity: 0.82,
    },
    heroGrid: {
      width: '100%',
      minHeight: 270,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    brandOrb: {
      width: 138,
      height: 138,
      borderRadius: 44,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 8,
      transform: [{ rotate: '-4deg' }],
    },
    floatingCard: {
      position: 'absolute',
      width: 132,
      minHeight: 94,
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      justifyContent: 'space-between',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 4,
    },
    cardLeft: { left: 3, top: 23, transform: [{ rotate: '-5deg' }] },
    cardRight: { right: 3, bottom: 19, transform: [{ rotate: '5deg' }] },
    floatingLabel: {
      marginTop: 12,
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    copyBlock: { marginBottom: 24 },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
    eyebrowLine: { width: 28, height: 3, borderRadius: 2, backgroundColor: colors.primary },
    eyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
      letterSpacing: 1.4,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 38,
      lineHeight: 42,
      letterSpacing: -1.2,
      maxWidth: 340,
    },
    body: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 16,
      lineHeight: 24,
      marginTop: 14,
      maxWidth: 350,
    },
    footer: { gap: 12 },
    caption: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      textAlign: 'center',
    },
  });
}
