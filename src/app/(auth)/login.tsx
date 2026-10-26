import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Field, Notice, Segmented, TextLink } from '../../components/ui';
import { Appear } from '../../components/motion';
import { useAuthStore } from '../../store/authStore';
import { colors, gradients, radius, shadow, spacing, textStart, type } from '../../theme';

type Space = 'client' | 'agent';

/**
 * Sign-in for both spaces. Customers verify with code + phone (unchanged
 * backend call). Agents sign in with email + password (unchanged backend call)
 * and then confirm a one-time code on the next screen.
 */
const LoginScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        router.replace('/(client)/(tabs)/home');
      } else {
        await loginAgent(email.trim().toLowerCase(), password);
        // With the second factor enabled the store parks the account until the
        // code is confirmed; otherwise the session is already open.
        if (useAuthStore.getState().pendingAgent) {
          router.push('/(auth)/otp');
        } else {
          router.replace('/(agent)/(tabs)/home');
        }
      }
    } catch (err: any) {
      // 401 here means the pair simply does not match any record.
      setError(err?.isUnauthorized || err?.isNotFound ? t('auth.notFound') : err?.message || t('auth.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.backdrop}>
        <View style={[styles.orb, styles.orbA]} />
        <View style={[styles.orb, styles.orbB]} />
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingTop: insets.top + spacing(8), paddingBottom: insets.bottom + spacing(6) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Appear from="down">
            <View style={styles.brand}>
              <View style={styles.logoFrame}>
                <Image source={require('../../../assets/splash-icon.png')} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.brandName}>STE</Text>
              <Text style={styles.brandTagline}>{t('auth.tagline')}</Text>
            </View>
          </Appear>

          <Appear index={2} from="up">
            <View style={styles.card}>
              <Segmented<Space>
                value={space}
                onChange={switchSpace}
                options={[
                  { value: 'client', label: t('auth.clientTab'), icon: 'person-outline' },
                  { value: 'agent', label: t('auth.agentTab'), icon: 'id-card-outline' },
                ]}
              />

              <Text style={[type.heading, textStart(), styles.formTitle]}>
                {space === 'client' ? t('auth.clientTitle') : t('auth.agentTitle')}
              </Text>
              <Text style={[type.caption, textStart(), styles.formSubtitle]}>
                {space === 'client' ? t('auth.clientSubtitle') : t('auth.agentSubtitle')}
              </Text>

              {space === 'client' ? (
                <>
                  <Field
                    label={t('auth.clientCode')}
                    icon="key-outline"
                    value={customerCode}
                    onChangeText={setCustomerCode}
                    placeholder="CUST-001"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                  <Field
                    label={t('auth.phone')}
                    icon="call-outline"
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
                    icon="mail-outline"
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
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    trailing={
                      <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={colors.textSubtle}
                        />
                      </Pressable>
                    }
                  />
                  <View style={styles.otpHint}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                    <Text style={[type.caption, textStart(), styles.otpHintText]}>{t('auth.otpHint')}</Text>
                  </View>
                </>
              )}

              {!!error && <Notice text={error} tone="danger" />}

              <Button
                label={space === 'client' ? t('auth.clientSubmit') : t('auth.agentSubmit')}
                onPress={submit}
                loading={busy}
                size="lg"
                iconEnd="arrow-forward"
                style={styles.submit}
              />

              {/* Agents recover their password through the back-office, not here. */}
              {space === 'client' ? (
                <TextLink
                  label={t('auth.helpLink')}
                  onPress={() => Alert.alert(t('auth.helpTitle'), t('auth.helpBody'))}
                />
              ) : (
                <TextLink
                  label={t('auth.forgotLink')}
                  onPress={() => Alert.alert(t('auth.forgotTitle'), t('auth.forgotBody'))}
                />
              )}
            </View>
          </Appear>

          <Text style={styles.footer}>{t('auth.footer', { year: new Date().getFullYear() })}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  orb: { position: 'absolute', borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.10)' },
  orbA: { width: 260, height: 260, top: -90, right: -70 },
  orbB: { width: 160, height: 160, top: 160, left: -60, backgroundColor: 'rgba(255,255,255,0.07)' },
  body: { flexGrow: 1, paddingHorizontal: spacing(5) },

  brand: { alignItems: 'center', marginBottom: spacing(7) },
  logoFrame: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  logo: { width: 52, height: 52 },
  brandName: {
    marginTop: spacing(3),
    fontSize: 26,
    fontFamily: 'Inter_800ExtraBold',
    color: colors.white,
    letterSpacing: 4,
  },
  brandTagline: { marginTop: 2, fontSize: 12.5, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.85)' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing(5),
    ...shadow.float,
  },
  formTitle: { marginTop: spacing(5) },
  formSubtitle: { marginTop: 3, marginBottom: spacing(4) },
  otpHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing(2), paddingHorizontal: spacing(1) },
  otpHintText: { flex: 1, color: colors.primary },
  submit: { marginTop: spacing(2) },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.textSubtle,
    marginTop: spacing(6),
  },
});

export default LoginScreen;
