import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tr from './tr';
import en from './en';

const LANGUAGE_DETECTOR = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      // Önce kaydedilmiş dili kontrol et
      const savedLanguage = await AsyncStorage.getItem('user-language');
      if (savedLanguage) {
        return callback(savedLanguage);
      }
      
      // Kayıtlı dil yoksa cihaz dilini al
      const locales = Localization.getLocales();
      if (locales && locales.length > 0) {
        return callback(locales[0].languageCode);
      }
      
      return callback('tr'); // Varsayılan Türkçe
    } catch (error) {
      console.log('Dil algılama hatası:', error);
      callback('tr');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem('user-language', language);
    } catch (error) {
      console.log('Dil kaydetme hatası:', error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false, // React zaten XSS koruması sağlıyor
    },
    react: {
      useSuspense: false, // React Native'de Suspense bazen sorun çıkarabilir
    },
  });

export default i18n;

