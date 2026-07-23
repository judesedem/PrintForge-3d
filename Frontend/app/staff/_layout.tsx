import React from 'react';
import { Platform } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import DrawerContent from '@/components/DrawerContent';
import { T } from '@/constants/theme';

export default function StaffDrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: Platform.OS === 'ios' ? 'slide' : 'front',
        drawerStyle: { width: 220, backgroundColor: T.sidebar },
        overlayColor: 'rgba(0,0,0,0.5)',
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="dashboard" options={{ drawerLabel: 'Dashboard' }} />
      <Drawer.Screen name="board" options={{ drawerLabel: 'Queue Board' }} />
      <Drawer.Screen name="queue" options={{ drawerLabel: 'Print Queue' }} />
    </Drawer>
  );
}
