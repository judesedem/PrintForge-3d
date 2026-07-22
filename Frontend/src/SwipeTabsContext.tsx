import { createContext, useContext } from 'react';

/**
 * The five primary product areas mirror the backend workflow:
 * discover a listing, upload/configure a model, place and track orders,
 * then manage the authenticated account.
 *
 * Existing screen-facing API is unchanged: consumers still receive
 * `activeIndex` and call `goToTab(key)`.
 */
export const TAB_KEYS = ['dashboard', 'marketplace', 'submit', 'orders', 'profile'] as const;
export type TabKey = typeof TAB_KEYS[number];

type SwipeTabsContextType = {
  activeIndex: number;
  goToTab: (key: TabKey) => void;
  setSwipeEnabled: (enabled: boolean) => void;
};

export const SwipeTabsContext = createContext<SwipeTabsContextType>({
  activeIndex: 0,
  goToTab: () => {},
  setSwipeEnabled: () => {},
});

/**
 * Lets any screen nested inside the swipeable tab pager jump to a sibling
 * tab without going through stack navigation.
 */
export function useSwipeTabs() {
  return useContext(SwipeTabsContext);
}
