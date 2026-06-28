import { Text, StyleSheet } from 'react-native';

export default function MonoText({ children, style }: { children: React.ReactNode; style?: object | object[] }) {
  return <Text style={[styles.text, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#E8EDF5',
  },
});
