'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useT } from '@/components/providers/LanguageProvider';
import type { Language } from '@/lib/i18n';

// Saves the display language to the profile. The session re-reads it on the
// next request, and router.refresh() re-renders the dashboard in it.
export default function LanguageSwitcher() {
  const { t, lang } = useT();
  const router = useRouter();
  const { update } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: Language) => {
    if (next === lang) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: next }),
      });
      if (!res.ok) throw new Error();
      await update({ language: next });
      router.refresh();
    } catch {
      setError(t('profile_language_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label htmlFor="language" className="block text-sm font-medium text-white/70 mb-1">
        {t('profile_language')}
      </label>
      <select
        id="language"
        value={lang}
        disabled={saving}
        onChange={(e) => change(e.target.value as Language)}
        className="w-full max-w-xs rounded-lg border border-white/10 bg-[#1C2740] px-4 py-2.5 text-sm text-white focus:border-[rgba(196,154,60,0.5)] focus:outline-none disabled:opacity-50"
      >
        <option value="en">{t('language_en')}</option>
        <option value="ms">{t('language_ms')}</option>
      </select>
      <p className="mt-1 text-xs text-white/40">{t('profile_language_hint')}</p>
      {error && <p className="mt-1 text-xs text-[#f87171]">{error}</p>}
    </div>
  );
}
