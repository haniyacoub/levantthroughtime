import type { Lang } from '../time/format';

export interface LocalizedText {
  en: string;
  ar?: string;
  he?: string;
  translation_status?: { ar?: string; he?: string };
}

export interface Resolved {
  text: string;
  /** The text shown is a machine draft, not yet reviewed. */
  draft: boolean;
  /** No text in the requested language; English shown instead. */
  fallback: boolean;
}

/** Pick the text for a language, falling back to English (the original). */
export function resolve(t: LocalizedText | undefined, lang: Lang): Resolved {
  if (!t) return { text: '', draft: false, fallback: false };
  if (lang === 'en') return { text: t.en, draft: false, fallback: false };
  const v = t[lang];
  if (!v) return { text: t.en, draft: false, fallback: true };
  return { text: v, draft: t.translation_status?.[lang] === 'machine-draft', fallback: false };
}

export const loc = (t: LocalizedText | undefined, lang: Lang): string => resolve(t, lang).text;
