import { Image, ImageProps, View, StyleSheet } from 'react-native';
import { useState } from 'react';

export default function ImageWithFallback(props: ImageProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <View style={[styles.fallback, props.style]} />;
  }

  return <Image {...props} onError={() => setErrored(true)} style={props.style} />;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#1E293B',
  },
});
