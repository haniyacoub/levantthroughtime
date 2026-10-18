import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';
import he from './locales/he.json';
import type { Lang } from '../time/format';

export const LANGS: Lang[] = ['en', 'ar', 'he'];
export const isRtl = (lang: Lang) => lang === 'ar' || lang === 'he';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar }, he: { translation: he } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Apply language to i18next and to the document (direction, lang attribute). */
export function applyLanguage(lang: Lang): void {
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
}

export default i18n;
