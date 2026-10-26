import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Button, Card, Divider, Empty, Header, Line, Loading, Notice, Screen, SectionTitle } from '../../../components/ui';
import { Appear } from '../../../components/motion';
import { useClientBills } from '../../../hooks/useClientData';
import { billBalance, formatCurrency, isBillPaid } from '../../../services/api';
import { billLabel, billTone, formatDate, formatPeriod } from '../../../lib/format';
import { useCustomer } from '../../../store/authStore';
import { colors, radius, spacing, textStart, type } from '../../../theme';

/** One bill from the cached list (GET /api/client/bills/:customerId, unchanged). */
const BillDetailScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const customer = useCustomer();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bills = useClientBills(customer);

  const bill = (bills.data ?? []).find((row: any, index: number) => String(row.billId ?? row.id ?? index) === String(id));
  const paid = bill ? isBillPaid(bill) : false;
  const balance = bill ? billBalance(bill) : 0;
  const number = bill?.invoiceNumber || bill?.billNumber || bill?.reference || String(id);

  return (
    <Screen scroll>
      <Header title={t('client.invoice', { number })} subtitle={bill ? formatPeriod(bill) : undefined} onBack={() => router.back()} />

      {bills.isPending ? (
        <Loading label={t('common.loading')} />
      ) : !bill ? (
        <Empty icon="receipt-outline" text={t('bills.notFound')} />
      ) : (
        <>
          <Appear>
            <Card style={styles.summary}>
              <Text style={[type.caption, textStart()]}>{paid ? t('bills.amountPaid') : t('bills.amountDue')}</Text>
              <Text style={[type.balance, textStart(), { color: paid ? colors.success : colors.text }]}>
                {formatCurrency(paid ? bill.totalAmount : balance)} <Text style={styles.currency}>{t('common.currency')}</Text>
              </Text>
              <View style={styles.badgeRow}>
                <Badge label={billLabel(bill, t)} tone={billTone(bill)} />
                {!!bill.dueDate && !paid && <Text style={type.caption}>{t('client.dueDate')} · {formatDate(bill.dueDate)}</Text>}
              </View>
            </Card>
          </Appear>

          <Appear index={1}>
            <Card style={styles.details}>
              <Line label={t('client.period')} value={formatPeriod(bill)} />
              <Divider />
              <Line label={t('client.consumption')} value={bill.consumption != null ? `${bill.consumption} ${t('common.unit')}` : '—'} />
              {bill.previousIndex != null && (
                <>
                  <Divider />
                  <Line label={t('agent.previousIndex')} value={String(bill.previousIndex)} />
                </>
              )}
              {bill.currentIndex != null && (
                <>
                  <Divider />
                  <Line label={t('agent.currentIndex')} value={String(bill.currentIndex)} />
                </>
              )}
              <Divider />
              <Line label={t('bills.total')} value={`${formatCurrency(bill.totalAmount)} ${t('common.currency')}`} strong />
              <Divider />
              <Line label={t('bills.paid')} value={`${formatCurrency(bill.paidAmount ?? (paid ? bill.totalAmount : 0))} ${t('common.currency')}`} tone="success" />
              {!paid && (
                <>
                  <Divider />
                  <Line label={t('bills.balance')} value={`${formatCurrency(balance)} ${t('common.currency')}`} strong tone="danger" />
                </>
              )}
              {!!bill.meter?.meterNumber && (
                <>
                  <Divider />
                  <Line label={t('agent.meter')} value={String(bill.meter.meterNumber)} />
                </>
              )}
            </Card>
          </Appear>

          <SectionTitle title={t('bills.actions')} />
          <Appear index={2}>
            <View style={styles.actions}>
              {!paid && (
                <Button label={t('clientHome.payNow')} icon="wallet-outline" size="lg" onPress={() => router.push({ pathname: '/(client)/pay', params: { billId: String(id) } })} />
              )}
              <View style={styles.secondary}>
                <Button label={t('bills.download')} icon="download-outline" variant="outline" size="sm" onPress={() => Alert.alert(t('bills.download'), t('bills.downloadMock'))} style={styles.secondaryButton} />
                <Button label={t('bills.dispute')} icon="chatbubble-ellipses-outline" variant="outline" size="sm" onPress={() => router.push({ pathname: '/(client)/reclamation', params: { category: 'Billing', subject: t('bills.disputeSubject', { number }) } })} style={styles.secondaryButton} />
              </View>
            </View>
          </Appear>

          <Notice text={t('bills.payHint')} tone="neutral" icon="information-circle-outline" style={styles.hint} />
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  summary: { gap: 6 },
  currency: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.textSubtle },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing(2) },
  details: { marginTop: spacing(3), borderRadius: radius.lg },
  actions: { gap: spacing(3) },
  secondary: { flexDirection: 'row', gap: spacing(2.5) },
  secondaryButton: { flex: 1 },
  hint: { marginTop: spacing(4) },
});

export default BillDetailScreen;
