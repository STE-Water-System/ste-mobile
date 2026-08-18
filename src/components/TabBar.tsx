import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing } from '../theme';

type IconRenderer = (props: { color: string; size: number; focused: boolean }) => React.ReactNode;

/**
 * Only the parts of the navigator we read. expo-router 57 vendors its own copy
 * of the navigation types, so describing the shape here avoids depending on
 * where they happen to live.
 */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string; tabBarIcon?: IconRenderer } }>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

/** Rounded bottom bar: icon over label, the active tab lifted onto a white pill. */
export const TabBar = ({ state, descriptors, navigation }: TabBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing(4)) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const tint = focused ? colors.primary : colors.textSubtle;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              style={[styles.tab, focused && styles.tabActive]}
              onPress={onPress}
              activeOpacity={0.85}
            >
              {options.tabBarIcon?.({ color: tint, size: 20, focused })}
              <Text style={[styles.label, { color: tint }, focused && styles.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing(5), paddingTop: spacing(2), backgroundColor: colors.background },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabActive: { backgroundColor: colors.white, ...shadow.soft },
  label: { fontSize: 11, fontWeight: '600' },
  labelActive: { fontWeight: '700' },
});

export default TabBar;
