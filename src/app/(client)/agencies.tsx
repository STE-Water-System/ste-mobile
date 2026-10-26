import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card, Divider, Header, MockBanner, Screen, SectionTitle } from '../../components/ui';
import { ListRow } from '../../components/blocks';
import { Appear } from '../../components/motion';
import { MOCK_AGENCIES, MOCK_CONTACT } from '../../mocks';
import { spacing } from '../../theme';

/** MOCK — how to reach STE: hotline, messaging and agencies. */
const AgenciesScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const show = (title: string, value: string) => Alert.alert(title, value);

  return (
    <Screen scroll>
      <Header title={t('services.agencies')} subtitle={t('agencies.subtitle')} onBack={() => router.back()} />
      <MockBanner label={t('mock.banner')} />

      <SectionTitle title={t('agencies.contact')} style={styles.firstSection} />
      <Appear>
        <Card padded={false} style={styles.list}>
          <ListRow icon="call-outline" iconTone="success" title={t('agencies.hotline')} subtitle={MOCK_CONTACT.hotline} meta={t('agencies.hotlineHours')} onPress={() => show(t('agencies.hotline'), MOCK_CONTACT.hotline)} style={styles.row} />
          <Divider inset />
          <ListRow icon="logo-whatsapp" iconTone="success" title={t('agencies.whatsapp')} subtitle={MOCK_CONTACT.whatsapp} onPress={() => show(t('agencies.whatsapp'), MOCK_CONTACT.whatsapp)} style={styles.row} />
          <Divider inset />
          <ListRow icon="mail-outline" title={t('agencies.email')} subtitle={MOCK_CONTACT.email} onPress={() => show(t('agencies.email'), MOCK_CONTACT.email)} style={styles.row} />
        </Card>
      </Appear>

      <SectionTitle title={t('agencies.list')} />
      <Appear index={1}>
        <Card padded={false} style={styles.list}>
          {MOCK_AGENCIES.map((agency, index) => (
            <React.Fragment key={agency.id}>
              {index > 0 && <Divider inset />}
              <ListRow
                icon="business-outline"
                iconTone="accent"
                title={agency.name}
                subtitle={`${agency.address} · ${agency.district}`}
                meta={`${agency.phone} · ${t(agency.hoursKey)}`}
                onPress={() => show(agency.name, `${agency.address}\n${agency.phone}\n${t(agency.hoursKey)}`)}
                style={styles.row}
              />
            </React.Fragment>
          ))}
        </Card>
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  firstSection: { marginTop: spacing(1) },
  list: { paddingHorizontal: spacing(4) },
  row: { paddingVertical: spacing(3.5) },
});

export default AgenciesScreen;
