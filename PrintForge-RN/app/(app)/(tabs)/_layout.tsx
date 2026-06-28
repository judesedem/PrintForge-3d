import { Tabs } from 'expo-router';
import { LayoutDashboard, Plus, ShoppingBag, Bell } from 'lucide-react-native';
import { useTheme } from '../../../src/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.sidebar, borderTopColor: colors.sidebarBorder, height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedFg,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tabs.Screen name="submit" options={{ title: 'New Job', tabBarIcon: ({ color, size }) => <Plus size={size} color={color} /> }} />
      <Tabs.Screen name="marketplace" options={{ title: 'Marketplace', tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications', tabBarIcon: ({ color, size }) => <Bell size={size} color={color} /> }} />
      <Tabs.Screen name="dashboard/student" options={{ href: null }} />
      <Tabs.Screen name="dashboard/designer" options={{ href: null }} />
    </Tabs>
  );
}