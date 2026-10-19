import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppData, SourceRef } from '../data/model';
import { useStore } from '../state/store';
import { formatCitation, sourceLink } from './format';

/** Small button that opens the source card for a record. Every number and record on the site has one. */
export function SourceButton({ refs, title, compact = false }: { refs: SourceRef[]; title: string; compact?: boolean }) {
  const { t } = useTranslation();
  const openSources = useStore((s) => s.openSources);
  if (!refs.length) return null;
  const n = new Set(refs.map((r) => r.ref)).size;
  return (
    <button
      type="button"
      className={`src-btn${compact ? ' compact' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        openSources({ title, refs });
      }}
      aria-label={t('sources.showFor', { what: title })}
      title={t('sources.showFor', { what: title })}
    >
      {compact ? `[${n}]` : n === 1 ? t('sources.count_one') : t('sources.count', { count: n })}
    </button>
  );
}

/** The source card: full citation, where in the work, the quoted passage, and how it was checked. */
export function SourceDialog({ data }: { data: AppData }) {
  const { t } = useTranslation();
  const { sources, openSources } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const byId = useMemo(() => new Map(data.sources.map((s) => [s.id, s])), [data]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (sources && !d.open) d.showModal();
    if (!sources && d.open) d.close();
  }, [sources]);

  return (
    <dialog ref={ref} className="source-dialog" onClose={() => openSources(null)} aria-labelledby="source-dialog-title" data-testid="source-dialog">
      {sources && (
        <>
          <header>
            <h2 id="source-dialog-title">
              {t('sources.dialogTitle')}: {sources.title}
            </h2>
            <button type="button" className="close" onClick={() => openSources(null)} aria-label={t('sources.close')}>
              ×
            </button>
          </header>
          <ol className="source-list">
            {sources.refs.map((r, i) => {
              const s = byId.get(r.ref);
              const via = r.via ? byId.get(r.via) : undefined;
              const link = s ? sourceLink(s) : undefined;
              return (
                <li key={`${r.ref}-${i}`}>
                  {s ? <p className="citation">{formatCitation(s)}</p> : <p className="citation missing">{t('sources.missing', { id: r.ref })}</p>}
                  {r.locator && (
                    <p>
                      <span className="k">{t('sources.locator')}:</span> {r.locator}
                    </p>
                  )}
                  {r.quote && (
                    <blockquote>
                      <span className="visually-hidden">{t('sources.quote')}: </span>“{r.quote}”
                    </blockquote>
                  )}
                  {via && (
                    <p>
                      <span className="k">{t('sources.via')}:</span> {formatCitation(via)}
                    </p>
                  )}
                  {r.note && (
                    <p>
                      <span className="k">{t('sources.note')}:</span> {r.note}
                    </p>
                  )}
                  {s && (
                    <p className={`verify level-${s.verification.level}`}>
                      {t(`sources.level.${s.verification.level}`)}
                      {s.verification.note ? ` — ${s.verification.note}` : ''} ({s.verification.checked_on})
                    </p>
                  )}
                  {link && (
                    <p>
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        {t('sources.open')} ↗
                      </a>
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          {data.config.corrections_url && (
            <p className="suggest">
              <a
                href={`${data.config.corrections_url}?title=${encodeURIComponent(`Correction: ${sources.title}`)}&body=${encodeURIComponent(`Record: ${sources.title}\nSources: ${sources.refs.map((r) => r.ref).join(', ')}\nPage: ${window.location.href}\n\nWhat is wrong, and which source shows it:\n`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('sources.suggest')} ↗
              </a>
            </p>
          )}
        </>
      )}
    </dialog>
  );
}
