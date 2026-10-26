import React, { useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, Field, Header, IconButton, MockBanner, Notice, Screen } from '../../components/ui';
import { Appear, Tap, successFeedback } from '../../components/motion';
import { MOCK_INCIDENT_TYPES, mockDelay } from '../../mocks';
import { newId, newReference } from '../../lib/ids';
import { useAgent } from '../../store/authStore';
import { useLocalStore } from '../../store/localStore';
import { colors, radius, spacing, textStart, type } from '../../theme';

/** MOCK — report a field anomaly (leak, broken meter, illegal connection…). Stored on the device only. */
const IncidentScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const agent = useAgent();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const addIncident = useLocalStore((state) => state.addIncident);

  const [kind, setKind] = useState<string>(MOCK_INCIDENT_TYPES[0].id);
  const [customerCode, setCustomerCode] = useState(code ? String(code) : '');
  const [meterNumber, setMeterNumber] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (description.trim().length < 10) {
      setError(t('incident.tooShort'));
      return;
    }
    setBusy(true);
    try {
      await mockDelay();
      const reference = newReference('INC');
      addIncident({
        id: newId(),
        owner: agent?.email || 'agent',
        reference,
        type: kind,
        description: description.trim(),
        customerCode: customerCode.trim() || undefined,
        meterNumber: meterNumber.trim() || undefined,
        photoUri: photo || undefined,
        createdAt: new Date().toISOString(),
      });
      successFeedback();
      Alert.alert(t('incident.sentTitle'), t('incident.sentBody', { reference }), [{ text: t('common.ok'), onPress: () => router.back() }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll keyboard>
      <Header title={t('incident.title')} subtitle={t('incident.subtitle')} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      <Appear>
        <Text style={[type.label, textStart(), styles.label]}>{t('incident.kind')}</Text>
        <View style={styles.types}>
          {MOCK_INCIDENT_TYPES.map((item) => {
            const active = item.id === kind;
            return (
              <Tap key={item.id} onPress={() => setKind(item.id)} style={[styles.type, active && styles.typeActive]} scale={0.96}>
                <Ionicons name={item.icon} size={20} color={active ? colors.white : colors.primary} />
                <Text style={[styles.typeLabel, active && styles.typeLabelActive]} numberOfLines={2}>
                  {t(item.labelKey)}
                </Text>
              </Tap>
            );
          })}
        </View>
      </Appear>

      <Appear index={1}>
        <Card>
          <Field label={t('auth.clientCode')} icon="key-outline" value={customerCode} onChangeText={setCustomerCode} placeholder="CUST-001" autoCapitalize="characters" autoCorrect={false} hint={t('incident.optional')} />
          <Field label={t('agent.meter')} icon="speedometer-outline" value={meterNumber} onChangeText={setMeterNumber} placeholder="MTR-00000" autoCapitalize="characters" autoCorrect={false} hint={t('incident.optional')} />
          <Field label={t('incident.description')} value={description} onChangeText={setDescription} placeholder={t('incident.descriptionPlaceholder')} multiline />

          {photo ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
              <IconButton icon="close" variant="white" size={32} onPress={() => setPhoto(null)} style={styles.photoRemove} accessibilityLabel={t('agent.removePhoto')} />
            </View>
          ) : (
            <Button label={t('incident.addPhoto')} icon="camera-outline" variant="outline" onPress={pickPhoto} />
          )}
        </Card>
      </Appear>

      {!!error && <Notice text={error} tone="danger" />}

      <Appear index={2}>
        <Button label={t('incident.submit')} icon="paper-plane-outline" onPress={submit} loading={busy} size="lg" style={styles.submit} />
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  label: { marginBottom: spacing(2), marginStart: spacing(1) },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2.5), marginBottom: spacing(4) },
  type: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(2),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeLabel: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold', color: colors.text, textAlign: 'center' },
  typeLabelActive: { color: colors.white },
  photoWrap: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  photo: { width: '100%', height: 160 },
  photoRemove: { position: 'absolute', top: spacing(2), right: spacing(2) },
  submit: { marginTop: spacing(4) },
});

export default IncidentScreen;
