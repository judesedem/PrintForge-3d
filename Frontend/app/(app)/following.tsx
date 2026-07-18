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

type Designer = {
  id: string;
  name: string;
  verified: boolean;
  designs: string;
  followers: string;
  following: boolean;
  avatar: string;
};

const MOCK_FOLLOWING: Designer[] = [
  {
    id: '1',
    name: 'Marcus Chen',
    verified: true,
    designs: '24 designs',
    followers: '1.2k followers',
    following: true,
    avatar:
      'https://images.pexels.com/photos/220459/pexels-photo-220459.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    id: '2',
    name: 'Priya Patel',
    verified: true,
    designs: '18 designs',
    followers: '890 followers',
    following: true,
    avatar:
      'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    id: '3',
    name: 'GearWorks Lab',
    verified: true,
    designs: '56 designs',
    followers: '3.4k followers',
    following: true,
    avatar:
      'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    id: '4',
    name: 'Jonas Weiss',
    verified: false,
    designs: '8 designs',
    followers: '234 followers',
    following: true,
    avatar:
      'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
];

export default function FollowingScreen() {
  const router = useRouter();
  const [designers, setDesigners] = useState<Designer[]>(MOCK_FOLLOWING);

  const toggleFollow = (id: string) => {
    setDesigners((prev) =>
      prev.map((d) => (d.id === id ? { ...d, following: !d.following } : d))
    );
  };

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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {designers.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() =>
              router.push({
                pathname: '/(app)/marketplace/designer/[id]',
                params: {
                  id: item.id,
                  name: item.name,
                  avatar: item.avatar,
                  verified: String(item.verified),
                },
              })
            }
          >
            <Image source={{ uri: item.avatar }} style={styles.avatar} />

            <View style={styles.infoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.name}</Text>
                {item.verified ? (
                  <BadgeCheck size={14} color={ORANGE} style={{ marginLeft: 4 }} />
                ) : null}
              </View>
              <Text style={styles.stats}>
                {`${item.designs} · ${item.followers}`}
              </Text>
            </View>

            <Pressable
              onPress={() => toggleFollow(item.id)}
              hitSlop={6}
              style={({ pressed }) => [
                styles.followPill,
                item.following ? styles.followPillFollowing : styles.followPillUnfollowed,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.followPillText,
                  item.following ? styles.followTextFollowing : styles.followTextUnfollowed,
                ]}
              >
                {item.following ? 'Following' : 'Follow'}
              </Text>
            </Pressable>

            <ChevronRight size={16} color={WHITE_20} style={{ marginLeft: 8 }} />
          </Pressable>
        ))}
      </ScrollView>
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
