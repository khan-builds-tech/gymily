import { type ReactNode } from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';

// Full-bleed gym photo with the moody top→bottom fade used on the auth screens.
const AUTH_BG = require('../../assets/images/auth-bg.png');

// ImageBackground and LinearGradient are not NativeWind-aware components, so
// className (e.g. flex-1) is ignored on them. Use explicit styles for layout —
// otherwise the gradient collapses to zero height and hides all children.
export function CinematicBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <ImageBackground source={AUTH_BG} resizeMode="cover" style={styles.fill}>
        <LinearGradient
          // from-background/40 via-background/80 to-background
          colors={['rgba(11,19,38,0.4)', 'rgba(11,19,38,0.85)', 'rgba(11,19,38,1)']}
          locations={[0, 0.55, 1]}
          style={styles.fill}
        >
          {children}
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
});
