import { useEffect, useRef } from 'react';
import { ScrollView, View, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

export type SwipePage = {
  key: string;
  render: () => React.ReactNode;
};

type Props = {
  pages: SwipePage[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  scrollEnabled?: boolean;
};

/**
 * Horizontally swipeable, paginated screen container, built on ScrollView.
 *
 * Several of the pages we host (Marketplace, Notifications, Designer
 * Dashboard) render their own FlatLists. Nesting a FlatList inside another
 * FlatList is unsafe in React Native (clipping / virtualization conflicts),
 * so the outer pager uses a plain ScrollView with paging enabled instead.
 * The user can swipe left/right to move between screens, or a tab bar can
 * jump directly to a page by changing `activeIndex` -- both stay in sync.
 */
export default function SwipePager({ pages, activeIndex, onIndexChange, scrollEnabled = true }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  // Tracks whether the current scroll was triggered programmatically (tab tap)
  // vs by the user's finger, so we don't re-report the index we just set.
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    isProgrammaticScroll.current = true;
    scrollRef.current?.scrollTo({ x: activeIndex * width, animated: true });
  }, [activeIndex, width]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== activeIndex) onIndexChange(index);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled"
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      scrollEventThrottle={16}
      scrollEnabled={scrollEnabled}
    >
      {pages.map(page => (
        <View key={page.key} style={{ width }}>
          {page.render()}
        </View>
      ))}
    </ScrollView>
  );
}
