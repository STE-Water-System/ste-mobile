import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, Divider, Empty, Field, Header, Line, Loading, MockBanner, Notice, Screen } from '../../components/ui';
import { ListRow, Stepper } from '../../components/blocks';
import { Appear, successFeedback } from '../../components/motion';
import { useClientBills } from '../../hooks/useClientData';
import { MOCK_PAYMENT_METHODS, mockDelay } from '../../mocks';
import { billBalance, formatCurrency, isBillPaid } from '../../services/api';
import { formatPeriod } from '../../lib/format';
import { newId, newReference } from '../../lib/ids';
import { useCustomer } from '../../store/authStore';
import { useLocalStore } from '../../store/localStore';
import { colors, radius, spacing, textStart, type } from '../../theme';

type Step = 0 | 1 | 2 | 3;

/**
 * MOCK — pay a bill from the phone. There is no payment gateway yet: the flow
 * is complete on screen, records a local receipt and never debits anything.
 */
const PayScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const customer = useCustomer();
  const params = useLocalSearchParams<{ billId?: string }>();
  const bills = useClientBills(customer);
  const addPayment = useLocalStore((state) => state.addPayment);

  const [step, setStep] = useState<Step>(0);
  const [billId, setBillId] = useState<string | null>(params.billId ?? null);
  const [method, setMethod] = useState(MOCK_PAYMENT_METHODS[0].id);
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const unpaid: any[] = (bills.data ?? []).filter((bill: any) => !isBillPaid(bill));
  const idOf = (bill: any, index: number) => String(bill.billId ?? bill.id ?? index);
  const selected = unpaid.find((bill, index) => idOf(bill, index) === billId);
  const amount = selected ? billBalance(selected) : 0;
  const chosen = MOCK_PAYMENT_METHODS.find((item) => item.id === method)!;

  // Arriving from a bill skips the first step.
  useEffect(() => {
    if (params.billId && unpaid.some((bill, index) => idOf(bill, index) === params.billId)) setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.billId, bills.data]);

  const confirm = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await mockDelay(1200);
      const ref = newReference('PAY');
      addPayment({
        id: newId(),
        owner: customer?.customerCode ?? '',
        reference: ref,
        billId: billId!,
        amount,
        method,
        phone: chosen.requiresPhone ? phone : undefined,
        createdAt: new Date().toISOString(),
      });
      setReference(ref);
      successFeedback();
      setStep(3);
    } finally {
      setBusy(false);
    }
  };

  const steps = [t('pay.step.bill'), t('pay.step.method'), t('pay.step.confirm')];

  return (
    <Screen scroll keyboard>
      <Header title={t('pay.title')} subtitle={t('pay.subtitle')} onBack={() => (step > 0 && step < 3 ? setStep((step - 1) as Step) : router.back())} />
      <MockBanner label={t('mock.banner')} />

      {step < 3 && <Stepper steps={steps} current={step} />}

      {bills.isPending ? (
        <Loading label={t('common.loading')} />
      ) : step === 0 ? (
        unpaid.length === 0 ? (
          <Empty icon="checkmark-done-circle-outline" title={t('client.upToDate')} text={t('pay.nothingDue')} />
        ) : (
          <Appear>
            <Card padded={false} style={styles.list}>
              {unpaid.map((bill, index) => {
                const id = idOf(bill, index);
                const active = id === billId;
                return (
                  <View key={id}>
                    {index > 0 && <Divider inset />}
                    <ListRow
                      leading={<Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primary : colors.placeholder} />}
                      title={`${formatCurrency(billBalance(bill))} ${t('common.currency')}`}
                      subtitle={formatPeriod(bill)}
                      chevron={false}
                      onPress={() => setBillId(id)}
                      style={styles.row}
                    />
                  </View>
                );
              })}
            </Card>
            <Button label={t('common.continue')} iconEnd="arrow-forward" onPress={() => setStep(1)} disabled={!selected} size="lg" style={styles.next} />
          </Appear>
        )
      ) : step === 1 ? (
        <Appear>
          <Card padded={false} style={styles.list}>
            {MOCK_PAYMENT_METHODS.map((item, index) => {
              const active = item.id === method;
              return (
                <View key={item.id}>
                  {index > 0 && <Divider inset />}
                  <ListRow
                    icon={item.icon}
                    iconTone={active ? 'info' : 'neutral'}
                    title={t(item.labelKey)}
                    subtitle={t(item.descriptionKey)}
                    trailing={<Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primary : colors.placeholder} />}
                    chevron={false}
                    onPress={() => setMethod(item.id)}
                    style={styles.row}
                  />
                </View>
              );
            })}
          </Card>
          {chosen.requiresPhone && (
            <Field label={t('pay.phoneLabel')} icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="66000001" hint={t('pay.phoneHint')} style={styles.phone} />
          )}
          <Button label={t('common.continue')} iconEnd="arrow-forward" onPress={() => setStep(2)} disabled={chosen.requiresPhone && phone.trim().length < 8} size="lg" style={styles.next} />
        </Appear>
      ) : step === 2 ? (
        <Appear>
          <Card>
            <Line label={t('pay.bill')} value={selected ? formatPeriod(selected) : '—'} />
            <Divider />
            <Line label={t('client.amount')} value={`${formatCurrency(amount)} ${t('common.currency')}`} strong />
            <Divider />
            <Line label={t('pay.methodLabel')} value={t(chosen.labelKey)} />
            {chosen.requiresPhone && (
              <>
                <Divider />
                <Line label={t('auth.phone')} value={phone} />
              </>
            )}
          </Card>
          <Notice text={t('pay.mockNotice')} tone="warning" icon="flask-outline" style={styles.notice} />
          <Button label={t('pay.confirm', { amount: formatCurrency(amount), currency: t('common.currency') })} icon="lock-closed-outline" onPress={confirm} loading={busy} size="lg" />
        </Appear>
      ) : (
        <Appear>
          <View style={styles.success}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={38} color={colors.white} />
            </View>
            <Text style={[type.title, styles.centered]}>{t('pay.successTitle')}</Text>
            <Text style={[type.caption, styles.centered]}>{t('pay.successBody')}</Text>
          </View>
          <Card>
            <Line label={t('verification.reference')} value={reference ?? '—'} strong />
            <Divider />
            <Line label={t('client.amount')} value={`${formatCurrency(amount)} ${t('common.currency')}`} />
            <Divider />
            <Line label={t('pay.methodLabel')} value={t(chosen.labelKey)} />
          </Card>
          <Notice text={t('pay.afterNotice')} tone="neutral" icon="information-circle-outline" style={styles.notice} />
          <Button label={t('common.done')} onPress={() => router.back()} size="lg" />
        </Appear>
      )}

      {step < 3 && step > 0 && (
        <Text style={[type.caption, textStart(), styles.footnote]}>{t('pay.footnote')}</Text>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3.5) },
  next: { marginTop: spacing(4) },
  phone: { marginTop: spacing(4) },
  notice: { marginVertical: spacing(4) },
  success: { alignItems: 'center', gap: spacing(2), paddingVertical: spacing(4) },
  successIcon: { width: 76, height: 76, borderRadius: radius.pill, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(2) },
  centered: { textAlign: 'center', maxWidth: 280 },
  footnote: { marginTop: spacing(4) },
});

export default PayScreen;
