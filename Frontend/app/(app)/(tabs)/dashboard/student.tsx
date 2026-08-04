import React, { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck, Bell, Heart, Star } from 'lucide-react-native';
import { useTheme } from '@/ThemeContext';
import { useToast } from '@/ToastContext';
import { Colors, designTokens } from '@/theme';
import NotificationsPanel from '@/components/NotificationsPanel';
import { ApiError } from '@/api/client';

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

import { fetchListings, addFavorite, removeFavorite, MarketplaceListing } from '@/api/marketplace';
import { followUser, unfollowUser, getFollowStatus } from '@/api/users';
import { useSession } from '@/SessionContext';

// NOTE: FeedItem still has mock-like fields (avatar, likes) because those
// backend features don't exist yet, but we will populate the core data
// (image, designName) from real listings. isFavorited/followed are real —
// backed by MarketplaceController's favorite endpoints and FollowController,
// not mocked.
type FeedItem = {
  id: string;
  designerId: number;
  designerName: string;
  verified: boolean;
  followed: boolean;
  image: string;
  avatar: string;
  designName: string;
  likes: number;
  trending: boolean;
  liked: boolean;
  isFavorited: boolean;
};

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
  const { token, authLoading } = useSession();
  const { showToast } = useToast();
  const s = makeStyles(colors);

  const [tab, setTab] = useState<FeedTab>('trending');
  const [notifOpen, setNotifOpen] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [pageNumber, setPageNumber] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const toFeedItems = (listings: MarketplaceListing[], startIdx: number): FeedItem[] =>
    listings.map((l, i) => ({
      id: l.id,
      designerId: l.designerId,
      designerName: l.designerName || 'Unknown Designer',
      verified: l.isPremiumDesigner || false,
      // Placeholder — corrected below once real follow status resolves.
      // Unlike isFavorited, the listing response doesn't embed per-designer
      // follow status (favorites are per-listing, follows are per-user), so
      // it needs its own lookup rather than riding along for free.
      followed: false,
      image: l.thumbnailUrl || 'https://via.placeholder.com/600',
      avatar: l.designerAvatar || 'https://images.pexels.com/photos/220459/pexels-photo-220459.jpeg?auto=compress&cs=tinysrgb&w=100',
      designName: l.title,
      likes: l.totalOrders * 3 + 12, // Fake likes based on orders
      trending: startIdx + i < 3,
      liked: false,
      isFavorited: l.isFavorited ?? false,
    }));

  // One lookup per distinct designer on the page (typically far fewer than
  // one per listing, since a designer usually has multiple listings), not
  // one per card — keeps this bounded rather than N+1.
  const loadFollowStatuses = async (items: FeedItem[]) => {
    if (!token) return;
    const uniqueDesignerIds = [...new Set(items.map(i => i.designerId))];
    const results = await Promise.all(
      uniqueDesignerIds.map(id =>
        getFollowStatus(token, id).catch(() => null)
      )
    );
    const followingMap = new Map<number, boolean>();
    uniqueDesignerIds.forEach((id, i) => {
      const result = results[i];
      if (result) followingMap.set(id, result.isFollowing);
    });
    setFeed(prev =>
      prev.map(item =>
        followingMap.has(item.designerId)
          ? { ...item, followed: followingMap.get(item.designerId)! }
          : item
      )
    );
  };

  // `tab` now drives a real ?sort= param (previously fetchListings() was
  // called with no sort at all, so the Trending/Newest toggle only ever
  // changed which of the first 3 already-fetched items got the "Popular"
  // badge, not what was actually fetched). A tab change is a different
  // result set from page 0, same as DesignsTab.tsx's category filter —
  // not something to paginate onto what's already loaded.
  const loadFirstPage = useCallback(() => {
    if (!token) {
      setFeed([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchListings(token, { page: 0, sort: tab })
      .then(page => {
        const items = toFeedItems(page.listings, 0);
        setFeed(items);
        setPageNumber(page.pageNumber);
        setTotalPages(page.totalPages);
        loadFollowStatuses(items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, tab]);

  useEffect(() => {
    if (authLoading) return;
    loadFirstPage();
  }, [authLoading, loadFirstPage]);

  const loadMore = useCallback(() => {
    if (!token || loading || loadingMore) return;
    if (pageNumber + 1 >= totalPages) return;
    setLoadingMore(true);
    fetchListings(token, { page: pageNumber + 1, sort: tab })
      .then(page => {
        let newItems: FeedItem[] = [];
        setFeed(prev => {
          newItems = toFeedItems(page.listings, prev.length);
          return [...prev, ...newItems];
        });
        setPageNumber(page.pageNumber);
        setTotalPages(page.totalPages);
        loadFollowStatuses(newItems);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  }, [token, tab, loading, loadingMore, pageNumber, totalPages]);

  const toggleLike = (id: string) =>
    setFeed(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) }
          : item
      )
    );

  // Keyed by designerId, not the card's listing id — a designer can have
  // multiple listings in the feed, and following/unfollowing them should
  // update every card from that designer at once, not just the one tapped.
  // Same optimistic-update-with-rollback shape as toggleFavorite below.
  const toggleFollow = async (designerId: number) => {
    if (!token) return;
    const wasFollowing = feed.find(item => item.designerId === designerId)?.followed ?? false;

    setFeed(prev =>
      prev.map(item =>
        item.designerId === designerId ? { ...item, followed: !wasFollowing } : item
      )
    );

    try {
      if (wasFollowing) {
        await unfollowUser(token, designerId);
      } else {
        await followUser(token, designerId);
      }
    } catch (err) {
      setFeed(prev =>
        prev.map(item =>
          item.designerId === designerId ? { ...item, followed: wasFollowing } : item
        )
      );
      showToast(err instanceof ApiError ? err.message : 'Failed to update follow status');
    }
  };

  // Optimistic update with rollback on failure — same shape as
  // toggleLike/toggleFollow above, but backed by the real favorite
  // endpoints instead of local-only mock state.
  const toggleFavorite = async (id: string) => {
    if (!token) return;
    const wasFavorited = feed.find(item => item.id === id)?.isFavorited ?? false;

    setFeed(prev =>
      prev.map(item => (item.id === id ? { ...item, isFavorited: !wasFavorited } : item))
    );

    try {
      if (wasFavorited) {
        await removeFavorite(token, id);
      } else {
        await addFavorite(token, id);
      }
    } catch (err) {
      setFeed(prev =>
        prev.map(item => (item.id === id ? { ...item, isFavorited: wasFavorited } : item))
      );
      showToast(err instanceof ApiError ? err.message : 'Failed to update favorite');
    }
  };

  const renderCard = ({ item }: { item: FeedItem }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        {/* Avatar + name open the designer's public profile (Pass 2) —
            display fields ride along as params since there's no designer
            endpoint to fetch them from yet. Fixed to pass the real
            designerId here — this previously passed the listing's own
            id, which happened to work as a route param but pointed the
            profile screen at the wrong id entirely. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${item.designerName}'s profile`}
          onPress={() =>
            router.push({
              pathname: '/(app)/marketplace/designer/[id]',
              params: {
                id: String(item.designerId),
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
          onPress={() => toggleFollow(item.designerId)}
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

      <Pressable 
        style={({ pressed }) => [s.imageWrap, pressed && s.pressed]}
        onPress={() => router.push(`/marketplace/${item.id}`)}
      >
        <Image source={{ uri: item.image }} style={s.cardImage} />
        {item.trending && tab === 'trending' ? (
          <View style={s.popularBadge}>
            <Text style={s.popularText}>Popular</Text>
          </View>
        ) : null}
      </Pressable>

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.isFavorited ? 'Unfavorite design' : 'Favorite design'}
          onPress={() => toggleFavorite(item.id)}
          style={({ pressed }) => [s.actionGroup, pressed && s.pressed]}
        >
          <Star
            size={20}
            color={item.isFavorited ? colors.primary : CARD_MUTED}
            fill={item.isFavorited ? colors.primary : 'transparent'}
          />
        </Pressable>
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

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.mutedFg }}>Loading feed...</Text>
        </View>
      ) : feed.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.mutedFg }}>No designs published yet.</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={s.feedContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={s.footerLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

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
    footerLoading: {
      paddingVertical: 20,
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
