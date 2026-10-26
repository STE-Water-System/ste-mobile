import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Button, Card, Chip, Divider, Empty, Field, Header, IconButton, Line, Loading, Notice, Screen, SectionTitle } from '../../../components/ui';
import { Avatar, Hero, ListRow } from '../../../components/blocks';
import { Appear } from '../../../components/motion';
import { billBalance, billingApi, formatAddress, formatCurrency, isBillPaid, meterApi } from '../../../services/api';
import { billLabel, billTone, formatPeriod } from '../../../lib/format';
import { colors, gradients, spacing, textStart, type } from '../../../theme';

/** Customer lookup: is this customer up to date on their bills? */
const ClientsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');

  // Unchanged backend calls: customer with meters, then their bills by code.
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
  const bills: any[] = lookup.data?.bills ?? [];
  const unpaid = bills.filter((bill: any) => !isBillPaid(bill));
  const due = unpaid.reduce((total: number, bill: any) => total + billBalance(bill), 0);
  const meters: any[] = Array.isArray(customer?.meters) ? customer.meters : [];
  const error = lookup.error as any;

  const search = () => setQuery(code.trim());

  return (
    <Screen scroll>
      <Header title={t('nav.clients')} subtitle={t('clients.subtitle')} />

      <Field
        icon="search-outline"
        value={code}
        onChangeText={setCode}
        placeholder={t('agent.searchPlaceholder')}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={search}
        trailing={<IconButton icon="arrow-forward" variant="primary" size={32} onPress={search} accessibilityLabel={t('common.search')} />}
      />

      {lookup.isFetching && <Loading label={t('common.loading')} />}

      {!lookup.isFetching && !!error && (
        <Notice text={error?.isNotFound ? t('agent.notFound') : error?.message || t('common.offline')} tone="danger" />
      )}

      {!lookup.isFetching && !query && (
        <Empty icon="people-outline" title={t('clients.emptyTitle')} text={t('agent.searchHint')} />
      )}

      {!lookup.isFetching && !!customer && (
        <>
          <Appear>
            <Hero gradient={gradients.client}>
              <View style={styles.heroRow}>
                <Avatar name={fullName || customer.customerCode || '?'} size={48} gradient={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']} />
                <View style={styles.heroText}>
                  <Text style={[styles.heroName, textStart()]} numberOfLines={1}>{fullName || '—'}</Text>
                  <Text style={[styles.heroCode, textStart()]} numberOfLines={1}>{customer.customerCode}</Text>
                </View>
              </View>
              <Text style={[styles.heroLabel, textStart()]}>{t('agent.balance')}</Text>
              <View style={styles.heroAmountRow}>
                <Text style={[styles.heroAmount, textStart()]}>{formatCurrency(due)} <Text style={styles.heroCurrency}>{t('common.currency')}</Text></Text>
                <Badge
                  label={unpaid.length === 0 ? t('agent.upToDate') : t('agent.overdue', { count: unpaid.length })}
                  tone={unpaid.length === 0 ? 'success' : 'danger'}
                />
              </View>
            </Hero>
          </Appear>

          <Appear index={1}>
            <View style={styles.actions}>
              <Button label={t('clients.readMeter')} icon="speedometer-outline" size="sm" onPress={() => router.push({ pathname: '/(agent)/reading/[code]', params: { code: String(customer.customerCode) } })} style={styles.action} />
              <Button label={t('clients.reportIncident')} icon="warning-outline" size="sm" variant="secondary" onPress={() => router.push({ pathname: '/(agent)/incident', params: { code: String(customer.customerCode) } })} style={styles.action} />
            </View>
          </Appear>

          <Appear index={2}>
            <Card>
              <Line label={t('auth.phone')} value={customer.phone || '—'} />
              {!!formatAddress(customer.address) && (
                <>
                  <Divider />
                  <Line label={t('agent.address')} value={formatAddress(customer.address)} />
                </>
              )}
              {!!customer.category && (
                <>
                  <Divider />
                  <Line label={t('clients.category')} value={String(customer.category)} />
                </>
              )}
            </Card>
          </Appear>

          {meters.length > 0 && (
            <>
              <SectionTitle title={t('clients.meters', { count: meters.length })} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.meterChips}>
                {meters.map((meter: any) => (
                  <Chip key={meter.meterId} label={String(meter.meterNumber || meter.meterId)} icon="speedometer-outline" />
                ))}
              </ScrollView>
            </>
          )}

          <SectionTitle title={t('agent.bills')} />
          {bills.length === 0 ? (
            <Empty icon="receipt-outline" text={t('client.noBills')} />
          ) : (
            <Card padded={false} style={styles.list}>
              {bills.map((bill: any, index: number) => (
                <Appear key={bill.billId ?? bill.id ?? index} index={index}>
                  {index > 0 && <Divider inset />}
                  <ListRow
                    icon="receipt-outline"
                    iconTone={billTone(bill)}
                    title={`${formatCurrency(bill.totalAmount)} ${t('common.currency')}`}
                    subtitle={formatPeriod(bill)}
                    trailing={<Badge label={billLabel(bill, t)} tone={billTone(bill)} size="sm" />}
                    chevron={false}
                    style={styles.row}
                  />
                </Appear>
              ))}
            </Card>
          )}

          <View style={styles.footerHint}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textSubtle} />
            <Text style={[type.caption, textStart(), styles.footerText]}>{t('clients.hint')}</Text>
          </View>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(5) },
  heroText: { flex: 1 },
  heroName: { fontSize: 17, fontFamily: 'Inter_700Bold', color: colors.white },
  heroCode: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(3), marginTop: 4 },
  heroAmount: { fontSize: 30, fontFamily: 'Inter_800ExtraBold', color: colors.white, letterSpacing: -0.8 },
  heroCurrency: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.85)' },

  actions: { flexDirection: 'row', gap: spacing(2.5), marginTop: spacing(3), marginBottom: spacing(3) },
  action: { flex: 1 },

  meterChips: { gap: spacing(2) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3) },

  footerHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing(4) },
  footerText: { flex: 1 },
});

export default ClientsScreen;
