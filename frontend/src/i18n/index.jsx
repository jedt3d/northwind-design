import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';
import th from './th.js';
import ja from './ja.js';
import { pb } from '../pb';

const DICTS = { en, th, ja };
export const LANGS = ['en', 'th', 'ja'];
const STORAGE_KEY = 'nw_lang';

const I18nContext = createContext(null);

export function detectInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch {
    /* private mode */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en')
    .slice(0, 2)
    .toLowerCase();
  return DICTS[nav] ? nav : 'en';
}

export function I18nProvider({ children, initialLang }) {
  const [lang, setLangState] = useState(() => initialLang || detectInitialLang());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l, { syncProfile = true } = {}) => {
    if (!DICTS[l]) return;
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    const rec = pb.authStore.record;
    if (syncProfile && pb.authStore.isValid && rec && rec.id && rec.language !== l) {
      pb.collection('employees')
        .update(rec.id, { language: l })
        .catch(() => {});
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.split(`{${k}}`).join(String(v));
        }
      }
      return s;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Hook returning { t, lang, setLang }. */
export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used inside <I18nProvider>');
  return ctx;
}
