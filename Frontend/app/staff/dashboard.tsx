import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { Menu } from 'lucide-react-native';
import AdminPanel from '../admin/index';

const openDrawer = (nav: any) => nav.dispatch({ type: 'OPEN_DRAWER' });

export default function StaffDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1 }}>
      <AdminPanel />
      {/* Floating Hamburger Menu Button so users can open the drawer from the dashboard */}
      <TouchableOpacity 
        style={[styles.hamburger, { top: insets.top + 16 }]} 
        onPress={() => openDrawer(navigation)}
      >
        <Menu color="#fff" size={24} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hamburger: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 24, 43, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  }
});
