import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Badge, Card, Divider, Empty, Header, Loading, Notice, Segmented } from '../../components/ui';
import { SettingsButton } from '../../components/SettingsButton';
import { billBalance, clientApi, formatCurrency, isBillPaid } from '../../services/api';
import { billLabel, billTone, formatPeriod } from '../../lib/format';
import { colors, spacing, textStart, type } from '../../theme';
import { useCustomer } from '../../store/authStore';

type Filter = 'all' | 'unpaid' | 'paid';

const BillsScreen = () => {
  const { t } = useTranslation();
  const customer = useCustomer();
  const [filter, setFilter] = useState<Filter>('all');

  const bills = useQuery({
    queryKey: ['client-bills', customer?.customerId],
    enabled: !!customer,
    queryFn: () => clientApi.getBills(customer!.customerId),
  });

  const all = bills.data ?? [];
  const unpaid = all.filter((bill: any) => !isBillPaid(bill));
  const due = unpaid.reduce((total: number, bill: any) => total + billBalance(bill), 0);

  const visible =
    filter === 'all' ? all : filter === 'paid' ? all.filter(isBillPaid) : unpaid;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={bills.isRefetching} onRefresh={() => bills.refetch()} />
        }
      >
        <Header
          title={t('client.tabBills')}
          subtitle={`${customer?.firstName || ''} ${customer?.lastName || ''}`.trim()}
          action={<SettingsButton />}
        />

        <View style={styles.summary}>
          <Text style={[type.caption, textStart()]}>{t('client.balanceDue')}</Text>
          <Text style={[type.balance, textStart(), styles.amount]}>
            {formatCurrency(due)} {t('common.currency')}
          </Text>
          <Badge
            label={unpaid.length === 0 ? t('client.upToDate') : t('agent.overdue', { count: unpaid.length })}
            tone={unpaid.length === 0 ? 'success' : 'danger'}
          />
        </View>

        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'unpaid', label: t('client.unpaid') },
            { value: 'paid', label: t('client.paid') },
          ]}
        />

        {bills.isPending ? (
          <Loading />
        ) : bills.error ? (
          <Notice text={(bills.error as any)?.message || t('common.offline')} tone="danger" />
        ) : visible.length === 0 ? (
          <Empty text={t('client.noBills')} />
        ) : (
          <Card style={styles.list}>
            {visible.map((bill: any, index: number) => (
              <View key={bill.billId ?? bill.id ?? index}>
                {index > 0 && <Divider />}
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={[type.bodyStrong, textStart()]}>
                      {formatCurrency(bill.totalAmount)} {t('common.currency')}
                    </Text>
                    <Text style={[type.caption, textStart()]}>
                      {formatPeriod(bill)}
                      {bill.consumption != null ? ` · ${bill.consumption} ${t('common.unit')}` : ''}
                    </Text>
                  </View>
                  <Badge label={billLabel(bill, t)} tone={billTone(bill)} />
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing(5), paddingBottom: spacing(8) },

  summary: { paddingBottom: spacing(6), gap: spacing(1), alignItems: 'flex-start' },
  amount: { marginBottom: spacing(2) },

  list: { marginTop: spacing(4) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(3),
    gap: spacing(3),
  },
  rowText: { flex: 1 },
});

export default BillsScreen;
