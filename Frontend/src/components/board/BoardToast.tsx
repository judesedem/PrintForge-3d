// components/board/BoardToast.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { T } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BoardToastProps {
  visible: boolean;
  message: string;
  jobId:   string;
}

export function BoardToast({ visible, message, jobId }: BoardToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      style={[
        s.toast,
        { bottom: insets.bottom + 20, opacity },
      ]}
      pointerEvents="none"
    >
      <View style={s.iconWrap}>
        <Check size={12} color="#34d399" strokeWidth={2.5} />
      </View>
      <View>
        <Text style={s.message}>{message}</Text>
        {jobId ? <Text style={s.jobId}>{jobId}</Text> : null}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.20)',
    borderRadius: T.radius,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(52,211,153,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontFamily: T.fontMedium,
    fontSize: 13,
    color: T.foreground,
    fontWeight: '500',
  },
  jobId: {
    fontFamily: T.monoRegular,
    fontSize: 10,
    color: T.mutedForeground,
    marginTop: 1,
  },
});
