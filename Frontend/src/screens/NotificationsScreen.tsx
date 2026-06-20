import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { apiGetNotifications, apiMarkNotificationRead, apiMarkAllNotificationsRead } from '../services/api';
import { Notification } from '../types';
import { EmptyState } from '../components/UI';

interface NotificationsScreenProps {
  onBack: () => void;
  onNotifPress?: (notif: Notification) => void;
}

const TYPE_CONFIG = {
  info:    { icon: 'ℹ️', color: Colors.info,    bg: Colors.infoBg },
  success: { icon: '✅', color: Colors.success, bg: Colors.successBg },
  warning: { icon: '⚠️', color: Colors.warning, bg: Colors.warningBg },
  error:   { icon: '❌', color: Colors.error,   bg: Colors.errorBg },
};

function formatRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsScreen({ onBack, onNotifPress }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) setRefreshing(true);
      const data = await apiGetNotifications();
      setNotifications(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    // Optimistic update
    setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    try {
      await apiMarkAllNotificationsRead();
    } catch (e: any) {
      // Revert on failure
      loadNotifications();
    }
  };

  const handleNotifPress = async (item: Notification) => {
    if (!item.is_read) {
      // Optimistic update
      setNotifications(n => n.map(x => x.notification_id === item.notification_id ? { ...x, is_read: true } : x));
      try {
        await apiMarkNotificationRead(item.notification_id);
      } catch (e: any) {
        // Revert on failure
        setNotifications(n => n.map(x => x.notification_id === item.notification_id ? { ...x, is_read: false } : x));
      }
    }
    onNotifPress?.(item);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderItem = ({ item }: { item: Notification }) => {
    const cfg = TYPE_CONFIG[item.type];
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
        onPress={() => handleNotifPress(item)}
        activeOpacity={0.8}
      >
        {!item.is_read && <View style={styles.unreadDot} />}
        <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 22 }}>{cfg.icon}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[Typography.bodyMedium, { color: Colors.textPrimary, lineHeight: 20 }]}>
            {item.message}
          </Text>
          <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 6 }]}>
            {formatRelative(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <SafeAreaView style={{ flex: 1 }}>

        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
            <Text style={{ color: Colors.accent, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={[Typography.displaySmall, { color: Colors.textPrimary, flex: 1, marginLeft: 8 }]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={[Typography.labelMedium, { color: Colors.accent }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {unreadCount > 0 && (
          <View style={styles.unreadBanner}>
            <Text style={[Typography.caption, { color: Colors.accent }]}>
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 12 }]}>
              Loading notifications…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 40 }}>⚠️</Text>
            <Text style={[Typography.bodyMedium, { color: Colors.error, marginTop: 12, textAlign: 'center' }]}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadNotifications()}>
              <Text style={[Typography.labelLarge, { color: Colors.accent }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={n => n.notification_id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => loadNotifications(true)}
            ListEmptyComponent={
              <EmptyState icon="🔔" title="All clear" subtitle="No notifications yet. We'll let you know when your job status changes." />
            }
            renderItem={renderItem}
          />
        )}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  unreadBanner: {
    backgroundColor: Colors.accentGlow, padding: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.accent + '33',
  },
  list: { padding: Spacing.lg, gap: Spacing.sm + 2, paddingBottom: Spacing.xxl },
  notifCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'flex-start',
    position: 'relative',
  },
  notifCardUnread: { borderColor: Colors.accent + '44', backgroundColor: Colors.surfaceElevated },
  unreadDot: {
    position: 'absolute', top: 14, right: 14,
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  retryBtn: {
    marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.accent,
    borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
});
