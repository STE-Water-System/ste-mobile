import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { colors, radius, shadow, spacing } from '../theme';
import { Tap } from './motion';

type IconRenderer = (props: { color: string; size: number; focused: boolean }) => React.ReactNode;

type TabPressEvent = { type: 'tabPress'; target: string; canPreventDefault: true };
type Emitter = { emit: (event: TabPressEvent) => { defaultPrevented: boolean } };

/**
 * Only the parts of the navigator we read. Expo Router 58 passes `emitter` +
 * `navigateToTab(routeKey)` to a custom tab bar; older versions passed a
 * `navigation` object. Both are accepted so the bar survives either.
 */
export interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<
    string,
    { options: { title?: string; tabBarIcon?: IconRenderer; tabBarBadge?: string | number; href?: null } }
  >;
  emitter?: Emitter;
  navigateToTab?: (routeKey: string) => void;
  navigation?: Emitter & { navigate: (name: string) => void };
}

const TabItem = ({
  focused,
  label,
  icon,
  badge,
  onPress,
}: {
  focused: boolean;
  label: string;
  icon?: IconRenderer;
  badge?: string | number;
  onPress: () => void;
}) => {
  const active = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    active.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 180 });
  }, [focused, active]);

  const pill = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scaleX: 0.6 + active.value * 0.4 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -active.value * 1.5 }, { scale: 1 + active.value * 0.08 }],
  }));

  const tint = focused ? colors.primary : colors.textSubtle;

  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      style={styles.tab}
      onPress={onPress}
      scale={0.94}
    >
      <Animated.View style={[styles.pill, pill]} />
      <Animated.View style={[styles.icon, iconStyle]}>
        {icon?.({ color: tint, size: 22, focused })}
        {badge != null && badge !== 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{String(badge)}</Text>
          </View>
        )}
      </Animated.View>
      <Text style={[styles.label, { color: tint }, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
};

/** Floating white bar; the active tab gets a soft blue pill and a lifted icon. */
export const TabBar = ({ state, descriptors, emitter, navigateToTab, navigation }: TabBarProps) => {
  const insets = useSafeAreaInsets();
  const emit = (event: TabPressEvent) =>
    emitter?.emit(event) ?? navigation?.emit(event) ?? { defaultPrevented: false };
  const goTo = (route: { key: string; name: string }) => {
    if (navigateToTab) navigateToTab(route.key);
    else navigation?.navigate(route.name);
  };
  const visible = useSharedValue(0);
  useEffect(() => {
    visible.value = withTiming(1, { duration: 320 });
  }, [visible]);
  const enter = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateY: (1 - visible.value) * 16 }],
  }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing(3)) }]}>
      <Animated.View style={[styles.bar, enter]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] ?? { options: {} };
          if (options.href === null) return null;
          const focused = state.index === index;
          const label = options.title ?? route.name;

          const onPress = () => {
            const event = emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) goTo(route);
          };

          return (
            <TabItem
              key={route.key}
              focused={focused}
              label={label}
              icon={options.tabBarIcon}
              badge={options.tabBarBadge}
              onPress={onPress}
            />
          );
        })}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing(4), paddingTop: spacing(2), backgroundColor: colors.background },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.float,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing(2),
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    right: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  icon: { alignItems: 'center', justifyContent: 'center', height: 24 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { color: colors.white, fontSize: 9, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 10.5, fontFamily: 'Inter_600SemiBold' },
  labelActive: { fontFamily: 'Inter_700Bold' },
});

export default TabBar;
