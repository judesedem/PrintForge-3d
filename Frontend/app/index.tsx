import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Box } from 'lucide-react-native';
import { useSession } from '../src/SessionContext';
import { useTheme } from '../src/ThemeContext';
import { Colors, designTokens } from '../src/theme';

// ASSUMPTIONS (flagged in Handoff.md):
// 1. assets/icon.png and assets/splash.png are placeholder text files, not
//    real images (confirmed by reading their bytes) — used the existing
//    "logo mark" pattern from login.tsx/the old onboarding screen (a Box
//    icon in a rounded navy square) instead of an <Image>.
// 2. The brief says this screen "already has auth-redirect logic — keep
//    that, just restyle." It didn't — app/index.tsx was a static "Get
//    started" onboarding screen with no session check at all (the only
//    real redirect-by-role logic in the app lives in
//    app/(app)/(tabs)/dashboard/index.tsx, which runs post-login). Since
//    the splash's own design (loading dots, "Please wait...") only makes
//    sense for a transient auto-redirecting screen, added the missing
//    redirect here: wait for authLoading, then send signed-in users to the
//    app and everyone else to login. This replaces the previous
//    onboarding/marketing content (hero illustration, feature cards, "Get
//    started" CTA) entirely, per "rebuild this screen to match the brand
//    guide's splash."
// 3. "REALITY" is specified as Warm Orange text — on this screen's solid
//    Warm Orange background that would be literally invisible (zero
//    contrast). Kept the exact letter color (#FF5803) but added a small
//    dark navy text-shadow purely for legibility. Same issue applies to
//    the single "orange" accent dot — given a thin off-white ring so it
//    reads against the identical-color background.
export default function SplashScreen() {
  const { colors } = useTheme();
  const { token, authLoading } = useSession();
  const s = makeStyles(colors);

  // Decide the destination exactly once, the first time the initial
  // stored-token check resolves. expo-router's <Redirect> re-fires its
  // router.replace() on every focus event (it's built on useFocusEffect,
  // not a plain mount-only effect) — if this screen recomputed `href` from
  // `token`/`authLoading` on every render, any later auth-state change from
  // elsewhere in the app (e.g. login()/register() toggling authLoading)
  // could make this long-lived root screen re-dispatch a stray navigation
  // of its own, racing whatever explicit router.replace() the active
  // screen already issued and surfacing as an "Unmatched Route" flash.
  const [destination, setDestination] = useState<string | null>(null);
  useEffect(() => {
    if (!authLoading && destination === null) {
      // '/(app)/(tabs)/dashboard' (a concrete leaf), not '/(app)/(tabs)':
      // the bare group href has an empty concrete pathname and can resolve
      // to Unmatched Route — see register.tsx's handleCreateAccount comment.
      setDestination(token ? '/(app)/(tabs)/dashboard' : '/(auth)/login');
    }
  }, [authLoading, token, destination]);

  if (destination) {
    return <Redirect href={destination} />;
  }

  return (
    <View style={s.screen}>
      <View style={s.logoMark}>
        <Box size={40} color={colors.primary} strokeWidth={2.2} />
      </View>

      <View style={s.textStack}>
        <Text style={s.bringing}>Bringing</Text>
        <Text style={s.ideas}>IDEAS</Text>
        <Text style={s.into}>into</Text>
        <Text style={s.reality}>REALITY</Text>
      </View>

      <View style={s.dotsRow}>
        <View style={s.dotSmall} />
        <View style={s.dotSmall} />
        <View style={s.dotAccent} />
        <View style={s.dotSmall} />
        <View style={s.dotSmall} />
      </View>
      <Text style={s.waitText}>Please wait...</Text>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: designTokens.spacing.xl,
    },
    logoMark: {
      width: 92,
      height: 92,
      borderRadius: 26,
      backgroundColor: colors.navy,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: designTokens.spacing.section,
    },
    textStack: {
      alignItems: 'center',
      marginBottom: designTokens.spacing.section,
    },
    bringing: {
      color: colors.offWhite,
      fontFamily: designTokens.type.heading,
      fontSize: 32,
      lineHeight: 36,
    },
    ideas: {
      color: colors.offWhite,
      fontFamily: 'Roboto_700Bold_Italic',
      fontSize: 46,
      lineHeight: 50,
      letterSpacing: 1,
      textShadowColor: 'rgba(255, 88, 3, 0.8)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 12,
    },
    into: {
      color: colors.offWhite,
      fontFamily: designTokens.type.body,
      fontSize: 20,
      lineHeight: 24,
      marginTop: 2,
    },
    reality: {
      color: colors.primary,
      fontFamily: designTokens.type.heading,
      fontSize: 34,
      lineHeight: 38,
      letterSpacing: 1,
      // Legibility fix — see file-level comment #3. Letter color is still
      // exactly the specified #FF5803.
      textShadowColor: 'rgba(22, 24, 43, 0.55)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: designTokens.spacing.md,
    },
    dotSmall: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(229, 229, 229, 0.45)',
    },
    dotAccent: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.offWhite,
    },
    waitText: {
      color: colors.offWhite,
      fontFamily: designTokens.type.body,
      fontSize: 12,
      opacity: 0.85,
    },
  });
}
