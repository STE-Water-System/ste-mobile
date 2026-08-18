import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Button, Card, Field, Header, Notice, Screen, Segmented } from '../../components/ui';
import {
  complaintsApi,
  type ComplaintCategory,
  type ComplaintPriority,
} from '../../services/api';
import { spacing } from '../../theme';
import { useCustomer } from '../../store/authStore';

const ComplaintsScreen = () => {
  const { t } = useTranslation();
  const customer = useCustomer();

  const [category, setCategory] = useState<ComplaintCategory>('Technical');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [subject, setSubject] = useState('');
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
      setSubject('');
      setDescription('');
      Alert.alert('', t('complaints.sent'));
    },
    onError: (err: any) => {
      // The route forces an invalid `status` on insert, so every submission is
      // rejected until that is corrected server-side. Raw SQL text would mean
      // nothing to a customer.
      const message = String(err?.message || '');
      setError(
        /truncated|status/i.test(message) ? t('complaints.unavailable') : message || t('auth.failed')
      );
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
    <Screen scroll>
      <Header title={t('client.tabComplaints')} subtitle={t('complaints.subtitle')} />

      <Card>
        <View style={styles.group}>
          <Segmented<ComplaintCategory>
            value={category}
            onChange={setCategory}
            options={[
              { value: 'Technical', label: t('complaints.type_Technical') },
              { value: 'Billing', label: t('complaints.type_Billing') },
              { value: 'Service', label: t('complaints.type_Service') },
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
              { value: 'Critical', label: t('complaints.priority_Critical') },
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
        disabled={!customer}
        style={styles.submit}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  group: { marginBottom: spacing(3) },
  submit: { marginTop: spacing(5) },
});

export default ComplaintsScreen;
