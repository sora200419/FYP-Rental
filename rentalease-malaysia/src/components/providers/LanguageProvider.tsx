'use client';

import { createContext, useCallback, useContext } from 'react';
import { t, tc, type Language, type MessageKey } from '@/lib/i18n';

// The dashboard layout reads the language from the server-side session and
// provides it here, so client components render in the right language on the
// very first paint (useSession() would start as undefined → English flash).
const LanguageContext = createContext<Language>('en');

export function LanguageProvider({
  lang,
  children,
}: {
  lang: Language;
  children: React.ReactNode;
}) {
  return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Language {
  return useContext(LanguageContext);
}

/** Translation functions bound to the current language. */
export function useT() {
  const lang = useLanguage();
  const translate = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => t(key, lang, vars),
    [lang],
  );
  const translateCount = useCallback(
    (base: Parameters<typeof tc>[0], count: number) => tc(base, count, lang),
    [lang],
  );
  return { t: translate, tc: translateCount, lang };
}
