// Lives inside the (tabs) route group purely so app/(app)/notifications.tsx
// can import it as a plain component (the same reuse pattern (tabs)/orders.tsx
// uses for app/jobs/index.tsx) — it is deliberately NOT added to
// (tabs)/_layout.tsx's PAGES array, since notifications are reached via a
// stack push from the bell icon, not swiped between like the other tabs.
// ASSUMPTION (unverified — flagged in Handoff.md too): since (app) and
// (tabs) are both parenthesized route groups, this file and
// app/(app)/notifications.tsx both flatten to the URL "/notifications".
// That's untested against a live Metro/expo-router run in this sandbox. If
// expo-router complains about a duplicate route, move this file out of
// (tabs) (e.g. to src/screens/NotificationsScreen.tsx) and update the
// import in app/(app)/notifications.tsx accordingly.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  PackageCheck,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { Colors, designTokens } from '@/theme';
import Card from '@/components/Card';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllAsRead,
  markAsRead,
  Notification,
} from '@/api/notifications';

type Props = {
  showBackButton?: boolean;
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

// The backend's `type` field is free text (Notification.java's comment
// gives "ORDER_UPDATE" / "SYSTEM_ALERT" / "PROMO" as examples, not a closed
// enum) — anything else falls back to the default branch below.
function typeVisual(type: string, colors: Colors) {
  switch (type) {
    case 'ORDER_UPDATE':
      return { Icon: PackageCheck, color: colors.statusApproved.text, bg: colors.statusApproved.bg };
    case 'SYSTEM_ALERT':
      return { Icon: AlertCircle, color: colors.statusFailed.text, bg: colors.statusFailed.bg };
    case 'PROMO':
      return { Icon: Sparkles, color: colors.primary, bg: colors.primarySoft };
    default:
      return { Icon: Bell, color: colors.mutedFg, bg: colors.secondary };
  }
}

export default function NotificationsScreen({ showBackButton }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { token, appUser, authLoading } = useSession();
  const s = makeStyles(colors);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([
        fetchNotifications(token),
        appUser ? fetchUnreadCount(token, appUser.user_id) : Promise.resolve(0),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [token, appUser]);

  useEffect(() => {
    // Same rationale as JobsContext: wait for SessionContext to finish
    // restoring/validating a stored token before deciding there's "no
    // token", otherwise this fires once with token=null on every app start.
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const handleMarkAsRead = useCallback(
    async (item: Notification) => {
      if (!token || item.read || pendingId) return;
      setPendingId(item.id);
      setActionError(null);
      try {
        await markAsRead(token, item.id);
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to mark as read');
      } finally {
        setPendingId(null);
      }
    },
    [token, pendingId]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!token || markingAll) return;
    setMarkingAll(true);
    setActionError(null);
    try {
      await markAllAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  }, [token, markingAll]);

  const emptyMessage = useMemo(() => {
    if (loading) return 'Loading notifications…';
    if (error) return error;
    return 'No notifications yet';
  }, [loading, error]);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        {showBackButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [s.iconButton, pressed && s.pressed]}
          >
            <ArrowLeft size={21} color={colors.foreground} strokeWidth={2} />
          </Pressable>
        ) : null}
        <View style={s.headerCopy}>
          <Text style={s.eyebrow}>UPDATES</Text>
          <Text style={s.headerTitle}>Notifications</Text>
        </View>
        <View style={s.headerMark}>
          <Bell size={20} color={colors.primary} />
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          notifications.length > 0 ? (
            <View>
              <View style={s.summaryRow}>
                <Text style={s.summaryText}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </Text>
                {unreadCount > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleMarkAllAsRead}
                    disabled={markingAll}
                    style={({ pressed }) => [s.markAllButton, pressed && s.pressed]}
                  >
                    <Text style={s.markAllText}>
                      {markingAll ? 'Marking…' : 'Mark all as read'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {actionError ? <Text style={s.actionErrorText}>{actionError}</Text> : null}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const visual = typeVisual(item.type, colors);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.read ? item.title : `Mark "${item.title}" as read`}
              disabled={item.read || pendingId === item.id}
              onPress={() => handleMarkAsRead(item)}
              style={({ pressed }) => [pressed && !item.read && s.pressed]}
            >
              <Card style={[s.notificationCard, !item.read && s.notificationCardUnread]}>
                <View style={[s.typeIcon, { backgroundColor: visual.bg }]}>
                  <visual.Icon size={19} color={visual.color} />
                </View>
                <View style={s.notificationBody}>
                  <View style={s.notificationTitleRow}>
                    <Text style={s.notificationTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.read ? <View style={s.unreadDot} /> : null}
                  </View>
                  <Text style={s.notificationMessage}>{item.message}</Text>
                  <Text style={s.notificationTime}>
                    {formatRelativeTime(item.createdAt)}
                    {pendingId === item.id ? ' · Marking as read…' : ''}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Card style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Bell size={26} color={colors.primary} />
            </View>
            <Text style={s.emptyTitle}>{emptyMessage}</Text>
            {!loading && !error ? (
              <Text style={s.emptyBody}>
                Lab updates, payment confirmations, and printer alerts will show up here.
              </Text>
            ) : null}
            {error ? (
              <Pressable
                accessibilityRole="button"
                onPress={load}
                style={({ pressed }) => [s.retryButton, pressed && s.pressed]}
              >
                <Text style={s.retryText}>Try again</Text>
              </Pressable>
            ) : null}
          </Card>
        }
      />
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      minHeight: 70,
      paddingHorizontal: designTokens.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.sidebar,
      borderBottomWidth: 1,
      borderBottomColor: colors.sidebarBorder,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: designTokens.spacing.md,
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.98 }],
    },
    headerCopy: {
      flex: 1,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 9,
      letterSpacing: 1.3,
    },
    headerTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 19,
      marginTop: 2,
    },
    headerMark: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.lg,
      paddingBottom: designTokens.spacing.section,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: designTokens.spacing.sm,
      marginBottom: designTokens.spacing.md,
    },
    summaryText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 12,
    },
    markAllButton: {
      minHeight: 30,
      borderRadius: designTokens.radius.pill,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    markAllText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 11,
    },
    actionErrorText: {
      color: colors.destructive,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginBottom: designTokens.spacing.md,
    },
    notificationCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: designTokens.spacing.md,
      marginBottom: designTokens.spacing.md,
    },
    notificationCardUnread: {
      borderColor: colors.primary,
    },
    typeIcon: {
      width: 40,
      height: 40,
      borderRadius: designTokens.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationBody: {
      flex: 1,
      minWidth: 0,
    },
    notificationTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    notificationTitle: {
      flex: 1,
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    notificationMessage: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    notificationTime: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 10,
      marginTop: 6,
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyTitle: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 17,
      textAlign: 'center',
    },
    emptyBody: {
      maxWidth: 260,
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 5,
    },
    retryButton: {
      marginTop: designTokens.spacing.lg,
      minHeight: 40,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: designTokens.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
  });
}
