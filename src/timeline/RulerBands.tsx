import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppData } from '../data/model';
import { loc } from '../i18n/localize';
import { useStore } from '../state/store';
import type { EraScale } from '../time/eraScale';
import { formatYear } from '../time/format';
import { fromT } from '../time/years';

const LANE_H = 13;

/** Black or white text, whichever contrasts more with the bar colour (WCAG relative luminance). */
function textOn(hex: string): string {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? '#000000' : '#ffffff';
}
const MAX_LANES = 7;

interface Bar {
  owner: string;
  t0: number;
  t1: number;
  lane: number;
}

/** Gantt-style strip under the slider: who held the core land, on the same non-linear scale. */
export function RulerBands({ data, scale }: { data: AppData; scale: EraScale }) {
  const { t: tr } = useTranslation();
  const { t, lang, setT, setPlaying } = useStore();
  const polities = useMemo(() => new Map(data.polities.map((p) => [p.id, p])), [data]);

  const { bars, lanes } = useMemo(() => {
    const items: Omit<Bar, 'lane'>[] = [];
    for (const b of data.bands) {
      for (const [a, c] of b.intervals) {
        const t0 = Math.max(a, scale.tMin);
        const t1 = Math.min(c ?? scale.tMax, scale.tMax);
        if (t1 > t0) items.push({ owner: b.owner, t0, t1 });
      }
    }
    items.sort((x, y) => x.t0 - y.t0 || y.t1 - y.t0 - (x.t1 - x.t0));
    // Greedy packing: each bar goes into the first lane that is free when it starts.
    const laneEnds: number[] = [];
    const out: Bar[] = [];
    for (const it of items) {
      let lane = laneEnds.findIndex((end) => end <= it.t0 + 1e-6);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = it.t1;
      if (lane < MAX_LANES) out.push({ ...it, lane });
    }
    return { bars: out, lanes: Math.min(laneEnds.length, MAX_LANES) };
  }, [data, scale]);

  const pos = scale.tToPos(t);

  return (
    <div className="ruler-bands" role="group" aria-label={tr('bands.label')} style={{ height: lanes * LANE_H }}>
      {bars.map((b, i) => {
        const p0 = scale.tToPos(b.t0);
        const p1 = scale.tToPos(b.t1);
        const pol = polities.get(b.owner);
        const name = loc(pol?.name, lang) || b.owner;
        const label = `${name} (${formatYear(fromT(b.t0).year, lang)}–${formatYear(fromT(b.t1).year, lang)})`;
        const wide = p1 - p0 > 0.035;
        return (
          <button
            type="button"
            key={`${b.owner}-${i}`}
            className="band-bar"
            style={{ insetInlineStart: `${p0 * 100}%`, width: `${Math.max(0.15, (p1 - p0) * 100)}%`, top: b.lane * LANE_H, background: pol?.color ?? '#999999', color: textOn(pol?.color ?? '#999999') }}
            title={label}
            aria-label={tr('bands.jump', { name: label })}
            tabIndex={-1}
            onClick={() => {
              setPlaying(false);
              setT(scale.snap(b.t0));
            }}
          >
            {wide && <span>{name}</span>}
          </button>
        );
      })}
      <div className="bands-cursor" style={{ insetInlineStart: `${pos * 100}%` }} aria-hidden />
    </div>
  );
}
