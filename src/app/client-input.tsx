import React, { useState } from 'react';
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

  const [activeTab, setActiveTab] = useState<'client' | 'agent'>('client');

  // Client form
  const [searchId, setSearchId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Agent form
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAgentLoggingIn, setIsAgentLoggingIn] = useState(false);

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
          {/* Header & Logo */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/splash-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>STE</Text>
            <Text style={styles.brandSubtitle}>Société Tchadienne des Eaux</Text>
          </View>

          {/* Segmented Switcher */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'client' && styles.tabItemActive]}
              onPress={() => setActiveTab('client')}
              activeOpacity={0.8}
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
              onPress={() => setActiveTab('agent')}
              activeOpacity={0.8}
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

          {/* Form Content */}
          {activeTab === 'client' ? (
            <View style={styles.form}>
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
                    onChangeText={setPhoneNumber}
                    placeholder="66 00 00 00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
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
                  <Text style={styles.primaryButtonText}>
                    {t('welcome.searchBtn') || 'Consulter'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
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
                    autoCapitalize="none"
                    editable={!isAgentLoggingIn}
                  />
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
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
                  <Text style={styles.primaryButtonText}>
                    {t('auth.loginBtn') || 'Se connecter'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© STE</Text>
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

  /* Header */
  header: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 28,
  },
  logo: {
    width: 68,
    height: 68,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },

  /* Segmented Tab Bar */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },

  /* Form */
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearBtn: {
    paddingHorizontal: 6,
  },
  clearText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  eyeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  /* Action Button */
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  /* Footer */
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

export default ClientInputScreen;
