import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BadgeCheck, ChevronRight } from 'lucide-react-native';

// ── Design tokens — literal values per spec, not theme-reactive ──────────
const NAVY = '#0A182E';
const WHITE = '#FFFFFF';
const WHITE_50 = 'rgba(255,255,255,0.5)';
const WHITE_20 = 'rgba(255,255,255,0.2)';
const ORANGE = '#FF6A00';
const ORANGE_30 = 'rgba(255,106,0,0.3)';

export default function FollowingScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ArrowLeft size={20} color={WHITE} />
            </Pressable>
            <Text style={styles.headerTitle}>Following</Text>
            <View style={styles.headerSpacer} />
          </View>
          <Text style={styles.headerSubtitle}>Designers you follow</Text>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: WHITE_50, textAlign: 'center' }}>
          You aren't following any designers yet.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  pressed: { opacity: 0.7 },

  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: WHITE,
  },
  headerSpacer: {
    width: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    color: WHITE_50,
    textAlign: 'center',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: ORANGE_30,
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },
  stats: {
    fontSize: 11,
    color: WHITE_50,
    marginTop: 2,
  },

  followPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  followPillFollowing: {
    borderColor: WHITE_20,
    backgroundColor: 'transparent',
  },
  followPillUnfollowed: {
    borderColor: ORANGE,
    backgroundColor: 'transparent',
  },
  followPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  followTextFollowing: {
    color: WHITE_50,
  },
  followTextUnfollowed: {
    color: ORANGE,
  },
});
