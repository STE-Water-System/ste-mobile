import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Button, Card, Chip, Divider, Field, Header, IconButton, Line, MockBanner, Notice, Screen, type IconName, type Tone } from '../../components/ui';
import { Appear } from '../../components/motion';
import { useClientBills } from '../../hooks/useClientData';
import { useComplaintRecords, useRequestRecords } from '../../hooks/useClientRecords';
import { MOCK_COMPLAINTS, MOCK_REQUESTS } from '../../mocks';
import { billBalance, formatCurrency, isBillPaid } from '../../services/api';
import { billLabel, billTone, complaintTone, formatDate, formatPeriod, requestTone } from '../../lib/format';
import { useCustomer } from '../../store/authStore';
import { useLocalStore } from '../../store/localStore';
import { colors, spacing, textStart, type } from '../../theme';

type Result =
  | { kind: 'request'; id: string; title: string; status: string; tone: Tone; date: string; lines: [string, string][] }
  | { kind: 'complaint'; id: string; title: string; status: string; tone: Tone; date: string; lines: [string, string][] }
  | { kind: 'payment'; title: string; status: string; tone: Tone; date: string; lines: [string, string][] }
  | { kind: 'bill'; id: string; title: string; status: string; tone: Tone; date: string; lines: [string, string][] };

const ICONS: Record<Result['kind'], IconName> = {
  request: 'construct-outline',
  complaint: 'chatbubble-ellipses-outline',
  payment: 'wallet-outline',
  bill: 'receipt-outline',
};

/**
 * "Vérification": look up any reference the customer holds (request, complaint,
 * payment receipt or bill) and see its current status. Requests, complaints and
 * receipts are MOCK/local; bills come from the cached bills query.
 */
const VerificationScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const customer = useCustomer();
  const bills = useClientBills(customer);
  const requests = useRequestRecords();
  const complaints = useComplaintRecords();
  const payments = useLocalStore((state) => state.payments).filter((row) => row.owner === (customer?.customerCode ?? ''));

  const [reference, setReference] = useState('');
  const [result, setResult] = useState<Result | null | undefined>(undefined);

  const lookup = (raw: string = reference) => {
    const needle = raw.trim().toUpperCase();
    if (!needle) return;
    setReference(needle);

    const request = requests.find((row) => row.reference.toUpperCase() === needle);
    if (request) {
      setResult({
        kind: 'request',
        id: request.id,
        title: t(`installation.kind.${request.kind}`),
        status: t(`requestStatus.${request.status}`),
        tone: requestTone(request.status),
        date: request.updatedAt,
        lines: [[t('installation.address'), [request.street, request.quarter].filter(Boolean).join(', ')]],
      });
      return;
    }

    const complaint = complaints.find((row) => row.reference.toUpperCase() === needle);
    if (complaint) {
      setResult({
        kind: 'complaint',
        id: complaint.id,
        title: complaint.subjectKey ? t(complaint.subjectKey) : complaint.subject,
        status: t(`complaintStatus.${complaint.status}`),
        tone: complaintTone(complaint.status),
        date: complaint.updatedAt,
        lines: [[t('reclamation.category'), t(`complaints.type_${complaint.category}`, complaint.category)]],
      });
      return;
    }

    const payment = payments.find((row) => row.reference.toUpperCase() === needle);
    if (payment) {
      setResult({
        kind: 'payment',
        title: t('verification.paymentTitle'),
        status: t('verification.paymentOk'),
        tone: 'success',
        date: payment.createdAt,
        lines: [
          [t('client.amount'), `${formatCurrency(payment.amount)} ${t('common.currency')}`],
          [t('pay.methodLabel'), t(`pay.method.${payment.method}`, payment.method)],
        ],
      });
      return;
    }

    const bill = (bills.data ?? []).find((row: any, index: number) =>
      [row.invoiceNumber, row.billNumber, row.reference, row.billId ?? row.id ?? index].some((value) => String(value ?? '').toUpperCase() === needle)
    );
    if (bill) {
      const index = (bills.data ?? []).indexOf(bill);
      setResult({
        kind: 'bill',
        id: String(bill.billId ?? bill.id ?? index),
        title: t('client.invoice', { number: needle }),
        status: billLabel(bill, t),
        tone: billTone(bill),
        date: bill.updatedAt || bill.createdAt,
        lines: [
          [t('client.period'), formatPeriod(bill)],
          [isBillPaid(bill) ? t('bills.total') : t('bills.balance'), `${formatCurrency(isBillPaid(bill) ? bill.totalAmount : billBalance(bill))} ${t('common.currency')}`],
        ],
      });
      return;
    }

    setResult(null);
  };

  const open = () => {
    if (!result) return;
    if (result.kind === 'request') router.push({ pathname: '/(client)/request/[id]', params: { id: result.id } });
    if (result.kind === 'complaint') router.push({ pathname: '/(client)/complaint/[id]', params: { id: result.id } });
    if (result.kind === 'bill') router.push({ pathname: '/(client)/bill/[id]', params: { id: result.id } });
  };

  const samples = [MOCK_REQUESTS[0].reference, MOCK_COMPLAINTS[0].reference, ...payments.slice(0, 1).map((row) => row.reference)];

  return (
    <Screen scroll keyboard>
      <Header title={t('services.verification')} subtitle={t('verification.subtitle')} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      <Appear>
        <Field
          label={t('verification.reference')}
          icon="shield-checkmark-outline"
          value={reference}
          onChangeText={(value) => {
            setReference(value);
            setResult(undefined);
          }}
          placeholder="DEM-2026-0031"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => lookup()}
          hint={t('verification.hint')}
          trailing={<IconButton icon="search" variant="primary" size={32} onPress={() => lookup()} accessibilityLabel={t('common.search')} />}
        />
        <Text style={[type.label, textStart(), styles.samplesLabel]}>{t('verification.samples')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.samples}>
          {samples.map((sample) => (
            <Chip key={sample} label={sample} icon="pricetag-outline" onPress={() => lookup(sample)} />
          ))}
        </ScrollView>
      </Appear>

      {result === null && <Notice text={t('verification.notFound', { reference })} tone="danger" icon="search-outline" />}

      {!!result && (
        <Appear>
          <Card>
            <Line label={t('verification.type')} value={t(`verification.kind.${result.kind}`)} />
            <Divider />
            <Line label={t('verification.reference')} value={reference} strong />
            <Divider />
            <Line label={t('verification.title')} value={result.title} />
            <Divider />
            <Line label={t('verification.status')} value={result.status} tone={result.tone} strong />
            <Divider />
            <Line label={t('verification.updated')} value={formatDate(result.date)} />
            {result.lines.map(([label, value]) => (
              <React.Fragment key={label}>
                <Divider />
                <Line label={label} value={value} />
              </React.Fragment>
            ))}
            <Badge label={t('verification.verified')} tone="success" icon="shield-checkmark" />
          </Card>
          {result.kind !== 'payment' && (
            <Button label={t('common.details')} icon={ICONS[result.kind]} variant="secondary" onPress={open} style={styles.open} />
          )}
        </Appear>
      )}

      <Text style={[type.caption, textStart(), styles.footnote]}>{t('verification.footnote')}</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  samplesLabel: { marginBottom: spacing(2), marginStart: spacing(1) },
  samples: { gap: spacing(2), paddingBottom: spacing(4) },
  open: { marginTop: spacing(3) },
  footnote: { marginTop: spacing(5), color: colors.textSubtle },
});

export default VerificationScreen;
