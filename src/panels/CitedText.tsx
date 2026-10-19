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
  const parts = r.text.split(/(\[\d+\])/g);
  return (
    <span className={r.draft ? 'cited draft' : 'cited'} lang={r.fallback ? 'en' : undefined}>
      {parts.map((p, i) => {
        const m = /^\[(\d+)\]$/.exec(p);
        if (!m) return <span key={i}>{p}</span>;
        const n = Number(m[1]);
        const ref = sources[n - 1];
        if (!ref) return <sup key={i}>{p}</sup>;
        return (
          <sup key={i}>
            <button type="button" className="cite-mark" onClick={() => openSources({ title, refs: [ref] })} aria-label={t('sources.showFor', { what: `${title} [${n}]` })}>
              {n}
            </button>
          </sup>
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
