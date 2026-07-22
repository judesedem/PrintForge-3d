import { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { Colors, designTokens } from '@/theme';

import DesignsTab from '@/components/marketplace/DesignsTab';
import RequestsTab from '@/components/marketplace/RequestsTab';
import ChallengesTab from '@/components/marketplace/ChallengesTab';

const TABS = ['Designs', 'Requests', 'Challenges'] as const;
type TabOption = (typeof TABS)[number];

export default function MarketplaceScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabOption>('Designs');
  const s = makeStyles(colors);

  return (
    <View style={s.screen}>
      <Text style={s.header}>Marketplace</Text>

      <View style={s.tabSwitcherContainer}>
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.tabButton, isActive && s.tabButtonActive]}
            >
              <Text style={[s.tabText, isActive && s.tabTextActive]}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.tabContent}>
        {activeTab === 'Designs' && <DesignsTab />}
        {activeTab === 'Requests' && <RequestsTab />}
        {activeTab === 'Challenges' && <ChallengesTab />}
      </View>
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
      color: colors.foreground,
      fontFamily: designTokens.type.display,
      fontSize: 26,
      fontWeight: '700',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    tabSwitcherContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 4,
      marginBottom: 16,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
    },
    tabButtonActive: {
      backgroundColor: colors.background, // or white in light mode
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 2,
    },
    tabText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.heading,
      fontSize: 13,
    },
    tabTextActive: {
      color: colors.foreground,
    },
    tabContent: {
      flex: 1,
    },
  });
}