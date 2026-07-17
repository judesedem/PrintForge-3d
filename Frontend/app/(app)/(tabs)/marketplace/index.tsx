import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { useRouter } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { Colors, designTokens } from '@/theme';
import { fetchListings, MarketplaceListing } from '@/api/marketplace';

/**
 * Discover screen — Bolt redesign Pass 1 (was the "Browse 3D models"
 * marketplace layout with featured rail / category cards / campus labs).
 *
 * The real data path is UNCHANGED: fetchListings() with the same
 * auth-gated effect, loading, error + retry states as before. Only the
 * presentation moved to the 2-column grid. Mock cards render ONLY when
 * the backend returns zero listings, purely so the grid design is
 * visible before real listings exist — mock cards don't navigate
 * anywhere (a fake id would just error on the real detail screen).
 */

// UI-only for now: DesignListing has no category field, so the pills
// don't filter anything yet (matches the reference, which also treats
// them as visual until a category model exists).
const CATEGORIES = ['All', 'Gears', 'Drones', 'Enclosures', 'Miniatures', 'Articulated'] as const;
type Category = (typeof CATEGORIES)[number];

type GridItem = {
  id: string;
  name: string;
  likes: number;
  price: string | null; // display string; null renders the "Free" badge
  img: string;
  /** Real backend listing id — null for mock fallback cards. */
  listingId: string | null;
};

const MOCK_GRID: GridItem[] = [
  {
    id: 'mock-1',
    name: 'Helical Gear',
    likes: 1200,
    price: 'GH₵ 3.99',
    img: 'https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=300',
    listingId: null,
  },
  {
    id: 'mock-2',
    name: 'GoPro Mount',
    likes: 890,
    price: 'GH₵ 4.99',
    img: 'https://images.pexels.com/photos/3825586/pexels-photo-3825586.jpeg?auto=compress&cs=tinysrgb&w=300',
    listingId: null,
  },
  {
    id: 'mock-3',
    name: 'Pi Case',
    likes: 567,
    price: 'GH₵ 1.49',
    img: 'https://images.pexels.com/photos/4488649/pexels-photo-4488649.jpeg?auto=compress&cs=tinysrgb&w=300',
    listingId: null,
  },
  {
    id: 'mock-4',
    name: 'Drone Frame',
    likes: 2100,
    price: 'GH₵ 4.99',
    img: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=300',
    listingId: null,
  },
  {
    id: 'mock-5',
    name: 'Cable Clip',
    likes: 340,
    price: null,
    img: 'https://images.pexels.com/photos/4488626/pexels-photo-4488626.jpeg?auto=compress&cs=tinysrgb&w=300',
    listingId: null,
  },
  {
    id: 'mock-6',
    name: 'Vase Spiral',
    likes: 780,
    price: 'GH₵ 0.99',
    img: 'https://images.pexels.com/photos/4488637/pexels-photo-4488637.jpeg?auto=compress&cs=tinysrgb&w=300',
    listingId: null,
  },
];

const FREE_BADGE_BG = '#10B981'; // emerald-500 per the reference

export default function MarketplaceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token, authLoading } = useSession();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const s = makeStyles(colors);

  const load = useCallback(async () => {
    if (!token) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchListings(token);
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the marketplace');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    // Explicit guard (load() already checks this internally) so
    // fetchListings can never go out with a null token.
    if (!token) {
      setListings([]);
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, token, load]);

  const gridData: GridItem[] = useMemo(() => {
    if (listings.length === 0) return MOCK_GRID;
    return listings.map(listing => ({
      id: listing.id,
      name: listing.title,
      // DesignListing has no likes field — totalOrders stands in as the
      // popularity count until the backend grows a social model.
      likes: listing.totalOrders,
      price: listing.price > 0 ? `GH₵ ${listing.price.toFixed(2)}` : null,
      img: listing.thumbnailUrl,
      listingId: listing.id,
    }));
  }, [listings]);

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
      {item.img ? (
        <Image source={{ uri: item.img }} style={s.gridImage} />
      ) : (
        <View style={[s.gridImage, s.gridImageFallback]} />
      )}
      <View style={[s.priceBadge, !item.price && s.freeBadge]}>
        <Text style={s.priceText}>{item.price ?? 'Free'}</Text>
      </View>
      <View style={s.gridCardBody}>
        <Text style={s.gridName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={s.likesRow}>
          <Heart size={12} color={colors.mutedFg} />
          <Text style={s.likesText}>{item.likes.toLocaleString()}</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={s.screen}>
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

        <ScrollView
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

      {loading ? (
        <View style={s.centered}>
          <Text style={s.stateText}>Loading designs…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.stateText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={load}
            style={({ pressed }) => [s.retryButton, pressed && s.pressed]}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          columnWrapperStyle={s.gridRow}
          contentContainerStyle={s.gridContent}
          showsVerticalScrollIndicator={false}
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
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topArea: {
      paddingTop: designTokens.spacing.sm,
      paddingBottom: designTokens.spacing.md,
    },
    searchBar: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginHorizontal: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.md,
      paddingHorizontal: 16,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.muted,
    },
    searchInput: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 14,
      paddingVertical: 10,
    },
    pillsRow: {
      paddingHorizontal: designTokens.spacing.lg,
      gap: 8,
    },
    pill: {
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.muted,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    pillActive: {
      backgroundColor: colors.primary,
    },
    pillText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 12,
    },
    pillTextActive: {
      color: '#FFFFFF',
    },
    gridRow: {
      gap: 12,
      paddingHorizontal: designTokens.spacing.lg,
    },
    gridContent: {
      gap: 12,
      // Clears the floating Upload circle overlapping the pager bottom.
      paddingBottom: 48,
    },
    gridCard: {
      flex: 1,
      maxWidth: '48.5%',
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    gridCardPressed: {
      opacity: 0.85,
    },
    gridImage: {
      width: '100%',
      height: 140,
      resizeMode: 'cover',
    },
    gridImageFallback: {
      backgroundColor: colors.cardElevated,
    },
    priceBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.primary,
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
    gridCardBody: {
      paddingHorizontal: 11,
      paddingTop: 9,
      paddingBottom: 11,
      gap: 4,
    },
    gridName: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    likesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    likesText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: designTokens.spacing.xl,
    },
    stateText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: designTokens.spacing.md,
    },
    retryButton: {
      minHeight: 40,
      borderRadius: designTokens.radius.pill,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: designTokens.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: designTokens.spacing.sm,
    },
    retryText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    pressed: {
      opacity: 0.7,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 64,
      paddingHorizontal: designTokens.spacing.xl,
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
