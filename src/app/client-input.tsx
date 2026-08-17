import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getClientProfile } from '../services/mockDataService';
import { customerApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const ClientInputScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { login } = useAuth();
  const currentYear = new Date().getFullYear();

  const [activeTab, setActiveTab] = useState<'client' | 'agent'>('client');

  // Animation values for smooth tab transition
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Client form
  const [searchId, setSearchId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Agent form
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAgentLoggingIn, setIsAgentLoggingIn] = useState(false);

  // Smooth Tab Switcher
  const handleTabSwitch = (newTab: 'client' | 'agent') => {
    if (newTab === activeTab) return;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: newTab === 'agent' ? -10 : 10,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveTab(newTab);
      slideAnim.setValue(newTab === 'agent' ? 10 : -10);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handlePhoneChange = (text: string) => {
    // Only accept numeric digits, spaces, and '+' prefix
    const cleanNumber = text.replace(/[^0-9\s+]/g, '');
    setPhoneNumber(cleanNumber);
  };

  const handleCustomerSearch = async () => {
    const targetCode = searchId.trim();
    if (!targetCode) {
      Alert.alert(t('common.error'), t('dashboard.enterCustomerCode'));
      return;
    }

    setIsLoading(true);
    const trimmedPhone = phoneNumber.trim();

    try {
      let customerData = null;

      try {
        const response = await customerApi.searchByCode(targetCode, trimmedPhone || undefined);
        if (response.success && response.data) {
          customerData = response.data;
        }
      } catch (apiError) {
        console.log('API search fallback to mock', apiError);
        const profile = await getClientProfile(targetCode);
        if (profile) {
          if (trimmedPhone && profile.phoneNumber && !profile.phoneNumber.includes(trimmedPhone)) {
            customerData = null;
          } else {
            customerData = profile;
          }
        }
      }

      if (customerData) {
        await AsyncStorage.setItem('customer_data', JSON.stringify(customerData));
        router.push({
          pathname: '/client-router',
          params: { clientId: targetCode },
        });
      } else {
        Alert.alert(
          t('dashboard.meterNotFound'),
          `Aucun compte trouvé avec le code "${targetCode}".`,
          [{ text: t('common.cancel') }]
        );
      }
    } catch (error) {
      Alert.alert(t('common.error'), 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentLogin = async () => {
    if (!agentEmail.trim() || !agentPassword.trim()) {
      Alert.alert(t('common.error'), t('auth.enterCreds'));
      return;
    }

    setIsAgentLoggingIn(true);
    try {
      await login(agentEmail.trim(), agentPassword.trim());
      router.replace('/agent-dashboard');
    } catch (error: any) {
      Alert.alert(
        t('auth.loginError'),
        error.message || t('auth.invalidCreds'),
        [{ text: t('auth.retry'), onPress: () => setAgentPassword('') }]
      );
    } finally {
      setIsAgentLoggingIn(false);
    }
  };

  const handleHelpPress = () => {
    if (activeTab === 'client') {
      Alert.alert(
        'Code Client STE',
        'Votre code client (ex: CUST-001) est indiqué en haut à gauche de votre facture d\'eau papier ou sur votre reçu de paiement STE.',
        [{ text: 'Compris' }]
      );
    } else {
      Alert.alert(
        t('auth.forgotPasswordTitle') || 'Mot de passe oublié',
        t('auth.forgotPasswordMsg') || 'Contactez votre administrateur système STE pour réinitialiser vos identifiants.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mainContent}>
            {/* Logo Emblem */}
            <View style={styles.logoFrame}>
              <Image
                source={require('../../assets/splash-icon.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>

            {/* Fully Rounded Switcher */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'client' && styles.tabItemActive]}
                onPress={() => handleTabSwitch('client')}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'client' && styles.tabTextActive,
                  ]}
                >
                  {t('welcome.clientTab') || 'Espace Client'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'agent' && styles.tabItemActive]}
                onPress={() => handleTabSwitch('agent')}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'agent' && styles.tabTextActive,
                  ]}
                >
                  {t('welcome.agentTab') || 'Espace Agent'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Animated Form Container */}
            <Animated.View
              style={[
                styles.form,
                {
                  opacity: fadeAnim,
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              {activeTab === 'client' ? (
                <View key="client-form">
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {t('welcome.clientCodeLabel') || 'Code Client'}
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={searchId}
                        onChangeText={setSearchId}
                        placeholder="CUST-001"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                      {searchId.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setSearchId('')}
                          style={styles.clearBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.clearText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {t('welcome.phoneLabel') || 'Téléphone'}
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={phoneNumber}
                        onChangeText={handlePhoneChange}
                        placeholder="66 00 00 00"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        textContentType="telephoneNumber"
                        autoComplete="tel"
                        editable={!isLoading}
                      />
                      {phoneNumber.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setPhoneNumber('')}
                          style={styles.clearBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.clearText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                    onPress={handleCustomerSearch}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={styles.buttonInner}>
                        <Text style={styles.primaryButtonText}>
                          {t('welcome.searchBtn') || 'Consulter mes factures'}
                        </Text>
                        <Text style={styles.buttonArrow}>→</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.helpLink}
                    onPress={handleHelpPress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.helpLinkText}>
                      Où trouver mon code client ?
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View key="agent-form">
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('auth.email') || 'Email'}</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={agentEmail}
                        onChangeText={setAgentEmail}
                        placeholder="agent@example.com"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isAgentLoggingIn}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {t('auth.password') || 'Mot de passe'}
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={agentPassword}
                        onChangeText={setAgentPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        textContentType="password"
                        autoCapitalize="none"
                        editable={!isAgentLoggingIn}
                      />
                      <TouchableOpacity
                        style={styles.clearBtn}
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.eyeText}>{showPassword ? 'Masquer' : 'Afficher'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, isAgentLoggingIn && styles.buttonDisabled]}
                    onPress={handleAgentLogin}
                    disabled={isAgentLoggingIn}
                    activeOpacity={0.85}
                  >
                    {isAgentLoggingIn ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={styles.buttonInner}>
                        <Text style={styles.primaryButtonText}>
                          {t('auth.loginBtn') || 'Se connecter'}
                        </Text>
                        <Text style={styles.buttonArrow}>→</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.helpLink}
                    onPress={handleHelpPress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.helpLinkText}>
                      {t('auth.forgotPassword') || 'Mot de passe oublié ?'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </View>

          {/* Dynamic Copyright Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © {currentYear} STE - Tous droits réservés
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },

  /* Refined Circular Logo Frame */
  logoFrame: {
    width: 82,
    height: 82,
    borderRadius: 9999,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  logo: {
    width: '100%',
    height: '100%',
  },

  /* Clean Switcher */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 9999,
    padding: 4,
    marginBottom: 24,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },

  /* Modern Form */
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginLeft: 8,
  },
  /* Modern clean filled pill with soft border and no flickering */
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 9999,
    paddingHorizontal: 18,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearBtn: {
    paddingHorizontal: 4,
  },
  clearText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  eyeText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },

  /* Primary Button */
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 9999,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  /* Minimalist Help Link */
  helpLink: {
    alignSelf: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  helpLinkText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  /* Footer */
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

export default ClientInputScreen;
