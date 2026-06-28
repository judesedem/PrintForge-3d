import { View } from 'react-native';
import { useTheme } from '../ThemeContext';

export default function Card({ children, style }: { children: React.ReactNode; style?: object | object[] }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 }, style]}>
      {children}
    </View>
  );
}
