import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import ImageWithFallback from './ImageWithFallback';
import { useTheme } from '../ThemeContext';
import { MarketplaceListing } from '../api/marketplace';
import { Colors, designTokens } from '../theme';

// Rebuilt against MarketplaceListing (the real DesignListing shape) instead
// of mockData's Listing — that mock shape had material/rating/designer
// fields with no backend equivalent, so this card now shows totalOrders in
// place of the old "downloads"/rating display, and drops the material
// badge and designer name entirely rather than fake them.
export default function ListingCard({ listing, onPress }: { listing: MarketplaceListing; onPress?: () => void }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.pressed]}>
      <View style={s.imageWrap}>
        <ImageWithFallback source={{ uri: listing.thumbnailUrl }} style={s.image} resizeMode="cover" />
        <View style={s.openBadge}>
          <ArrowUpRight size={15} color={colors.foreground} />
        </View>
      </View>

      <View style={s.content}>
        <Text style={s.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={s.meta} numberOfLines={1}>
          {listing.totalOrders} {listing.totalOrders === 1 ? 'order' : 'orders'}
        </Text>
        <View style={s.bottomRow}>
          <Text style={s.price}>GH₵ {listing.price.toFixed(2)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
      marginBottom: designTokens.spacing.lg,
      flex: 1,
      marginHorizontal: 6,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
    imageWrap: { position: 'relative' },
    image: { width: '100%', height: 148 },
    openBadge: {
      position: 'absolute',
      right: 12,
      top: 12,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { padding: 13 },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 15,
      lineHeight: 20,
      minHeight: 40,
    },
    meta: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginTop: 4,
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 13,
    },
    price: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 14 },
  });
}
