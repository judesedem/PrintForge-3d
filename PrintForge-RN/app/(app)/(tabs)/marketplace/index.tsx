import { View, Text, StyleSheet, TextInput, ScrollView, FlatList, Pressable } from 'react-native';
import { useState } from 'react';
import { Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { Colors } from '@/theme';
import { LISTINGS } from '@/data/mockData';
import ListingCard from '@/components/ListingCard';

const materials = ['ALL', 'PLA', 'RESIN', 'ABS'];

export default function MarketplaceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [material, setMaterial] = useState('ALL');
  const s = makeStyles(colors);

  const filtered = LISTINGS.filter(l =>
    (material === 'ALL' || l.material === material) &&
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Marketplace</Text>
        <Text style={s.subtitle}>{LISTINGS.length} designs available</Text>
      </View>
      <View style={s.searchRow}>
        <Search size={18} color={colors.mutedFg} />
        <TextInput style={s.searchInput} placeholder="Search designs..." placeholderTextColor={colors.mutedFg} value={search} onChangeText={setSearch} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersRow} contentContainerStyle={s.filtersContent}>
        {materials.map(m => (
          <Pressable key={m} onPress={() => setMaterial(m)} style={[s.chip, material === m && s.chipActive]}>
            <Text style={[s.chipText, material === m && s.chipTextActive]}>{m}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={s.grid}
        columnWrapperStyle={s.row}
        renderItem={({ item }) => (
          <Pressable style={s.cardWrap} onPress={() => router.push(`/(app)/marketplace/${item.id}`)}>
            <ListingCard listing={item} />
          </Pressable>
        )}
      />
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingBottom: 12 },
    title: { color: colors.foreground, fontSize: 26, fontWeight: '700' },
    subtitle: { color: colors.mutedFg, marginTop: 4 },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginHorizontal: 16, paddingHorizontal: 12, gap: 8, marginBottom: 12 },
    searchInput: { flex: 1, color: colors.foreground, height: 44 },
    filtersRow: { marginBottom: 12 },
    filtersContent: { paddingHorizontal: 16, gap: 8 },
    chipActive: { backgroundColor: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.5)' },
    chip: { paddingHorizontal: 14, height: 28, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    chipText: { color: colors.mutedFg, fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, lineHeight: 14 },
    chipTextActive: { color: colors.primary },
    grid: { paddingHorizontal: 12, paddingBottom: 32 },
    row: { gap: 12, marginBottom: 12 },
    cardWrap: { flex: 1 },
  });
}
