import { Text, StyleSheet } from 'react-native';

const sizeMap = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
};

export default function GhsAmount({ amount, size = 'md' }: { amount: number; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return <Text style={[styles.text, { fontSize: sizeMap[size] }]}>{`GH₵ ${amount.toFixed(2)}`}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: '#E8EDF5',
    fontWeight: '700',
  },
});
