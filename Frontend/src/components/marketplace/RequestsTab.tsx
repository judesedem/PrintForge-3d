import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { Colors, designTokens } from '@/theme';
import { fetchDesignRequests, DesignRequest } from '@/api/design-requests';
import { Clock } from 'lucide-react-native';

export default function RequestsTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token, authLoading } = useSession();
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const s = makeStyles(colors);

  const load = useCallback(async () => {
    if (!token) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDesignRequests(token);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setRequests([]);
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, token, load]);

  const renderItem = (item: DesignRequest) => (
    <View key={item.id} style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>{item.title}</Text>
        <View style={[s.badge, item.status === 'OPEN' ? s.badgeOpen : s.badgeClosed]}>
          <Text style={s.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={s.cardDesc} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={s.cardFooter}>
        <Text style={s.cardUser}>Requested by: {item.userName}</Text>
        {item.budget && (
          <Text style={s.cardBudget}>GH₵ {item.budget.toFixed(2)}</Text>
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
      <View style={s.topArea}>
        <Pressable
          style={({ pressed }) => [s.createBtn, pressed && s.pressed]}
          onPress={() => router.push('/(app)/design-requests/create')}
        >
          <Text style={s.createBtnText}>+ Create New Request</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.centered}>
          <Text style={s.stateText}>Loading requests…</Text>
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
          {requests.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No active requests</Text>
              <Text style={s.emptyBody}>Be the first to request a custom design.</Text>
            </View>
          ) : (
            requests.map(renderItem)
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
      backgroundColor: '#FF6A00',
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
    badgeOpen: {
      backgroundColor: '#10B98120', // tinted green
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
    cardBudget: {
      color: '#10B981',
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
      borderColor: '#FF6A00',
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
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
