import React from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge, Button, Card, Divider, Empty, Header, MockBanner, Screen } from '../../components/ui';
import { ListRow } from '../../components/blocks';
import { Appear } from '../../components/motion';
import { useRequestRecords } from '../../hooks/useClientRecords';
import { formatDateShort, requestTone } from '../../lib/format';
import { spacing } from '../../theme';

/** MOCK list — the customer's installation / connection requests. */
const RequestsScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const records = useRequestRecords();

  return (
    <Screen scroll>
      <Header title={t('services.requests')} subtitle={t('requests.subtitle', { count: records.filter((row) => row.status !== 'COMPLETED').length })} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      <Appear>
        <Button label={t('requests.new')} icon="add-circle-outline" variant="secondary" onPress={() => router.push('/(client)/installation')} style={styles.new} />
      </Appear>

      {records.length === 0 ? (
        <Empty icon="document-text-outline" text={t('requests.empty')} />
      ) : (
        <Card padded={false} style={styles.list}>
          {records.map((row, index) => (
            <Appear key={row.id} index={index}>
              {index > 0 && <Divider inset />}
              <ListRow
                icon="construct-outline"
                iconTone={requestTone(row.status)}
                title={t(`installation.kind.${row.kind}`)}
                subtitle={`${row.reference} · ${[row.street, row.quarter].filter(Boolean).join(', ')}`}
                meta={formatDateShort(row.updatedAt, i18n.language)}
                trailing={<Badge label={t(`requestStatus.${row.status}`)} tone={requestTone(row.status)} size="sm" />}
                onPress={() => router.push({ pathname: '/(client)/request/[id]', params: { id: row.id } })}
                style={styles.row}
              />
            </Appear>
          ))}
        </Card>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  new: { marginBottom: spacing(4) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3.5) },
});

export default RequestsScreen;
