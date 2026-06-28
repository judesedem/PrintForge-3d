import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useState } from 'react';
import { Bell, CheckCircle2, AlertCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '@/ThemeContext';
import { Colors } from '@/theme';
import { NOTIFICATIONS } from '@/data/mockData';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState(NOTIFICATIONS);
  const s = makeStyles(colors);
  const unread = items.filter(n => !n.read).length;

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));

  const getIcon = (type: string) => {
    if (type === 'success') return <CheckCircle2 size={20} color="#34D399" />;
    if (type === 'error') return <XCircle size={20} color="#F87171" />;
    if (type === 'warning') return <AlertCircle size={20} color="#FBBF24" />;
    return <Bell size={20} color="#60A5FA" />;
  };

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Notifications</Text>
          <Text style={s.subtitle}>{unread} unread</Text>
        </View>
        <Pressable onPress={markAllRead}><Text style={s.markAll}>Mark all read</Text></Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={[s.card, !item.read && s.cardUnread]}>
            <View style={s.cardRow}>
              {getIcon(item.type)}
              <View style={s.cardBody}>
                <View style={s.cardTitleRow}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardTime}>{item.time}</Text>
                </View>
                <Text style={s.cardText}>{item.body}</Text>
              </View>
              {!item.read && <View style={s.dot} />}
            </View>
          </View>
        )}
      />
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 12 },
    title: { color: colors.foreground, fontSize: 26, fontWeight: '700' },
    subtitle: { color: colors.mutedFg, marginTop: 4 },
    markAll: { color: colors.primary, fontWeight: '600', marginTop: 8 },
    list: { padding: 16, paddingTop: 4, gap: 12 },
    card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
    cardUnread: { backgroundColor: colors.secondary, borderColor: 'rgba(249,115,22,0.2)' },
    cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    cardBody: { flex: 1 },
    cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    cardTitle: { color: colors.foreground, fontWeight: '700', flex: 1 },
    cardTime: { color: colors.mutedFg, fontSize: 12 },
    cardText: { color: colors.mutedFg, lineHeight: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
  });
}
