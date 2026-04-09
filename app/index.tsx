import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { ShoppingCart } from 'lucide-react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { session, store, loading } = useAuth();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, {
      damping: 10,
      stiffness: 100,
    });
    opacity.value = withSequence(
      withSpring(1, { duration: 1000 }),
      withSpring(1, { duration: 1500 })
    );
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (session && store) {
          router.replace('/(tabs)' as any);
        } else {
          router.replace('/auth/login' as any);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [loading, session, store]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        <View style={styles.iconCircle}>
          <ShoppingCart size={64} color={Colors.white} strokeWidth={2} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textContainer, animatedTextStyle]}>
        <Text style={styles.title}>POS System</Text>
        <Text style={styles.subtitle}>Professional Point of Sale</Text>
      </Animated.View>

      <View style={styles.footer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.poweredBy}>Powered by YourBrand</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.white,
    opacity: 0.9,
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.xxl,
    alignItems: 'center',
  },
  poweredBy: {
    fontSize: FontSize.sm,
    color: Colors.white,
    opacity: 0.8,
    marginTop: Spacing.sm,
  },
});
