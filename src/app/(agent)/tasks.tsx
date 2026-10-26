import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Card, Chip, Divider, Empty, Header, MockBanner, Screen } from '../../components/ui';
import { ListRow } from '../../components/blocks';
import { Appear } from '../../components/motion';
import { MOCK_TASKS, TASK_KIND_ICON } from '../../mocks';
import { formatDateShort, taskTone } from '../../lib/format';
import { useLocalStore } from '../../store/localStore';
import { spacing } from '../../theme';

type Filter = 'open' | 'done' | 'all';

/** MOCK — field interventions assigned to the agent (disconnections, reconnections, inspections). */
const TasksScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const overrides = useLocalStore((state) => state.taskStatus);
  const [filter, setFilter] = useState<Filter>('open');

  const tasks = useMemo(
    () => MOCK_TASKS.map((task) => ({ ...task, status: overrides[task.id] ?? task.status })),
    [overrides]
  );
  const visible = tasks.filter((task) =>
    filter === 'all' ? true : filter === 'done' ? task.status === 'done' : task.status !== 'done'
  );
  const openCount = tasks.filter((task) => task.status !== 'done').length;

  return (
    <Screen scroll>
      <Header title={t('tasks.title')} subtitle={t('tasks.subtitle', { count: openCount })} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={t('tasks.filter.open')} count={openCount} active={filter === 'open'} onPress={() => setFilter('open')} />
        <Chip label={t('tasks.filter.done')} count={tasks.length - openCount} active={filter === 'done'} onPress={() => setFilter('done')} />
        <Chip label={t('tasks.filter.all')} count={tasks.length} active={filter === 'all'} onPress={() => setFilter('all')} />
      </ScrollView>

      {visible.length === 0 ? (
        <Empty icon="checkmark-done-circle-outline" text={t('tasks.empty')} />
      ) : (
        <Card padded={false} style={styles.list}>
          {visible.map((task, index) => (
            <Appear key={task.id} index={index}>
              {index > 0 && <Divider inset />}
              <ListRow
                icon={TASK_KIND_ICON[task.kind]}
                iconTone={task.priority === 'high' ? 'danger' : taskTone(task.status)}
                title={task.customerName}
                subtitle={`${t(`tasks.kind.${task.kind}`)} · ${task.address}`}
                meta={`${task.area} · ${formatDateShort(task.dueDate, i18n.language)}${task.priority === 'high' ? ` · ${t('tasks.priorityHigh')}` : ''}`}
                trailing={<Badge label={t(`tasks.status.${task.status}`)} tone={taskTone(task.status)} size="sm" />}
                onPress={() => router.push({ pathname: '/(agent)/task/[id]', params: { id: task.id } })}
                style={styles.row}
              />
            </Appear>
          ))}
        </Card>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  chips: { gap: spacing(2), paddingBottom: spacing(4) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3.5) },
});

export default TasksScreen;
