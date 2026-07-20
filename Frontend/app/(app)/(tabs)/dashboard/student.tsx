import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck, Bell, Download, Heart } from 'lucide-react-native';
import { useTheme } from '@/ThemeContext';
import { Colors, designTokens } from '@/theme';
import NotificationsPanel from '@/components/NotificationsPanel';

/**
 * Home feed — Bolt redesign Pass 1 (replaces the old quick-actions/stats
 * dashboard layout entirely).
 *
 * Everything in the feed is MOCK data for now: the designer/like/download
 * social model has no backend yet. The old dashboard's real data (jobs via
 * useJobs()) was presentation-only here — the fetch itself lives in
 * JobsContext at the provider level and still runs; job stats can be
 * reintroduced as a feed section in a later pass.
 *
 * Feed cards are deliberately WHITE with navy text in BOTH themes — that's
 * the Bolt reference look (white cards floating on forge navy), not a
 * missing theme token.
 */

type FeedItem = {
  id: string;
  designerName: string;
  verified: boolean;
  followed: boolean;
  image: string;
  avatar: string;
  designName: string;
  likes: number;
  downloads: number;
  trending: boolean;
  liked: boolean;
};

const MOCK_FEED: FeedItem[] = [
  {
    id: '1',
    designerName: 'Marcus Chen',
    verified: true,
    followed: false,
    image:
      'https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=600',
    avatar:
      'https://images.pexels.com/photos/220459/pexels-photo-220459.jpeg?auto=compress&cs=tinysrgb&w=100',
    designName: 'Planetary Gear Set V3',
    likes: 1240,
    downloads: 320,
    trending: true,
    liked: false,
  },
  {
    id: '2',
    designerName: 'Priya Patel',
    verified: true,
    followed: true,
    image:
      'https://images.pexels.com/photos/3825586/pexels-photo-3825586.jpeg?auto=compress&cs=tinysrgb&w=600',
    avatar:
      'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
    designName: 'Drone GoPro Mount',
    likes: 890,
    downloads: 210,
    trending: true,
    liked: true,
  },
  {
    id: '3',
    designerName: 'Jonas Weiss',
    verified: false,
    followed: false,
    image:
      'https://images.pexels.com/photos/4488649/pexels-photo-4488649.jpeg?auto=compress&cs=tinysrgb&w=600',
    avatar:
      'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=100',
    designName: 'Raspberry Pi Enclosure',
    likes: 567,
    downloads: 145,
    trending: false,
    liked: false,
  },
];

// The Bolt reference renders feed cards white-on-navy in both themes, so
// these are fixed card-local colors rather than theme tokens.
const CARD_BG = '#FFFFFF';
const CARD_FG = '#0A182E';
const CARD_MUTED = 'rgba(10, 24, 46, 0.55)';
const CARD_BORDER_MUTED = 'rgba(10, 24, 46, 0.25)';

type FeedTab = 'trending' | 'newest';

export default function StudentDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  // UI-only toggle for now — no feed API exists yet.
  const [tab, setTab] = useState<FeedTab>('trending');
  const [notifOpen, setNotifOpen] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>(MOCK_FEED);

  const toggleLike = (id: string) =>
    setFeed(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) }
          : item
      )
    );

  const toggleFollow = (id: string) =>
    setFeed(prev =>
      prev.map(item => (item.id === id ? { ...item, followed: !item.followed } : item))
    );

  const renderCard = ({ item }: { item: FeedItem }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        {/* Avatar + name open the designer's public profile (Pass 2) —
            display fields ride along as params since there's no designer
            endpoint to fetch them from yet. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${item.designerName}'s profile`}
          onPress={() =>
            router.push({
              pathname: '/(app)/marketplace/designer/[id]',
              params: {
                id: item.id,
                name: item.designerName,
                avatar: item.avatar,
                verified: String(item.verified),
              },
            })
          }
          style={({ pressed }) => [s.designerTap, pressed && s.pressed]}
        >
          <Image source={{ uri: item.avatar }} style={s.avatar} />
          <View style={s.nameWrap}>
            <Text style={s.designerName} numberOfLines={1}>
              {item.designerName}
            </Text>
            {item.verified ? <BadgeCheck size={15} color={colors.primary} /> : null}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            item.followed ? `Unfollow ${item.designerName}` : `Follow ${item.designerName}`
          }
          onPress={() => toggleFollow(item.id)}
          style={({ pressed }) => [
            s.followButton,
            item.followed && s.followButtonFollowing,
            pressed && s.pressed,
          ]}
        >
          <Text style={[s.followText, item.followed && s.followTextFollowing]}>
            {item.followed ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      </View>

      <View style={s.imageWrap}>
        <Image source={{ uri: item.image }} style={s.cardImage} />
        {item.trending && tab === 'trending' ? (
          <View style={s.popularBadge}>
            <Text style={s.popularText}>Popular</Text>
          </View>
        ) : null}
      </View>

      <View style={s.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.liked ? 'Unlike design' : 'Like design'}
          onPress={() => toggleLike(item.id)}
          style={({ pressed }) => [s.actionGroup, pressed && s.pressed]}
        >
          <Heart
            size={20}
            color={item.liked ? colors.primary : CARD_MUTED}
            fill={item.liked ? colors.primary : 'transparent'}
          />
          <Text style={s.actionCount}>{item.likes.toLocaleString()}</Text>
        </Pressable>
        <View style={s.actionGroup}>
          <Download size={20} color={CARD_MUTED} />
          <Text style={s.actionCount}>{item.downloads.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={s.designName}>{item.designName}</Text>
    </View>
  );

  return (
    <View style={s.screen}>
      {/* Fixed (non-scrolling) top bar — the feed scrolls beneath it. */}
      <View style={s.topBar}>
        <View style={s.topRow}>
          <Text style={s.wordmark}>PrintForge</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => setNotifOpen(true)}
            style={({ pressed }) => [s.bellButton, pressed && s.pressed]}
          >
            <Bell size={22} color={colors.foreground} />
            <View style={s.bellDot} />
          </Pressable>
        </View>

        <View style={s.segment}>
          {(['trending', 'newest'] as const).map(key => {
            const active = key === tab;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(key)}
                style={[s.segmentTab, active && s.segmentTabActive]}
              >
                <Text style={[s.segmentText, active && s.segmentTextActive]}>
                  {key === 'trending' ? 'Trending' : 'Newest'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={feed}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        contentContainerStyle={s.feedContent}
        showsVerticalScrollIndicator={false}
      />

      <NotificationsPanel visible={notifOpen} onClose={() => setNotifOpen(false)} />
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      backgroundColor: colors.background,
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.sm,
      paddingBottom: designTokens.spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: designTokens.spacing.md,
    },
    wordmark: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 26,
      letterSpacing: -0.5,
    },
    bellButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellDot: {
      position: 'absolute',
      right: 9,
      top: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.muted,
      borderRadius: 12,
      padding: 3,
    },
    segmentTab: {
      flex: 1,
      minHeight: 34,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentTabActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    segmentTextActive: {
      color: '#FFFFFF',
    },
    feedContent: {
      paddingTop: 2,
      // Clears the floating Upload circle that overlaps the pager bottom.
      paddingBottom: 48,
    },
    pressed: {
      opacity: 0.7,
    },
    card: {
      backgroundColor: CARD_BG,
      borderRadius: 32,
      marginHorizontal: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.lg,
      overflow: 'hidden',
      shadowColor: '#0A182E',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    designerTap: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'rgba(255, 106, 0, 0.2)',
    },
    nameWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minWidth: 0,
    },
    designerName: {
      color: CARD_FG,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
      flexShrink: 1,
    },
    followButton: {
      minHeight: 28,
      borderRadius: designTokens.radius.pill,
      borderWidth: 1.5,
      borderColor: colors.primary,
      paddingHorizontal: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    followButtonFollowing: {
      borderColor: CARD_BORDER_MUTED,
    },
    followText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
    },
    followTextFollowing: {
      color: CARD_MUTED,
    },
    imageWrap: {
      position: 'relative',
    },
    cardImage: {
      width: '100%',
      height: 240,
      resizeMode: 'cover',
    },
    popularBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: colors.primary,
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 11,
      paddingVertical: 5,
    },
    popularText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 11,
      letterSpacing: 0.3,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.lg,
      paddingHorizontal: 12,
      paddingTop: 11,
    },
    actionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionCount: {
      color: CARD_MUTED,
      fontFamily: designTokens.type.medium,
      fontSize: 13,
    },
    designName: {
      color: CARD_FG,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
      paddingHorizontal: 12,
      paddingTop: 7,
      paddingBottom: 13,
    },
  });
}
