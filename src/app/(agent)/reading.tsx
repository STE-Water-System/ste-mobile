import React, { useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  ACCESS_REASONS,
  customerNameOf,
  customerOf,
  formatAddress,
  isRejectedStatus,
  meterApi,
  readingIdOf,
  summarizeRound,
  toDateOnly,
  type AccessReason,
} from '../../services/api';
import { formatDate, readingLabel, readingTone } from '../../lib/format';
import { arrowBack, colors, radius, spacing, textStart, type } from '../../theme';

/** One counter of the round header. */
const Stat = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, strong && styles.statValueStrong]}>{value}</Text>
    <Text style={[type.caption, styles.statLabel]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

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

const ReadingScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

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
  const [feedback, setFeedback] = useState<string | null>(null);

  // The rows the commercial assigned to this agent — the screen's home state.
  const round = useQuery({
    queryKey: ['agent-round'],
    queryFn: async () => {
      const assigned = await meterApi.getAssignedRound();
      // Keep the counters consistent with the rows the agent can actually see.
      // There is no summary route in the current backend contract.
      return { items: assigned.items, summary: summarizeRound(assigned.items) };
    },
  });

  // --- Derived state -------------------------------------------------------

  const roundItems: any[] = round.data?.items ?? [];
  const summary = round.data?.summary ?? { total: 0, todo: 0, sent: 0 };

  const detail: MeterDetail | null = details[meterIndex] || null;
  const meter = detail?.meter || null;
  const previousIndex = detail?.previousIndex ?? 0;

  // The app never creates a reading: the commercial pre-creates one row per meter
  // when assigning the round, and the agent completes it in place with
  // PUT /api/meter-readings/:id. No open row means nothing to do on this meter.
  const assignment = detail?.assignment || null;
  const correcting = isRejectedStatus(assignment);
  const blocked = !assignment;
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

  const clearForm = () => {
    setCurrentIndex('');
    setComments('');
    setPhoto(null);
    setAccess('read');
    setError(null);
  };

  const resetCustomer = () => {
    setCustomer(null);
    setDetails([]);
    setMeterIndex(0);
    clearForm();
  };

  const clearCustomer = () => {
    setFeedback(null);
    resetCustomer();
  };

  /** GET /api/meter-readings/customer/:code — customer, meters and previous index. */
  const loadCustomer = async (
    raw: string,
    { silent = false, focusMeterId }: { silent?: boolean; focusMeterId?: number } = {}
  ) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setFeedback(null);
    setSearching(true);
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
      selectMeter(
        loaded as MeterDetail[],
        focused >= 0 ? focused : silent && loaded[meterIndex] ? meterIndex : 0
      );
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

  /** Open a round row on its own meter, as if the agent had searched for the code. */
  const openRound = (row: any) => {
    const code = customerOf(row)?.customerCode;
    if (!code) return;
    setSearchId(String(code));
    loadCustomer(String(code), { focusMeterId: row.meterId ?? row.meter?.meterId });
  };

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
        accessReason: (inaccessible
          ? ACCESS_REASONS.Door_Closed
          : ACCESS_REASONS.Accessed) as AccessReason,
        comments: comments.trim() || undefined,
        imageUri: photo || undefined,
        longitude: longitude || undefined,
        latitude: latitude || undefined,
      };

      // PUT /api/meter-readings/:id — completes the assigned row. The backend
      // moves PENDING to SUBMITTED and REJECTED to RE_SUBMITED on its own.
      await meterApi.updateReading(readingId, payload);

      // The row just changed status, so the round no longer reflects the server.
      await queryClient.invalidateQueries({ queryKey: ['agent-round'] });

      const savedMessage = correcting ? t('agent.resent') : t('agent.sent');
      setFeedback(savedMessage);
      // A completed assignment is no longer an editable form. Return to the
      // round immediately so the agent can pick the next customer.
      resetCustomer();
      Alert.alert('', savedMessage, [{ text: t('common.ok') }]);
    } catch (err: any) {
      if (err?.isNotFound) {
        // Reassigned or already handled elsewhere — reload to show its real state.
        setError(t('agent.assignmentGone'));
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
    if (correcting) return { text: t('agent.rejectedNotice'), tone: 'danger' };
    if (assignment) return { text: t('agent.assignedNotice'), tone: 'info' };
    if (detail.approvedThisMonth) return { text: t('agent.approvedNotice'), tone: 'success' };
    if (detail.awaitingValidation) return { text: t('agent.pendingNotice'), tone: 'warning' };
    return { text: t('agent.noAssignment'), tone: 'warning' };
  };

  const banner = notice();

  return (
    <Screen scroll>
      <Header
        title={t('agent.tabReading')}
        action={
          customer ? (
            <TouchableOpacity
              style={styles.headerBack}
              onPress={clearCustomer}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <Text style={styles.headerBackLabel}>{arrowBack()}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {!customer ? (
        <>
          {!!feedback && <Notice text={feedback} tone="success" />}
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

          {/* The round: what this agent was assigned, most urgent first. */}
          {round.isPending ? (
            <Loading />
          ) : round.error ? (
            <Notice text={messageFor(round.error)} tone="danger" />
          ) : roundItems.length === 0 ? (
            <Empty text={t('agent.roundEmpty')} />
          ) : (
            <>
              <View style={styles.stats}>
                <Stat label={t('agent.roundTotal')} value={summary.total} />
                <Stat label={t('agent.roundTodo')} value={summary.todo} strong />
                <Stat label={t('agent.roundSent')} value={summary.sent} />
              </View>

              <Text style={[type.label, textStart(), styles.roundTitle]}>{t('agent.round')}</Text>
              <Card>
                {roundItems.map((row: any, index: number) => {
                  const rowCustomer = customerOf(row);
                  const code = rowCustomer?.customerCode;
                  const name = customerNameOf(rowCustomer);
                  const meterNumber = row.meter?.meterNumber || row.meterNumber;

                  return (
                    <View key={readingIdOf(row) ?? index}>
                      {index > 0 && <Divider />}
                      <TouchableOpacity
                        style={styles.roundRow}
                        activeOpacity={0.7}
                        disabled={!code}
                        onPress={() => openRound(row)}
                      >
                        <View style={styles.roundText}>
                          <Text style={[type.bodyStrong, textStart()]} numberOfLines={1}>
                            {name || meterNumber || '—'}
                          </Text>
                          <Text style={[type.caption, textStart()]} numberOfLines={1}>
                            {[code, meterNumber].filter(Boolean).join(' · ') || '—'}
                          </Text>
                        </View>
                        <Badge label={readingLabel(row, t)} tone={readingTone(row)} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </Card>
            </>
          )}
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
                      {assignment?.evidencePhotoUrl ? t('agent.retakePhoto') : t('agent.takePhoto')}
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
              label={correcting ? t('agent.resubmit') : t('agent.submit')}
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
                  <View key={readingIdOf(reading) ?? index}>
                    {index > 0 && <Divider />}
                    <TouchableOpacity
                      style={styles.historyRow}
                      activeOpacity={0.7}
                      onPress={() =>
                        router.push({
                          pathname: '/reading-details',
                          params: { readingId: String(readingIdOf(reading)) },
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
  stats: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(5) },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing(0.5),
    paddingVertical: spacing(3.5),
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statValueStrong: { color: colors.primary },
  statLabel: { textAlign: 'center' },

  headerBack: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackLabel: { fontSize: 16, color: colors.textMuted },

  roundTitle: { marginTop: spacing(6), marginBottom: spacing(2), marginStart: spacing(2) },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2.5),
    gap: spacing(3),
  },
  roundText: { flex: 1 },

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
