import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ClipboardList,
  CloudUpload,
  House,
  Search,
  User,
} from 'lucide-react-native';
import { useTheme } from '../ThemeContext';
import { Colors, designTokens } from '../theme';

// Bolt redesign Pass 1: labels/icons are now Home / Discover / Upload /
// Orders / Profile, with Upload as an always-orange floating circle. The
// pager indices and TAB_KEYS in SwipeTabsContext are UNCHANGED
// ('dashboard' | 'marketplace' | 'submit' | 'orders' | 'profile') — those
// keys are functional API used by goToTab() callers (submit.tsx, dashboard
// screens), so only the visual layer was renamed.
const TABS = [
  { label: 'Home', accessibilityLabel: 'Home feed', Icon: House },
  { label: 'Discover', accessibilityLabel: 'Discover designs', Icon: Search },
  { label: 'Upload', accessibilityLabel: 'Upload a model', Icon: CloudUpload },
  { label: 'Orders', accessibilityLabel: 'View print orders', Icon: ClipboardList },
  { label: 'Profile', accessibilityLabel: 'Open profile', Icon: User },
] as const;

// Index of the visually-distinct floating Upload tab ('submit' page).
const CENTER_INDEX = 2;

type Props = {
  activeIndex: number;
  onChange: (index: number) => void;
};

export default function SwipeTabBar({ activeIndex, onChange }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(colors, insets.bottom);

  return (
    <View style={s.shell}>
      <View style={s.bar}>
        {TABS.map(({ label, accessibilityLabel, Icon }, index) => {
          const active = index === activeIndex;

          // The Upload tab never changes appearance with active state —
          // it's always the orange circle floating above the bar.
          if (index === CENTER_INDEX) {
            return (
              <Pressable
                key={label}
                accessibilityRole="tab"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ selected: active }}
                onPress={() => onChange(index)}
                style={({ pressed }) => [s.tab, pressed && s.tabPressed]}
              >
                <View style={s.uploadCircle}>
                  <Icon size={26} color="#FFFFFF" strokeWidth={2.2} />
                </View>
              </Pressable>
            );
          }

          const color = active ? colors.primary : colors.mutedFg;
          return (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityLabel={accessibilityLabel}
              accessibilityState={{ selected: active }}
              onPress={() => onChange(index)}
              style={({ pressed }) => [s.tab, pressed && s.tabPressed]}
            >
              <Icon size={22} color={color} strokeWidth={active ? 2.35 : 2} />
              <Text style={[s.label, active && s.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(colors: Colors, bottomInset: number) {
  return StyleSheet.create({
    // colors.sidebar = #0A182E (dark) / #FFFFFF (light) — exactly the
    // tab-bar surfaces the redesign calls for in each theme.
    shell: {
      backgroundColor: colors.sidebar,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: designTokens.spacing.sm,
      paddingTop: 6,
      paddingBottom: Math.max(6, bottomInset),
    },
    bar: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tab: {
      minWidth: 0,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: 2,
      paddingVertical: 2,
    },
    tabPressed: {
      opacity: 0.72,
      transform: [{ scale: 0.98 }],
    },
    uploadCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      // Floats above the bar — negative top margin lifts it over the
      // pager edge; sibling order + elevation keep it drawn on top.
      marginTop: -28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    label: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 10,
      lineHeight: 13,
    },
    labelActive: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
    },
  });
}
