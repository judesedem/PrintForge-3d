import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { MapPin, CircleDashed } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { Colors } from '@/theme';
import { JOBS } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import MonoText from '@/components/MonoText';
import Card from '@/components/Card';
import SectionHeader from '@/components/SectionHeader';

const stats = [
  { label: 'Active Jobs', value: '4', color: '#60A5FA', subtitle: 'In progress' },
  { label: 'Completed', value: '12', color: '#10B981', subtitle: 'This month' },
  { label: 'Total Spent', value: 'GH₵ 1,280', color: '#F97316', subtitle: 'On prints' },
  { label: 'Marketplace', value: '6', color: '#A78BFA', subtitle: 'New designs' },
];

const notifications = [
  { id: 'n1', title: 'Job approved', body: 'PF-2024-0047 is now queued for print.', unread: true },
  { id: 'n2', title: 'Payment received', body: 'Paystack payment successful.', unread: false },
  { id: 'n3', title: 'Printer update', body: 'FlashForge maintenance scheduled.', unread: false },
  { id: 'n4', title: 'Job ready', body: 'Your print is ready for pickup.', unread: true },
];

export default function StudentDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.greeting}>Good morning, Kwame</Text>
            <Text style={s.subtitle}>Friday, June 25</Text>
          </View>
          <Pressable style={s.profileButton} onPress={() => router.push('/profile')}>
            <Text style={s.profileInitial}>K</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.statsScroll} contentContainerStyle={s.statsRow}>
          {stats.map(item => (
            <View key={item.label} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: item.color + '22' }]}>
                <CircleDashed size={18} color={item.color} />
              </View>
              <Text style={s.statLabel}>{item.label}</Text>
              <Text style={s.statValue}>{item.value}</Text>
              <Text style={s.statSubtitle}>{item.subtitle}</Text>
            </View>
          ))}
        </ScrollView>

        <SectionHeader label="Active Print Jobs" actionLabel="View all" onAction={() => router.push('/jobs/index')} />
        {JOBS.slice(0, 3).map(job => (
          <Pressable key={job.id} onPress={() => router.push(`/jobs/${job.id}`)}>
            <Card style={s.jobCard}>
              <View style={s.jobTopRow}>
                <StatusBadge status={job.status} />
                <MonoText style={s.jobId}>{job.id}</MonoText>
              </View>
              <Text style={s.jobTitle}>{job.title}</Text>
              <View style={s.jobMetaRow}>
                <MonoText style={s.metaMono}>{job.material} • {job.quality}</MonoText>
                <View style={s.metaGroup}>
                  <MapPin size={12} color={colors.mutedFg} />
                  <Text style={s.metaText}>{job.location}</Text>
                </View>
              </View>
              <View style={s.jobBottomRow}>
                <Text style={s.costText}>GH₵ {job.cost.toFixed(2)}</Text>
                <Text style={s.qtyText}>{job.qty} pcs</Text>
              </View>
            </Card>
          </Pressable>
        ))}

        <SectionHeader label="Notifications" actionLabel="All" onAction={() => router.push('/(app)/notifications')} />
        {notifications.map(note => (
          <View key={note.id} style={[s.notificationItem, note.unread && { borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
            <View style={s.notificationDot} />
            <View style={s.notificationText}>
              <Text style={s.notificationTitle}>{note.title}</Text>
              <Text style={s.notificationBody}>{note.body}</Text>
            </View>
          </View>
        ))}

        <SectionHeader label="Payment History" />
        {JOBS.slice(0, 3).map(job => (
          <View key={job.id} style={s.paymentRow}>
            <View>
              <MonoText style={s.jobId}>{job.id}</MonoText>
              <Text style={s.paymentTitle}>{job.title}</Text>
            </View>
            <View style={s.paymentRight}>
              <Text style={s.paymentAmount}>GH₵ {job.cost.toFixed(2)}</Text>
              <StatusBadge status={job.status} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting: { color: colors.foreground, fontSize: 24, fontWeight: '700' },
    subtitle: { color: colors.mutedFg, marginTop: 4 },
    profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    profileInitial: { color: '#fff', fontWeight: '700', fontSize: 18 },
    statsScroll: { marginBottom: 24 },
    statsRow: { gap: 14 },
    statCard: { width: 220, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, backgroundColor: colors.secondary, marginRight: 12 },
    statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statLabel: { color: colors.mutedFg, fontSize: 12, marginBottom: 6 },
    statValue: { color: colors.foreground, fontSize: 22, fontWeight: '700', marginBottom: 6 },
    statSubtitle: { color: colors.mutedFg, fontSize: 13 },
    jobCard: { marginBottom: 14 },
    jobTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    jobId: { color: colors.foreground, fontSize: 12 },
    jobTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: 10 },
    jobMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
    metaMono: { color: colors.mutedFg },
    metaGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: colors.mutedFg },
    jobBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    costText: { color: colors.foreground, fontWeight: '700' },
    qtyText: { color: colors.mutedFg },
    notificationItem: { backgroundColor: colors.secondary, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, marginBottom: 12, borderColor: 'transparent' },
    notificationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
    notificationText: { flex: 1 },
    notificationTitle: { color: colors.foreground, fontWeight: '700', marginBottom: 4 },
    notificationBody: { color: colors.mutedFg },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    paymentTitle: { color: colors.mutedFg },
    paymentRight: { alignItems: 'flex-end' },
    paymentAmount: { color: colors.foreground, fontWeight: '700', marginBottom: 6 },
  });
}
