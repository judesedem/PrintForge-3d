import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Heart, Package, TrendingUp, X } from 'lucide-react-native';
import { useTheme } from '../ThemeContext';
import { Colors, designTokens } from '../theme';

/**
 * Slide-up notifications panel for the Home feed's bell icon (Bolt Pass 1).
 * Content is mock-only for now — the real notifications route
 * (app/(app)/(tabs)/notifications.tsx) is untouched and its data can be
 * wired into this panel in a later pass.
 */

type Props = {
  visible: boolean;
  onClose: () => void;
};

const NOTIFICATIONS = [
  {
    id: 'n1',
    icon: Package,
    accent: 'primary',
    text: 'Your Planetary Gear Set order is ready for pickup! 🎉',
    time: '2 min ago',
  },
  {
    id: 'n2',
    icon: Heart,
    accent: 'navy',
    text: 'Marcus Chen liked your Drone Mount design',
    time: '1 hr ago',
  },
  {
    id: 'n3',
    icon: CheckCircle2,
    accent: 'primary',
    text: 'Your payment of GH₵ 45.00 was confirmed',
    time: '3 hrs ago',
  },
  {
    id: 'n4',
    icon: TrendingUp,
    accent: 'navy',
    text: 'New design trending in Mechanical Parts',
    time: 'Yesterday',
  },
] as const;

export default function NotificationsPanel({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        {/* Tapping the dimmed area above the panel dismisses it. */}
        <Pressable
          style={s.overlayTouch}
          accessibilityLabel="Close notifications"
          onPress={onClose}
        />
        <View style={s.panel}>
          <View style={s.header}>
            <Text style={s.title}>Notifications</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close notifications"
              onPress={onClose}
              style={({ pressed }) => [s.closeButton, pressed && s.pressed]}
            >
              <X size={20} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {NOTIFICATIONS.map(({ id, icon: Icon, accent, text, time }) => {
              const accentColor = accent === 'primary' ? colors.primary : colors.navy;
              return (
                <View key={id} style={[s.item, { borderLeftColor: accentColor }]}>
                  <View style={s.itemIcon}>
                    <Icon
                      size={18}
                      color={accent === 'primary' ? colors.primary : colors.foreground}
                    />
                  </View>
                  <View style={s.itemCopy}>
                    <Text style={s.itemText}>{text}</Text>
                    <Text style={s.itemTime}>{time}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    overlayTouch: {
      flex: 1,
    },
    // colors.card = #FFFFFF (light) / #152544 (dark) — the panel surfaces
    // the redesign specifies for each theme.
    panel: {
      maxHeight: '72%',
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: designTokens.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: designTokens.spacing.lg,
      paddingVertical: designTokens.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      color: colors.foreground,
      fontFamily: designTokens.type.heading,
      fontSize: 19,
      letterSpacing: -0.2,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.7,
    },
    list: {
      padding: designTokens.spacing.lg,
      gap: designTokens.spacing.md,
      paddingBottom: designTokens.spacing.section,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: designTokens.spacing.md,
      borderLeftWidth: 4,
      borderRadius: designTokens.radius.md,
      backgroundColor: colors.cardElevated,
      paddingVertical: designTokens.spacing.md,
      paddingHorizontal: designTokens.spacing.md,
    },
    itemIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemCopy: {
      flex: 1,
    },
    itemText: {
      color: colors.foreground,
      fontFamily: designTokens.type.medium,
      fontSize: 13,
      lineHeight: 18,
    },
    itemTime: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 11,
      marginTop: 4,
    },
  });
}
