import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from 'react';
import { translations, type TranslationKey } from '@/i18n/translations';
import type { Language } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/firestoreData';

interface LanguageContextValue {
  language: Language;
  t: TranslationKey;
  setLanguage: (lang: Language) => Promise<void>;
  locale: string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const language: Language = profile?.language ?? 'es';
  const t = translations[language];
  const locale = language === 'en' ? 'en-US' : 'es-MX';

  const setLanguage = useCallback(
    async (lang: Language) => {
      if (!profile) return;
      await updateUserProfile(profile.id, { language: lang });
      await refreshProfile();
    },
    [profile, refreshProfile]
  );

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, locale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export function useTranslation() {
  return useLanguage();
}
