import React, { ReactNode } from 'react';
import { Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { motion } from '../theme';

/**
 * Motion helpers shared by both spaces: a press-scale wrapper with haptics and
 * staggered entrance wrappers for lists. Keeping them here means every screen
 * gets the same timing without importing Reanimated directly.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Light haptic tick on native; silently ignored on web and in simulators without an engine. */
export const tapFeedback = () => {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
};

export const successFeedback = () => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

export const errorFeedback = () => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
};

/** Pressable that shrinks slightly while held. The base of every tappable surface. */
export const Tap = ({
  children,
  onPress,
  style,
  disabled,
  scale = 0.97,
  haptic = true,
  ...rest
}: Omit<PressableProps, 'style'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  haptic?: boolean;
}) => {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scale) }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: motion.fast });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 14, stiffness: 220 });
      }}
      onPress={(event) => {
        if (haptic) tapFeedback();
        onPress?.(event);
      }}
      disabled={disabled}
      style={[animated, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
};

/** Fade-and-rise entrance, staggered by `index` so lists settle top to bottom. */
export const Appear = ({
  index = 0,
  children,
  style,
  from = 'down',
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  from?: 'down' | 'up' | 'none';
}) => {
  const delay = Math.min(index, 10) * 45;
  const entering =
    from === 'down'
      ? FadeInDown.duration(motion.slow).delay(delay)
      : from === 'up'
        ? FadeInUp.duration(motion.slow).delay(delay)
        : FadeIn.duration(motion.base).delay(delay);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
};
