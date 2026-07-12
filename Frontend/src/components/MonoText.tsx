import { Text, StyleProp, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../ThemeContext';
import { designTokens } from '../theme';

export default function MonoText({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Text style={[styles.text, { color: colors.foreground }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: designTokens.type.mono,
  },
});
