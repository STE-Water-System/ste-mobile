import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Card, Chip, Divider, Empty, Header, Loading, Notice, Screen } from '../../components/ui';
import { ListRow } from '../../components/blocks';
import { Appear } from '../../components/motion';
import { useAgentRound } from '../../hooks/useAgentRound';
import { customerNameOf, customerOf, normalizeStatus, READING_STATUS, readingIdOf } from '../../services/api';
import { filterRound, meterNumberOf, type RoundFilter } from '../../lib/round';
import { formatDateShort, formatIndex, formatMonthYear, readingIcon, readingLabel, readingTone } from '../../lib/format';
import { spacing } from '../../theme';

type Filter = 'all' | Extract<RoundFilter, 'sent' | 'approved' | 'rejected'>;
const FILTERS: Filter[] = ['all', 'sent', 'approved', 'rejected'];

/** Readings already handed in this month, from the assigned round (unchanged call). */
const HistoryScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const round = useAgentRound();
  const [filter, setFilter] = useState<Filter>('all');

  const items: any[] = round.data?.items ?? [];
  // Everything the agent has already recorded at least once: all but fresh PENDING rows.
  const handed = useMemo(() => items.filter((row) => normalizeStatus(row) !== READING_STATUS.PENDING), [items]);
  const visible = filter === 'all' ? handed : filterRound(handed, filter);
  const counts: Record<Filter, number> = {
    all: handed.length,
    sent: round.data?.stats.sent ?? 0,
    approved: round.data?.stats.approved ?? 0,
    rejected: round.data?.stats.rejected ?? 0,
  };

  return (
    <Screen scroll refreshing={round.isRefetching} onRefresh={() => round.refetch()}>
      <Header title={t('history.title')} subtitle={formatMonthYear(new Date(), i18n.language)} onBack={() => router.back()} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((key) => (
          <Chip key={key} label={t(`round.filter.${key}`)} count={counts[key]} active={filter === key} onPress={() => setFilter(key)} />
        ))}
      </ScrollView>

      {round.isPending ? (
        <Loading label={t('common.loading')} />
      ) : round.error ? (
        <Notice text={(round.error as any)?.message || t('common.offline')} tone="danger" />
      ) : visible.length === 0 ? (
        <Empty icon="time-outline" text={handed.length === 0 ? t('history.empty') : t('round.emptyFilter')} />
      ) : (
        <Card padded={false} style={styles.list}>
          {visible.map((row, index) => {
            const customer = customerOf(row);
            return (
              <Appear key={readingIdOf(row) ?? index} index={index}>
                {index > 0 && <Divider inset />}
                <ListRow
                  icon={readingIcon(row)}
                  iconTone={readingTone(row)}
                  title={customerNameOf(customer) || meterNumberOf(row) || '—'}
                  subtitle={`${formatIndex(row.currentIndex)} ${t('common.unit')} · ${formatDateShort(row.readingDate || row.updatedAt || row.createdAt, i18n.language)}`}
                  meta={[customer?.customerCode, meterNumberOf(row)].filter(Boolean).join(' · ')}
                  trailing={<Badge label={readingLabel(row, t)} tone={readingTone(row)} size="sm" />}
                  onPress={() => router.push({ pathname: '/reading-details', params: { readingId: String(readingIdOf(row)) } })}
                  style={styles.row}
                />
              </Appear>
            );
          })}
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

export default HistoryScreen;
