import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useSession } from '@/SessionContext';
import { useToast } from '@/ToastContext';
import { fetchFollowing, followUser, unfollowUser, FollowedUser } from '@/api/users';
import { ApiError } from '@/api/client';

// ── Design tokens — literal values per spec, not theme-reactive ──────────
const NAVY = '#0A182E';
const WHITE = '#FFFFFF';
const WHITE_50 = 'rgba(255,255,255,0.5)';
const WHITE_20 = 'rgba(255,255,255,0.2)';
const ORANGE = '#FF6A00';
const ORANGE_30 = 'rgba(255,106,0,0.3)';

function formatFollowerCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

export default function FollowingScreen() {
  const router = useRouter();
  const { token } = useSession();
  const { showToast } = useToast();

  const [following, setFollowing] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!token) {
      setFollowing([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchFollowing(token)
      .then(setFollowing)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Every row here is, by definition, someone the caller currently
  // follows — so this only ever unfollows, never follows. Optimistic
  // removal from the list with rollback (re-insert) on failure, same
  // shape as toggleFavorite/toggleFollow elsewhere in this app.
  const handleUnfollow = async (user: FollowedUser) => {
    if (!token) return;
    setFollowing(prev => prev.filter(u => u.id !== user.id));
    try {
      await unfollowUser(token, user.id);
    } catch (err) {
      setFollowing(prev => [...prev, user].sort((a, b) => a.id - b.id));
      showToast(err instanceof ApiError ? err.message : 'Failed to unfollow');
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={ORANGE} />
        </View>
      ) : following.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ color: WHITE_50, textAlign: 'center' }}>
            You aren't following any designers yet.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {following.map(user => (
            <Pressable
              key={user.id}
              accessibilityRole="button"
              accessibilityLabel={`View ${user.fullName}'s profile`}
              onPress={() =>
                router.push({
                  pathname: '/(app)/marketplace/designer/[id]',
                  params: { id: String(user.id), name: user.fullName, avatar: user.profilePictureUrl ?? '' },
                })
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              {user.profilePictureUrl ? (
                <Image source={{ uri: user.profilePictureUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{user.fullName[0]?.toUpperCase() ?? '?'}</Text>
                </View>
              )}
              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>{user.fullName}</Text>
                </View>
                <Text style={styles.stats}>{formatFollowerCount(user.followerCount)} followers</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unfollow ${user.fullName}`}
                onPress={() => handleUnfollow(user)}
                style={({ pressed }) => [styles.followPill, styles.followPillFollowing, pressed && styles.pressed]}
              >
                <Text style={[styles.followPillText, styles.followTextFollowing]}>Following</Text>
              </Pressable>
              <ChevronRight size={16} color={WHITE_50} style={{ marginLeft: 8 }} />
            </Pressable>
          ))}
        </ScrollView>
      )}
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

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
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
  avatarFallback: {
    backgroundColor: 'rgba(255,106,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: ORANGE,
    fontSize: 15,
    fontWeight: '800',
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
