import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Colors, designTokens } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Card({ children, style }: Props) {
  const { colors, isDark } = useTheme();
  const s = makeStyles(colors, isDark);

  return <View style={[s.card, style]}>{children}</View>;
}

function makeStyles(colors: Colors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: designTokens.spacing.lg,
      // Brand guide: shadow-based elevation in light mode, border-only
      // definition in dark mode (a shadow barely reads against a dark
      // background anyway).
      ...(isDark
        ? { elevation: 0 }
        : {
            shadowColor: colors.navy,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }),
    },
  });
}
