import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Card, Divider, Empty, Header, Loading, Notice, Screen, Segmented } from '../../../components/ui';
import { ListRow, StatCard } from '../../../components/blocks';
import { Appear } from '../../../components/motion';
import { useClientBills } from '../../../hooks/useClientData';
import { billBalance, formatCurrency, isBillPaid } from '../../../services/api';
import { billLabel, billTone, formatPeriod } from '../../../lib/format';
import { useCustomer } from '../../../store/authStore';
import { colors, spacing, textStart, type } from '../../../theme';

type Filter = 'all' | 'unpaid' | 'paid';

const BillsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const customer = useCustomer();
  const [filter, setFilter] = useState<Filter>('all');
  const bills = useClientBills(customer);

  const all: any[] = bills.data ?? [];
  const unpaid = all.filter((bill: any) => !isBillPaid(bill));
  const due = unpaid.reduce((total: number, bill: any) => total + billBalance(bill), 0);
  const visible = filter === 'all' ? all : filter === 'paid' ? all.filter(isBillPaid) : unpaid;

  return (
    <Screen scroll refreshing={bills.isRefetching} onRefresh={() => bills.refetch()}>
      <Header title={t('nav.bills')} subtitle={`${customer?.firstName || ''} ${customer?.lastName || ''}`.trim()} />

      <Appear>
        <View style={styles.stats}>
          <StatCard label={t('client.balanceDue')} value={`${formatCurrency(due)} ${t('common.currency')}`} icon="wallet-outline" tone={due > 0 ? 'danger' : 'success'} />
          <StatCard label={t('bills.unpaidCount')} value={unpaid.length} icon="alert-circle-outline" tone="warning" onPress={() => setFilter('unpaid')} />
        </View>
      </Appear>

      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('common.all') },
          { value: 'unpaid', label: t('client.unpaid') },
          { value: 'paid', label: t('client.paid') },
        ]}
        style={styles.segmented}
      />

      {bills.isPending ? (
        <Loading label={t('common.loading')} />
      ) : bills.error ? (
        <Notice text={(bills.error as any)?.message || t('common.offline')} tone="danger" action={t('common.retry')} onAction={() => bills.refetch()} />
      ) : visible.length === 0 ? (
        <Empty icon="receipt-outline" text={t('client.noBills')} />
      ) : (
        <Card padded={false} style={styles.list}>
          {visible.map((bill: any, index: number) => {
            const id = String(bill.billId ?? bill.id ?? index);
            return (
              <Appear key={id} index={index}>
                {index > 0 && <Divider inset />}
                <ListRow
                  icon="receipt-outline"
                  iconTone={billTone(bill)}
                  title={`${formatCurrency(bill.totalAmount)} ${t('common.currency')}`}
                  subtitle={`${formatPeriod(bill)}${bill.consumption != null ? ` · ${bill.consumption} ${t('common.unit')}` : ''}`}
                  meta={!isBillPaid(bill) && billBalance(bill) !== Number(bill.totalAmount) ? t('bills.remaining', { amount: formatCurrency(billBalance(bill)), currency: t('common.currency') }) : undefined}
                  trailing={<Badge label={billLabel(bill, t)} tone={billTone(bill)} size="sm" />}
                  onPress={() => router.push({ pathname: '/(client)/bill/[id]', params: { id } })}
                  style={styles.row}
                />
              </Appear>
            );
          })}
        </Card>
      )}

      {all.length > 0 && (
        <Text style={[type.caption, textStart(), styles.hint]}>{t('bills.hint')}</Text>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing(3), marginBottom: spacing(4) },
  segmented: { marginBottom: spacing(4) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3.5) },
  hint: { marginTop: spacing(4), color: colors.textSubtle },
});

export default BillsScreen;
