import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Typography, Spacing } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function SplashScreen({ onGetStarted, onLogin }: SplashScreenProps) {
  const { Colors } = useTheme();
  const s = styles(Colors);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Logo entrance
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // Content fade in
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.container}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />

      {/* Background grid lines — decorative */}
      <View style={s.gridOverlay} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[s.gridLine, { top: (height / 8) * i }]} />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={[s.gridLineV, { left: (width / 5) * i }]} />
        ))}
      </View>

      <SafeAreaView style={s.inner}>
        {/* Logo mark */}
        <Animated.View style={[s.logoSection, { transform: [{ scale: logoScale }] }]}>
          <Animated.View style={[s.glowRing, { opacity: glowAnim }]} />
          <View style={s.logoBox}>
            <Text style={s.logoIcon}>◈</Text>
          </View>
          <View style={s.logoTextRow}>
            <Text style={s.logoBrand}>PrintForge</Text>
            <View style={s.logo3D}>
              <Text style={s.logo3DText}>3D</Text>
            </View>
          </View>
        </Animated.View>

        {/* Tagline & CTAs */}
        <Animated.View style={[s.footer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={[Typography.displayMedium, { color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 }]}>
            Your Lab, Streamlined.
          </Text>
          <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl }]}>
            Submit 3D print requests, track job progress, and manage your lab — all in one place.
          </Text>

          <TouchableOpacity style={s.primaryBtn} onPress={onGetStarted} activeOpacity={0.85}>
            <Text style={[Typography.labelLarge, { color: Colors.background, fontSize: 16 }]}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.ghostBtn} onPress={onLogin} activeOpacity={0.7}>
            <Text style={[Typography.labelLarge, { color: Colors.textSecondary }]}>Sign In</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

type ThemeColors = {
  background: string; surface: string; border: string; accent: string;
  textPrimary: string;
};

const styles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.accent,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.accent,
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: height * 0.12,
    paddingBottom: Spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.accent,
    opacity: 0.08,
    top: -20,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoIcon: {
    fontSize: 44,
    color: Colors.accent,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBrand: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  logo3D: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  logo3DText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.background,
    letterSpacing: 1,
  },
  footer: {
    paddingBottom: Spacing.md,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.sm + 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  ghostBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
