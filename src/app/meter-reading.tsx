import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { meterApi, normalizeServerAssetUrl, type UploadableImage } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../constants/theme';
import { Header, Avatar, Badge, StatCard, EmptyState } from '../components/ui';

interface ClientInfo {
  customerId: number;
  meterId: number;
  name: string;
  meterNumber: string;
  zoneCode: string;
  longitude: string;
  latitude: string;
  previousIndex: number;
  address?: string;
}

type ReadingMode = 'new' | 'edit' | 'locked';

const MeterReadingScreen = () => {
  const router = useRouter();
  const [searchId, setSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [currentIndex, setCurrentIndex] = useState('');
  const [selectedImage, setSelectedImage] = useState<UploadableImage | null>(null);
  const [isInaccessible, setIsInaccessible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [statusCheckLoading, setStatusCheckLoading] = useState<boolean>(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [statusValidated, setStatusValidated] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<{ latitude: string; longitude: string } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [editableReadingId, setEditableReadingId] = useState<number | null>(null);
  const [existingPhotoUri, setExistingPhotoUri] = useState<string | null>(null);
  const [activeReading, setActiveReading] = useState<any | null>(null);
  const [readingMode, setReadingMode] = useState<ReadingMode>('new');
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);

  const extractReadingId = (reading: any): number | null => {
    const rawId = reading?.meterReadingId || reading?.readingId || reading?.id;
    const id = Number(rawId);
    return Number.isFinite(id) && id > 0 ? id : null;
  };

  const getSortedReadings = (readings: any[]) =>
    [...readings].sort(
      (a: any, b: any) =>
        new Date(b?.readingDate || b?.createdAt || 0).getTime() -
        new Date(a?.readingDate || a?.createdAt || 0).getTime()
    );

  const getLatestReading = (readings: any[]) => getSortedReadings(readings)[0] || null;

  const isReadingInCurrentMonth = (reading: any) => {
    const date = new Date(reading?.readingDate || reading?.createdAt || 0);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };

  const getReadingValue = (reading: any): number | null => {
    const raw = reading?.currentIndex ?? reading?.readingValue;
    if (raw === null || raw === undefined || raw === '') return null;
    const value = Number(raw);
    return Number.isNaN(value) ? null : value;
  };

  const getReadingPreviousIndex = (reading: any): number | null => {
    const raw = reading?.previousIndex;
    if (raw === null || raw === undefined || raw === '') return null;
    const value = Number(raw);
    return Number.isNaN(value) ? null : value;
  };

  const resolveReadingState = (readings: any[]) => {
    if (!readings.length) {
      return {
        isBlocked: false,
        blockedReason: null as string | null,
        editableReadingId: null as number | null,
        mode: 'new' as ReadingMode,
      };
    }

    const latest = getLatestReading(readings);
    const latestStatus = String(latest?.status || '').toLowerCase();
    const latestReadingId = extractReadingId(latest);

    if (['pending', 're_submitted', 'rejected'].includes(latestStatus) && latestReadingId) {
      return {
        isBlocked: false,
        blockedReason:
          latestStatus === 'rejected'
            ? 'Dernier relevé rejeté - Corrigez-le puis renvoyez-le'
            : "Relevé du mois déjà enregistré - modifiez-le si nécessaire",
        editableReadingId: latestReadingId,
        mode: 'edit' as ReadingMode,
      };
    }

    if (latestStatus === 'approved' && isReadingInCurrentMonth(latest)) {
      return {
        isBlocked: true,
        blockedReason: 'Relevé déjà approuvé pour ce mois',
        editableReadingId: null as number | null,
        mode: 'locked' as ReadingMode,
      };
    }

    return {
      isBlocked: false,
      blockedReason: null as string | null,
      editableReadingId: null as number | null,
      mode: 'new' as ReadingMode,
    };
  };

  const applyReadingToForm = (reading: any, fallbackPreviousIndex: number) => {
    if (!reading) {
      setIsInaccessible(false);
      setSelectedImage(null);
      setExistingPhotoUri(null);
      setPhotoLoadFailed(false);
      return;
    }

    const accessReason = String(reading?.accessReason || '').toLowerCase();
    const inaccessible = accessReason === 'door_closed';
    let photoUrl =
      typeof reading?.evidencePhotoUrl === 'string' && reading.evidencePhotoUrl
        ? reading.evidencePhotoUrl
        : null;
    if (!photoUrl && typeof reading?.photoUrls === 'string') {
      try {
        const parsed = JSON.parse(reading.photoUrls);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0]) {
          photoUrl = parsed[0];
        }
      } catch {}
    }
    const normalizedPhotoUrl = normalizeServerAssetUrl(photoUrl);

    setIsInaccessible(inaccessible);
    setExistingPhotoUri(normalizedPhotoUrl);
    setSelectedImage(null);
    setPhotoLoadFailed(false);

    if (inaccessible) {
      setCurrentIndex('');
      return;
    }

    const readingValue = getReadingValue(reading);
    if (readingValue !== null) {
      setCurrentIndex(String(readingValue));
    } else if (fallbackPreviousIndex > 0) {
      setCurrentIndex(String(fallbackPreviousIndex));
    }
  };

  const syncFormWithState = (reading: any, state: ReturnType<typeof resolveReadingState>, info: ClientInfo) => {
    const derivedPreviousIndex = getReadingPreviousIndex(reading);
    const nextPreviousIndex =
      state.mode === 'edit' && derivedPreviousIndex !== null ? derivedPreviousIndex : info.previousIndex;

    setClientInfo({ ...info, previousIndex: nextPreviousIndex });
    setReadingMode(state.mode);
    setActiveReading(reading);

    if (state.mode === 'new') {
      setCurrentIndex(nextPreviousIndex > 0 ? String(nextPreviousIndex) : '');
      setIsInaccessible(false);
      setSelectedImage(null);
      setExistingPhotoUri(null);
      setPhotoLoadFailed(false);
      return;
    }

    applyReadingToForm(reading, nextPreviousIndex);
  };

  const canTakeReading = statusValidated && !isBlocked;

  const statusTone =
    readingMode === 'locked' ? 'error' : blockedReason ? 'warning' : 'success';
  const statusText =
    statusCheckLoading
      ? 'Vérification en cours...'
      : blockedReason ||
        (readingMode === 'edit'
          ? 'Vous modifiez le relevé de ce mois'
          : 'Prêt pour un nouveau relevé');
  const statusIcon =
    statusCheckLoading ? '⏳' : readingMode === 'locked' ? '🔒' : readingMode === 'edit' ? '✏️' : '✓';
  const displayedPhotoUri = !photoLoadFailed ? selectedImage?.uri || existingPhotoUri : selectedImage?.uri || null;
  const statIndexValue =
    readingMode === 'new'
      ? clientInfo?.previousIndex ?? 0
      : getReadingValue(activeReading) ?? clientInfo?.previousIndex ?? 0;
  const statIndexLabel = readingMode === 'new' ? 'Index préc.' : 'Index relevé';
  const photoHelperText =
    isInaccessible
      ? 'Photo optionnelle si le compteur est inaccessible.'
      : readingMode === 'edit'
        ? 'La photo existante est conservée. Remplacez-la seulement si nécessaire.'
        : 'Ajoutez une photo nette du compteur.';
  const submitLabel = readingMode === 'edit' ? 'Mettre à jour' : 'Enregistrer';

  const getDeviceLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à la localisation est nécessaire.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setDeviceLocation({ latitude: String(location.coords.latitude), longitude: String(location.coords.longitude) });
    } catch {
      Alert.alert('Erreur de localisation', 'Impossible d\'obtenir votre position.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    if (clientInfo && !deviceLocation) getDeviceLocation();
  }, [clientInfo]);

  const handleSearch = async () => {
    const trimmedId = searchId.trim();
    if (!trimmedId) {
      Alert.alert('Erreur', 'Veuillez entrer un ID client.');
      return;
    }

    setIsSearching(true);
    try {
      const response = await meterApi.getByCustomerCode(trimmedId);
      if (response.success && response.data) {
        const { meter, customer, lastReading } = response.data as any;
        if (!customer) throw new Error('Client introuvable.');
        if (!meter) throw new Error("Aucun compteur associé à ce client.");

        const info: ClientInfo = {
          customerId: customer.customerId,
          meterId: meter.meterId,
          name: `${customer.firstName} ${customer.lastName}`,
          meterNumber: meter.meterNumber,
          zoneCode: customer.address?.area?.name || customer.address?.district?.name || 'N/A',
          longitude: customer.address?.longitude || '0.0',
          latitude: customer.address?.latitude || '0.0',
          previousIndex: (typeof lastReading?.readingValue === 'number' ? lastReading.readingValue : Number(lastReading?.readingValue)) || Number(meter.installationIndex) || 0,
          address: customer.address ? `${customer.address.streetName || ''} ${customer.address.streetNumber || ''}, ${customer.address.city?.cityName || ''}` : 'N/A',
        };
        setClientInfo(info);
        setEditableReadingId(null);
        setSubmitError(null);
        setSelectedImage(null);
        setExistingPhotoUri(null);
        setIsInaccessible(false);
        setActiveReading(null);
        setReadingMode('new');
        setPhotoLoadFailed(false);

        setStatusCheckLoading(true);
        try {
          const readings = await meterApi.getReadings(info.meterId);
          const items = Array.isArray(readings?.data?.data) ? readings.data.data : Array.isArray(readings?.data) ? readings.data : [];
          const state = resolveReadingState(items);
          const latestReading = getLatestReading(items);

          setIsBlocked(state.isBlocked);
          setBlockedReason(state.blockedReason);
          setEditableReadingId(state.editableReadingId);
          setStatusValidated(true);
          syncFormWithState(latestReading, state, info);
        } catch {
          setIsBlocked(false);
          setBlockedReason(null);
          setEditableReadingId(null);
          setStatusValidated(false);
          setReadingMode('new');
          setActiveReading(null);
          setCurrentIndex(info.previousIndex > 0 ? String(info.previousIndex) : '');
        } finally {
          setStatusCheckLoading(false);
        }
      } else {
        Alert.alert('Client non trouvé', `L'identifiant "${trimmedId}" n'existe pas.`);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleChoosePhoto = async () => {
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
        });
        setPhotoLoadFailed(false);
      }
      return;
    }

    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermission.status === 'granted') {
      try {
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          setSelectedImage({
            uri: asset.uri,
            fileName: asset.fileName,
            mimeType: asset.mimeType,
          });
          setPhotoLoadFailed(false);
          return;
        }
      } catch {}
    }

    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (libraryPermission.status === 'granted') {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
        });
        setPhotoLoadFailed(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!clientInfo) return Alert.alert('Erreur', 'Aucun client sélectionné.');
    if (!isInaccessible && !currentIndex.trim()) return Alert.alert('Erreur', 'Veuillez entrer l\'index actuel.');
    if (isBlocked) return Alert.alert('Erreur', blockedReason || 'Ce relevé ne peut pas être soumis.');

    setIsSubmitting(true);
    try {
      const readings = await meterApi.getReadings(clientInfo.meterId);
      const items = Array.isArray(readings?.data?.data) ? readings.data.data : Array.isArray(readings?.data) ? readings.data : [];
      const state = resolveReadingState(items);
      const readingIdToUpdate = state.editableReadingId ?? editableReadingId;
      const hasPhotoForSubmission =
        !!selectedImage?.uri || (!!readingIdToUpdate && !!existingPhotoUri);

      setReadingMode(state.mode);
      setActiveReading(getLatestReading(items));
      setEditableReadingId(readingIdToUpdate);
      if (state.isBlocked) throw new Error(state.blockedReason || "Impossible d'enregistrer le relevé.");
      if (!isInaccessible && !hasPhotoForSubmission) {
        throw new Error('Veuillez ajouter une photo du compteur.');
      }

      const parsedIndex = Number(currentIndex.replace(/,/g, '.').trim());
      if (!isInaccessible && Number.isNaN(parsedIndex)) throw new Error('Index invalide.');

      if (!isInaccessible && parsedIndex < clientInfo.previousIndex) {
        Alert.alert('Attention', `L'index actuel (${parsedIndex}) est inférieur à l'index précédent (${clientInfo.previousIndex}). Voulez-vous continuer ?`, [
          { text: 'Annuler', style: 'cancel', onPress: () => setIsSubmitting(false) },
          { text: 'Continuer', onPress: () => submitReadingData(parsedIndex, readingIdToUpdate) }
        ]);
        return;
      }

      await submitReadingData(parsedIndex, readingIdToUpdate);
    } catch (error: any) {
      setSubmitError(error?.message || "Impossible d'enregistrer le relevé.");
      setIsSubmitting(false);
    }
  };

  const submitReadingData = async (parsedIndex: number, readingIdToUpdate?: number | null) => {
    try {
      setUploadProgress('Préparation des données...');
      await new Promise(r => setTimeout(r, 300));

      const payload = {
        meterId: clientInfo!.meterId,
        meterReadingId: readingIdToUpdate || undefined,
        currentIndex: isInaccessible ? undefined : parsedIndex,
        previousIndex: clientInfo!.previousIndex,
        isInaccessible,
        image: selectedImage || undefined,
        longitude: deviceLocation?.longitude || clientInfo!.longitude,
        latitude: deviceLocation?.latitude || clientInfo!.latitude,
      };

      setUploadProgress('Envoi de la photo...');
      await new Promise(r => setTimeout(r, 400));
      setUploadProgress(readingIdToUpdate ? 'Mise à jour du relevé...' : 'Enregistrement du relevé...');
      if (readingIdToUpdate) {
        await meterApi.updateReading({
          meterReadingId: readingIdToUpdate,
          currentIndex: payload.currentIndex,
          previousIndex: payload.previousIndex,
          isInaccessible: payload.isInaccessible,
          image: payload.image,
          longitude: payload.longitude,
          latitude: payload.latitude,
        });
      } else {
        await meterApi.submitReading(payload);
      }
      setUploadProgress('Finalisation...');
      await new Promise(r => setTimeout(r, 300));
      
      setSubmitError(null);
      setShowSuccessAnimation(true);

      setTimeout(() => {
        setShowSuccessAnimation(false);
        Alert.alert('✅ Succès', readingIdToUpdate ? 'Relevé mis à jour avec succès.' : 'Relevé enregistré avec succès.', [{
          text: 'OK',
          onPress: () => {
            setCurrentIndex('');
            setSelectedImage(null);
            setExistingPhotoUri(selectedImage?.uri || existingPhotoUri);
            setIsInaccessible(false);
            setUploadProgress('');
            setIsBlocked(true);
            setBlockedReason('Relevé du mois enregistré et en attente de validation');
            setEditableReadingId(readingIdToUpdate ?? null);
            setReadingMode('edit');
          },
        }]);
      }, 1000);
    } catch (error: any) {
      setUploadProgress('');
      setShowSuccessAnimation(false);
      setSubmitError(error?.message || "Impossible d'enregistrer le relevé.");
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress('');
      }, 1200);
    }
  };

  const handleReset = () => {
    setSubmitError(null);
    if (readingMode !== 'new' && activeReading) {
      applyReadingToForm(activeReading, clientInfo?.previousIndex || 0);
      return;
    }

    setCurrentIndex(clientInfo?.previousIndex ? String(clientInfo.previousIndex) : '');
    setSelectedImage(null);
    setExistingPhotoUri(null);
    setIsInaccessible(false);
    setPhotoLoadFailed(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

      {isSubmitting && (
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
            {showSuccessAnimation ? (
              <>
                <View style={styles.successCircle}>
                  <Text style={styles.successIcon}>✓</Text>
                </View>
                <Text style={styles.successText}>Relevé enregistré !</Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={Colors.primary[500]} />
                <Text style={styles.loaderText}>{uploadProgress || 'Envoi en cours…'}</Text>
                <View style={styles.progressBar}>
                  <View style={styles.progressFill} />
                </View>
              </>
            )}
          </View>
        </View>
      )}

      <Header title="Relevé de Compteur" onBack={() => router.back()} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Search Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rechercher Client</Text>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={searchId}
                onChangeText={setSearchId}
                placeholder="ID Client (ex: 138533800005)"
                placeholderTextColor={Colors.text.disabled}
                keyboardType="numeric"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
            </View>
            <TouchableOpacity
              style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={isSearching}
              activeOpacity={0.8}
            >
              {isSearching ? <ActivityIndicator color={Colors.text.inverse} size="small" /> : <Text style={styles.searchButtonText}>Rechercher</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {clientInfo ? (
          <>
            {/* Client Card */}
            <View style={styles.section}>
              <View style={styles.clientCard}>
                <View style={styles.clientHeader}>
                  <Avatar name={clientInfo.name} size="lg" />
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{clientInfo.name}</Text>
                    <Text style={styles.clientId}>ID: {clientInfo.customerId}</Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBanner,
                  statusTone === 'error' && styles.statusBannerError,
                  statusTone === 'warning' && styles.statusBannerWarning,
                  statusTone === 'success' && styles.statusBannerSuccess,
                ]}>
                  <Text style={styles.statusBannerIcon}>{statusIcon}</Text>
                  <Text style={styles.statusBannerText}>{statusText}</Text>
                </View>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <StatCard icon="📊" value={clientInfo.meterNumber} label="Compteur" />
                <StatCard icon="📈" value={statIndexValue} label={statIndexLabel} />
              </View>
              <View style={styles.statsGrid}>
                <StatCard icon="📍" value={clientInfo.zoneCode} label="Zone" />
                <StatCard icon="🏠" value={clientInfo.address || 'N/A'} label="Adresse" />
              </View>

              {/* GPS Card */}
              <View style={styles.gpsCard}>
                <Text style={styles.gpsIcon}>📍</Text>
                <View style={styles.gpsInfo}>
                  <Text style={styles.gpsLabel}>Position GPS (appareil)</Text>
                  {isGettingLocation ? (
                    <View style={styles.gpsLoadingRow}>
                      <ActivityIndicator size="small" color={Colors.primary[500]} />
                      <Text style={styles.gpsLoadingText}>Localisation en cours...</Text>
                    </View>
                  ) : deviceLocation ? (
                    <Text style={styles.gpsValue}>Lat: {deviceLocation.latitude.substring(0, 10)} | Long: {deviceLocation.longitude.substring(0, 10)}</Text>
                  ) : (
                    <Text style={styles.gpsValueError}>Position non disponible</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.gpsRefreshButton} onPress={getDeviceLocation} disabled={isGettingLocation}>
                  <Text style={styles.gpsRefreshIcon}>🔄</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reading Input Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Saisie du Relevé</Text>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Index Actuel</Text>
                <TextInput
                  style={[styles.input, (!canTakeReading || statusCheckLoading) && styles.inputDisabled]}
                  value={currentIndex}
                  onChangeText={setCurrentIndex}
                  placeholder="Entrez l'index"
                  placeholderTextColor={Colors.text.disabled}
                  keyboardType="numeric"
                  editable={canTakeReading && !statusCheckLoading}
                />

                <Text style={styles.inputLabel}>Photo du Compteur</Text>
                <Text style={styles.inputHelper}>{photoHelperText}</Text>
                {displayedPhotoUri ? (
                  <View style={styles.photoPreview}>
                    <Image
                      source={{ uri: displayedPhotoUri }}
                      style={styles.previewImage}
                      resizeMode="cover"
                      onError={() => {
                        if (!selectedImage) {
                          setPhotoLoadFailed(true);
                        }
                      }}
                    />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => (selectedImage ? setSelectedImage(null) : handleChoosePhoto())}
                      disabled={!canTakeReading || statusCheckLoading}
                    >
                      <Text style={styles.removePhotoText}>
                        {selectedImage ? '✕ Supprimer' : '📷 Remplacer'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : existingPhotoUri && photoLoadFailed ? (
                  <View style={styles.photoFallbackCard}>
                    <Text style={styles.photoFallbackIcon}>🖼️</Text>
                    <View style={styles.photoFallbackContent}>
                      <Text style={styles.photoFallbackTitle}>Photo existante indisponible</Text>
                      <Text style={styles.photoFallbackText}>
                        L&apos;ancienne image ne peut pas etre affichee depuis le serveur. Vous pouvez la remplacer.
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.photoReplaceButton}
                      onPress={handleChoosePhoto}
                      disabled={!canTakeReading || statusCheckLoading}
                    >
                      <Text style={styles.photoReplaceButtonText}>Remplacer</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.photoButton, (!canTakeReading || statusCheckLoading) && styles.buttonDisabled]}
                    onPress={handleChoosePhoto}
                    disabled={!canTakeReading || statusCheckLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.photoButtonIcon}>📷</Text>
                    <Text style={styles.photoButtonText}>Prendre une photo</Text>
                  </TouchableOpacity>
                )}

                {/* Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => {
                    if (isBlocked || statusCheckLoading) return;
                    const nextValue = !isInaccessible;
                    setIsInaccessible(nextValue);
                    setSubmitError(null);

                    if (nextValue) {
                      setCurrentIndex('');
                      setSelectedImage(null);
                    } else {
                      const restoredValue = getReadingValue(activeReading);
                      if (restoredValue !== null) {
                        setCurrentIndex(String(restoredValue));
                      } else if (clientInfo?.previousIndex) {
                        setCurrentIndex(String(clientInfo.previousIndex));
                      }
                    }
                  }}
                  disabled={isBlocked || statusCheckLoading}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isInaccessible && styles.checkboxChecked]}>
                    {isInaccessible && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Compteur non accessible</Text>
                </TouchableOpacity>

                {submitError && (
                  <View style={styles.errorCard}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{submitError}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.resetButton, (!canTakeReading || statusCheckLoading) && styles.buttonDisabled]}
                    onPress={handleReset}
                    disabled={!canTakeReading || statusCheckLoading}
                    activeOpacity={0.7}
                  >
                      <Text style={styles.resetButtonText}>Réinitialiser</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitButton, (isSubmitting || !statusValidated || isBlocked || statusCheckLoading) && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || !statusValidated || isBlocked || statusCheckLoading}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <View style={styles.submitButtonContent}>
                        <ActivityIndicator color={Colors.text.inverse} size="small" />
                        <Text style={styles.submitButtonTextLoading}>Envoi...</Text>
                      </View>
                    ) : (
                      <View style={styles.submitButtonContent}>
                        <Text style={styles.submitButtonText}>{submitLabel}</Text>
                        <Text style={styles.submitButtonIcon}>→</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        ) : (
          <EmptyState icon="🔍" title="Rechercher un client" description="Entrez le code client pour commencer le relevé de compteur." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    height: 52,
  },
  searchButton: {
    paddingHorizontal: Spacing.xl,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  searchButtonDisabled: {
    backgroundColor: Colors.neutral[400],
  },
  searchButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    fontSize: Typography.fontSize.md,
  },
  clientCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  clientId: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
  },
  statusBannerSuccess: {
    backgroundColor: Colors.success.light,
    borderColor: '#A7F3D0',
  },
  statusBannerWarning: {
    backgroundColor: Colors.warning.light,
    borderColor: '#FCD34D',
  },
  statusBannerError: {
    backgroundColor: Colors.error.light,
    borderColor: '#FCA5A5',
  },
  statusBannerIcon: {
    fontSize: 16,
  },
  statusBannerText: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Shadows.sm,
  },
  gpsIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  gpsInfo: {
    flex: 1,
  },
  gpsLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  gpsValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  gpsValueError: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.error.main,
  },
  gpsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gpsLoadingText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  gpsRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsRefreshIcon: {
    fontSize: 18,
  },
  inputCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Shadows.md,
  },
  inputLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  inputHelper: {
    marginTop: -Spacing.xs,
    marginBottom: Spacing.lg,
    color: Colors.text.tertiary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
  input: {
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.xl,
  },
  inputDisabled: {
    backgroundColor: Colors.neutral[100],
    color: Colors.text.disabled,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: Colors.border.default,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  photoButtonIcon: {
    fontSize: 24,
  },
  photoButtonText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.md,
    fontWeight: '600',
  },
  photoPreview: {
    marginBottom: Spacing.xl,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  removePhotoButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  removePhotoText: {
    color: Colors.primary[700],
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  photoFallbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  photoFallbackIcon: {
    fontSize: 22,
  },
  photoFallbackContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  photoFallbackTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
  photoFallbackText: {
    color: Colors.text.tertiary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
  photoReplaceButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  photoReplaceButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.border.dark,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  checkmark: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  errorCard: {
    backgroundColor: Colors.error.light,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error.main,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  errorText: {
    color: Colors.error.dark,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  resetButton: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderWidth: 1.5,
    borderColor: Colors.border.dark,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  resetButtonText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.md,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.neutral[400],
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  submitButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.md,
    fontWeight: '600',
  },
  submitButtonTextLoading: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.md,
    fontWeight: '600',
  },
  submitButtonIcon: {
    color: Colors.text.inverse,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loaderCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['3xl'],
    alignItems: 'center',
    minWidth: 280,
    ...Shadows.xl,
  },
  loaderText: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.neutral[200],
    borderRadius: 2,
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary[500],
    borderRadius: 2,
    width: '100%',
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.success.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  successIcon: {
    fontSize: 36,
    color: Colors.text.inverse,
    fontWeight: 'bold',
  },
  successText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.success.main,
    textAlign: 'center',
  },
});

export default MeterReadingScreen;
