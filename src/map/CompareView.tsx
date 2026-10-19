import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Map as MLMap } from './maplibre';
import type { AppData } from '../data/model';
import { isRtl } from '../i18n';
import { useStore, type LayerKey } from '../state/store';
import type { EraScale } from '../time/eraScale';
import { formatT } from '../time/format';
import { parseUserDate } from '../time/parse';
import { tOf } from '../time/years';
import { MapView } from './MapView';

export interface ComparePreset {
  id: string;
  a: number;
  b: number;
  layers?: LayerKey[];
}

/** Presets: the 1947 plan, the 1949 armistice lines, the 1967 war, and today. */
export function comparePresets(scale: EraScale): ComparePreset[] {
  return [
    { id: 'plan-vs-1949', a: tOf(1947, 12), b: tOf(1949, 8), layers: ['modern'] },
    { id: '1949-vs-1967', a: tOf(1967, 5), b: tOf(1967, 7), layers: ['modern'] },
    { id: '1967-vs-today', a: tOf(1967, 7), b: scale.tMax, layers: ['modern'] },
    { id: 'mandate-vs-today', a: tOf(1946), b: scale.tMax },
  ];
}

/** Two maps at two dates, kept on the same view, side by side or with a swipe handle. */
export function CompareView({ data, scale }: { data: AppData; scale: EraScale }) {
  const { t: tr } = useTranslation();
  const { t, lang, compare, setCompare, setT, layers, setLayers } = useStore();
  const maps = useRef<[MLMap | null, MLMap | null]>([null, null]);
  const [split, setSplit] = useState(50);
  const [input, setInput] = useState('');
  const rtl = isRtl(lang);

  // Keep both maps on the same view.
  const link = (i: 0 | 1) => (m: MLMap) => {
    maps.current[i] = m;
    const [a, b] = maps.current;
    if (!a || !b) return;
    let syncing = false;
    const follow = (src: MLMap, dst: MLMap) => () => {
      if (syncing) return;
      syncing = true;
      dst.jumpTo({ center: src.getCenter(), zoom: src.getZoom() });
      syncing = false;
    };
    a.on('move', follow(a, b));
    b.on('move', follow(b, a));
    b.jumpTo({ center: a.getCenter(), zoom: a.getZoom() });
  };

  useEffect(() => {
    maps.current.forEach((m) => m?.resize());
  }, [compare.mode]);

  const applyPreset = (p: ComparePreset) => {
    setT(scale.snap(p.a));
    setCompare({ t2: scale.snap(p.b) });
    if (p.layers) setLayers([...new Set([...layers, ...p.layers])]);
  };

  const onGo = (e: FormEvent) => {
    e.preventDefault();
    const v = parseUserDate(input);
    if (v !== null) setCompare({ t2: scale.snap(scale.clampT(v)) });
  };

  const unit = (tt: number) => scale.displayUnit(tt);
  const clip = compare.mode === 'swipe' ? (rtl ? `inset(0 0 0 ${100 - split}%)` : `inset(0 ${100 - split}% 0 0)`) : undefined;

  return (
    <div className={`compare compare-${compare.mode}`} data-testid="compare-view">
      <div className="compare-bar">
        <strong>{tr('compare.title')}</strong>
        <span>
          {tr('compare.left')}: <b>{formatT(t, lang, unit(t))}</b> · {tr('compare.right')}: <b>{formatT(compare.t2, lang, unit(compare.t2))}</b>
        </span>
        <form onSubmit={onGo} className="goto">
          <label>
            <span className="visually-hidden">{tr('compare.secondDate')}</span>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={tr('compare.secondDate')} dir="ltr" data-testid="compare-input" />
          </label>
          <button type="submit">{tr('timeline.goTo')}</button>
        </form>
        <div className="seg" role="group" aria-label={tr('compare.mode')}>
          {(['split', 'swipe'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={compare.mode === m} onClick={() => setCompare({ mode: m })}>
              {tr(`compare.${m}`)}
            </button>
          ))}
        </div>
        <div className="presets" role="group" aria-label={tr('compare.presets')}>
          {comparePresets(scale).map((p) => (
            <button key={p.id} type="button" onClick={() => applyPreset(p)} data-testid={`preset-${p.id}`}>
              {tr(`compare.preset.${p.id}`)}
            </button>
          ))}
        </div>
        <button type="button" className="link-btn" onClick={() => setCompare({ on: false })}>
          {tr('compare.close')}
        </button>
      </div>
      <div className="compare-maps">
        <div className="compare-pane a">
          <MapView data={data} t={t} lang={lang} onMap={link(0)} />
          <span className="pane-date">{formatT(t, lang, unit(t))}</span>
        </div>
        <div className="compare-pane b" style={clip ? { clipPath: clip } : undefined}>
          <MapView data={data} t={compare.t2} lang={lang} controls={false} onMap={link(1)} />
          <span className="pane-date">{formatT(compare.t2, lang, unit(compare.t2))}</span>
        </div>
        {compare.mode === 'swipe' && (
          <input
            className="swipe-handle"
            type="range"
            min={5}
            max={95}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            aria-label={tr('compare.swipe')}
          />
        )}
      </div>
    </div>
  );
}
