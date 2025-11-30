import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert, 
  Animated, 
  Easing, 
  Image, 
  Platform,
  LogBox,
  Dimensions,
  Modal,
  Switch
} from 'react-native';

// Uyarıları gizle
LogBox.ignoreAllLogs(true);

import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { PrayerTimes, Coordinates, CalculationMethod, Qibla } from 'adhan';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Audio } from 'expo-av'; // expo-audio yerine expo-av kullanıyoruz
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ekran genişliği
const { width } = Dimensions.get('window');

const PRAYER_NAMES = {
  fajr: 'İmsak',
  sunrise: 'Güneş',
  dhuhr: 'Öğle',
  asr: 'İkindi',
  maghrib: 'Akşam',
  isha: 'Yatsı'
};

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

// Namaz Bilgileri
const PRAYER_DETAILS = {
  fajr: {
    name: 'İmsak',
    rakats: '4 Rekat',
    detail: '2 Sünnet, 2 Farz',
  },
  sunrise: {
    name: 'Güneş',
    rakats: 'Kerahat Vakti',
    detail: 'Bayram namazı haricinde namaz kılınmaz.',
  },
  dhuhr: {
    name: 'Öğle',
    rakats: '10 Rekat',
    detail: '4 İlk Sünnet, 4 Farz, 2 Son Sünnet',
  },
  asr: {
    name: 'İkindi',
    rakats: '8 Rekat',
    detail: '4 Sünnet, 4 Farz',
  },
  maghrib: {
    name: 'Akşam',
    rakats: '5 Rekat',
    detail: '3 Farz, 2 Sünnet',
  },
  isha: {
    name: 'Yatsı',
    rakats: '13 Rekat',
    detail: '4 İlk Sünnet, 4 Farz, 2 Son Sünnet, 3 Vitir',
  },
};

// Ses dosyaları
const SOUND_FILES = {
  fajr: require('./assets/sounds/imsak.mp3'),
  dhuhr: require('./assets/sounds/ogle.mp3'),
  asr: require('./assets/sounds/ikindi.mp3'),
  maghrib: require('./assets/sounds/aksam.mp3'),
  isha: require('./assets/sounds/yatsi.mp3'),
};

const RELIGIOUS_DAYS = [
  { year: 2026, date: '2026-01-15', name: 'Miraç Kandili' },
  { year: 2026, date: '2026-02-02', name: 'Berat Kandili' },
  { year: 2026, date: '2026-02-18', name: 'Ramazan Başlangıcı' },
  { year: 2026, date: '2026-03-15', name: 'Kadir Gecesi' },
  { year: 2026, date: '2026-03-20', name: 'Ramazan Bayramı (1. Gün)' },
  { year: 2026, date: '2026-05-27', name: 'Kurban Bayramı (1. Gün)' },
  { year: 2026, date: '2026-06-17', name: 'Hicri Yılbaşı' },
  { year: 2026, date: '2026-06-26', name: 'Aşure Günü' },
  { year: 2026, date: '2026-10-21', name: 'Mevlid Kandili' },
  { year: 2027, date: '2027-01-05', name: 'Miraç Kandili' },
  { year: 2027, date: '2027-01-22', name: 'Berat Kandili' },
  { year: 2027, date: '2027-02-08', name: 'Ramazan Başlangıcı' },
  { year: 2027, date: '2027-03-05', name: 'Kadir Gecesi' },
  { year: 2027, date: '2027-03-09', name: 'Ramazan Bayramı (1. Gün)' },
  { year: 2027, date: '2027-05-16', name: 'Kurban Bayramı (1. Gün)' },
  { year: 2027, date: '2027-06-07', name: 'Hicri Yılbaşı' },
  { year: 2027, date: '2027-06-16', name: 'Aşure Günü' },
  { year: 2027, date: '2027-10-10', name: 'Mevlid Kandili' },
];

const NOTIFICATION_PREF_KEY = 'notificationsEnabled';

// Bildirim Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: 'max',
  }),
});

export default function App() {
  // --- STATE TANIMLARI ---
  const [location, setLocation] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [currentPrayer, setCurrentPrayer] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Yükleme ve Hata Durumları
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);
  
  // Ses State
  const [sound, setSound] = useState(null);
  const [playingSound, setPlayingSound] = useState(null);
  
  // Kıble State
  const [qiblaAngle, setQiblaAngle] = useState(null);
  const [deviceHeading, setDeviceHeading] = useState(0);

  // Namaz Bilgileri Modal State
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedPrayerInfo, setSelectedPrayerInfo] = useState(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsPrefLoaded, setNotificationsPrefLoaded] = useState(false);

  // Animasyon Refleri
  const splashFadeAnim = useRef(new Animated.Value(1)).current;
  const splashScaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const arrowPulseAnim = useRef(new Animated.Value(1)).current;

  const getAngleDiff = (target, current) => {
    if (target === null || current === null || Number.isNaN(target) || Number.isNaN(current)) {
      return null;
    }
    let diff = target - current;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    return diff;
  };

  // --- EFFECT: BAŞLANGIÇ AYARLARI ---
  useEffect(() => {
    setupApp();
    
    // Splash Animasyonu
    Animated.parallel([
      Animated.timing(splashScaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoRotateAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(logoRotateAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // SAFETY TIMEOUT: 3 saniye sonra Splash'i zorla kapat (konum gelmese bile)
    const safetyTimer = setTimeout(() => {
        closeSplash();
    }, 3000);

    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    const loadNotificationPreference = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(NOTIFICATION_PREF_KEY);
        if (storedValue !== null) {
          setNotificationsEnabled(storedValue === 'true');
        }
      } catch (error) {
        console.log('Bildirim tercihi okunamadı', error);
      } finally {
        setNotificationsPrefLoaded(true);
      }
    };
    loadNotificationPreference();
  }, []);

  const setupApp = async () => {
    // 1. Bildirim İzni
    await requestNotificationPermissions();
    
    // 2. Kanal Kurulumu (Android)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('ezan-channel', {
        name: 'Ezan Vakti Bildirimleri',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'ogle.mp3', // app.json sound ile eşleşmeli
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      });
      await Notifications.setNotificationChannelAsync('reminder-channel', {
        name: 'Vakit Hatırlatıcıları',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null,
        vibrationPattern: [0, 150],
        enableVibrate: true,
      });
    }

    // 3. Konumu Al
    getLocation();
  };

  const closeSplash = () => {
      Animated.timing(splashFadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
  };

  // --- LOCATION & PRAYER TIMES ---
  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Konum izni reddedildi.');
        setLoading(false);
        return;
      }

      let locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation(locationData);
      
      // Hesaplamaları yap
      const coords = new Coordinates(locationData.coords.latitude, locationData.coords.longitude);
      
      // 1. Namaz Vakitleri
      const params = CalculationMethod.Turkey();
      const date = new Date();
      const times = new PrayerTimes(coords, date, params);
      setPrayerTimes(times);

      // 2. Kıble Açısı
      const qibla = Qibla(coords);
      setQiblaAngle(qibla);

      // 3. Pusula Başlat
      startHeadingWatch();

      setLoading(false);

    } catch (err) {
      console.log(err);
      setError('Konum alınamadı.');
      setLoading(false);
    }
  };

  const startHeadingWatch = async () => {
    try {
        await Location.watchHeadingAsync((obj) => {
            let heading = obj.trueHeading !== -1 ? obj.trueHeading : obj.magHeading;
            setDeviceHeading(heading);
        });
    } catch (e) {
        console.log(e);
    }
  };

  // --- TIMERS ---
  useEffect(() => {
    if (prayerTimes) {
      updateCurrentAndNextPrayer();
      const interval = setInterval(updateCurrentAndNextPrayer, 1000);
      return () => clearInterval(interval);
    }
  }, [prayerTimes]);

  useEffect(() => {
      if (!notificationsPrefLoaded) return;
      if (!notificationsEnabled) return;
      if (prayerTimes && location) {
          schedulePrayerNotifications();
      }
  }, [prayerTimes, location, notificationsEnabled, notificationsPrefLoaded]);


  const updateCurrentAndNextPrayer = () => {
    if (!prayerTimes) return;
    const now = new Date();
    
    // Basit bir döngü ile vakit bulma
    const times = [
        { key: 'fajr', time: prayerTimes.fajr },
        { key: 'sunrise', time: prayerTimes.sunrise },
        { key: 'dhuhr', time: prayerTimes.dhuhr },
        { key: 'asr', time: prayerTimes.asr },
        { key: 'maghrib', time: prayerTimes.maghrib },
        { key: 'isha', time: prayerTimes.isha },
    ].filter(item => item.time);

    let current = null;
    let next = null;

    for (let i = 0; i < times.length; i++) {
        if (now < times[i].time) {
            next = times[i];
            current = times[i - 1] || times[5]; // Bir önceki, yoksa dünün yatsısı (basitleştirilmiş)
            break;
        }
    }

    if (!next) {
        // Gün bitmiş, sonraki İmsak (Yarın)
        next = times[0]; 
        current = times[5]; // Yatsı
        // Not: Tam doğruluk için yarının vakitlerini hesaplamak gerekir ama bu basitçe iş görür
    }

    setCurrentPrayer(current ? { name: current.key } : null);
    setNextPrayer(next ? { name: next.key, time: next.time } : null);

    // Countdown
    if (next) {
      let diff = next.time - now;
      if (diff < 0) {
        diff += 24 * 60 * 60 * 1000;
      }
      if (diff >= 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds });
      } else {
        setTimeRemaining(null);
      }
    } else {
      setTimeRemaining(null);
    }
  };

  // --- AUDIO ---
  const handlePrayerPress = async (prayerKey) => {
    if (prayerKey === 'sunrise') {
        Alert.alert("Bilgi", "Kerahat vaktinde ezan okunmaz.");
        return;
    }

    // Zaten çalıyorsa durdur
    if (playingSound === prayerKey) {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
            setPlayingSound(null);
        }
        return;
    }

    // Başka ses varsa durdur
    if (sound) {
        try {
            await sound.stopAsync();
            await sound.unloadAsync();
        } catch (e) {}
    }

    // Yeni çal
    try {
        const file = SOUND_FILES[prayerKey];
        if (!file) return;

        const { sound: newSound } = await Audio.Sound.createAsync(file);
        setSound(newSound);
        setPlayingSound(prayerKey);
        
        newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
                setPlayingSound(null);
                newSound.unloadAsync();
            }
        });

        await newSound.playAsync();

    } catch (error) {
        Alert.alert("Hata", "Ses dosyası çalınamadı.");
    }
  };

  const handlePrayerLongPress = (key) => {
    const info = PRAYER_DETAILS[key];
    if (info) {
      setSelectedPrayerInfo(info);
      setInfoModalVisible(true);
    }
  };

  const triggerTestEzanNotification = async () => {
    if (!notificationsEnabled) {
      Alert.alert('Bilgi', 'Test için önce bildirimleri açmanız gerekir.');
      return;
    }
    try {
      const triggerDate = new Date(Date.now() + 5000);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Bildirimi',
          body: 'Ezan sesi testi başlatılıyor.',
          sound: 'ogle.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          ...(Platform.OS === 'android' ? { channelId: 'ezan-channel' } : {}),
        },
      });
      Alert.alert('Bilgi', '5 saniye içinde test bildirimi gelecek.');
    } catch (error) {
      console.log('Test bildirimi hatası', error);
      Alert.alert('Hata', 'Test bildirimi planlanamadı.');
    }
  };

  const handleNotificationsToggle = async (value) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREF_KEY, value ? 'true' : 'false');
    } catch (error) {
      console.log('Bildirim tercihi kaydedilemedi', error);
    }

    if (value) {
      await schedulePrayerNotifications(true);
      Alert.alert('Bilgi', 'Bildirimler tekrar açıldı.');
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      Alert.alert('Bilgi', 'Ezan bildirimleri kapatıldı.');
    }
  };

  // --- NOTIFICATIONS ---
  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  };

  const schedulePrayerNotifications = async (forceEnabledValue = null) => {
    const isEnabled = forceEnabledValue ?? notificationsEnabled;
    if (!prayerTimes || !isEnabled) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const buildDateTrigger = (date, channelId = 'ezan-channel') => ({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android' ? { channelId } : {}),
    });

    // Güneş vaktini (sunrise) ana ezan bildirimlerinden hariç tutuyoruz.
    const entries = [
      { key: 'fajr',    time: prayerTimes.fajr },
      { key: 'dhuhr',   time: prayerTimes.dhuhr },
      { key: 'asr',     time: prayerTimes.asr },
      { key: 'maghrib', time: prayerTimes.maghrib },
      { key: 'isha',    time: prayerTimes.isha },
    ];

    for (const { key, time } of entries) {
      if (!time) continue;

      // 1) Vakit girdiği anda EZAN sesli bildirim
      if (time > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${PRAYER_NAMES[key]} vakti`,
            body: `${PRAYER_NAMES[key]} vakti girdi.`,
            sound: 'ogle.mp3',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: buildDateTrigger(time, 'ezan-channel'),
        });
      }

      // 2) Her vakitten 10 dk önce ek sessiz hatırlatma (sadece bildirim, ezan sesi yok)
      const tenMinutesBefore = new Date(time.getTime() - 10 * 60 * 1000);
      if (tenMinutesBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${PRAYER_NAMES[key]} vaktine 10 dakika kaldı`,
            body: `${PRAYER_NAMES[key]} için hazırlanın.`,
            sound: null,
            priority: Notifications.AndroidNotificationPriority.DEFAULT,
          },
          trigger: buildDateTrigger(tenMinutesBefore, 'reminder-channel'),
        });
      }
    }
  };

  // --- QIBLA ANIMATION ---
  useEffect(() => {
    if (qiblaAngle !== null && deviceHeading !== null) {
      const diff = getAngleDiff(qiblaAngle, deviceHeading);

      Animated.spring(rotateAnim, {
        toValue: diff ?? 0,
        friction: 7,
        useNativeDriver: true
      }).start();

      if (diff !== null && Math.abs(diff) < 10) {
        const pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(arrowPulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
            Animated.timing(arrowPulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
          ])
        );
        pulseAnimation.start();
        return () => pulseAnimation.stop();
      }

      arrowPulseAnim.setValue(1);
    }
  }, [deviceHeading, qiblaAngle]);


  // --- RENDER HELPERS ---
  const formatTime = (date) => date ? format(date, 'HH:mm', { locale: tr }) : '--:--';
  const formatDate = (date) => format(date, 'd MMMM yyyy, EEEE', { locale: tr });
  const formatReligiousDate = (dateString) => format(new Date(dateString), 'd MMMM, EEEE', { locale: tr });

  const qiblaAngleDiff = qiblaAngle !== null ? getAngleDiff(qiblaAngle, deviceHeading ?? 0) : null;
  const qiblaDiffAbs = qiblaAngleDiff !== null ? Math.abs(qiblaAngleDiff) : null;
  const isQiblaAligned = qiblaDiffAbs !== null && qiblaDiffAbs <= 5;
  const qiblaDirectionText = qiblaAngleDiff !== null ? (qiblaAngleDiff > 0 ? 'Sağa çevir' : 'Sola çevir') : '';
  const qiblaAngleDisplay = qiblaAngle !== null ? `${Math.round(qiblaAngle)}°` : '--°';
  const deviceHeadingDisplay = deviceHeading !== null ? `${Math.round(deviceHeading)}°` : '--°';
  const qiblaDiffDisplay = qiblaDiffAbs !== null ? `${qiblaDiffAbs.toFixed(0)}°` : '--°';
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingReligiousDay = RELIGIOUS_DAYS.find((day) => new Date(day.date) >= todayStart);

  const cardinalPoints = [
    { label: 'K', style: styles.cardinalNorth },
    { label: 'D', style: styles.cardinalEast },
    { label: 'G', style: styles.cardinalSouth },
    { label: 'B', style: styles.cardinalWest },
  ];


  // --- SPLASH SCREEN RENDER ---
  if (showSplash) {
      const spin = logoRotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg']
      });
      return (
          <View style={styles.splashContainer}>
              <Animated.View style={[styles.splashContent, { opacity: splashFadeAnim, transform: [{ scale: splashScaleAnim }] }]}>
                  <Animated.Image 
                    source={require('./assets/logo.png')} 
                    style={[styles.splashLogo, { transform: [{ rotate: spin }] }]} 
                    resizeMode="contain"
                  />
                  <Text style={styles.splashText}>Vakit</Text>
                  <View style={styles.splashQuoteCard}>
                    <Text style={styles.splashQuote}>
                      “Namaz, müminlere vakitli olarak farz kılınmıştır.”
                    </Text>
                    <Text style={styles.splashQuoteRef}>(Nisa, 103)</Text>
                  </View>
              </Animated.View>
          </View>
      );
  }

  // --- MAIN RENDER ---
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.title}>Namaz Vakitleri</Text>
            <TouchableOpacity
              style={styles.headerIconBtn}
              activeOpacity={0.8}
              onPress={() => setCalendarModalVisible(true)}
            >
              <Ionicons name="calendar" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
          <Text style={styles.date}>{formatDate(new Date())}</Text>
          <TouchableOpacity style={styles.testBtn} onPress={triggerTestEzanNotification}>
            <Text style={styles.testBtnText}>Test Bildirimi Çal</Text>
          </TouchableOpacity>
          {loading && <ActivityIndicator color="#10B981" style={{ marginTop: 10 }} />}
          {error && <Text style={{ color: 'red', marginTop: 5 }}>{error}</Text>}
        </View>

        <View style={styles.notificationToggleCard}>
          <View style={styles.notificationToggleTexts}>
            <Text style={styles.notificationToggleTitle}>Ezan Bildirimleri</Text>
            <Text style={styles.notificationToggleSubtitle}>
              {notificationsEnabled ? 'Vakit girince ezan sesi çalar' : 'Bildirimler kapalı'}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            disabled={!notificationsPrefLoaded}
            trackColor={{ false: '#CBD5F5', true: '#BBF7D0' }}
            thumbColor={notificationsEnabled ? '#10B981' : '#F4F4F5'}
            ios_backgroundColor="#CBD5F5"
          />
        </View>

        {/* Countdown */}
        {nextPrayer && (
          <View style={styles.countdownCard}>
            <View style={styles.countdownHeaderRow}>
              <View style={styles.countdownBadge}>
                <Ionicons name="time-outline" size={16} color="#ECFDF3" />
                <Text style={styles.countdownBadgeText}>Sonraki Vakit</Text>
              </View>
              <View style={styles.countdownMeta}>
                <Ionicons name="alarm-outline" size={16} color="#ECFDF3" />
                <Text style={styles.countdownMetaText}>
                  {nextPrayer?.time ? formatTime(nextPrayer.time) : '--:--'}
                </Text>
              </View>
            </View>
            <Text style={styles.countdownTitle}>{PRAYER_NAMES[nextPrayer.name]}</Text>
            <Text style={styles.countdownSubtitle}>Vaktine kalan süre</Text>
            <View style={styles.timerRow}>
              <Text style={styles.timerText}>
                {timeRemaining ? timeRemaining.hours.toString().padStart(2, '0') : '--'}
              </Text>
              <Text style={styles.timerDot}>:</Text>
              <Text style={styles.timerText}>
                {timeRemaining ? timeRemaining.minutes.toString().padStart(2, '0') : '--'}
              </Text>
              <Text style={styles.timerDot}>:</Text>
              <Text style={styles.timerText}>
                {timeRemaining ? timeRemaining.seconds.toString().padStart(2, '0') : '--'}
              </Text>
            </View>
          </View>
        )}

        {/* Vakit Listesi */}
        <View style={styles.listContainer}>
          {prayerTimes && PRAYER_ORDER.map((key) => {
            const isActive = currentPrayer?.name === key;
            const isPlaying = playingSound === key;
            const time = prayerTimes[key];

            // Kart ikonu ve renk paleti
            const config = {
              fajr: { icon: 'moon', color: '#4F46E5', bg: '#EEF2FF' },
              sunrise: { icon: 'sunny-outline', color: '#F97316', bg: '#FFF7ED' },
              dhuhr: { icon: 'sunny', color: '#EAB308', bg: '#FEFCE8' },
              asr: { icon: 'cloud-outline', color: '#0EA5E9', bg: '#ECFEFF' },
              maghrib: { icon: 'partly-sunny', color: '#F97316', bg: '#FFF7ED' },
              isha: { icon: 'moon-outline', color: '#0F172A', bg: '#E5E7EB' },
            }[key] || { icon: 'time-outline', color: '#64748B', bg: '#E5E7EB' };

            return (
              <TouchableOpacity
                key={key}
                style={[styles.row, isActive && styles.activeRow]}
                activeOpacity={0.8}
                onLongPress={() => handlePrayerLongPress(key)}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIconShell, { backgroundColor: config.bg }]}> 
                    <Ionicons name={config.icon} size={22} color={config.color} />
                  </View>
                  <View style={styles.rowTextContainer}>
                    <View style={styles.rowTitleLine}>
                      <Text style={[styles.rowName, isActive && styles.activeText]}>
                        {PRAYER_NAMES[key]}
                      </Text>
                      {isActive && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Şimdi</Text>
                        </View>
                      )}
                      {isPlaying && (
                        <Ionicons
                          name="volume-high"
                          size={16}
                          color={config.color}
                          style={styles.playingIcon}
                        />
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowTime, isActive && styles.activeText]}>
                    {formatTime(time)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Kıble */}
        {qiblaAngle !== null && (
          <View style={styles.qiblaContainer}>
            <View style={styles.qiblaHeader}>
              <View style={styles.qiblaHeaderLeft}>
                <View style={styles.qiblaIconShell}>
                  <Ionicons name="compass" size={18} color="#0f172a" />
                </View>
                <View>
                  <Text style={styles.qiblaTitle}>Kıble Pusulası</Text>
                  <Text style={styles.qiblaSubtitle}>Cihaz başlığı: {deviceHeadingDisplay}</Text>
                </View>
              </View>
              {qiblaDiffAbs !== null && (
                <View style={[styles.alignStatus, isQiblaAligned ? styles.alignStatusSuccess : styles.alignStatusWarn]}>
                  <Ionicons
                    name={isQiblaAligned ? 'checkmark-circle' : 'navigate'}
                    size={16}
                    color={isQiblaAligned ? '#0F766E' : '#B45309'}
                  />
                  <Text
                    style={[styles.alignStatusText, isQiblaAligned ? styles.alignStatusTextSuccess : styles.alignStatusTextWarn]}
                  >
                    {isQiblaAligned ? 'Hizalı' : `${qiblaDirectionText} (${qiblaDiffAbs.toFixed(0)}°)`}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.compassWrapper}>
              <View style={[
                styles.compassGlow,
                isQiblaAligned && styles.compassGlowAligned
              ]} />
              <View style={[
                styles.compassCircle,
                isQiblaAligned && styles.compassCircleAligned
              ]}>
                {cardinalPoints.map(({ label, style }) => (
                  <Text key={label} style={[styles.cardinalLabel, style]}>
                    {label}
                  </Text>
                ))}

                {Array.from({ length: 12 }).map((_, index) => (
                  <View key={`tick-${index}`} style={[styles.tickWrapper, { transform: [{ rotate: `${index * 30}deg` }] }]}>
                    <View style={styles.tick} />
                  </View>
                ))}

                <View style={[
                  styles.innerRing,
                  isQiblaAligned && styles.innerRingAligned
                ]} />
                <View style={[
                  styles.centerDot,
                  isQiblaAligned && styles.centerDotAligned
                ]} />
                <View style={styles.northMarker} />
                <Animated.View
                  style={[
                    styles.qiblaNeedleWrapper,
                    {
                      transform: [
                        { rotate: rotateAnim.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] }) },
                        { scale: arrowPulseAnim },
                      ],
                    },
                  ]}
                >
                  <View style={styles.qiblaNeedleStem} />
                  <View style={styles.qiblaNeedleHead} />
                </Animated.View>
              </View>
            </View>

            <View style={styles.qiblaInfoRow}>
              <View style={styles.qiblaInfoCard}>
                <Text style={styles.infoLabel}>Kıble Açısı</Text>
                <Text style={styles.infoValue}>{qiblaAngleDisplay}</Text>
              </View>
              <View style={styles.qiblaInfoCard}>
                <Text style={styles.infoLabel}>Cihaz Yönü</Text>
                <Text style={styles.infoValue}>{deviceHeadingDisplay}</Text>
              </View>
              <View style={styles.qiblaInfoCard}>
                <Text style={styles.infoLabel}>Fark</Text>
                <Text style={[styles.infoValue, isQiblaAligned && styles.infoValueAligned]}>{qiblaDiffDisplay}</Text>
              </View>
            </View>

          </View>
        )}

        <View style={styles.memorialCard}>
          <Text style={styles.memorialTitle}>"Zeliha Tiryakioğlu" hayrına yapılmıştır.</Text>
          <Text style={styles.memorialSubtitle}>Ruhuna bir Fatiha okumanız dileğiyle...</Text>
        </View>

      </ScrollView>
      
        {/* Dini Günler Modal */}
      <Modal
        visible={calendarModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.calendarModal]}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.modalTitle}>Dini Günler</Text>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setCalendarModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.calendarList}
              contentContainerStyle={styles.calendarListContent}
              showsVerticalScrollIndicator={false}
            >
              {RELIGIOUS_DAYS.map((item, index) => {
                const showYearLabel = index === 0 || RELIGIOUS_DAYS[index - 1].year !== item.year;
                const dateObj = new Date(item.date);
                const isUpcoming = upcomingReligiousDay && upcomingReligiousDay.date === item.date;
                const isPast = dateObj < todayStart;
                return (
                  <View key={`${item.date}-${item.name}`}>
                    {showYearLabel && (
                      <Text style={styles.calendarYearLabel}>{item.year}</Text>
                    )}
                    <View
                      style={[
                        styles.calendarCard,
                        isUpcoming && styles.calendarCardUpcoming,
                        isPast && styles.calendarCardPast,
                      ]}
                    >
                      <View>
                        <Text
                          style={[
                            styles.calendarName,
                            isPast && styles.calendarTextPast,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.calendarDate,
                            isPast && styles.calendarTextPast,
                          ]}
                        >
                          {formatReligiousDate(item.date)}
                        </Text>
                      </View>
                      {isUpcoming && (
                        <View style={styles.upcomingBadge}>
                          <Ionicons
                            name="leaf"
                            size={14}
                            color="#15803D"
                            style={styles.upcomingBadgeIcon}
                          />
                          <Text style={styles.upcomingBadgeText}>Yaklaşıyor</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Namaz Bilgileri Modal */}
      <Modal
        visible={infoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedPrayerInfo?.name}</Text>
            <Text style={styles.modalRakats}>{selectedPrayerInfo?.rakats}</Text>
            <Text style={styles.modalDetail}>{selectedPrayerInfo?.detail}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  splashText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  splashQuoteCard: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(17,24,39,0.85)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    alignItems: 'center',
  },
  splashQuote: {
    color: '#F9FAFB',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
  },
  splashQuoteRef: {
    marginTop: 6,
    color: '#A5F3FC',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 80,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
    width: '100%',
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationToggleCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  notificationToggleTexts: {
    flex: 1,
    marginRight: 12,
  },
  notificationToggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  notificationToggleSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '600',
  },
  testBtn: {
    marginTop: 10,
    backgroundColor: '#eee',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  testBtnText: {
    fontSize: 12,
    color: '#333'
  },
  countdownCard: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  countdownHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 118, 110, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countdownBadgeText: {
    color: '#ECFDF3',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 118, 110, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countdownMetaText: {
    color: '#ECFDF3',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  countdownTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  countdownSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timerDot: {
    fontSize: 42,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 5,
    marginBottom: 5,
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 30,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
  },
  activeRow: {
    backgroundColor: '#ECFDF3',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  rowIconShell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowName: {
    fontSize: 20,
    color: '#333',
    fontWeight: '500',
  },
  rowSubText: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  playingIcon: {
    marginLeft: 6,
  },
  rowTime: {
    fontSize: 20,
    color: '#333',
    fontWeight: '600',
  },
  rowRight: {
    marginLeft: 8,
    flexShrink: 0,
  },
  activeText: {
    color: '#10B981',
    fontWeight: '700',
  },
  currentBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },
  currentBadgeText: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  qiblaContainer: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    marginBottom: 40,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 10,
  },
  qiblaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qiblaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qiblaIconShell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  qiblaTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  qiblaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  alignStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  alignStatusText: {
    fontSize: 13,
    marginLeft: 6,
  },
  alignStatusSuccess: {
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  alignStatusTextSuccess: {
    color: '#34D399',
    fontWeight: '600',
  },
  alignStatusWarn: {
    backgroundColor: 'rgba(251,191,36,0.15)',
  },
  alignStatusTextWarn: {
    color: '#FBBF24',
    fontWeight: '600',
  },
  compassWrapper: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(16,185,129,0.08)',
    shadowColor: '#10B981',
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  compassGlowAligned: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    shadowColor: '#22C55E',
  },
  compassCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#111c32',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  compassCircleAligned: {
    backgroundColor: '#052e23',
    borderColor: 'rgba(34,197,94,0.4)',
    shadowColor: '#22C55E',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  innerRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  innerRingAligned: {
    borderColor: 'rgba(34,197,94,0.4)',
  },
  northMarker: {
    position: 'absolute',
    width: 6,
    height: 30,
    borderRadius: 3,
    backgroundColor: '#F87171',
    top: 12,
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  centerDotAligned: {
    backgroundColor: '#22C55E',
    borderColor: '#052e23',
  },
  cardinalLabel: {
    position: 'absolute',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardinalNorth: {
    top: 18,
  },
  cardinalSouth: {
    bottom: 18,
  },
  cardinalEast: {
    right: 18,
  },
  cardinalWest: {
    left: 18,
  },
  tickWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  tick: {
    width: 2,
    height: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 10,
  },
  qiblaNeedleWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qiblaNeedleStem: {
    width: 4,
    height: 80,
    borderRadius: 2,
    backgroundColor: 'rgba(16,185,129,0.7)',
  },
  qiblaNeedleHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#34D399',
    marginTop: -2,
  },
  qiblaInfoRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  qiblaInfoCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  infoValueAligned: {
    color: '#34D399',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  modalRakats: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  modalDetail: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalCloseButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  memorialCard: {
    marginTop: 32,
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  memorialTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  memorialSubtitle: {
    marginTop: 6,
    color: '#A5F3FC',
    fontSize: 13,
    textAlign: 'center',
  },
  calendarModal: {
    width: '90%',
    maxHeight: '75%',
    alignItems: 'stretch',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalCloseIcon: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  calendarList: {
    flexGrow: 0,
  },
  calendarListContent: {
    paddingBottom: 10,
  },
  calendarYearLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 6,
  },
  calendarCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarCardUpcoming: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86efac',
  },
  calendarCardPast: {
    opacity: 0.85,
  },
  calendarName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  calendarDate: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  calendarTextPast: {
    color: '#94A3B8',
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  upcomingBadgeIcon: {
    marginRight: 4,
  },
  upcomingBadgeText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
});