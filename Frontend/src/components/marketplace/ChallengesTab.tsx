import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { Colors, designTokens } from '@/theme';
import { fetchChallenges, Challenge } from '@/api/challenges';
import { Clock, Trophy } from 'lucide-react-native';

export default function ChallengesTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token, authLoading, role } = useSession();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const s = makeStyles(colors);

  const canCreate = role === 'admin' || role === 'lab_staff';

  const load = useCallback(async () => {
    if (!token) {
      setChallenges([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChallenges(token);
      setChallenges(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setChallenges([]);
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, token, load]);

  const renderItem = (item: Challenge) => (
    <View key={item.id} style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>{item.title}</Text>
        <View style={[s.badge, item.status === 'ACTIVE' ? s.badgeActive : s.badgeClosed]}>
          <Text style={s.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={s.cardDesc} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={s.cardFooter}>
        <Text style={s.cardUser}>Posted by: {item.postedByName}</Text>
        {item.prize && (
          <View style={s.prizeRow}>
            <Trophy size={14} color="#F59E0B" />
            <Text style={s.cardPrize}>GH₵ {item.prize.toFixed(2)}</Text>
          </View>
        )}
      </View>
      {item.deadline && (
        <View style={s.deadlineRow}>
          <Clock size={12} color={colors.mutedFg} />
          <Text style={s.deadlineText}>Deadline: {new Date(item.deadline).toLocaleDateString()}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={s.screen}>
      {canCreate && (
        <View style={s.topArea}>
          <Pressable
            style={({ pressed }) => [s.createBtn, pressed && s.pressed]}
            onPress={() => router.push('/(app)/challenges/create')}
          >
            <Text style={s.createBtnText}>+ Create New Challenge</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={s.centered}>
          <Text style={s.stateText}>Loading challenges…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.stateText}>{error}</Text>
          <Pressable onPress={load} style={({ pressed }) => [s.retryButton, pressed && s.pressed]}>
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {challenges.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No active challenges</Text>
              <Text style={s.emptyBody}>Check back later for new innovation challenges.</Text>
            </View>
          ) : (
            challenges.map(renderItem)
          )}
        </ScrollView>
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
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    createBtn: {
      backgroundColor: '#3B82F6', // Blue for staff actions
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    createBtnText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 80,
      gap: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: '#3B82F6',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    cardTitle: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 16,
      marginRight: 12,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 99,
    },
    badgeActive: {
      backgroundColor: '#3B82F620',
    },
    badgeClosed: {
      backgroundColor: colors.cardElevated,
    },
    badgeText: {
      fontFamily: designTokens.type.heading,
      fontSize: 10,
      color: colors.foreground,
    },
    cardDesc: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 13,
      marginBottom: 12,
      lineHeight: 18,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    cardUser: {
      color: colors.foreground,
      fontFamily: designTokens.type.body,
      fontSize: 12,
    },
    prizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardPrize: {
      color: '#F59E0B',
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    deadlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    deadlineText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
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
      borderColor: '#3B82F6',
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: {
      color: '#3B82F6',
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    pressed: {
      opacity: 0.7,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 64,
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
    },
  });
}
