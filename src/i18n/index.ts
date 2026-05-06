import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dict, Lang, TKey } from './strings';

const STORAGE_KEY = '@trace/language';
const DEFAULT_LANG: Lang = 'en';

type TranslateParams = Record<string, string | number>;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey, params?: TranslateParams) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, params?: TranslateParams) {
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'en' || stored === 'ko') setLangState(stored);
      })
      .finally(() => setReady(true));
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TKey, params?: TranslateParams) => {
      const value = (dict[lang] as Record<string, string>)[key] ?? dict.en[key] ?? key;
      return interpolate(value, params);
    },
    [lang]
  );

  const ctx = useMemo(() => ({ lang, setLang, t, ready }), [lang, setLang, t, ready]);

  return React.createElement(I18nContext.Provider, { value: ctx }, children);
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}

export function formatRelative(ts: number, t: (key: TKey, params?: TranslateParams) => string) {
  const now = Date.now();
  const diff = now - ts;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / day);
  if (days === 0) return t('date.today');
  if (days === 1) return t('date.yesterday');
  if (days < 7) return t('date.daysAgo', { n: days });
  if (days < 30) return t('date.weeksAgo', { n: Math.floor(days / 7) });
  if (days < 365) return t('date.monthsAgo', { n: Math.floor(days / 30) });
  return t('date.yearsAgo', { n: Math.floor(days / 365) });
}
