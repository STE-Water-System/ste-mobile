import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Field, Notice, Segmented, TextLink } from '../../components/ui';
import { SettingsButton } from '../../components/SettingsButton';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, shadow, spacing } from '../../theme';

type Space = 'client' | 'agent';

const LoginScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const loginClient = useAuthStore((state) => state.loginClient);
  const loginAgent = useAuthStore((state) => state.loginAgent);

  const [space, setSpace] = useState<Space>('client');
  const [customerCode, setCustomerCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchSpace = (next: Space) => {
    setSpace(next);
    setError(null);
  };

  const submit = async () => {
    setError(null);

    if (space === 'client') {
      if (!customerCode.trim() || !phone.trim()) {
        setError(t('auth.missingClient'));
        return;
      }
    } else if (!email.trim() || !password) {
      setError(t('auth.missingAgent'));
      return;
    }

    setBusy(true);
    try {
      if (space === 'client') {
        await loginClient(customerCode, phone);
        router.replace('/(client)/bills');
      } else {
        await loginAgent(email.trim().toLowerCase(), password);
        router.replace('/(agent)/reading');
      }
    } catch (err: any) {
      // 401 here means the pair simply does not match any record.
      setError(err?.isUnauthorized || err?.isNotFound ? t('auth.notFound') : err?.message || t('auth.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <SettingsButton />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={styles.logoFrame}>
              <Image
                source={require('../../../assets/splash-icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>STE</Text>
          </View>

          <Segmented<Space>
            value={space}
            onChange={switchSpace}
            options={[
              { value: 'client', label: t('auth.clientTab') },
              { value: 'agent', label: t('auth.agentTab') },
            ]}
          />

          <View style={styles.form}>
            {space === 'client' ? (
              <>
                <Field
                  label={t('auth.clientCode')}
                  value={customerCode}
                  onChangeText={setCustomerCode}
                  placeholder="CUST-001"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <Field
                  label={t('auth.phone')}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="66000001"
                  keyboardType="phone-pad"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
              </>
            ) : (
              <>
                <Field
                  label={t('auth.email')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="agent@ste.td"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <Field
                  label={t('auth.password')}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  trailing={
                    <TouchableOpacity onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
                      <Text style={styles.reveal}>{showPassword ? t('auth.hide') : t('auth.show')}</Text>
                    </TouchableOpacity>
                  }
                />
              </>
            )}

            {!!error && <Notice text={error} tone="danger" />}

            <Button
              label={space === 'client' ? t('auth.clientSubmit') : t('auth.agentSubmit')}
              onPress={submit}
              loading={busy}
              style={styles.submit}
            />

            <TextLink
              label={space === 'client' ? t('auth.helpLink') : t('auth.forgotLink')}
              onPress={() =>
                Alert.alert(
                  space === 'client' ? t('auth.helpTitle') : t('auth.forgotTitle'),
                  space === 'client' ? t('auth.helpBody') : t('auth.forgotBody')
                )
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Text style={styles.footer}>{t('auth.footer', { year: new Date().getFullYear() })}</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topBar: { alignItems: 'flex-end', paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  body: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing(7), paddingBottom: spacing(6) },

  brand: { alignItems: 'center', marginBottom: spacing(8) },
  logoFrame: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  logo: { width: 46, height: 46 },
  brandName: {
    marginTop: spacing(3),
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 3,
  },

  form: { marginTop: spacing(6) },
  reveal: { fontSize: 12, fontWeight: '600', color: colors.primary },
  submit: { marginTop: spacing(2) },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.placeholder,
    paddingBottom: spacing(4),
  },
});

export default LoginScreen;
