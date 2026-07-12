import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Colors, designTokens } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Card({ children, style }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return <View style={[s.card, style]}>{children}</View>;
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: designTokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: designTokens.spacing.lg,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 2,
    },
  });
}
