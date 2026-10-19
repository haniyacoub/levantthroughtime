import { useTranslation } from 'react-i18next';
import type { SourceRef } from '../data/model';
import { resolve, type LocalizedText } from '../i18n/localize';
import { useStore } from '../state/store';

/**
 * Narrative text whose sentences end with [n] markers. Each marker becomes a
 * button that opens the n-th source of the record, so every sentence links to its source.
 */
export function CitedText({ text, sources, title }: { text: LocalizedText; sources: SourceRef[]; title: string }) {
  const { t } = useTranslation();
  const { lang, openSources } = useStore();
  const r = resolve(text, lang);
  // Markers and the punctuation right after them ("[1][2].") form one unbreakable group, so a line
  // break never strands the full stop on the next line (which also misplaces it in right-to-left text).
  const parts = r.text.split(/((?:\[\d+\])+[.!?,;:،؛]*)/g);
  return (
    <span className={r.draft ? 'cited draft' : 'cited'} lang={r.fallback ? 'en' : undefined} dir={r.fallback ? 'ltr' : undefined}>
      {parts.map((p, i) => {
        const nums = [...p.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
        if (!nums.length) return p ? <span key={i}>{p}</span> : null;
        const tail = p.replace(/(\[\d+\])+/, '');
        return (
          <span key={i} className="cite-group">
            {nums.map((n, j) => {
              const ref = sources[n - 1];
              return (
                <sup key={j}>
                  {/* Consecutive markers are separated so they don't read as one number. */}
                  {j > 0 && ','}
                  {ref ? (
                    <button type="button" className="cite-mark" onClick={() => openSources({ title, refs: [ref] })} aria-label={t('sources.showFor', { what: `${title} [${n}]` })}>
                      {n}
                    </button>
                  ) : (
                    `[${n}]`
                  )}
                </sup>
              );
            })}
            {tail}
          </span>
        );
      })}
      {r.draft && (
        <span className="draft-mark" title={t('draftNotice')}>
          *
        </span>
      )}
    </span>
  );
}
