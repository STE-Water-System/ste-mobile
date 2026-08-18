import React, { useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
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
  Segmented,
  TextLink,
  type Tone,
} from '../../components/ui';
import { SettingsButton } from '../../components/SettingsButton';
import {
  ACCESS_REASONS,
  READING_STATUS,
  formatAddress,
  meterApi,
  type AccessReason,
} from '../../services/api';
import { formatDate, readingLabel, readingTone } from '../../lib/format';
import { colors, radius, spacing, textStart, type } from '../../theme';

/** One entry of meterApi.loadCustomerForReading().details */
interface MeterDetail {
  meter: any;
  currentMonthReadings: any[];
  lastApprovedReading: any | null;
  previousIndex: number;
  pendingReading: any | null;
  approvedThisMonth: any | null;
  rejectedThisMonth: any | null;
  blocked: boolean;
  blockedReason: string | null;
}

type Access = 'read' | 'blocked';

const ReadingScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<any | null>(null);
  const [details, setDetails] = useState<MeterDetail[]>([]);
  const [meterIndex, setMeterIndex] = useState(0);

  const [currentIndex, setCurrentIndex] = useState('');
  const [comments, setComments] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [access, setAccess] = useState<Access>('read');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Derived state -------------------------------------------------------

  const detail: MeterDetail | null = details[meterIndex] || null;
  const meter = detail?.meter || null;
  const previousIndex = detail?.previousIndex ?? 0;

  // The backend refuses a second reading for the same meter and month (409), so a
  // rejected reading has to be corrected in place with PUT /api/meter-readings/:id.
  const editing = detail?.rejectedThisMonth || null;
  const blocked = Boolean(detail?.blocked);
  const inaccessible = access === 'blocked';

  const parsed = Number(String(currentIndex).replace(/,/g, '.').trim());
  const validIndex = currentIndex.trim().length > 0 && Number.isFinite(parsed);
  const consumption = inaccessible ? 0 : validIndex ? Math.max(0, parsed - previousIndex) : 0;

  const customerName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : '';
  const longitude = String(customer?.address?.longitude ?? meter?.longitude ?? '');
  const latitude = String(customer?.address?.latitude ?? meter?.latitude ?? '');

  // --- Helpers -------------------------------------------------------------

  const messageFor = (err: any): string => {
    if (err?.isUnauthorized) return t('common.sessionExpired');
    if (err?.isForbidden) return t('common.forbidden');
    if (err?.isNotFound) return t('agent.notFound');
    if (err?.isDuplicate) return t('agent.duplicate');
    return err?.message || t('auth.failed');
  };

  /** Prefill the form for a meter — with the rejected reading's values when correcting one. */
  const selectMeter = (list: MeterDetail[], index: number) => {
    setMeterIndex(index);
    setError(null);
    setPhoto(null);

    const rejected = list[index]?.rejectedThisMonth;
    setCurrentIndex(rejected?.currentIndex != null ? String(rejected.currentIndex) : '');
    setComments(rejected?.comments || '');
    setAccess(rejected?.accessReason === ACCESS_REASONS.Door_Closed ? 'blocked' : 'read');
  };

  const clearForm = () => {
    setCurrentIndex('');
    setComments('');
    setPhoto(null);
    setAccess('read');
    setError(null);
  };

  const clearCustomer = () => {
    setCustomer(null);
    setDetails([]);
    setMeterIndex(0);
    clearForm();
  };

  /** GET /api/meter-readings/customer/:code — customer, meters and previous index. */
  const loadCustomer = async (raw: string, { silent = false } = {}) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setSearching(true);
    try {
      const { customer: found, details: loaded } = await meterApi.loadCustomerForReading(trimmed);
      if (!loaded.length) throw new Error(t('agent.noMeter'));

      setCustomer(found);
      setDetails(loaded as MeterDetail[]);

      // Keep the meter in focus across a refresh, otherwise start on the first one.
      selectMeter(loaded as MeterDetail[], silent && loaded[meterIndex] ? meterIndex : 0);
    } catch (err: any) {
      if (silent) {
        console.warn('Refresh failed:', err?.message);
      } else {
        clearCustomer();
        setError(messageFor(err));
      }
    } finally {
      setSearching(false);
    }
  };

  const pickPhoto = async () => {
    const fromLibrary = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
    };

    if (Platform.OS === 'web') {
      await fromLibrary();
      return;
    }

    const camera = await ImagePicker.requestCameraPermissionsAsync();
    if (camera.status === 'granted') {
      try {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
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
    if (!detail || !meter || blocked) return;
    setError(null);

    if (!inaccessible) {
      if (!validIndex) {
        setError(currentIndex.trim() ? t('agent.invalidIndex') : t('agent.missingIndex'));
        return;
      }
      // A correction may reuse the photo already attached to the rejected reading.
      if (!photo && !editing?.evidencePhotoUrl) {
        setError(t('agent.missingPhoto'));
        return;
      }
      if (parsed < previousIndex) {
        Alert.alert(
          t('agent.lowerIndexTitle'),
          t('agent.lowerIndexBody', { current: parsed, previous: previousIndex }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.confirm'), onPress: () => send() },
          ]
        );
        return;
      }
    }

    await send();
  };

  const send = async () => {
    if (!meter) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        meterId: meter.meterId,
        readingDate: new Date().toISOString().slice(0, 10),
        currentIndex: inaccessible ? previousIndex : parsed,
        previousIndex,
        consumption,
        isInaccessible: inaccessible,
        accessReason: (inaccessible
          ? ACCESS_REASONS.Door_Closed
          : ACCESS_REASONS.Accessed) as AccessReason,
        comments: comments.trim() || undefined,
        imageUri: photo || undefined,
        longitude: longitude || undefined,
        latitude: latitude || undefined,
      };

      if (editing) {
        // PUT /api/meter-readings/:id — correct and resubmit.
        const readingId = editing.meterReadingId ?? editing.readingId ?? editing.id;
        await meterApi.updateReading(readingId, { ...payload, status: READING_STATUS.RE_SUBMITED });
      } else {
        // POST /api/meter-readings/new — status becomes PENDING.
        await meterApi.submitReading(payload);
      }

      Alert.alert('', editing ? t('agent.resent') : t('agent.sent'), [
        {
          text: t('common.ok'),
          onPress: () => {
            clearForm();
            // Reload so the blocking state reflects what the server now holds.
            loadCustomer(searchId, { silent: true });
          },
        },
      ]);
    } catch (err: any) {
      if (err?.isDuplicate) {
        // The reading may belong to another agent, in which case it stays
        // invisible here — the backend scopes listings to their author.
        setError(t('agent.duplicateOther'));
        loadCustomer(searchId, { silent: true });
      } else {
        setError(messageFor(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render --------------------------------------------------------------

  const notice = (): { text: string; tone: Tone } | null => {
    if (!detail) return null;
    if (detail.approvedThisMonth) return { text: t('agent.approvedNotice'), tone: 'success' };
    if (detail.pendingReading) return { text: t('agent.pendingNotice'), tone: 'warning' };
    if (detail.rejectedThisMonth) return { text: t('agent.rejectedNotice'), tone: 'danger' };
    return null;
  };

  const banner = notice();

  return (
    <Screen scroll>
      <Header title={t('agent.tabReading')} action={<SettingsButton />} />

      {!customer ? (
        <>
          <Field
            label={t('agent.searchLabel')}
            value={searchId}
            onChangeText={setSearchId}
            placeholder={t('agent.searchPlaceholder')}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => loadCustomer(searchId)}
          />
          <Button
            label={t('common.search')}
            onPress={() => loadCustomer(searchId)}
            loading={searching}
            disabled={!searchId.trim()}
          />
          {!!error && <Notice text={error} tone="danger" />}
          {!error && <Empty text={t('agent.searchHint')} />}
        </>
      ) : searching ? (
        <Loading />
      ) : (
        <>
          <View style={styles.client}>
            <View style={styles.clientText}>
              <Text style={[type.heading, textStart()]} numberOfLines={1}>
                {customerName}
              </Text>
              <Text style={[type.caption, textStart()]} numberOfLines={1}>
                {customer.customerCode}
                {formatAddress(customer.address) ? ` · ${formatAddress(customer.address)}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={clearCustomer} hitSlop={8}>
              <Text style={styles.change}>{t('agent.change')}</Text>
            </TouchableOpacity>
          </View>

          {details.length > 1 && (
            <View style={styles.meters}>
              {details.map((item, index) => {
                const active = index === meterIndex;
                return (
                  <TouchableOpacity
                    key={item.meter.meterId}
                    style={[styles.meterChip, active && styles.meterChipActive]}
                    onPress={() => selectMeter(details, index)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.meterChipText, active && styles.meterChipTextActive]}>
                      {item.meter.meterNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!!banner && <Notice text={banner.text} tone={banner.tone} />}

          <Card style={styles.form}>
            <Line label={t('agent.meter')} value={meter?.meterNumber || '—'} />
            <Divider />
            <Line
              label={t('agent.previousIndex')}
              value={`${previousIndex} ${t('common.unit')}`}
            />
            <Divider />

            <View style={styles.access}>
              <Segmented<Access>
                value={access}
                onChange={(value) => {
                  setAccess(value);
                  setError(null);
                }}
                options={[
                  { value: 'read', label: t('agent.accessed') },
                  { value: 'blocked', label: t('agent.inaccessible') },
                ]}
              />
            </View>

            {!inaccessible && (
              <>
                <Field
                  label={t('agent.currentIndex')}
                  value={currentIndex}
                  onChangeText={(value) => {
                    setCurrentIndex(value);
                    setError(null);
                  }}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  editable={!blocked}
                />

                <Line
                  label={t('agent.consumption')}
                  value={`${consumption} ${t('common.unit')}`}
                  strong
                />

                <TouchableOpacity
                  style={styles.photo}
                  onPress={pickPhoto}
                  disabled={blocked}
                  activeOpacity={0.85}
                >
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
                  ) : (
                    <Text style={styles.photoLabel}>
                      {editing?.evidencePhotoUrl ? t('agent.retakePhoto') : t('agent.takePhoto')}
                    </Text>
                  )}
                </TouchableOpacity>
                {!!photo && <TextLink label={t('agent.removePhoto')} onPress={() => setPhoto(null)} />}
              </>
            )}

            <Field
              value={comments}
              onChangeText={setComments}
              placeholder={t('agent.commentPlaceholder')}
              multiline
              editable={!blocked}
            />
          </Card>

          {!!error && <Notice text={error} tone="danger" />}

          {!blocked && (
            <Button
              label={editing ? t('agent.resubmit') : t('agent.submit')}
              onPress={submit}
              loading={submitting}
              style={styles.submit}
            />
          )}

          {detail && detail.currentMonthReadings.length > 0 && (
            <View style={styles.history}>
              <Text style={[type.label, textStart(), styles.historyTitle]}>{t('agent.history')}</Text>
              <Card>
                {detail.currentMonthReadings.map((reading, index) => (
                  <View key={reading.meterReadingId ?? reading.id ?? index}>
                    {index > 0 && <Divider />}
                    <TouchableOpacity
                      style={styles.historyRow}
                      activeOpacity={0.7}
                      onPress={() =>
                        router.push({
                          pathname: '/reading-details',
                          params: { readingId: String(reading.meterReadingId ?? reading.id) },
                        })
                      }
                    >
                      <View style={styles.historyText}>
                        <Text style={[type.bodyStrong, textStart()]}>
                          {reading.currentIndex} {t('common.unit')}
                        </Text>
                        <Text style={[type.caption, textStart()]}>
                          {formatDate(reading.readingDate || reading.createdAt)}
                        </Text>
                      </View>
                      <Badge label={readingLabel(reading, t)} tone={readingTone(reading)} />
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            </View>
          )}
      </>
    )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  client: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingBottom: spacing(4),
  },
  clientText: { flex: 1 },
  change: { fontSize: 12, fontWeight: '600', color: colors.primary },

  meters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(4) },
  meterChip: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  meterChipActive: { backgroundColor: colors.primary },
  meterChipText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  meterChipTextActive: { color: colors.white },

  form: { marginTop: spacing(3) },
  access: { paddingVertical: spacing(3) },

  photo: {
    height: 132,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing(3),
  },
  photoPreview: { width: '100%', height: '100%' },
  photoLabel: { fontSize: 13, fontWeight: '600', color: colors.textSubtle },

  submit: { marginTop: spacing(4) },

  history: { marginTop: spacing(7) },
  historyTitle: { marginBottom: spacing(2), marginStart: spacing(2) },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2.5),
    gap: spacing(3),
  },
  historyText: { flex: 1 },
});

export default ReadingScreen;
