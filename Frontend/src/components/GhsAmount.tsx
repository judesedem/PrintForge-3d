import { Text, StyleProp, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../ThemeContext';
import { designTokens } from '../theme';

const sizeMap = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 30,
};

export default function GhsAmount({ amount, size = 'md', style }: { amount: number; size?: 'sm' | 'md' | 'lg' | 'xl'; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.text, { fontSize: sizeMap[size], color: colors.foreground }, style]}>
      {`GH₵ ${amount.toFixed(2)}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: designTokens.type.heading,
    letterSpacing: -0.2,
  },
});
