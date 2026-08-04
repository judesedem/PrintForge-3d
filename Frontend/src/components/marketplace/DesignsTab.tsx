import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Heart, Search } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { Colors, designTokens } from '@/theme';
import { fetchListings, MarketplaceListing } from '@/api/marketplace';

const CATEGORIES = ['All', 'Gears', 'Drones', 'Enclosures', 'Miniatures', 'Articulated'] as const;
type Category = (typeof CATEGORIES)[number];

type GridItem = {
  id: string;
  name: string;
  likes: number;
  price: string | null;
  img: string;
  listingId: string | null;
  designerName?: string;
  isPremiumDesigner?: boolean;
  category?: string;
};

const FREE_BADGE_BG = '#10B981';

export default function DesignsTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token, authLoading } = useSession();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [pageNumber, setPageNumber] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = makeStyles(colors);

  // Category is a real server-side filter (MarketplaceController's own
  // ?category= param) — a different category is a different result set,
  // not something to slice client-side out of one big fetch.
  const backendCategory = category === 'All' ? undefined : category.toUpperCase();

  const loadFirstPage = useCallback(async () => {
    if (!token) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await fetchListings(token, { page: 0, category: backendCategory });
      setListings(page.listings);
      setPageNumber(page.pageNumber);
      setTotalPages(page.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the marketplace');
    } finally {
      setLoading(false);
    }
  }, [token, backendCategory]);

  // Reacts to category (or token) changes while this screen stays
  // focused — useFocusEffect below only fires on focus transitions, not
  // on every dependency change while already focused, so a category pill
  // tap needs its own effect to actually trigger the refetch.
  useEffect(() => {
    if (authLoading) return;
    loadFirstPage();
  }, [authLoading, loadFirstPage]);

  // Refreshes the feed when returning to this tab (e.g. after publishing
  // a new listing elsewhere) — same intent as the original single-effect
  // version, just split out from the category-reactive effect above.
  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      loadFirstPage();
    }, [authLoading, loadFirstPage])
  );

  const loadMore = useCallback(async () => {
    if (!token || loading || loadingMore) return;
    if (pageNumber + 1 >= totalPages) return;
    setLoadingMore(true);
    try {
      const page = await fetchListings(token, { page: pageNumber + 1, category: backendCategory });
      setListings(prev => [...prev, ...page.listings]);
      setPageNumber(page.pageNumber);
      setTotalPages(page.totalPages);
    } catch {
      // A failed "load more" shouldn't blow away what's already on
      // screen — the user can scroll and trigger it again. The initial
      // load has its own retry button for a hard failure; this doesn't.
    } finally {
      setLoadingMore(false);
    }
  }, [token, loading, loadingMore, pageNumber, totalPages, backendCategory]);

  const gridData: GridItem[] = useMemo(() => {
    return listings.map(listing => ({
      id: listing.id,
      name: listing.title,
      likes: listing.totalOrders,
      price: listing.price > 0 ? `GH₵ ${listing.price.toFixed(2)}` : null,
      img: listing.thumbnailUrl,
      listingId: listing.id,
      designerName: listing.designerName,
      isPremiumDesigner: listing.isPremiumDesigner,
      category: listing.category,
    }));
  }, [listings]);

  // Client-side only — the backend endpoint has no text-search param, so
  // this filters whatever pages have been loaded so far, not the whole
  // storefront. Unlike category, search intentionally does NOT trigger a
  // refetch/reset.
  const filtered = gridData.filter(item =>
    item.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const renderCard = ({ item }: { item: GridItem }) => (
    <Pressable
      accessibilityRole={item.listingId ? 'button' : undefined}
      accessibilityLabel={item.listingId ? `Open ${item.name}` : `${item.name} (sample)`}
      disabled={!item.listingId}
      onPress={() => item.listingId && router.push(`/(app)/marketplace/${item.listingId}`)}
      style={({ pressed }) => [s.gridCard, pressed && s.gridCardPressed]}
    >
      {/* Full width image */}
      {item.img ? (
        <Image source={{ uri: item.img }} style={s.gridImage} />
      ) : (
        <View style={[s.gridImage, s.gridImageFallback]} />
      )}

      {/* Price badge overlaid on image */}
      <View style={[s.priceBadge, !item.price && s.freeBadge]}>
        <Text style={s.priceText}>{item.price ?? 'Free'}</Text>
      </View>

      {/* White bottom section */}
      <View style={s.cardBody}>
        <Text style={s.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.designerName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 4 }}>
            <Text style={{ fontSize: 10, color: '#6B7280', marginRight: 4 }} numberOfLines={1}>
              by {item.designerName}
            </Text>
            {item.isPremiumDesigner && (
              <View style={[s.priceBadge, { position: 'relative', top: 0, right: 0, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                <Text style={[s.priceText, { color: '#22C55E', fontSize: 8 }]}>Verified</Text>
              </View>
            )}
          </View>
        )}
        <View style={s.likesRow}>
          <Heart size={12} color="#6B7280" />
          <Text style={s.likesText}>{item.likes.toLocaleString()}</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={s.screen}>
      {/* Search + Category pills */}
      <View style={s.topArea}>
        <View style={s.searchBar}>
          <Search size={17} color={colors.mutedFg} />
          <TextInput
            style={s.searchInput}
            placeholder="Search designs, designers..."
            placeholderTextColor={colors.mutedFg}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsRow}
        >
          {CATEGORIES.map(item => {
            const active = item === category;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setCategory(item)}
                style={[s.pill, active && s.pillActive]}
              >
                <Text style={[s.pillText, active && s.pillTextActive]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Grid */}
      {loading ? (
        <View style={s.centered}>
          <Text style={s.stateText}>Loading designs…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.stateText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={loadFirstPage}
            style={({ pressed }) => [s.retryButton, pressed && s.pressed]}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={s.gridRow}
          contentContainerStyle={s.gridContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={s.footerLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No matching designs</Text>
              <Text style={s.emptyBody}>Try another search.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSearch('')}
                style={({ pressed }) => [s.retryButton, pressed && s.pressed]}
              >
                <Text style={s.retryText}>Clear search</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(colors: Colors) {
  const { width } = Dimensions.get('window');
  const HORIZONTAL_PADDING = 16;
  const GAP = 12;
  const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - GAP) / 2;
  const IMAGE_HEIGHT = CARD_WIDTH * 1.1;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topArea: {
      paddingBottom: 12,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginHorizontal: HORIZONTAL_PADDING,
      marginBottom: 12,
      paddingHorizontal: 14,
      borderRadius: 99,
      backgroundColor: colors.card,
      minHeight: 44,
    },
    searchInput: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 14,
      paddingVertical: 10,
    },
    pillsRow: {
      paddingHorizontal: HORIZONTAL_PADDING,
      gap: 8,
    },
    pill: {
      borderRadius: 99,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    pillActive: {
      backgroundColor: '#FF6A00',
    },
    pillText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    pillTextActive: {
      color: '#FFFFFF',
    },
    gridContent: {
      paddingHorizontal: HORIZONTAL_PADDING,
      paddingBottom: 80,
    },
    gridRow: {
      gap: GAP,
      marginBottom: GAP,
    },
    gridCard: {
      width: CARD_WIDTH,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
    },
    gridCardPressed: {
      opacity: 0.85,
    },
    gridImage: {
      width: CARD_WIDTH,
      height: IMAGE_HEIGHT,
      resizeMode: 'cover',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    gridImageFallback: {
      backgroundColor: colors.cardElevated,
    },
    priceBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      borderRadius: 99,
      backgroundColor: '#FF6A00',
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    freeBadge: {
      backgroundColor: FREE_BADGE_BG,
    },
    priceText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 11,
    },
    cardBody: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 4,
      borderBottomRightRadius: 16,
      borderBottomLeftRadius: 16,
    },
    cardName: {
      color: '#1A1A1A',
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    likesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    likesText: {
      color: '#6B7280',
      fontFamily: designTokens.type.body,
      fontSize: 11,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    stateText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 12,
    },
    retryButton: {
      minHeight: 40,
      borderRadius: 99,
      borderWidth: 1,
      borderColor: '#FF6A00',
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    retryText: {
      color: '#FF6A00',
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    pressed: {
      opacity: 0.7,
    },
    footerLoading: {
      paddingVertical: 20,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 64,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
    emptyBody: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginTop: 4,
      marginBottom: 6,
    },
  });
}
