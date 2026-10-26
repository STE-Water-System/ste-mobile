import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Button, Card, Divider, Empty, Header, Line, MockBanner, Notice, Screen, SectionTitle } from '../../../components/ui';
import { Appear, successFeedback } from '../../../components/motion';
import { MOCK_TASKS, TASK_KIND_ICON } from '../../../mocks';
import { formatCurrency } from '../../../services/api';
import { formatDate, taskTone } from '../../../lib/format';
import { useLocalStore } from '../../../store/localStore';
import { radius, spacing, textStart, toneColors, type } from '../../../theme';

/** MOCK — one field intervention with its local progress. */
const TaskDetailScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const overrides = useLocalStore((state) => state.taskStatus);
  const setTaskStatus = useLocalStore((state) => state.setTaskStatus);

  const base = MOCK_TASKS.find((task) => task.id === id);
  if (!base) {
    return (
      <Screen>
        <Header title={t('tasks.title')} onBack={() => router.back()} />
        <Empty text={t('tasks.notFound')} />
      </Screen>
    );
  }

  const task = { ...base, status: overrides[base.id] ?? base.status };
  const tone = taskTone(task.status);
  const palette = toneColors[tone];

  const finish = () => {
    Alert.alert(t('tasks.finishTitle'), t('tasks.finishBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: () => {
          setTaskStatus(task.id, 'done');
          successFeedback();
        },
      },
    ]);
  };

  const block = () => {
    Alert.alert(t('tasks.blockTitle'), t('tasks.blockBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('tasks.blockConfirm'), style: 'destructive', onPress: () => setTaskStatus(task.id, 'blocked') },
    ]);
  };

  return (
    <Screen scroll>
      <Header title={task.reference} subtitle={t(`tasks.kind.${task.kind}`)} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      <Appear>
        <Card style={styles.head}>
          <View style={[styles.kindIcon, { backgroundColor: palette.bg }]}>
            <Ionicons name={TASK_KIND_ICON[task.kind]} size={24} color={palette.fg} />
          </View>
          <View style={styles.headText}>
            <Text style={[type.heading, textStart()]}>{task.customerName}</Text>
            <Text style={[type.caption, textStart()]}>{task.address} · {task.area}</Text>
          </View>
          <Badge label={t(`tasks.status.${task.status}`)} tone={tone} />
        </Card>
      </Appear>

      {!!task.noteKey && (
        <Appear index={1}>
          <Notice text={t(task.noteKey)} tone={task.priority === 'high' ? 'danger' : 'info'} icon="document-text-outline" />
        </Appear>
      )}

      <Appear index={2}>
        <Card style={styles.details}>
          <Line label={t('auth.clientCode')} value={task.customerCode} />
          <Divider />
          <Line label={t('agent.meter')} value={task.meterNumber} />
          <Divider />
          <Line label={t('tasks.due')} value={formatDate(task.dueDate)} />
          <Divider />
          <Line label={t('tasks.priority')} value={t(`tasks.priorityLabel.${task.priority}`)} tone={task.priority === 'high' ? 'danger' : undefined} />
          {task.amountDue != null && (
            <>
              <Divider />
              <Line label={t('tasks.amountDue')} value={`${formatCurrency(task.amountDue)} ${t('common.currency')}`} strong tone="danger" />
            </>
          )}
        </Card>
      </Appear>

      <SectionTitle title={t('tasks.actions')} />
      <Appear index={3}>
        <View style={styles.actions}>
          {task.status === 'todo' && (
            <Button label={t('tasks.start')} icon="play-outline" onPress={() => setTaskStatus(task.id, 'in_progress')} />
          )}
          {task.status === 'in_progress' && (
            <Button label={t('tasks.finish')} icon="checkmark-done-outline" onPress={finish} />
          )}
          {task.status === 'blocked' && (
            <Button label={t('tasks.resume')} icon="refresh-outline" variant="secondary" onPress={() => setTaskStatus(task.id, 'in_progress')} />
          )}
          {task.status === 'done' && (
            <Notice text={t('tasks.doneNotice')} tone="success" icon="checkmark-circle-outline" />
          )}
          <View style={styles.secondary}>
            <Button label={t('clients.readMeter')} icon="speedometer-outline" variant="outline" size="sm" onPress={() => router.push({ pathname: '/(agent)/reading/[code]', params: { code: task.customerCode } })} style={styles.secondaryButton} />
            <Button label={t('tasks.call')} icon="call-outline" variant="outline" size="sm" onPress={() => Alert.alert(t('tasks.call'), t('tasks.callBody', { name: task.customerName }))} style={styles.secondaryButton} />
          </View>
          {task.status !== 'done' && task.status !== 'blocked' && (
            <Button label={t('tasks.block')} icon="alert-circle-outline" variant="danger" size="sm" onPress={block} />
          )}
        </View>
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  kindIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, gap: 2 },
  details: { marginTop: spacing(3) },
  actions: { gap: spacing(3) },
  secondary: { flexDirection: 'row', gap: spacing(2.5) },
  secondaryButton: { flex: 1 },
});

export default TaskDetailScreen;
