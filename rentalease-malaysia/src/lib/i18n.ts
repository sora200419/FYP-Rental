/*
 * Internationalization helper — minimal by design.
 *
 * Why a custom helper instead of a library like next-intl?
 * --------------------------------------------------------
 * Libraries like next-intl are designed for production applications with
 * many locales, complex pluralization rules, timezone-aware date formatting,
 * and automatic locale detection from URLs or cookies. Our needs are much
 * smaller: two languages (English and Bahasa Malaysia), roughly 200 UI
 * strings, session-based locale preference, and no URL routing changes.
 *
 * For that scale, a twenty-line dictionary lookup is simpler, has zero
 * dependencies to version-pin against Next.js, and is easy to explain in
 * the Chapter 4 write-up. If the project ever grows to need full i18n
 * features, swapping this file for next-intl is a straightforward
 * mechanical migration at that point.
 *
 * How this is used
 * ----------------
 * Server components read the user's language from the NextAuth session
 * and pass it down as a prop to any component that needs translations:
 *
 *     const session = await getServerSession(authOptions);
 *     const lang: Language = session?.user?.language ?? 'en';
 *     return <MyComponent lang={lang} />;
 *
 * The component then calls t() with the key, the language, and optionally
 * an interpolation map:
 *
 *     <h1>{t('dashboard_welcome', lang, { name: user.name })}</h1>
 *
 * Keys that are missing from the Malay dictionary fall back to English
 * automatically. Keys missing from both dictionaries fall back to the
 * key name itself — this is deliberate so that missing translations are
 * visible in the UI rather than rendering as blanks.
 */

export type Language = 'en' | 'ms';

/*
 * Message dictionaries — English and Bahasa Malaysia.
 *
 * Phase A ships this file with empty dictionaries so the helper is
 * available for import. Phase C, Step 13 will populate both dictionaries
 * with the actual UI strings. The order of key-value pairs here should
 * match the order of the corresponding entries in the other dictionary,
 * so a reviewer can diff them side by side.
 *
 * Naming convention for keys:
 *   - snake_case, lowercase
 *   - prefix with the area (nav_, dashboard_, form_, btn_, error_)
 *   - describe the content, not the location
 *     GOOD: 'nav_dashboard', 'btn_save_profile', 'error_network_retry'
 *     BAD:  'top_right_link', 'button_1', 'red_message'
 */

export const messagesEn: Record<string, string> = {
  // Populated in Phase C, Step 13.
  // Example entry kept here so the shape is obvious to future contributors:
  // 'nav_dashboard': 'Dashboard',
};

export const messagesMs: Record<string, string> = {
  // Populated in Phase C, Step 13.
  // Example entry:
  // 'nav_dashboard': 'Papan Pemuka',
};

/*
 * Translate a key to the given language with optional variable interpolation.
 *
 * Lookup order:
 *   1. Try the requested language's dictionary.
 *   2. If not found and language was 'ms', fall back to the English dictionary.
 *   3. If still not found, return the key itself (makes missing keys visible).
 *
 * Variable interpolation:
 *   Placeholders use the form {name} in the message string. The vars
 *   parameter is an object mapping placeholder names to their values.
 *   Missing placeholders are left as-is rather than rendered as 'undefined'.
 *
 * Examples:
 *   t('nav_dashboard', 'en')                    // "Dashboard"
 *   t('dashboard_welcome', 'en', { name: 'Sora' })
 *     with template "Welcome, {name}!"          // "Welcome, Sora!"
 *   t('missing_key', 'ms')                      // "missing_key"
 */
export function t(
  key: string,
  lang: Language,
  vars?: Record<string, string | number>,
): string {
  // Pick the right dictionary. For Malay, fall back to English if the key
  // isn't translated yet — this is common during the gradual rollout of
  // translations in Phase C.
  const dict = lang === 'ms' ? messagesMs : messagesEn;
  let template = dict[key];

  if (template === undefined && lang === 'ms') {
    template = messagesEn[key];
  }

  // If we still don't have a template, surface the missing key in the UI
  // so the developer spots it during testing instead of silently rendering
  // an empty string.
  if (template === undefined) {
    return key;
  }

  // No variables to interpolate — return the template as-is. Using this
  // fast path avoids unnecessary regex work when most strings are simple.
  if (!vars) {
    return template;
  }

  // Simple `{name}` placeholder replacement. Not regex-escaped because
  // our keys follow a controlled naming convention (alphanumeric and
  // underscore only) and user input never ends up in template strings.
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}
