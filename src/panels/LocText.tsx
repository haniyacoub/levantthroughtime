import { resolve, type LocalizedText } from '../i18n/localize';
import type { Lang } from '../time/format';

/**
 * Text in the reader's language. When only the English original exists, it is marked as
 * English and left-to-right, so its punctuation stays in place inside Arabic or Hebrew pages.
 */
export function LocText({ text, lang }: { text: LocalizedText | undefined; lang: Lang }) {
  const r = resolve(text, lang);
  if (!r.text) return null;
  return r.fallback ? (
    <span lang="en" dir="ltr">
      {r.text}
    </span>
  ) : (
    <>{r.text}</>
  );
}
