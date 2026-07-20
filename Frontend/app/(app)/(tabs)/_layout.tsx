import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { useSession } from '@/SessionContext';
import { SwipeTabsContext, TAB_KEYS, TabKey } from '@/SwipeTabsContext';
import SwipePager from '@/components/SwipePager';
import SwipeTabBar from '@/components/SwipeTabBar';
import DashboardIndex from './dashboard/index';
import MarketplaceScreen from './marketplace/index';
import SubmitScreen from './submit';
import OrdersScreen from './orders';
import ProfileTabScreen from './profile';

// The ordering intentionally follows the marketplace-to-print backend flow.
const PAGES = [
  { key: 'dashboard', render: () => <DashboardIndex /> },
  { key: 'marketplace', render: () => <MarketplaceScreen /> },
  { key: 'submit', render: () => <SubmitScreen /> },
  { key: 'orders', render: () => <OrdersScreen /> },
  { key: 'profile', render: () => <ProfileTabScreen /> },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  const { token, authLoading } = useSession();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleIndexChange = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const goToTab = useCallback((key: TabKey) => {
    const index = TAB_KEYS.indexOf(key);
    if (index !== -1) setActiveIndex(index);
  }, []);

  const contextValue = useMemo(() => ({ activeIndex, goToTab }), [activeIndex, goToTab]);

  // register.tsx/login.tsx replace() straight to this route the moment
  // auth succeeds, but SwipePager mounts all 5 tabs at once (not lazily —
  // see its own file comment), and each one fires an authenticated fetch
  // on mount. Holding the tabs off-screen until the token is confirmed
  // present closes the window where those fetches could go out with no/
  // stale Authorization header, 401, and race client.ts's session-expiry
  // redirect back to login against this screen's own navigation.
  if (authLoading || !token) {
    return (
      <View style={[styles.screen, styles.loadingScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SwipeTabsContext.Provider value={contextValue}>
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}> 
        <View style={styles.pagerWrap}>
          <SwipePager pages={PAGES} activeIndex={activeIndex} onIndexChange={handleIndexChange} />
        </View>
        <SwipeTabBar activeIndex={activeIndex} onChange={handleIndexChange} />
      </View>
    </SwipeTabsContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingScreen: { alignItems: 'center', justifyContent: 'center' },
  pagerWrap: { flex: 1 },
});
