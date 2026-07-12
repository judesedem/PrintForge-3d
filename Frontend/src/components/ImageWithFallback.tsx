import { Image, ImageProps, View, StyleSheet } from 'react-native';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react-native';
import { useTheme } from '../ThemeContext';

export default function ImageWithFallback(props: ImageProps) {
  const [errored, setErrored] = useState(false);
  const { colors } = useTheme();

  if (errored) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.secondary }, props.style]}>
        <ImageIcon size={28} color={colors.mutedFg} strokeWidth={1.7} />
      </View>
    );
  }

  return <Image {...props} onError={() => setErrored(true)} style={props.style} />;
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
