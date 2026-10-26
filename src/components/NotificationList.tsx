import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card, Divider, Empty, Header, MockBanner, Screen, type IconName, type Tone } from './ui';
import { ListRow } from './blocks';
import { Appear } from './motion';
import { useNotifications } from '../hooks/useNotifications';
import { formatDateShort, formatTime } from '../lib/format';
import { colors, spacing } from '../theme';

const ICONS: Record<string, { icon: IconName; tone: Tone }> = {
  bill: { icon: 'receipt-outline', tone: 'info' },
  outage: { icon: 'water-outline', tone: 'warning' },
  complaint: { icon: 'chatbubble-ellipses-outline', tone: 'accent' },
  payment: { icon: 'checkmark-circle-outline', tone: 'success' },
  info: { icon: 'bulb-outline', tone: 'neutral' },
  round: { icon: 'speedometer-outline', tone: 'info' },
  rejected: { icon: 'close-circle-outline', tone: 'danger' },
  task: { icon: 'construct-outline', tone: 'warning' },
  system: { icon: 'settings-outline', tone: 'neutral' },
};

/** MOCK — shared notifications screen for both spaces. */
export const NotificationList = ({ space }: { space: 'agent' | 'client' }) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { items, unread, markRead, markAllRead } = useNotifications(space);

  return (
    <Screen scroll>
      <Header
        title={t('nav.notifications')}
        subtitle={unread ? t('notifications.unread', { count: unread }) : t('notifications.allRead')}
        onBack={() => router.back()}
      />
      <MockBanner label={t('mock.banner')} />

      {items.length === 0 ? (
        <Empty icon="notifications-off-outline" text={t('notifications.empty')} />
      ) : (
        <>
          {unread > 0 && (
            <Text style={styles.markAll} onPress={markAllRead}>
              {t('notifications.markAll')}
            </Text>
          )}
          <Card padded={false} style={styles.list}>
            {items.map((item, index) => {
              const look = ICONS[item.kind] ?? ICONS.info;
              return (
                <Appear key={item.id} index={index}>
                  {index > 0 && <Divider inset />}
                  <ListRow
                    icon={look.icon}
                    iconTone={look.tone}
                    title={t(item.titleKey)}
                    subtitle={t(item.bodyKey)}
                    meta={`${formatDateShort(item.date, i18n.language)} · ${formatTime(item.date, i18n.language)}`}
                    trailing={!item.read ? <View style={styles.dot} /> : undefined}
                    chevron={false}
                    onPress={() => markRead(item.id)}
                    style={[styles.row, !item.read && styles.rowUnread]}
                  />
                </Appear>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  markAll: { alignSelf: 'flex-end', color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 12.5, marginBottom: spacing(2) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3.5) },
  rowUnread: {},
  dot: { width: 9, height: 9, borderRadius: 9, backgroundColor: colors.primary },
});

export default NotificationList;
