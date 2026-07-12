import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useTheme } from '../ThemeContext';
import { Colors, designTokens } from '../theme';

type Props = { label: string; actionLabel?: string; onAction?: () => void };

export default function SectionHeader({ label, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} style={({ pressed }) => [s.actionWrap, pressed && s.pressed]}>
          <Text style={s.action}>{actionLabel}</Text>
          <ArrowRight size={15} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.md,
      marginTop: designTokens.spacing.sm,
    },
    label: {
      color: colors.foreground,
      fontSize: 18,
      fontFamily: designTokens.type.heading,
      letterSpacing: -0.2,
    },
    actionWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 36,
      paddingHorizontal: 4,
    },
    action: {
      color: colors.primary,
      fontSize: 13,
      fontFamily: designTokens.type.heading,
    },
    pressed: { opacity: 0.68 },
  });
}
