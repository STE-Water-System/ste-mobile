import { useMemo } from 'react';

import { MOCK_AGENT_NOTIFICATIONS, MOCK_CLIENT_NOTIFICATIONS } from '../mocks';
import { useLocalStore } from '../store/localStore';

/** MOCK — in-app notifications with device-side read state. */
export const useNotifications = (space: 'agent' | 'client') => {
  const read = useLocalStore((state) => state.readNotifications);
  const markRead = useLocalStore((state) => state.markRead);
  const markAllRead = useLocalStore((state) => state.markAllRead);

  const source = space === 'agent' ? MOCK_AGENT_NOTIFICATIONS : MOCK_CLIENT_NOTIFICATIONS;

  return useMemo(() => {
    const items = source.map((item) => ({ ...item, read: read.includes(item.id) }));
    const unread = items.filter((item) => !item.read).length;
    return {
      items,
      unread,
      markRead,
      markAllRead: () => markAllRead(items.map((item) => item.id)),
    };
  }, [source, read, markRead, markAllRead]);
};
