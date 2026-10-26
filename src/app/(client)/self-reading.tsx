import React, { useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Card, Chip, Divider, Empty, Field, Header, IconButton, Line, MockBanner, Notice, Screen } from '../../components/ui';
import { Appear, successFeedback } from '../../components/motion';
import { useClientConsumption } from '../../hooks/useClientData';
import { mockDelay } from '../../mocks';
import { isApprovedStatus } from '../../services/api';
import { formatDate, formatIndex } from '../../lib/format';
import { newId, newReference } from '../../lib/ids';
import { useCustomer } from '../../store/authStore';
import { useLocalStore } from '../../store/localStore';
import { colors, radius, spacing, type } from '../../theme';

/**
 * MOCK — "auto-relevé": the customer sends their own meter index with a photo.
 * Stored on the device only; it never replaces the agent's official reading.
 */
const SelfReadingScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const customer = useCustomer();
  const addSelfReading = useLocalStore((state) => state.addSelfReading);
  const previous = useLocalStore((state) => state.selfReadings).filter((row) => row.owner === (customer?.customerCode ?? ''));

  const meters: any[] = customer?.meters ?? [];
  const [meterIndex, setMeterIndex] = useState(0);
  const meter = meters[meterIndex];
  const readings = useClientConsumption(meter?.meterId);

  const latest = (readings.data ?? []).find(isApprovedStatus) ?? (readings.data ?? [])[0];
  const lastIndex = Number(latest?.currentIndex) || Number(meter?.installationIndex) || 0;

  const [value, setValue] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = Number(String(value).replace(/,/g, '.').trim());
  const valid = value.trim().length > 0 && Number.isFinite(parsed);
  const consumption = valid ? Math.max(0, parsed - lastIndex) : 0;

  const pickPhoto = async () => {
    const fromLibrary = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
    };
    if (Platform.OS === 'web') return fromLibrary();
    const camera = await ImagePicker.requestCameraPermissionsAsync();
    if (camera.status === 'granted') {
      try {
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
        if (!result.canceled && result.assets[0]) {
          setPhoto(result.assets[0].uri);
          return;
        }
      } catch {
        // No camera available — fall through to the library.
      }
    }
    await fromLibrary();
  };

  const submit = async () => {
    setError(null);
    if (!valid) {
      setError(t('agent.invalidIndex'));
      return;
    }
    if (parsed < lastIndex) {
      setError(t('selfReading.lowerIndex', { previous: formatIndex(lastIndex) }));
      return;
    }
    if (!photo) {
      setError(t('agent.missingPhoto'));
      return;
    }
    setBusy(true);
    try {
      await mockDelay();
      const reference = newReference('REL');
      addSelfReading({
        id: newId(),
        owner: customer?.customerCode ?? '',
        reference,
        meterId: meter.meterId,
        meterNumber: String(meter.meterNumber),
        index: parsed,
        photoUri: photo,
        createdAt: new Date().toISOString(),
      });
      successFeedback();
      Alert.alert(t('selfReading.sentTitle'), t('selfReading.sentBody', { reference }), [{ text: t('common.ok'), onPress: () => router.back() }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll keyboard>
      <Header title={t('services.selfReading')} subtitle={t('selfReading.subtitle')} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      {!meter ? (
        <Empty icon="speedometer-outline" text={t('agent.noMeter')} />
      ) : (
        <>
          {meters.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {meters.map((item: any, index: number) => (
                <Chip key={item.meterId} label={String(item.meterNumber)} icon="speedometer-outline" active={index === meterIndex} onPress={() => setMeterIndex(index)} />
              ))}
            </ScrollView>
          )}

          <Appear>
            <Card>
              <Line label={t('agent.meter')} value={String(meter.meterNumber)} />
              <Divider />
              <Line label={t('selfReading.lastIndex')} value={`${formatIndex(lastIndex)} ${t('common.unit')}`} strong />
              {!!latest && (
                <>
                  <Divider />
                  <Line label={t('consumption.lastReading')} value={formatDate(latest.readingDate || latest.createdAt)} />
                </>
              )}
            </Card>
          </Appear>

          <Appear index={1}>
            <Card style={styles.form}>
              <Field label={t('selfReading.newIndex')} icon="speedometer-outline" value={value} onChangeText={(v) => { setValue(v); setError(null); }} keyboardType="decimal-pad" placeholder={String(lastIndex)} hint={t('reading.indexHint', { unit: t('common.unit') })} />
              <View style={styles.consumption}>
                <Text style={type.caption}>{t('agent.consumption')}</Text>
                <Text style={[type.amount, { color: valid ? colors.primary : colors.textSubtle }]}>{formatIndex(consumption)} {t('common.unit')}</Text>
              </View>
              {photo ? (
                <View style={styles.photoWrap}>
                  <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                  <IconButton icon="close" variant="white" size={32} onPress={() => setPhoto(null)} style={styles.photoRemove} accessibilityLabel={t('agent.removePhoto')} />
                </View>
              ) : (
                <Button label={t('agent.takePhoto')} icon="camera-outline" variant="outline" onPress={pickPhoto} />
              )}
            </Card>
          </Appear>

          {!!error && <Notice text={error} tone="danger" />}

          <Appear index={2}>
            <Notice text={t('selfReading.disclaimer')} tone="info" icon="information-circle-outline" />
            <Button label={t('selfReading.submit')} icon="paper-plane-outline" onPress={submit} loading={busy} size="lg" style={styles.submit} />
          </Appear>

          {previous.length > 0 && (
            <Appear index={3}>
              <Card style={styles.previous}>
                <Text style={[type.subheading, styles.previousTitle]}>{t('selfReading.previous')}</Text>
                {previous.slice(0, 3).map((row, index) => (
                  <View key={row.id}>
                    {index > 0 && <Divider />}
                    <Line label={`${row.reference} · ${formatDate(row.createdAt)}`} value={`${formatIndex(row.index)} ${t('common.unit')}`} />
                  </View>
                ))}
              </Card>
            </Appear>
          )}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  chips: { gap: spacing(2), paddingBottom: spacing(4) },
  form: { marginTop: spacing(3) },
  consumption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    marginBottom: spacing(4),
  },
  photoWrap: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  photo: { width: '100%', height: 170 },
  photoRemove: { position: 'absolute', top: spacing(2), right: spacing(2) },
  submit: { marginTop: spacing(3) },
  previous: { marginTop: spacing(5) },
  previousTitle: { marginBottom: spacing(2) },
});

export default SelfReadingScreen;
