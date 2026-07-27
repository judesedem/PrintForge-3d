// components/DrawerContent.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard, ClipboardList, Columns3, LogOut, Zap,
} from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { T } from '@/constants/theme';
import { useSession } from '@/SessionContext';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  lab_staff: 'Lab Technician',
  designer: 'Designer',
  student: 'Student',
};

const MENU_ITEMS = [
  { route: '/staff/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { route: '/staff/queue',         label: 'Print Queue',   icon: ClipboardList },
  { route: '/staff/board',         label: 'Queue Board',   icon: Columns3 },
] as const;

export default function DrawerContent(_props: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { signOut, appUser, role } = useSession();

  const initials = appUser?.full_name
    ? appUser.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'ST';

  // This drawer is mounted by staff/_layout.tsx, but admins reach the same
  // screens — so label the actual role rather than assuming lab staff.
  const roleLabel = ROLE_LABELS[role] ?? 'Lab Technician';

  return (
    <View style={[s.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      {/* Logo */}
      <View style={s.logoRow}>
        <View style={s.logoBox}>
          <Zap size={14} color="#fff" strokeWidth={2.5} />
        </View>
        <Text style={s.logoText}>PrintForge</Text>
      </View>

      {/* User info */}
      <View style={s.userRow}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={s.userInfo}>
          <Text style={s.userName} numberOfLines={1}>{appUser?.full_name ?? 'Lab Staff'}</Text>
          <Text style={s.userRole}>{roleLabel}</Text>
        </View>
      </View>

      <View style={s.divider} />

      {/* Menu items */}
      <ScrollView keyboardShouldPersistTaps="handled" style={s.menuScroll} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map(item => {
          const active = pathname === item.route;
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.route}
              style={[s.menuItem, active && s.menuItemActive]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Icon size={16} color={active ? T.primary : T.mutedForeground} />
              <Text style={[s.menuLabel, active && s.menuLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.divider} />

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={() => {
        Alert.alert(
          'Sign Out',
          'Are you sure you want to sign out?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign Out',
              style: 'destructive',
              onPress: async () => {
                await signOut();
                router.replace('/(auth)/login');
              },
            },
          ]
        );
      }} activeOpacity={0.7}>
        <LogOut size={16} color="#f87171" />
        <Text style={s.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.sidebar,
    paddingHorizontal: 14,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  logoBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: T.fontBold,
    fontSize: 16,
    color: T.foreground,
    letterSpacing: -0.3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: T.fontBold,
    fontSize: 13,
    color: '#fff',
  },
  userInfo: { flex: 1 },
  userName: {
    fontFamily: T.fontMedium,
    fontSize: 13,
    color: T.foreground,
  },
  userRole: {
    fontFamily: T.fontRegular,
    fontSize: 11,
    color: T.mutedForeground,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 8,
  },
  menuScroll: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: 'rgba(249,115,22,0.10)',
  },
  menuLabel: {
    fontFamily: T.fontRegular,
    fontSize: 13,
    color: T.mutedForeground,
  },
  menuLabelActive: {
    color: T.primary,
    fontFamily: T.fontMedium,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  logoutText: {
    fontFamily: T.fontMedium,
    fontSize: 13,
    color: '#f87171',
  },
});
