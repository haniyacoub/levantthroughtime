import { create } from 'zustand';
import type { Lang } from '../time/format';

export const SPEEDS = [0.5, 1, 2, 4] as const;
/** At 1× the whole timeline plays in five minutes. */
export const FULL_PLAY_MS = 5 * 60 * 1000;

export type View = 'map' | 'bibliography' | 'perspectives' | 'about';
export const LAYER_KEYS = ['territories', 'places', 'holy', 'conflicts', 'migrations', 'landscape', 'routes', 'modern'] as const;
export type LayerKey = (typeof LAYER_KEYS)[number];
export const DEFAULT_LAYERS: LayerKey[] = ['territories', 'places', 'holy', 'conflicts', 'migrations', 'landscape', 'routes', 'modern'];
export type ChartMode = 'total' | 'composition' | 'share';

export interface OpenSources {
  title: string;
  refs: { ref: string; locator?: string; quote?: string; via?: string; note?: string }[];
}

interface State {
  /** Which page is showing (map, bibliography…). */
  view: View;
  /** The place whose panel is open. */
  placeId: string | null;
  /** The source card that is open. */
  sources: OpenSources | null;
  chartOpen: boolean;
  chartMode: ChartMode;
  chartLog: boolean;
  /** Area series shown in the population chart ("core" or an area id). */
  chartSeries: string;
  /** Map labels show the names in use at the time, or today's names. */
  namesMode: 'then' | 'today';
  /** Map layers switched on. */
  layers: LayerKey[];
  /** Compare mode: a second map at another date, side by side or with a swipe handle. */
  compare: { on: boolean; t2: number; mode: 'split' | 'swipe' };
  setCompare: (c: Partial<State['compare']>) => void;
  /** The guided tour being played, if any. */
  story: { id: string; step: number } | null;
  storyAuto: boolean;
  setStory: (s: { id: string; step: number } | null) => void;
  setStoryAuto: (a: boolean) => void;
  /** Modern sub-layers switched off (by id). */
  modernOff: string[];
  toggleModern: (id: string) => void;
  toggleLayer: (k: LayerKey) => void;
  setLayers: (l: LayerKey[]) => void;
  setNamesMode: (m: 'then' | 'today') => void;
  setView: (v: View) => void;
  setPlace: (id: string | null) => void;
  openSources: (s: OpenSources | null) => void;
  setChart: (p: Partial<Pick<State, 'chartOpen' | 'chartMode' | 'chartLog' | 'chartSeries'>>) => void;
  /** Continuous time (astronomical year + month fraction), always on the step grid. */
  t: number;
  playing: boolean;
  speed: number;
  lang: Lang;
  setT: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
  setLang: (l: Lang) => void;
}

/** The page named in the address bar (#/bibliography etc.), read once at start-up. */
export function viewFromHash(hash: string): View {
  return hash === '#/bibliography' ? 'bibliography' : hash === '#/perspectives' ? 'perspectives' : hash === '#/about' ? 'about' : 'map';
}

export const useStore = create<State>((set) => ({
  view: typeof window === 'undefined' ? 'map' : viewFromHash(window.location.hash),
  placeId: null,
  sources: null,
  // Open by default only where there is room for both the map and the chart.
  chartOpen: typeof window === 'undefined' ? true : window.innerHeight > 860,
  chartMode: 'total',
  chartLog: true,
  chartSeries: 'core',
  namesMode: 'then',
  layers: [...DEFAULT_LAYERS],
  modernOff: [],
  story: null,
  storyAuto: false,
  setStory: (story) => set({ story }),
  setStoryAuto: (storyAuto) => set({ storyAuto }),
  compare: { on: false, t2: 2026 + 9 / 12, mode: 'split' },
  setCompare: (c) => set((st) => ({ compare: { ...st.compare, ...c } })),
  toggleModern: (id) => set((st) => ({ modernOff: st.modernOff.includes(id) ? st.modernOff.filter((x) => x !== id) : [...st.modernOff, id] })),
  toggleLayer: (k) => set((st) => ({ layers: st.layers.includes(k) ? st.layers.filter((x) => x !== k) : [...st.layers, k] })),
  setLayers: (layers) => set({ layers }),
  setNamesMode: (namesMode) => set({ namesMode }),
  setView: (view) => set({ view }),
  setPlace: (placeId) => set({ placeId }),
  openSources: (sources) => set({ sources }),
  setChart: (p) => set(p),
  t: 1,
  playing: false,
  speed: 1,
  lang: 'en',
  setT: (t) => set({ t }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  setLang: (lang) => set({ lang }),
}));
