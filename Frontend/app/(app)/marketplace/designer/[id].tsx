import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BadgeCheck, Grid3x3 } from 'lucide-react-native';
import { useTheme } from '@/ThemeContext';
import { Colors, designTokens } from '@/theme';

export default function DesignerProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    avatar?: string;
    verified?: string;
  }>();
  const s = makeStyles(colors);

  const name = typeof params.name === 'string' && params.name ? params.name : 'Designer';
  const avatar = typeof params.avatar === 'string' ? params.avatar : '';
  const verified = params.verified === 'true';

  const [following, setFollowing] = useState(false);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [s.backButton, pressed && s.pressed]}
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <Text style={s.topBarTitle}>Profile</Text>
        <View style={s.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarInitial}>{name[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}

        <View style={s.nameRow}>
          <Text style={s.name}>{name}</Text>
          {verified ? <BadgeCheck size={18} color={colors.primary} /> : null}
        </View>

        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statValue}>0</Text>
            <Text style={s.statLabel}>Designs</Text>
          </View>
          <View style={s.statItem}>
            <Text style={s.statValue}>0</Text>
            <Text style={s.statLabel}>Followers</Text>
          </View>
          <View style={s.statItem}>
            <Text style={s.statValue}>0</Text>
            <Text style={s.statLabel}>Following</Text>
          </View>
        </View>

        <Text style={s.bio}>3D designer on PrintForge — models for printing on campus.</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: following }}
          onPress={() => setFollowing(v => !v)}
          style={({ pressed }) => [
            s.followButton,
            following && s.followButtonFollowing,
            pressed && s.pressed,
          ]}
        >
          <Text style={[s.followText, following && s.followTextFollowing]}>
            {following ? 'Following' : 'Follow'}
          </Text>
        </Pressable>

        <View style={s.sectionHeader}>
          <Grid3x3 size={16} color={colors.primary} />
          <Text style={s.sectionTitle}>DESIGNS</Text>
        </View>
        
        <View style={s.designGrid}>
          <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 10 }}>
            No designs available to view yet.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pressed: { opacity: 0.72 },
    topBar: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: designTokens.spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -8,
    },
    topBarTitle: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
      textAlign: 'center',
    },
    topSpacer: { width: 32 },
    content: {
      alignItems: 'center',
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.md,
      paddingBottom: 48,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: 'rgba(255, 106, 0, 0.3)',
      marginBottom: designTokens.spacing.md,
    },
    avatarFallback: {
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      color: colors.primary,
      fontFamily: designTokens.type.display,
      fontSize: 28,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: designTokens.spacing.md,
    },
    name: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 21,
    },
    statsRow: {
      flexDirection: 'row',
      gap: designTokens.spacing.section,
      marginBottom: designTokens.spacing.md,
    },
    statItem: { alignItems: 'center', gap: 2 },
    statValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
    },
    statLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
    },
    bio: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      textAlign: 'center',
      maxWidth: 280,
      marginBottom: designTokens.spacing.lg,
    },
    followButton: {
      alignSelf: 'stretch',
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: '#FF6A00',
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: designTokens.spacing.xl,
    },
    followButtonFollowing: { borderColor: colors.border },
    followText: {
      color: '#FF6A00',
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    followTextFollowing: { color: colors.mutedFg },
    sectionHeader: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: designTokens.spacing.sm,
    },
    sectionTitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
      letterSpacing: 1,
    },
    designGrid: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    designThumb: {
      width: '32%',
      aspectRatio: 1,
      borderRadius: 14,
      backgroundColor: colors.cardElevated,
    },
  });
}
