import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
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

const CATEGORIES = ['All', 'Gears', 'Drones', 'Enclosures', 'Miniatures', 'Articulated'] as const;
type Category = (typeof CATEGORIES)[number];

type GridItem = {
  id: string;
  name: string;
  likes: number;
  price: string | null;
  img: string;
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

const FREE_BADGE_BG = '#10B981';

export default function DesignsTab() {
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
      likes: listing.totalOrders,
      price: listing.price > 0 ? `GH₵ ${listing.price.toFixed(2)}` : null,
      img: listing.thumbnailUrl,
      listingId: listing.id,
    }));
  }, [listings]);

  const filtered = gridData.filter(item =>
    item.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const rows = useMemo(() => {
    const result: GridItem[][] = [];
    for (let i = 0; i < filtered.length; i += 2) {
      result.push(filtered.slice(i, i + 2));
    }
    return result;
  }, [filtered]);

  const renderCard = (item: GridItem) => (
    <Pressable
      key={item.id}
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
            onPress={load}
            style={({ pressed }) => [s.retryButton, pressed && s.pressed]}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.gridContent}
          showsVerticalScrollIndicator={false}
        >
          {rows.length === 0 ? (
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
          ) : (
            rows.map((row, rowIndex) => (
              <View key={rowIndex} style={s.gridRow}>
                {row.map(item => renderCard(item))}
                {/* Fill empty slot if odd number of items */}
                {row.length === 1 && <View style={s.gridCard} />}
              </View>
            ))
          )}
        </ScrollView>
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
      paddingBottom: 80,
    },
    gridRow: {
      flexDirection: 'row',
      paddingHorizontal: HORIZONTAL_PADDING,
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
