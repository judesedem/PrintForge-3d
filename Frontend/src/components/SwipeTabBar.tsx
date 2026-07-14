import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Boxes,
  ClipboardList,
  CloudUpload,
  House,
  UserRound,
} from 'lucide-react-native';
import { useTheme } from '../ThemeContext';
import { Colors, designTokens } from '../theme';

const TABS = [
  { label: 'Home', accessibilityLabel: 'Home dashboard', Icon: House },
  { label: 'Browse', accessibilityLabel: 'Browse marketplace', Icon: Boxes },
  { label: 'Upload', accessibilityLabel: 'Upload a model', Icon: CloudUpload },
  { label: 'Orders', accessibilityLabel: 'View print orders', Icon: ClipboardList },
  { label: 'Profile', accessibilityLabel: 'Open profile', Icon: UserRound },
] as const;

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
              <View style={[s.iconWrap, active && s.iconWrapActive]}>
                <Icon size={21} color={color} strokeWidth={active ? 2.35 : 2} />
              </View>
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
    shell: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: designTokens.spacing.sm,
      paddingTop: 7,
      paddingBottom: Math.max(7, bottomInset),
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -5 },
      elevation: 12,
    },
    bar: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tab: {
      minWidth: 0,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingHorizontal: 2,
      paddingVertical: 2,
      borderRadius: designTokens.radius.md,
    },
    tabPressed: {
      opacity: 0.72,
      transform: [{ scale: 0.98 }],
    },
    iconWrap: {
      width: 38,
      height: 30,
      borderRadius: designTokens.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapActive: {
      backgroundColor: colors.primarySoft,
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
