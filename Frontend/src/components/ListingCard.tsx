import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowUpRight, Star } from 'lucide-react-native';
import ImageWithFallback from './ImageWithFallback';
import { useTheme } from '../ThemeContext';
import { Listing } from '../data/mockData';
import { Colors, designTokens, getMaterialChipColors } from '../theme';

export default function ListingCard({ listing, onPress }: { listing: Listing; onPress?: () => void }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const material = getMaterialChipColors(colors, listing.material);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.pressed]}>
      <View style={s.imageWrap}>
        <ImageWithFallback source={{ uri: listing.image }} style={s.image} resizeMode="cover" />
        <View style={[s.materialBadge, { backgroundColor: material.backgroundColor }]}>
          <Text style={[s.materialText, { color: material.color }]}>{listing.material}</Text>
        </View>
        <View style={s.openBadge}>
          <ArrowUpRight size={15} color={colors.foreground} />
        </View>
      </View>

      <View style={s.content}>
        <Text style={s.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={s.designer} numberOfLines={1}>by {listing.designer}</Text>
        <View style={s.bottomRow}>
          <Text style={s.price}>GH₵ {listing.price.toFixed(2)}</Text>
          <View style={s.ratingRow}>
            <Star size={13} color="#D9A11A" fill="#D9A11A" />
            <Text style={s.rating}>{listing.rating}</Text>
          </View>
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
    materialBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    materialText: { fontFamily: designTokens.type.heading, fontSize: 10 },
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
    designer: {
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
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rating: { color: colors.foreground, fontFamily: designTokens.type.medium, fontSize: 12 },
  });
}
