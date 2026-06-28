import { View, Text, Pressable, StyleSheet } from 'react-native';
import ImageWithFallback from './ImageWithFallback';
import MonoText from './MonoText';
import { colors } from '../theme';
import { Listing } from '../data/mockData';

export default function ListingCard({ listing, onPress }: { listing: Listing; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <ImageWithFallback source={{ uri: listing.image }} style={styles.image} resizeMode="cover" />
      <View style={styles.badgeRow}>
        <View style={styles.materialBadge}>
          <MonoText style={styles.materialText}>{listing.material}</MonoText>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
      <Text style={styles.designer}>{listing.designer}</Text>
      <View style={styles.bottomRow}>
        <Text style={styles.price}>GH₵ {listing.price}</Text>
        <Text style={styles.rating}>{listing.rating} ★</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 16,
    flex: 1,
    marginHorizontal: 6,
  },
  image: {
    width: '100%',
    height: 140,
  },
  badgeRow: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  materialBadge: {
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  materialText: {
    fontSize: 11,
    color: '#fff',
  },
  title: {
    color: colors.foreground,
    fontWeight: '700',
    fontSize: 15,
    marginTop: 12,
    marginHorizontal: 12,
  },
  designer: {
    color: '#94A3B8',
    marginTop: 4,
    marginHorizontal: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  price: {
    color: colors.foreground,
    fontWeight: '700',
  },
  rating: {
    color: '#FBBF24',
    fontWeight: '700',
  },
});
