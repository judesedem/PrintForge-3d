import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Star } from 'lucide-react-native';
import ImageWithFallback from '../../../src/components/ImageWithFallback';
import MonoText from '../../../src/components/MonoText';
import { LISTINGS } from '../../../src/data/mockData';
import { colors } from '../../../src/theme';

export default function ListingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const listing = LISTINGS.find(item => item.id === String(id)) ?? LISTINGS[0];
  const [qty, setQty] = useState(1);
  const images = [listing.image, listing.image, listing.image];
  const [selectedImage, setSelectedImage] = useState(listing.image);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.primary} />
          <Text style={styles.backText}>Back to Marketplace</Text>
        </Pressable>
        <ImageWithFallback source={{ uri: selectedImage }} style={styles.heroImage} resizeMode="cover" />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={images}
          keyExtractor={(item, index) => `${item}-${index}`}
          contentContainerStyle={styles.thumbRow}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelectedImage(item)} style={[styles.thumbItem, selectedImage === item && { borderColor: colors.primary, borderWidth: 2 }]}>
              <ImageWithFallback source={{ uri: item }} style={styles.thumbImage} resizeMode="cover" />
            </Pressable>
          )}
        />
        <View style={styles.infoHeader}>
          <View style={styles.badgeRow}>
            <MonoText style={styles.materialBadge}>{listing.material}</MonoText>
          </View>
          <View style={styles.ratingRow}>
            <Star size={14} color="#FBBF24" />
            <Text style={styles.ratingText}>{listing.rating} • {listing.downloads} downloads</Text>
          </View>
        </View>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.designer}>by {listing.designer}</Text>
        <Text style={styles.description}>A polished 3D model designed for quick print setup and reliable finishing. Ideal for lifestyle and tech product prints.</Text>
        <View style={styles.gridRow}>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>Material</Text><MonoText>PLA</MonoText></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>Lead Time</Text><Text style={styles.infoValue}>2 days</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>File Format</Text><MonoText>STL</MonoText></View>
          <View style={styles.infoCard}><Text style={styles.infoLabel}>License</Text><Text style={styles.infoValue}>Commercial</Text></View>
        </View>
        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Quantity</Text>
          <View style={styles.stepperRow}>
            <Pressable style={styles.stepperButton} onPress={() => setQty(Math.max(1, qty - 1))}><Text style={styles.stepperText}>−</Text></Pressable>
            <MonoText style={styles.stepperValue}>{qty}</MonoText>
            <Pressable style={styles.stepperButton} onPress={() => setQty(qty + 1)}><Text style={styles.stepperText}>+</Text></Pressable>
          </View>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.unitLabel}>Unit price</Text>
          <Text style={styles.unitAmount}>GH₵ {listing.price.toFixed(2)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.unitLabel}>Total</Text>
          <Text style={styles.totalAmount}>GH₵ {(listing.price * qty).toFixed(2)}</Text>
        </View>
        <Pressable style={styles.payButton}>
          <Text style={styles.payText}>Pay with Paystack • GH₵ {(listing.price * qty).toFixed(2)}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  backText: {
    color: colors.primary,
    fontWeight: '700',
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 18,
    marginBottom: 12,
  },
  thumbRow: {
    gap: 12,
    marginBottom: 18,
  },
  thumbItem: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  thumbImage: {
    width: 90,
    height: 90,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  materialBadge: {
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    color: '#94A3B8',
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  designer: {
    color: colors.primary,
    marginBottom: 14,
  },
  description: {
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 18,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  infoCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 14,
  },
  infoLabel: {
    color: '#94A3B8',
    marginBottom: 6,
  },
  infoValue: {
    color: colors.foreground,
    fontWeight: '700',
  },
  quantityRow: {
    marginBottom: 18,
  },
  quantityLabel: {
    color: '#94A3B8',
    marginBottom: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperText: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '700',
  },
  stepperValue: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.foreground,
    fontSize: 18,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  unitLabel: {
    color: '#94A3B8',
  },
  unitAmount: {
    color: colors.foreground,
    fontWeight: '700',
  },
  totalAmount: {
    color: colors.primary,
    fontWeight: '700',
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  payText: {
    color: '#fff',
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
