import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Button, Card, Chip, Field, Header, Notice, Screen } from '../../components/ui';
import { Appear, successFeedback } from '../../components/motion';
import { complaintsApi, type ComplaintCategory, type ComplaintPriority, COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES } from '../../services/api';
import { newId, newReference } from '../../lib/ids';
import { useCustomer } from '../../store/authStore';
import { useLocalStore } from '../../store/localStore';
import { spacing, textStart, type } from '../../theme';

/**
 * File a complaint ("réclamation"). The submission is the existing backend call
 * (POST /api/client/complaints, unchanged); the local copy only feeds the
 * "plaintes" list until a customer-facing complaints endpoint exists.
 */
const ReclamationScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const customer = useCustomer();
  const params = useLocalSearchParams<{ category?: string; subject?: string }>();
  const addComplaint = useLocalStore((state) => state.addComplaint);

  const [category, setCategory] = useState<ComplaintCategory>(
    (COMPLAINT_CATEGORIES as readonly string[]).includes(params.category ?? '') ? (params.category as ComplaintCategory) : 'Technical'
  );
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [subject, setSubject] = useState(params.subject ?? '');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      complaintsApi.create({
        customerId: customer!.customerId,
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      }),
    onSuccess: () => {
      const reference = newReference('REC');
      const now = new Date().toISOString();
      addComplaint({
        id: newId(),
        owner: customer?.customerCode ?? '',
        reference,
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        status: 'Open',
        createdAt: now,
        updatedAt: now,
        origin: 'synced',
      });
      successFeedback();
      setSubject('');
      setDescription('');
      Alert.alert(t('complaints.sent'), t('reclamation.sentBody', { reference }), [
        { text: t('common.ok'), onPress: () => router.replace('/(client)/complaints') },
      ]);
    },
    onError: (err: any) => {
      // The route forces an invalid `status` on insert, so every submission is
      // rejected until that is corrected server-side. Raw SQL text would mean
      // nothing to a customer.
      const message = String(err?.message || '');
      setError(/truncated|status/i.test(message) ? t('complaints.unavailable') : message || t('auth.failed'));
    },
  });

  const submit = () => {
    setError(null);
    // description is optional to the validator but NOT NULL in the model.
    if (!subject.trim() || !description.trim()) {
      setError(t('complaints.missingFields'));
      return;
    }
    create.mutate();
  };

  return (
    <Screen scroll keyboard>
      <Header title={t('services.reclamation')} subtitle={t('complaints.subtitle')} onBack={() => router.back()} />

      <Appear>
        <Text style={[type.label, textStart(), styles.label]}>{t('reclamation.category')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {COMPLAINT_CATEGORIES.map((item) => (
            <Chip key={item} label={t(`complaints.type_${item}`)} active={item === category} onPress={() => setCategory(item)} />
          ))}
        </ScrollView>

        <Text style={[type.label, textStart(), styles.label]}>{t('reclamation.priority')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {COMPLAINT_PRIORITIES.map((item) => (
            <Chip key={item} label={t(`complaints.priority_${item}`)} active={item === priority} onPress={() => setPriority(item)} tone={item === 'Critical' ? 'danger' : item === 'High' ? 'warning' : 'info'} />
          ))}
        </ScrollView>
      </Appear>

      <Appear index={1}>
        <Card>
          <Field label={t('complaints.subject')} icon="create-outline" value={subject} onChangeText={setSubject} maxLength={255} placeholder={t('reclamation.subjectPlaceholder')} />
          <Field label={t('reclamation.description')} value={description} onChangeText={setDescription} placeholder={t('complaints.descriptionPlaceholder')} multiline style={styles.last} />
        </Card>
      </Appear>

      {!!error && <Notice text={error} tone="danger" />}

      <Appear index={2}>
        <Notice text={t('reclamation.followHint')} tone="info" icon="time-outline" />
        <Button label={t('complaints.submit')} icon="paper-plane-outline" onPress={submit} loading={create.isPending} disabled={!customer} size="lg" style={styles.submit} />
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  label: { marginBottom: spacing(2), marginStart: spacing(1) },
  chips: { gap: spacing(2), paddingBottom: spacing(4) },
  last: { marginBottom: 0 },
  submit: { marginTop: spacing(3) },
});

export default ReclamationScreen;
