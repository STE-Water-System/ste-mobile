import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Button, Card, Field, Header, Notice, Screen, Segmented } from '../../components/ui';
import { SettingsButton } from '../../components/SettingsButton';
import { clientApi } from '../../services/api';
import { spacing } from '../../theme';
import { useCustomer } from '../../store/authStore';

type ComplaintType = 'Technical' | 'Billing' | 'Other';

const ComplaintsScreen = () => {
  const { t } = useTranslation();
  const customer = useCustomer();

  const [complainType, setComplainType] = useState<ComplaintType>('Technical');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      clientApi.createComplaint({
        customerId: customer!.customerId,
        subject: subject.trim(),
        description: description.trim(),
        complainType,
      }),
    onSuccess: () => {
      setSubject('');
      setDescription('');
      setComplainType('Technical');
      Alert.alert('', t('complaints.sent'));
    },
    onError: (err: any) => setError(err?.message || t('auth.failed')),
  });

  const submit = () => {
    setError(null);
    if (!subject.trim() || !description.trim()) {
      setError(t('complaints.missingFields'));
      return;
    }
    create.mutate();
  };

  return (
    <Screen scroll>
      <Header title={t('complaints.title')} action={<SettingsButton />} />

      <Card>
        <View style={styles.types}>
          <Segmented<ComplaintType>
            value={complainType}
            onChange={setComplainType}
            options={[
              { value: 'Technical', label: t('complaints.type_Technical') },
              { value: 'Billing', label: t('complaints.type_Billing') },
              { value: 'Other', label: t('complaints.type_Other') },
            ]}
          />
        </View>

        <Field
          label={t('complaints.subject')}
          value={subject}
          onChangeText={setSubject}
          maxLength={120}
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
        style={styles.submit}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  types: { marginBottom: spacing(4) },
  submit: { marginTop: spacing(5) },
});

export default ComplaintsScreen;
