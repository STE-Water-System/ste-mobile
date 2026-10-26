import React from 'react';
import { type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { TabBar, type TabBarProps } from '../../../components/TabBar';
import { colors } from '../../../theme';

type IconProps = { color: ColorValue; size: number; focused: boolean };

const icon =
  (filled: React.ComponentProps<typeof Ionicons>['name'], outline: React.ComponentProps<typeof Ionicons>['name']) =>
  ({ color, size, focused }: IconProps) => <Ionicons name={focused ? filled : outline} size={size} color={color as string} />;

const ClientTabs = () => {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      tabBar={(props) => <TabBar {...(props as unknown as TabBarProps)} />}
    >
      <Tabs.Screen name="home" options={{ title: t('nav.home'), tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="bills" options={{ title: t('nav.bills'), tabBarIcon: icon('receipt', 'receipt-outline') }} />
      <Tabs.Screen name="consumption" options={{ title: t('nav.consumption'), tabBarIcon: icon('water', 'water-outline') }} />
      <Tabs.Screen name="services" options={{ title: t('nav.services'), tabBarIcon: icon('grid', 'grid-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile'), tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
};

export default ClientTabs;
