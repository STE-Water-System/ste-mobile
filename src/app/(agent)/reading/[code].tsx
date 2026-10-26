import React, { useEffect, useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Button, Card, Chip, Divider, Field, Header, IconButton, Line, Loading, Notice, Screen, SectionTitle, Segmented, type Tone } from '../../../components/ui';
import { ListRow } from '../../../components/blocks';
import { Appear, successFeedback } from '../../../components/motion';
import { AGENT_ROUND_KEY } from '../../../hooks/useAgentRound';
import {
  ACCESS_REASONS,
  customerNameOf,
  formatAddress,
  isRejectedStatus,
  meterApi,
  readingIdOf,
  readingMonthOf,
  toDateOnly,
  type AccessReason,
} from '../../../services/api';
import { formatDate, formatIndex, readingIcon, readingLabel, readingTone } from '../../../lib/format';
import { colors, radius, spacing, textStart, type } from '../../../theme';

/** One entry of meterApi.loadCustomerForReading().details */
interface MeterDetail {
  meter: any;
  currentMonthReadings: any[];
  lastApprovedReading: any | null;
  previousIndex: number;
  /** The PENDING or REJECTED row this agent has to complete, if any. */
  assignment: any | null;
  awaitingValidation: any | null;
  approvedThisMonth: any | null;
}

type Access = 'read' | 'blocked';

/**
 * Completing an assigned reading. The row already exists (created by the
 * commercial team when the round was assigned); this screen fills it in with
 * PUT /api/meter-readings/:id — the only write the app performs on a reading.
 */
const ReadingFormScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { code, meterId } = useLocalSearchParams<{ code: string; meterId?: string }>();

  const [searching, setSearching] = useState(true);
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

  // The app never creates a reading: no open row means nothing to do on this meter.
  const assignment = detail?.assignment || null;
  const correcting = isRejectedStatus(assignment);
  const blocked = !assignment;
  const inaccessible = access === 'blocked';

  const parsed = Number(String(currentIndex).replace(/,/g, '.').trim());
  const validIndex = currentIndex.trim().length > 0 && Number.isFinite(parsed);
  const consumption = inaccessible ? 0 : validIndex ? Math.max(0, parsed - previousIndex) : 0;

  const customerName = customer ? customerNameOf(customer) : '';
  const address = formatAddress(customer?.address);
  const longitude = String(customer?.address?.longitude ?? meter?.longitude ?? '');
  const latitude = String(customer?.address?.latitude ?? meter?.latitude ?? '');

  // --- Helpers -------------------------------------------------------------

  const messageFor = (err: any): string => {
    if (err?.isUnauthorized) return t('common.sessionExpired');
    if (err?.isForbidden) return t('common.forbidden');
    if (err?.isNotFound) return t('agent.notFound');
    return err?.message || t('auth.failed');
  };

  /** Prefill the form from the row to complete — a fresh assignment carries no index yet. */
  const selectMeter = (list: MeterDetail[], index: number) => {
    setMeterIndex(index);
    setError(null);
    setPhoto(null);

    const row = list[index]?.assignment;
    // A pending assignment is created at index 0; only a value already recorded
    // (a rejected reading being corrected) is worth putting back in the field.
    const recorded = Number(row?.currentIndex);
    setCurrentIndex(Number.isFinite(recorded) && recorded > 0 ? String(row.currentIndex) : '');
    setComments(row?.comments || '');
    setAccess(row?.accessReason === ACCESS_REASONS.Door_Closed ? 'blocked' : 'read');
  };

  /** GET /api/meter-readings/customer/:code — customer, meters and previous index. */
  const loadCustomer = async ({ silent = false, focusMeterId }: { silent?: boolean; focusMeterId?: number } = {}) => {
    const trimmed = String(code || '').trim();
    if (!trimmed) {
      setSearching(false);
      setError(t('agent.notFound'));
      return;
    }

    setSearching(!silent);
    try {
      const { customer: found, details: loaded } = await meterApi.loadCustomerForReading(trimmed);
      if (!loaded.length) throw new Error(t('agent.noMeter'));

      setCustomer(found);
      setDetails(loaded as MeterDetail[]);

      // Opening a round row focuses its meter; otherwise keep the meter in focus
      // across a refresh, and start on the first one for a plain search.
      const focused =
        focusMeterId != null
          ? loaded.findIndex((item: MeterDetail) => item.meter?.meterId === focusMeterId)
          : -1;
      selectMeter(loaded as MeterDetail[], focused >= 0 ? focused : silent && loaded[meterIndex] ? meterIndex : 0);
      setError(null);
    } catch (err: any) {
      if (silent) {
        console.warn('Refresh failed:', err?.message);
      } else {
        setCustomer(null);
        setDetails([]);
        setError(messageFor(err));
      }
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const focus = Number(meterId);
    loadCustomer({ focusMeterId: Number.isFinite(focus) && focus > 0 ? focus : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, meterId]);

  const pickPhoto = async () => {
    const fromLibrary = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
          mediaTypes: ['images'],
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
    if (!detail || !meter || !assignment) return;
    setError(null);

    if (!inaccessible) {
      if (!validIndex) {
        setError(currentIndex.trim() ? t('agent.invalidIndex') : t('agent.missingIndex'));
        return;
      }
      // A correction may reuse the photo already attached to the rejected reading.
      if (!photo && !assignment.evidencePhotoUrl) {
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
    if (!meter || !assignment) return;

    const readingId = readingIdOf(assignment);
    if (!readingId) {
      setError(t('agent.noAssignment'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        meterId: meter.meterId,
        // Keep the date the round was assigned for: it decides which month the
        // reading is billed in, and a late submission must not shift it.
        readingDate: toDateOnly(assignment.readingDate),
        currentIndex: inaccessible ? previousIndex : parsed,
        previousIndex,
        consumption,
        isInaccessible: inaccessible,
        accessReason: (inaccessible ? ACCESS_REASONS.Door_Closed : ACCESS_REASONS.Accessed) as AccessReason,
        comments: comments.trim() || undefined,
        imageUri: photo || undefined,
        longitude: longitude || undefined,
        latitude: latitude || undefined,
      };

      // PUT /api/meter-readings/:id — completes the assigned row. The backend
      // moves PENDING to SUBMITTED and REJECTED to RE_SUBMITED on its own.
      await meterApi.updateReading(readingId, payload);

      // The row just changed status, so the round no longer reflects the server.
      await queryClient.invalidateQueries({ queryKey: AGENT_ROUND_KEY });

      successFeedback();
      const savedMessage = correcting ? t('agent.resent') : t('agent.sent');
      // A completed assignment is no longer an editable form: back to the round.
      Alert.alert(t('reading.savedTitle'), savedMessage, [{ text: t('common.ok'), onPress: () => router.back() }]);
    } catch (err: any) {
      if (err?.isNotFound) {
        // Reassigned or already handled elsewhere — reload to show its real state.
        setError(t('agent.assignmentGone'));
        loadCustomer({ silent: true });
      } else {
        setError(messageFor(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render --------------------------------------------------------------

  const banner = (): { text: string; tone: Tone; icon: React.ComponentProps<typeof Ionicons>['name'] } | null => {
    if (!detail) return null;
    const month = assignment ? readingMonthOf(assignment, i18n.language) : '';
    if (correcting) return { text: `${t('agent.rejectedNotice')} · ${t('reading.monthOf', { month })}`, tone: 'danger', icon: 'refresh-circle-outline' };
    if (assignment) return { text: `${t('agent.assignedNotice')} · ${t('reading.monthOf', { month })}`, tone: 'info', icon: 'create-outline' };
    if (detail.approvedThisMonth) return { text: t('agent.approvedNotice'), tone: 'success', icon: 'checkmark-circle-outline' };
    if (detail.awaitingValidation) return { text: t('agent.pendingNotice'), tone: 'warning', icon: 'hourglass-outline' };
    return { text: t('agent.noAssignment'), tone: 'warning', icon: 'information-circle-outline' };
  };

  const notice = banner();

  return (
    <Screen scroll keyboard>
      <Header
        title={customerName || t('reading.title')}
        subtitle={[String(code || ''), address].filter(Boolean).join(' · ')}
        onBack={() => router.back()}
        action={!searching && !!customer ? <IconButton icon="refresh-outline" variant="white" onPress={() => loadCustomer({ silent: true })} accessibilityLabel={t('common.retry')} /> : undefined}
      />

      {searching ? (
        <Loading label={t('common.loading')} />
      ) : !customer ? (
        <>
          <Notice text={error || t('agent.notFound')} tone="danger" />
          <Button label={t('common.retry')} variant="secondary" icon="refresh-outline" onPress={() => loadCustomer()} />
        </>
      ) : (
        <>
          {details.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.meters}>
              {details.map((item, index) => (
                <Chip
                  key={item.meter.meterId}
                  label={String(item.meter.meterNumber)}
                  icon="speedometer-outline"
                  active={index === meterIndex}
                  onPress={() => selectMeter(details, index)}
                />
              ))}
            </ScrollView>
          )}

          {!!notice && (
            <Appear>
              <Notice text={notice.text} tone={notice.tone} icon={notice.icon} />
            </Appear>
          )}

          <Appear index={1}>
            <Card style={styles.meterCard}>
              <View style={styles.meterHead}>
                <View style={styles.meterIcon}>
                  <Ionicons name="speedometer" size={22} color={colors.primary} />
                </View>
                <View style={styles.meterText}>
                  <Text style={[type.caption, textStart()]}>{t('agent.meter')}</Text>
                  <Text style={[type.heading, textStart()]} numberOfLines={1}>{meter?.meterNumber || '—'}</Text>
                </View>
                {!!assignment && <Badge label={readingLabel(assignment, t)} tone={readingTone(assignment)} size="sm" />}
              </View>
              <Divider />
              <Line label={t('agent.previousIndex')} value={`${formatIndex(previousIndex)} ${t('common.unit')}`} strong />
              {!!assignment?.readingDate && (
                <>
                  <Divider />
                  <Line label={t('reading.month')} value={readingMonthOf(assignment, i18n.language)} strong />
                  <Divider />
                  <Line label={t('reading.deadline')} value={formatDate(assignment.readingDate)} />
                </>
              )}
            </Card>
          </Appear>

          <Appear index={2}>
            <Card style={styles.form}>
              <Text style={[type.label, textStart(), styles.formLabel]}>{t('agent.access')}</Text>
              <Segmented<Access>
                value={access}
                onChange={(value) => {
                  setAccess(value);
                  setError(null);
                }}
                options={[
                  { value: 'read', label: t('agent.accessed'), icon: 'eye-outline' },
                  { value: 'blocked', label: t('agent.inaccessible'), icon: 'eye-off-outline' },
                ]}
                style={styles.segmented}
              />

              {!inaccessible ? (
                <>
                  <Field
                    label={t('agent.currentIndex')}
                    icon="speedometer-outline"
                    value={currentIndex}
                    onChangeText={(value) => {
                      setCurrentIndex(value);
                      setError(null);
                    }}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    editable={!blocked}
                    hint={t('reading.indexHint', { unit: t('common.unit') })}
                  />

                  <View style={styles.consumption}>
                    <Text style={[type.caption, textStart()]}>{t('agent.consumption')}</Text>
                    <Text style={[type.amount, { color: validIndex ? colors.primary : colors.textSubtle }]}>
                      {formatIndex(consumption)} {t('common.unit')}
                    </Text>
                  </View>

                  <Text style={[type.label, textStart(), styles.formLabel]}>{t('agent.photo')}</Text>
                  {photo ? (
                    <View style={styles.photoWrap}>
                      <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
                      <IconButton icon="close" variant="white" size={32} onPress={() => setPhoto(null)} style={styles.photoRemove} accessibilityLabel={t('agent.removePhoto')} />
                    </View>
                  ) : (
                    <Button
                      label={assignment?.evidencePhotoUrl ? t('agent.retakePhoto') : t('agent.takePhoto')}
                      icon="camera-outline"
                      variant="outline"
                      onPress={pickPhoto}
                      disabled={blocked}
                      style={styles.photoButton}
                    />
                  )}
                </>
              ) : (
                <Notice text={t('reading.inaccessibleHint')} tone="warning" icon="lock-closed-outline" />
              )}

              <Field
                label={t('agent.comment')}
                value={comments}
                onChangeText={setComments}
                placeholder={t('agent.commentPlaceholder')}
                multiline
                editable={!blocked}
                style={styles.comments}
              />
            </Card>
          </Appear>

          {!!error && <Notice text={error} tone="danger" />}

          {!blocked && (
            <Button
              label={correcting ? t('agent.resubmit') : t('agent.submit')}
              icon={correcting ? 'refresh-outline' : 'paper-plane-outline'}
              onPress={submit}
              loading={submitting}
              size="lg"
              style={styles.submit}
            />
          )}

          {detail && detail.currentMonthReadings.length > 0 && (
            <>
              <SectionTitle title={t('agent.history')} />
              <Card padded={false} style={styles.history}>
                {detail.currentMonthReadings.map((reading, index) => (
                  <View key={readingIdOf(reading) ?? index}>
                    {index > 0 && <Divider inset />}
                    <ListRow
                      icon={readingIcon(reading)}
                      iconTone={readingTone(reading)}
                      title={`${formatIndex(reading.currentIndex)} ${t('common.unit')}`}
                      subtitle={formatDate(reading.readingDate || reading.createdAt)}
                      trailing={<Badge label={readingLabel(reading, t)} tone={readingTone(reading)} size="sm" />}
                      onPress={() => router.push({ pathname: '/reading-details', params: { readingId: String(readingIdOf(reading)) } })}
                      style={styles.historyRow}
                    />
                  </View>
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  meters: { gap: spacing(2), paddingBottom: spacing(3) },

  meterCard: { marginTop: spacing(2) },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingBottom: spacing(3) },
  meterIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  meterText: { flex: 1 },

  form: { marginTop: spacing(3) },
  formLabel: { marginBottom: 6, marginStart: spacing(1) },
  segmented: { marginBottom: spacing(4) },
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
  photoButton: { marginBottom: spacing(4) },
  photoWrap: { borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing(4), backgroundColor: colors.surfaceAlt },
  photoPreview: { width: '100%', height: 180 },
  photoRemove: { position: 'absolute', top: spacing(2), right: spacing(2) },
  comments: { marginBottom: 0 },

  submit: { marginTop: spacing(4) },

  history: { paddingHorizontal: spacing(4) },
  historyRow: { paddingVertical: spacing(3) },
});

export default ReadingFormScreen;
