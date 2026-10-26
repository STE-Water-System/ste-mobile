import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Header, MockBanner, Notice, Screen, TextLink } from '../../components/ui';
import { OtpInput, ProgressBar } from '../../components/blocks';
import { Appear, errorFeedback, successFeedback } from '../../components/motion';
import { MOCK_OTP_CODE, OTP_LENGTH, OTP_PERIOD_SECONDS } from '../../config/auth';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, spacing, textStart, type } from '../../theme';

/**
 * Second step of the agent sign-in: a time-based one-time code from an
 * authenticator app. The check is local (see src/config/auth.ts) until the
 * backend exposes a TOTP endpoint; the screen itself will not change.
 */
const OtpScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const pendingAgent = useAuthStore((state) => state.pendingAgent);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const cancelOtp = useAuthStore((state) => state.cancelOtp);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(OTP_PERIOD_SECONDS);

  // Authenticator codes rotate on a fixed period; mirror that so the agent
  // knows when to read a fresh one.
  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setSecondsLeft(OTP_PERIOD_SECONDS - (now % OTP_PERIOD_SECONDS));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Arriving here without a parked account (deep link, reload) means there is
  // nothing to confirm.
  useEffect(() => {
    if (!pendingAgent) router.replace('/(auth)/login');
  }, [pendingAgent, router]);

  const back = async () => {
    await cancelOtp();
    router.replace('/(auth)/login');
  };

  const submit = async (value: string = code) => {
    if (value.length !== OTP_LENGTH) {
      setError(t('otp.incomplete'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(value);
      successFeedback();
      // The (auth) layout redirects to the agent space once the session opens.
    } catch (err: any) {
      errorFeedback();
      setCode('');
      setError(err?.message || t('otp.invalid'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll keyboard>
      <Header title={t('otp.title')} onBack={back} />

      <Appear>
        <View style={styles.hero}>
          <View style={styles.shield}>
            <Ionicons name="shield-checkmark" size={30} color={colors.primary} />
          </View>
          <Text style={[type.heading, styles.centered]}>{t('otp.heading')}</Text>
          <Text style={[type.caption, styles.centered, styles.lead]}>
            {t('otp.lead', { email: pendingAgent?.email ?? '' })}
          </Text>
        </View>
      </Appear>

      <Appear index={1}>
        <OtpInput
          length={OTP_LENGTH}
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
          }}
          onComplete={(value) => submit(value)}
          error={!!error}
          autoFocus
        />

        <View style={styles.timer}>
          <View style={styles.timerRow}>
            <Ionicons name="time-outline" size={14} color={colors.textSubtle} />
            <Text style={[type.caption, textStart()]}>{t('otp.rotates', { seconds: secondsLeft })}</Text>
          </View>
          <ProgressBar value={secondsLeft / OTP_PERIOD_SECONDS} tone={secondsLeft <= 5 ? 'warning' : 'info'} height={4} />
        </View>

        {!!error && <Notice text={error} tone="danger" />}

        <Button label={t('otp.verify')} onPress={() => submit()} loading={busy} size="lg" icon="lock-open-outline" style={styles.submit} />

        <TextLink label={t('otp.noAccess')} onPress={() => Alert.alert(t('otp.helpTitle'), t('otp.helpBody'))} />
      </Appear>

      <Appear index={2}>
        <View style={styles.demo}>
          <MockBanner label={t('mock.banner')} style={styles.demoRibbon} />
          <Notice
            tone="warning"
            icon="flask-outline"
            title={t('otp.demoTitle')}
            text={t('otp.demoBody', { code: MOCK_OTP_CODE })}
          />
        </View>
      </Appear>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing(4), gap: spacing(2) },
  shield: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  centered: { textAlign: 'center' },
  lead: { maxWidth: 300, lineHeight: 18 },
  timer: { marginTop: spacing(4), gap: spacing(2) },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  submit: { marginTop: spacing(5) },
  demo: { marginTop: spacing(6) },
  demoRibbon: { marginBottom: spacing(2) },
});

export default OtpScreen;
