import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useState } from 'react';
import {
  Box,
  Boxes,
  ChevronRight,
  CircuitBoard,
  MapPin,
  Plane,
  Printer,
  Search,
  Shapes,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { Colors, designTokens, makeControlStyles } from '@/theme';
import { LISTINGS, PRINTERS } from '@/data/mockData';
import ListingCard from '@/components/ListingCard';
import PrinterDot from '@/components/PrinterDot';
import SectionHeader from '@/components/SectionHeader';

const materials = ['ALL', 'PLA', 'RESIN', 'ABS'] as const;

const categories = [
  { label: 'Mechanical\nParts', icon: CircuitBoard },
  { label: 'Drone\nComponents', icon: Plane },
  { label: 'Enclosures\n& Cases', icon: Box },
  { label: 'Toys &\nHobbies', icon: Shapes },
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [material, setMaterial] = useState<(typeof materials)[number]>('ALL');
  const s = makeStyles(colors);
  const controls = makeControlStyles(colors);

  const filtered = LISTINGS.filter(listing =>
    (material === 'ALL' || listing.material === material) &&
    listing.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  const topLabs = PRINTERS.slice(0, 3);

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.eyebrow}>PRINTFORGE MARKETPLACE</Text>
            <Text style={s.title}>Browse 3D models</Text>
            <Text style={s.subtitle}>Order student-made designs from verified campus labs.</Text>
          </View>
          <View style={s.headerIcon}>
            <Boxes size={23} color={colors.primary} />
          </View>
        </View>

        <View style={s.searchRow}>
          <Search size={19} color={colors.mutedFg} />
          <TextInput
            style={s.searchInput}
            placeholder="Search models, parts or designers..."
            placeholderTextColor={colors.mutedFg}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter marketplace"
            style={({ pressed }) => [s.filterButton, pressed && s.pressed]}
          >
            <SlidersHorizontal size={17} color={colors.primary} />
          </Pressable>
        </View>

        <View style={s.sectionHeaderWrap}>
          <SectionHeader label="Featured models" actionLabel="See all" />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.featuredRow}
        >
          {LISTINGS.slice(0, 4).map(listing => (
            <View key={listing.id} style={s.featuredCardWrap}>
              <ListingCard
                listing={listing}
                onPress={() => router.push(`/(app)/marketplace/${listing.id}`)}
              />
            </View>
          ))}
        </ScrollView>

        <View style={s.sectionHeaderWrap}>
          <SectionHeader label="Categories" actionLabel="See all" />
        </View>
        <View style={s.categoryRow}>
          {categories.map(({ label, icon: Icon }) => (
            <Pressable
              key={label}
              style={({ pressed }) => [s.categoryCard, pressed && s.categoryPressed]}
            >
              <View style={s.categoryIcon}>
                <Icon size={21} color={colors.primary} strokeWidth={1.9} />
              </View>
              <Text style={s.categoryText}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.sectionHeaderWrap}>
          <SectionHeader label="Top campus labs" actionLabel="View printers" />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.labsRow}
        >
          {topLabs.map(printer => (
            <View key={printer.id} style={s.labCard}>
              <View style={s.labTopRow}>
                <View style={s.labIcon}>
                  <Printer size={20} color={colors.primary} />
                </View>
                <View style={s.labStatus}>
                  <PrinterDot status={printer.status} />
                  <Text style={s.labStatusText}>{printer.status}</Text>
                </View>
              </View>
              <Text style={s.labName}>{printer.location}</Text>
              <Text style={s.printerName}>{printer.name}</Text>
              <View style={s.labMetaRow}>
                <MapPin size={13} color={colors.mutedFg} />
                <Text style={s.labMeta}>University engineering facility</Text>
              </View>
              <View style={s.materialLine}>
                <Text style={s.materialLabel}>PLA</Text>
                <Text style={s.materialDot}>•</Text>
                <Text style={s.materialLabel}>PETG</Text>
                <Text style={s.materialDot}>•</Text>
                <Text style={s.materialLabel}>TPU</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={s.designHeader}>
          <View>
            <Text style={s.designTitle}>All designs</Text>
            <Text style={s.designCount}>{filtered.length} models available</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.materialFilters}
          >
            {materials.map(item => (
              <Pressable
                key={item}
                onPress={() => setMaterial(item)}
                style={({ pressed }) => [
                  controls.chip,
                  s.materialChip,
                  material === item && controls.chipSelected,
                  pressed && s.pressed,
                ]}
              >
                <Text
                  style={[
                    controls.chipText,
                    material === item && controls.chipTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {filtered.length > 0 ? (
          <View style={s.grid}>
            {filtered.map(listing => (
              <View key={listing.id} style={s.gridItem}>
                <ListingCard
                  listing={listing}
                  onPress={() => router.push(`/(app)/marketplace/${listing.id}`)}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Search size={26} color={colors.primary} />
            </View>
            <Text style={s.emptyTitle}>No matching designs</Text>
            <Text style={s.emptyBody}>Try another model name or material filter.</Text>
            <Pressable
              onPress={() => {
                setSearch('');
                setMaterial('ALL');
              }}
              style={({ pressed }) => [s.resetButton, pressed && s.pressed]}
            >
              <Text style={s.resetText}>Clear filters</Text>
              <ChevronRight size={15} color={colors.primary} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingTop: designTokens.spacing.lg, paddingBottom: 44 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      paddingHorizontal: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.lg,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
      letterSpacing: 1,
      marginBottom: 5,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 27,
      letterSpacing: -0.6,
    },
    subtitle: {
      maxWidth: 275,
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 5,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 5,
    },
    searchRow: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.lg,
      paddingLeft: 14,
      paddingRight: 8,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      shadowColor: colors.shadow,
      shadowOpacity: 0.035,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1,
    },
    searchInput: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 14,
    },
    filterButton: {
      width: 35,
      height: 35,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.65 },
    sectionHeaderWrap: { paddingHorizontal: designTokens.spacing.lg },
    featuredRow: {
      paddingHorizontal: 10,
      paddingBottom: 4,
    },
    featuredCardWrap: { width: 198 },
    categoryRow: {
      flexDirection: 'row',
      paddingHorizontal: designTokens.spacing.lg,
      gap: 8,
      marginBottom: designTokens.spacing.xl,
    },
    categoryCard: {
      flex: 1,
      minHeight: 106,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 8,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryPressed: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
      transform: [{ translateY: -1 }],
    },
    categoryIcon: {
      width: 39,
      height: 39,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 9,
    },
    categoryText: {
      color: colors.foreground,
      fontFamily: designTokens.type.medium,
      fontSize: 10,
      lineHeight: 13,
      textAlign: 'center',
    },
    labsRow: {
      paddingHorizontal: designTokens.spacing.lg,
      gap: 11,
      paddingBottom: 4,
      marginBottom: designTokens.spacing.xl,
    },
    labCard: {
      width: 238,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
      shadowColor: colors.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    labTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 13,
    },
    labIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    labStatus: { flexDirection: 'row', alignItems: 'center' },
    labStatusText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
    },
    labName: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
    },
    printerName: {
      color: colors.primary,
      fontFamily: designTokens.type.medium,
      fontSize: 11,
      marginTop: 3,
    },
    labMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 },
    labMeta: { color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 10 },
    materialLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    materialLabel: { color: colors.foreground, fontFamily: designTokens.type.heading, fontSize: 9 },
    materialDot: { color: colors.primary, fontSize: 8 },
    designHeader: {
      paddingHorizontal: designTokens.spacing.lg,
      marginBottom: designTokens.spacing.md,
    },
    designTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 18,
    },
    designCount: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 3,
      marginBottom: 11,
    },
    materialFilters: { gap: 7 },
    materialChip: { minHeight: 33, paddingVertical: 6, paddingHorizontal: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
    gridItem: { width: '50%' },
    emptyState: {
      marginHorizontal: designTokens.spacing.lg,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      padding: designTokens.spacing.xxl,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 17,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
      marginTop: 12,
    },
    emptyBody: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 4,
    },
    resetButton: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 13 },
    resetText: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 12 },
  });
}
