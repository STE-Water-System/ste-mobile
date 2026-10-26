import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, Divider, Field, Header, Line, MockBanner, Notice, Screen, type IconName } from '../../components/ui';
import { Stepper } from '../../components/blocks';
import { Appear, Tap, successFeedback } from '../../components/motion';
import { mockDelay } from '../../mocks';
import { newId, newReference } from '../../lib/ids';
import { useCustomer } from '../../store/authStore';
import { useLocalStore } from '../../store/localStore';
import { colors, radius, spacing, textStart, type } from '../../theme';

type Kind = 'new' | 'extension' | 'transfer';
type Usage = 'private' | 'public' | 'borne_fontaine';

const KINDS: { id: Kind; icon: IconName }[] = [
  { id: 'new', icon: 'add-circle-outline' },
  { id: 'extension', icon: 'git-branch-outline' },
  { id: 'transfer', icon: 'swap-horizontal-outline' },
];
/** Same categories as the back-office customer file: PRIVATE, PUBLIC, BRONZE_FONTAINE. */
const USAGES: { id: Usage; icon: IconName }[] = [
  { id: 'private', icon: 'home-outline' },
  { id: 'public', icon: 'business-outline' },
  { id: 'borne_fontaine', icon: 'water-outline' },
];

/** MOCK — "demande d'installation": a three-step request stored on the device. */
const InstallationScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const customer = useCustomer();
  const addRequest = useLocalStore((state) => state.addInstallationRequest);

  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<Kind>('new');
  const [usage, setUsage] = useState<Usage>('private');
  const [fullName, setFullName] = useState(`${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim());
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [quarter, setQuarter] = useState('');
  const [street, setStreet] = useState('');
  const [door, setDoor] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const steps = [t('installation.step.kind'), t('installation.step.address'), t('installation.step.review')];

  const next = () => {
    setError(null);
    if (step === 1) {
      if (!fullName.trim() || phone.trim().length < 8) {
        setError(t('installation.missingContact'));
        return;
      }
      if (!quarter.trim() || !street.trim()) {
        setError(t('installation.missingAddress'));
        return;
      }
    }
    setStep(step + 1);
  };

  const submit = async () => {
    setBusy(true);
    try {
      await mockDelay();
      const reference = newReference('DEM');
      addRequest({
        id: newId(),
        owner: customer?.customerCode ?? '',
        reference,
        kind,
        usage,
        status: 'OPEN',
        fullName: fullName.trim(),
        phone: phone.trim(),
        quarter: quarter.trim(),
        street: street.trim(),
        door: door.trim(),
        landmark: landmark.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      });
      successFeedback();
      Alert.alert(t('installation.sentTitle'), t('installation.sentBody', { reference }), [
        { text: t('common.ok'), onPress: () => router.replace('/(client)/requests') },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const choice = <T extends string>(items: { id: T; icon: IconName }[], value: T, onChange: (v: T) => void, prefix: string) => (
    <View style={styles.choices}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Tap key={item.id} onPress={() => onChange(item.id)} style={[styles.choice, active && styles.choiceActive]} scale={0.96}>
            <Ionicons name={item.icon} size={22} color={active ? colors.white : colors.primary} />
            <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]} numberOfLines={2}>
              {t(`${prefix}.${item.id}`)}
            </Text>
          </Tap>
        );
      })}
    </View>
  );

  return (
    <Screen scroll keyboard>
      <Header title={t('services.installation')} subtitle={t('installation.subtitle')} onBack={() => (step > 0 ? setStep(step - 1) : router.back())} />
      <MockBanner label={t('mock.banner')} />
      <Stepper steps={steps} current={step} />

      {step === 0 && (
        <Appear>
          <Text style={[type.label, textStart(), styles.label]}>{t('installation.kindLabel')}</Text>
          {choice(KINDS, kind, setKind, 'installation.kind')}
          <Text style={[type.label, textStart(), styles.label]}>{t('installation.usageLabel')}</Text>
          {choice(USAGES, usage, setUsage, 'installation.usage')}
          <Notice text={t('installation.kindHint')} tone="info" icon="information-circle-outline" />
          <Button label={t('common.continue')} iconEnd="arrow-forward" onPress={next} size="lg" style={styles.next} />
        </Appear>
      )}

      {step === 1 && (
        <Appear>
          <Card style={styles.card}>
            <Text style={[type.subheading, textStart(), styles.cardTitle]}>{t('installation.contact')}</Text>
            <Field label={t('installation.fullName')} icon="person-outline" value={fullName} onChangeText={setFullName} />
            <Field label={t('auth.phone')} icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.last} />
          </Card>
          <Card style={styles.card}>
            <Text style={[type.subheading, textStart(), styles.cardTitle]}>{t('installation.address')}</Text>
            <Field label={t('installation.quarter')} icon="map-outline" value={quarter} onChangeText={setQuarter} placeholder="Moursal" />
            <Field label={t('installation.street')} icon="navigate-outline" value={street} onChangeText={setStreet} placeholder="Rue 3015" />
            <Field label={t('installation.door')} icon="home-outline" value={door} onChangeText={setDoor} placeholder="12" />
            <Field label={t('installation.landmark')} icon="flag-outline" value={landmark} onChangeText={setLandmark} placeholder={t('installation.landmarkPlaceholder')} style={styles.last} />
          </Card>
          {!!error && <Notice text={error} tone="danger" />}
          <Button label={t('common.continue')} iconEnd="arrow-forward" onPress={next} size="lg" style={styles.next} />
        </Appear>
      )}

      {step === 2 && (
        <Appear>
          <Card style={styles.card}>
            <Line label={t('installation.kindLabel')} value={t(`installation.kind.${kind}`)} />
            <Divider />
            <Line label={t('installation.usageLabel')} value={t(`installation.usage.${usage}`)} />
            <Divider />
            <Line label={t('installation.fullName')} value={fullName} />
            <Divider />
            <Line label={t('auth.phone')} value={phone} />
            <Divider />
            <Line label={t('installation.address')} value={[street, door, quarter].filter(Boolean).join(', ')} />
            {!!landmark && (
              <>
                <Divider />
                <Line label={t('installation.landmark')} value={landmark} />
              </>
            )}
          </Card>
          <Field label={t('installation.notes')} value={notes} onChangeText={setNotes} placeholder={t('installation.notesPlaceholder')} multiline />
          <Notice text={t('installation.reviewHint')} tone="warning" icon="flask-outline" />
          <Button label={t('installation.submit')} icon="paper-plane-outline" onPress={submit} loading={busy} size="lg" style={styles.next} />
        </Appear>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  label: { marginBottom: spacing(2), marginStart: spacing(1) },
  choices: { flexDirection: 'row', gap: spacing(2.5), marginBottom: spacing(5) },
  choice: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(2),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceLabel: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold', color: colors.text, textAlign: 'center' },
  choiceLabelActive: { color: colors.white },
  card: { marginBottom: spacing(3) },
  cardTitle: { marginBottom: spacing(3) },
  last: { marginBottom: 0 },
  next: { marginTop: spacing(3) },
});

export default InstallationScreen;
