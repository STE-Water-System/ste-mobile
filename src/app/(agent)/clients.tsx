import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  Badge,
  Button,
  Card,
  Divider,
  Empty,
  Field,
  Header,
  Line,
  Loading,
  Notice,
  Screen,
} from '../../components/ui';
import { SettingsButton } from '../../components/SettingsButton';
import {
  billBalance,
  billingApi,
  formatAddress,
  formatCurrency,
  isBillPaid,
  meterApi,
} from '../../services/api';
import { billLabel, billTone, formatPeriod } from '../../lib/format';
import { spacing, textStart, type } from '../../theme';

/** Client lookup: is this customer up to date on their bills? */
const ClientsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');

  const lookup = useQuery({
    queryKey: ['agent-client', query],
    enabled: query.length > 0,
    queryFn: async () => {
      const { customer } = await meterApi.getCustomerWithMeters(query);
      if (!customer) throw new Error(t('agent.notFound'));
      const bills = await billingApi.listByCustomerCode(customer.customerCode || query);
      return { customer, bills };
    },
  });

  const customer = lookup.data?.customer;
  const fullName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();
  const bills = lookup.data?.bills ?? [];
  const unpaid = bills.filter((bill: any) => !isBillPaid(bill));
  const due = unpaid.reduce((total: number, bill: any) => total + billBalance(bill), 0);

  const error = lookup.error as any;

  return (
    <Screen scroll>
      <Header title={t('agent.tabClients')} action={<SettingsButton />} />

      <Field
        value={code}
        onChangeText={setCode}
        placeholder={t('agent.searchPlaceholder')}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={() => setQuery(code.trim())}
      />
      <Button
        label={t('common.search')}
        onPress={() => setQuery(code.trim())}
        disabled={!code.trim()}
        loading={lookup.isFetching}
      />

      {lookup.isFetching && <Loading />}

      {!lookup.isFetching && !!error && (
        <Notice text={error?.isNotFound ? t('agent.notFound') : error?.message} tone="danger" />
      )}

      {!lookup.isFetching && !query && <Empty text={t('agent.searchHint')} />}

      {!lookup.isFetching && !!customer && (
        <>
          <View style={styles.summary}>
            <Text style={[type.caption, textStart()]}>{t('agent.balance')}</Text>
            <Text style={[type.amount, textStart(), styles.amount]}>
              {formatCurrency(due)} {t('common.currency')}
            </Text>
            <Badge
              label={
                unpaid.length === 0 ? t('agent.upToDate') : t('agent.overdue', { count: unpaid.length })
              }
              tone={unpaid.length === 0 ? 'success' : 'danger'}
            />
          </View>

          <Card>
            <Line label={t('agent.client')} value={fullName || '—'} />
            <Divider />
            <Line label={t('auth.clientCode')} value={customer.customerCode || '—'} />
            <Divider />
            <Line label={t('auth.phone')} value={customer.phone || '—'} />
            {!!formatAddress(customer.address) && (
              <>
                <Divider />
                <Line label={t('agent.address')} value={formatAddress(customer.address)} />
              </>
            )}
          </Card>

          <Button
            label={t('complaints.new')}
            variant="ghost"
            style={styles.complaint}
            onPress={() =>
              router.push({
                pathname: '/complaint',
                params: { customerId: String(customer.customerId), name: fullName },
              })
            }
          />

          <Text style={[type.label, textStart(), styles.sectionTitle]}>{t('agent.bills')}</Text>

          {bills.length === 0 ? (
            <Empty text={t('client.noBills')} />
          ) : (
            <Card>
              {bills.map((bill: any, index: number) => (
                <View key={bill.billId ?? bill.id ?? index}>
                  {index > 0 && <Divider />}
                  <View style={styles.billRow}>
                    <View style={styles.billText}>
                      <Text style={[type.bodyStrong, textStart()]}>
                        {formatCurrency(bill.totalAmount)} {t('common.currency')}
                      </Text>
                      <Text style={[type.caption, textStart()]}>{formatPeriod(bill)}</Text>
                    </View>
                    <Badge label={billLabel(bill, t)} tone={billTone(bill)} />
                  </View>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  summary: { paddingVertical: spacing(5), gap: spacing(1), alignItems: 'flex-start' },
  amount: { marginBottom: spacing(2) },
  complaint: { marginTop: spacing(3) },
  sectionTitle: { marginTop: spacing(6), marginBottom: spacing(2), marginStart: spacing(2) },

  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2.5),
    gap: spacing(3),
  },
  billText: { flex: 1 },
});

export default ClientsScreen;
