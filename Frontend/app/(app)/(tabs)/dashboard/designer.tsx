import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, ActionSheetIOS, Platform, AlertButton } from 'react-native';
import {
  Bell,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CloudUpload,
  Crown,
  Eye,
  EyeOff,
  MoreHorizontal,
  PackageCheck,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { Colors, designTokens, makeControlStyles } from '@/theme';
import { fetchMyListings, publishListing, unpublishListing, deleteListing, MarketplaceListing } from '@/api/marketplace';
import { fetchDesignRequests, DesignRequest } from '@/api/design-requests';
import ImageWithFallback from '@/components/ImageWithFallback';
import GhsAmount from '@/components/GhsAmount';
import SectionHeader from '@/components/SectionHeader';
import { useSwipeTabs } from '@/SwipeTabsContext';
import { useSession } from '@/SessionContext';

export default function DesignerDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const { goToTab } = useSwipeTabs();
  const { firebaseUser, token } = useSession();
  const s = makeStyles(colors);
  const controls = makeControlStyles(colors);

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [listingsData, requestsData] = await Promise.all([
        fetchMyListings(token),
        fetchDesignRequests(token),
      ]);
      setListings(listingsData);
      setRequests(requestsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleTogglePublish = async (listing: MarketplaceListing) => {
    if (!token || publishingId) return;
    setPublishingId(listing.id);
    try {
      const updated = listing.status === 'DRAFT'
        ? await publishListing(token, listing.id)
        : await unpublishListing(token, listing.id);
      setListings(prev => prev.map(l => l.id === listing.id ? updated : l));
    } catch (err) {
      console.error('Publish/unpublish failed:', err);
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeleteListing = (listing: MarketplaceListing) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${listing.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await deleteListing(token, listing.id);
              setListings(prev => prev.filter(l => l.id !== listing.id));
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete listing');
            }
          },
        },
      ]
    );
  };

  const handleCardPress = (listing: MarketplaceListing) => {
    const isDraft = listing.status === 'DRAFT';
    const canDelete = isDraft && listing.totalOrders === 0;

    if (Platform.OS === 'ios') {
      const options = ['Cancel', isDraft ? 'Publish' : 'Unpublish'];
      let destructiveIndex = -1;
      
      if (canDelete) {
        options.push('Delete');
        destructiveIndex = 2;
      }

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: destructiveIndex !== -1 ? destructiveIndex : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTogglePublish(listing);
          } else if (buttonIndex === 2 && canDelete) {
            handleDeleteListing(listing);
          }
        }
      );
    } else {
      // Fallback for Android
      const buttons: AlertButton[] = [
        {
          text: isDraft ? 'Publish' : 'Unpublish',
          onPress: () => handleTogglePublish(listing),
        },
        { text: 'Cancel', style: 'cancel' as const },
      ];

      if (canDelete) {
        buttons.splice(1, 0, {
          text: 'Delete',
          style: 'destructive' as const,
          onPress: () => handleDeleteListing(listing),
        });
      }

      Alert.alert('Manage Listing', `What would you like to do with "${listing.title}"?`, buttons);
    }
  };

  const designerName = firebaseUser?.displayName || 'Designer';
  const designerEmail = firebaseUser?.email || 'designer@printforge.edu';

  // Derive stats from live data — shows 0 when no transactions exist
  const totalEarnings = listings.reduce((sum, l) => sum + l.totalEarnings, 0);
  const totalOrders = listings.reduce((sum, l) => sum + l.totalOrders, 0);
  const publishedCount = listings.filter(l => l.status === 'PUBLISHED').length;

  if (loading) {
    return (
      <View style={[s.screen, s.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Loading your dashboard…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.screen, s.centered]}>
        <Text style={s.loadingText}>{error}</Text>
        <Pressable onPress={load} style={({ pressed }) => [s.retryButton, pressed && s.pressed]}>
          <Text style={s.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <View style={s.headerCopy}>
            <Text style={s.eyebrow}>DESIGNER WORKSPACE</Text>
            <Text style={s.title}>My Dashboard</Text>
          </View>

          <View style={s.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              onPress={() => router.push('/notifications')}
              style={({ pressed }) => [s.iconButton, pressed && s.pressed]}
            >
              <Bell size={20} color={colors.foreground} />
              <View style={s.notificationDot} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => goToTab('profile')}
              style={({ pressed }) => [s.avatar, pressed && s.pressed]}
            >
              <Text style={s.avatarText}>{designerName.charAt(0).toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Boxes size={27} color={colors.onPrimary} strokeWidth={2.2} />
          </View>
          <View style={s.profileCopy}>
            <View style={s.profileTitleRow}>
              <Text style={s.profileName} numberOfLines={1}>{designerName}</Text>
              <View style={s.verifiedBadge}>
                <Crown size={12} color={colors.primary} />
                <Text style={s.verifiedText}>Verified</Text>
              </View>
            </View>
            <Text style={s.profileRole}>3D designer · {designerEmail}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open designer profile"
            onPress={() => goToTab('profile')}
            style={({ pressed }) => [s.profileArrow, pressed && s.pressed]}
          >
            <ChevronRight size={18} color={colors.mutedFg} />
          </Pressable>
        </View>

        <Text style={s.sectionEyebrow}>THIS MONTH</Text>
        <View style={s.statsContainer}>
          <View style={[s.statCard, s.statCardWide]}>
            <View style={s.statHeaderRow}>
               <View style={[s.statIcon, { backgroundColor: colors.statusCompleted.bg }]}>
                 <CircleDollarSign size={20} color={colors.statusCompleted.dot} />
               </View>
            </View>
            <View style={s.statBody}>
              <Text style={s.statLabel}>Total Earnings</Text>
              <GhsAmount amount={totalEarnings} style={s.statAmountWide} />
            </View>
          </View>

          <View style={s.statsSubRow}>
            <View style={[s.statCard, s.statCardSquare]}>
              <View style={[s.statIcon, { backgroundColor: colors.primarySoft }]}>
                <Boxes size={20} color={colors.primary} />
              </View>
              <View style={s.statBodySquare}>
                <Text style={s.statValue}>{listings.length}</Text>
                <Text style={s.statLabel}>Active Listings</Text>
              </View>
              <View style={s.statFooter}>
                <PackageCheck size={12} color={colors.success} />
                <Text style={s.statFooterText}>{publishedCount} published</Text>
              </View>
            </View>

            <View style={[s.statCard, s.statCardSquare]}>
              <View style={[s.statIcon, { backgroundColor: colors.statusApproved.bg }]}>
                <ClipboardList size={20} color={colors.statusApproved.dot} />
              </View>
              <View style={s.statBodySquare}>
                <Text style={s.statValue}>{totalOrders}</Text>
                <Text style={s.statLabel}>Total Orders</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.sectionHeaderWrap}>
          <SectionHeader label="My listings" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload a new design"
            onPress={() => router.push('/marketplace/create')}
            style={({ pressed }) => [s.createButton, pressed && controls.primaryButtonPressed]}
          >
            <CloudUpload size={16} color={colors.onPrimary} />
            <Text style={s.createButtonText}>Create listing</Text>
          </Pressable>
        </View>

        {listings.length === 0 ? (
          <View style={s.emptyListings}>
            <Boxes size={40} color={colors.mutedFg} />
            <Text style={s.emptyTitle}>No listings yet</Text>
            <Text style={s.emptySubtitle}>
              Upload your first 3D design to start selling on the marketplace.
            </Text>
            <Pressable
              onPress={() => router.push('/marketplace/create')}
              style={({ pressed }) => [s.createButton, pressed && controls.primaryButtonPressed, { marginTop: 12 }]}
            >
              <CloudUpload size={16} color={colors.onPrimary} />
              <Text style={s.createButtonText}>Create your first listing</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.listingsGrid}>
            {listings.map(listing => (
              <Pressable
                key={listing.id}
                onPress={() => handleCardPress(listing)}
                style={({ pressed }) => [s.listingCard, pressed && s.pressed]}
              >
                <View style={s.listingImageWrap}>
                  {listing.thumbnailUrl ? (
                    <ImageWithFallback source={{ uri: listing.thumbnailUrl }} style={s.listingImage} resizeMode="cover" />
                  ) : (
                    <View style={[s.listingImage, s.listingImageFallback]}>
                      <Boxes size={30} color={colors.mutedFg} />
                    </View>
                  )}
                  <View
                    style={[
                      s.statusBadge,
                      listing.status === 'PUBLISHED' ? s.publishedBadge : s.draftBadge,
                    ]}
                  >
                    <View
                      style={[
                        s.statusDot,
                        {
                          backgroundColor:
                            listing.status === 'PUBLISHED' ? colors.success : colors.warning,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        s.statusText,
                        {
                          color:
                            listing.status === 'PUBLISHED'
                              ? colors.statusCompleted.text
                              : colors.statusSubmitted.text,
                        },
                      ]}
                    >
                      {listing.status}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={listing.status === 'DRAFT' ? `Publish ${listing.title}` : `Unpublish ${listing.title}`}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleTogglePublish(listing);
                    }}
                    style={({ pressed }) => [s.publishButton, pressed && s.pressed]}
                  >
                    {publishingId === listing.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : listing.status === 'DRAFT' ? (
                      <Eye size={17} color={colors.success} />
                    ) : (
                      <EyeOff size={17} color={colors.warning} />
                    )}
                  </Pressable>

                  {listing.status === 'DRAFT' && listing.totalOrders === 0 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${listing.title}`}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteListing(listing);
                      }}
                      style={({ pressed }) => [s.deleteButton, pressed && s.pressed]}
                    >
                      <Trash2 size={16} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>

                <View style={s.listingContent}>
                  <Text style={s.listingTitle} numberOfLines={2}>{listing.title}</Text>
                  <View style={s.priceRow}>
                    <GhsAmount amount={listing.price} size="sm" />
                    <Text style={s.perOrder}>per order</Text>
                  </View>

                  <View style={s.listingDivider} />

                  <View style={s.listingMetrics}>
                    <View style={s.listingMetric}>
                      <ClipboardList size={14} color={colors.mutedFg} />
                      <Text style={s.metricText}>{listing.totalOrders} orders</Text>
                    </View>
                    <View style={s.listingMetric}>
                      <CircleDollarSign size={14} color={colors.mutedFg} />
                      <Text style={s.metricText}>GH₵ {listing.totalEarnings.toFixed(0)}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={s.sectionHeaderWrap}>
          <SectionHeader label="Open design requests" />
          <Pressable
            accessibilityRole="button"
            onPress={() => goToTab('marketplace')}
            style={({ pressed }) => [s.createButton, pressed && controls.primaryButtonPressed, { backgroundColor: colors.secondary }]}
          >
            <Text style={[s.createButtonText, { color: colors.foreground }]}>View all</Text>
          </Pressable>
        </View>

        <View style={s.requestsList}>
          {requests.length === 0 ? (
            <Text style={s.requestsEmpty}>No open requests right now.</Text>
          ) : (
            requests.slice(0, 3).map(req => (
              <View key={req.id} style={s.requestCard}>
                <Text style={s.requestTitle}>{req.title}</Text>
                <Text style={s.requestDesc} numberOfLines={2}>{req.description}</Text>
                <View style={s.requestFooter}>
                  <Text style={s.requestBudget}>GH₵ {req.budget?.toFixed(2) || '0.00'}</Text>
                  <Text style={s.requestUser}>By {req.userName}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {listings.length > 0 && totalEarnings > 0 ? (
          <View style={s.earningsCard}>
            <View style={s.earningsHeader}>
              <View>
                <Text style={s.earningsEyebrow}>EARNINGS OVERVIEW</Text>
                <Text style={s.earningsTitle}>Your designs are gaining traction</Text>
              </View>
              <View style={s.sparkleBadge}>
                <Sparkles size={19} color={colors.primary} />
              </View>
            </View>

            {listings.filter(l => l.totalEarnings > 0).slice(0, 3).map((listing, index) => {
              const maximum = Math.max(...listings.map(item => item.totalEarnings), 1);
              const progress = `${Math.max(8, (listing.totalEarnings / maximum) * 100)}%` as `${number}%`;

              return (
                <View key={listing.id} style={[s.earningRow, index > 0 && s.earningRowBorder]}>
                  <View style={s.earningCopy}>
                    <Text style={s.earningTitle} numberOfLines={1}>{listing.title}</Text>
                    <Text style={s.earningOrders}>{listing.totalOrders} marketplace orders</Text>
                  </View>
                  <GhsAmount amount={listing.totalEarnings} size="sm" />
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: progress }]} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    centered: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    loadingText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      marginTop: 12,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 12,
      minHeight: 42,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: designTokens.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 13 },
    content: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.lg,
      paddingBottom: 42,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: designTokens.spacing.lg,
    },
    headerCopy: { flex: 1 },
    eyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 10,
      letterSpacing: 1.15,
      marginBottom: 3,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 27,
      letterSpacing: -0.65,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notificationDot: {
      position: 'absolute',
      top: 7,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.card,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.navy,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.white, fontFamily: designTokens.type.heading, fontSize: 15 },
    pressed: { opacity: 0.66 },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: designTokens.spacing.md,
      shadowColor: colors.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    profileAvatar: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileCopy: { flex: 1, minWidth: 0 },
    profileTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    profileName: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
      flexShrink: 1,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.primarySoft,
    },
    verifiedText: { color: colors.primary, fontFamily: designTokens.type.heading, fontSize: 9 },
    profileRole: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 4,
    },
    profileArrow: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    sectionEyebrow: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
      letterSpacing: 0.75,
      marginBottom: 10,
    },
    statsContainer: {
      gap: 12,
      marginBottom: designTokens.spacing.xxl,
    },
    statsSubRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    statCardWide: {
      flexDirection: 'column',
    },
    statCardSquare: {
      flex: 1,
      minHeight: 130,
      justifyContent: 'space-between',
    },
    statHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statBody: {
      gap: 4,
    },
    statLabel: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 12,
    },
    statAmountWide: {
      fontSize: 28,
      fontFamily: designTokens.type.display,
      letterSpacing: -0.5,
    },
    statBodySquare: {
      marginTop: 12,
      marginBottom: 8,
    },
    statValue: {
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 24,
      letterSpacing: -0.5,
      marginBottom: 2,
    },
    statFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 'auto',
    },
    statFooterText: {
      color: colors.success,
      fontFamily: designTokens.type.medium,
      fontSize: 10,
    },
    sectionHeaderWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 11,
    },
    createButton: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 11,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    createButtonText: { color: colors.onPrimary, fontFamily: designTokens.type.heading, fontSize: 11 },
    emptyListings: {
      alignItems: 'center',
      padding: 32,
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: designTokens.spacing.lg,
      gap: 8,
    },
    emptyTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
      marginTop: 8,
    },
    emptySubtitle: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      textAlign: 'center',
      maxWidth: 260,
    },
    listingsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -5,
      marginBottom: designTokens.spacing.lg,
    },
    listingCard: {
      width: '50%',
      paddingHorizontal: 5,
      marginBottom: 10,
    },
    listingCardPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
    listingImageWrap: {
      height: 132,
      borderTopLeftRadius: designTokens.radius.lg,
      borderTopRightRadius: designTokens.radius.lg,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    listingImage: { width: '100%', height: '100%' },
    listingImageFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    statusBadge: {
      position: 'absolute',
      left: 9,
      top: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: designTokens.radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    publishedBadge: { backgroundColor: colors.statusCompleted.bg },
    draftBadge: { backgroundColor: colors.statusSubmitted.bg },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: designTokens.type.heading, fontSize: 8, letterSpacing: 0.35 },
    publishButton: {
      position: 'absolute',
      right: 9,
      top: 9,
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.93)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButton: {
      position: 'absolute',
      right: 45, // 9 + 30 + 6
      top: 9,
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.93)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    listingContent: {
      padding: 12,
      minHeight: 130,
      borderBottomLeftRadius: designTokens.radius.lg,
      borderBottomRightRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: colors.border,
    },
    listingTitle: {
      minHeight: 39,
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
      lineHeight: 19,
    },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 7 },
    perOrder: { color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 9 },
    listingDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
    listingMetrics: { gap: 6 },
    listingMetric: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metricText: { color: colors.mutedFg, fontFamily: designTokens.type.medium, fontSize: 10 },
    earningsCard: {
      padding: 16,
      borderRadius: designTokens.radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.035,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    earningsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 6,
    },
    earningsEyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 0.85,
      marginBottom: 4,
    },
    earningsTitle: { color: colors.foreground, fontFamily: designTokens.type.heading, fontSize: 16 },
    sparkleBadge: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    earningRow: { paddingVertical: 13, position: 'relative' },
    earningRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    earningCopy: { paddingRight: 95 },
    earningTitle: { color: colors.foreground, fontFamily: designTokens.type.medium, fontSize: 12 },
    earningOrders: { color: colors.mutedFg, fontFamily: designTokens.type.body, fontSize: 10, marginTop: 2 },
    progressTrack: {
      height: 5,
      borderRadius: designTokens.radius.pill,
      backgroundColor: colors.secondary,
      overflow: 'hidden',
      marginTop: 9,
    },
    progressFill: { height: 5, borderRadius: designTokens.radius.pill, backgroundColor: colors.primary },
    requestsList: {
      gap: 12,
      marginBottom: designTokens.spacing.lg,
    },
    requestCard: {
      padding: 14,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    requestTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
      marginBottom: 4,
    },
    requestDesc: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      marginBottom: 10,
    },
    requestFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    requestBudget: {
      color: colors.success,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    requestUser: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 11,
    },
    requestsEmpty: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      fontStyle: 'italic',
      paddingVertical: 10,
    },
  });
}
