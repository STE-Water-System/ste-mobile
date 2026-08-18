import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Button, Card, Field, Header, Notice, Screen, Segmented } from '../components/ui';
import { complaintsApi, type ComplaintCategory, type ComplaintPriority } from '../services/api';
import { arrowBack, colors, radius, spacing } from '../theme';

/**
 * POST /api/complaints — filed by the agent for a customer they just looked up.
 * The customer-facing route is unusable (see complaintsApi.create), so this is
 * the only way a complaint reaches the backend from the app.
 */
const ComplaintScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ customerId?: string; name?: string }>();
  const customerId = Number(params.customerId);

  const [category, setCategory] = useState<ComplaintCategory>('Technical');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      complaintsApi.create({
        customerId,
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      }),
    onSuccess: () => {
      Alert.alert('', t('complaints.sent'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err: any) => setError(err?.message || t('auth.failed')),
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
    <Screen scroll>
      <Header
        title={t('complaints.new')}
        subtitle={params.name}
        action={
          <TouchableOpacity style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backLabel}>{arrowBack()}</Text>
          </TouchableOpacity>
        }
      />

      <Card>
        <View style={styles.group}>
          <Segmented<ComplaintCategory>
            value={category}
            onChange={setCategory}
            options={[
              { value: 'Technical', label: t('complaints.type_Technical') },
              { value: 'Billing', label: t('complaints.type_Billing') },
              { value: 'Maintenance', label: t('complaints.type_Maintenance') },
              { value: 'Other', label: t('complaints.type_Other') },
            ]}
          />
        </View>

        <View style={styles.group}>
          <Segmented<ComplaintPriority>
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'Low', label: t('complaints.priority_Low') },
              { value: 'Medium', label: t('complaints.priority_Medium') },
              { value: 'High', label: t('complaints.priority_High') },
              { value: 'Urgent', label: t('complaints.priority_Urgent') },
            ]}
          />
        </View>

        <Field
          label={t('complaints.subject')}
          value={subject}
          onChangeText={setSubject}
          maxLength={255}
        />
        <Field
          value={description}
          onChangeText={setDescription}
          placeholder={t('complaints.descriptionPlaceholder')}
          multiline
        />
      </Card>

      {!!error && <Notice text={error} tone="danger" />}

      <Button
        label={t('complaints.submit')}
        onPress={submit}
        loading={create.isPending}
        disabled={!Number.isFinite(customerId) || customerId <= 0}
        style={styles.submit}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  back: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: { fontSize: 16, color: colors.text },

  group: { marginBottom: spacing(3) },
  submit: { marginTop: spacing(5) },
});

export default ComplaintScreen;
