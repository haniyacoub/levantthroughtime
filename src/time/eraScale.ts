import { fromAstronomical, startT } from './years';

/**
 * The non-linear timeline. The slider is split into contiguous segments; each
 * takes a share of the slider proportional to its `weight`, and time runs
 * linearly *within* a segment. That keeps the mapping exactly invertible.
 */

export interface StepSpec {
  unit: 'year' | 'month';
  size: number;
}

export interface FineStep extends StepSpec {
  /** Continuous time range where this finer step applies. */
  t0: number;
  t1: number;
}

export interface Segment {
  id: string;
  t0: number;
  t1: number;
  weight: number;
  step: StepSpec;
  fine: FineStep[];
}

export interface SegmentInput {
  id: string;
  start: { year: number; month?: number };
  weight: number;
  step: StepSpec;
  fine_steps?: { start: { year: number; month?: number }; end: { year: number; month?: number }; unit: 'year' | 'month'; size: number }[];
}

const EPS = 1e-9;

export class EraScale {
  readonly segments: Segment[];
  /** Cumulative slider position at the start of each segment, 0..1. */
  private readonly p0: number[];
  readonly tMin: number;
  readonly tMax: number;

  constructor(input: SegmentInput[], tEnd: number) {
    if (input.length === 0) throw new Error('EraScale needs at least one segment');
    this.segments = input.map((s, i) => {
      const t0 = startT(s.start);
      const next = input[i + 1];
      const t1 = next ? startT(next.start) : tEnd;
      if (!(t1 > t0)) throw new Error(`Segment ${s.id} has no duration`);
      if (!(s.weight > 0)) throw new Error(`Segment ${s.id} needs a positive weight`);
      return {
        id: s.id,
        t0,
        t1,
        weight: s.weight,
        step: s.step,
        fine: (s.fine_steps ?? []).map((f) => ({ unit: f.unit, size: f.size, t0: startT(f.start), t1: startT(f.end) })),
      };
    });
    const total = this.segments.reduce((a, s) => a + s.weight, 0);
    let acc = 0;
    this.p0 = this.segments.map((s) => {
      const p = acc;
      acc += s.weight / total;
      return p;
    });
    this.tMin = this.segments[0]!.t0;
    this.tMax = this.segments[this.segments.length - 1]!.t1;
  }

  private width(i: number): number {
    const next = this.p0[i + 1] ?? 1;
    return next - this.p0[i]!;
  }

  clampT(t: number): number {
    return Math.min(this.tMax, Math.max(this.tMin, t));
  }

  segmentIndexAt(t: number): number {
    const tc = this.clampT(t);
    for (let i = this.segments.length - 1; i >= 0; i--) {
      if (tc >= this.segments[i]!.t0 - EPS) return i;
    }
    return 0;
  }

  segmentAt(t: number): Segment {
    return this.segments[this.segmentIndexAt(t)]!;
  }

  /** Time → slider position in [0, 1]. */
  tToPos(t: number): number {
    const tc = this.clampT(t);
    const i = this.segmentIndexAt(tc);
    const s = this.segments[i]!;
    return this.p0[i]! + this.width(i) * ((tc - s.t0) / (s.t1 - s.t0));
  }

  /** Slider position in [0, 1] → time. */
  posToT(p: number): number {
    const pc = Math.min(1, Math.max(0, p));
    let i = 0;
    for (let k = this.p0.length - 1; k >= 0; k--) {
      if (pc >= this.p0[k]! - EPS) {
        i = k;
        break;
      }
    }
    const s = this.segments[i]!;
    const w = this.width(i);
    const frac = w > 0 ? (pc - this.p0[i]!) / w : 0;
    return s.t0 + frac * (s.t1 - s.t0);
  }

  /** Slider position where each segment starts (for era labels and ticks). */
  segmentPositions(): { id: string; p0: number; p1: number }[] {
    return this.segments.map((s, i) => ({ id: s.id, p0: this.p0[i]!, p1: this.p0[i]! + this.width(i) }));
  }

  /** The step that applies at time t (a fine step overrides the segment default). */
  stepAt(t: number): StepSpec {
    const s = this.segmentAt(t);
    const f = s.fine.find((x) => t >= x.t0 - EPS && t < x.t1 - EPS);
    return f ? { unit: f.unit, size: f.size } : s.step;
  }

  /** Every boundary where stepping must stop: segment starts, fine-step edges, ends. */
  private stops(): number[] {
    const out = new Set<number>();
    for (const s of this.segments) {
      out.add(s.t0);
      for (const f of s.fine) {
        out.add(f.t0);
        out.add(f.t1);
      }
    }
    out.add(this.tMax);
    return [...out].sort((a, b) => a - b);
  }

  /** Is t on the step grid for the given spec? Year grids use round historical years (…, 590, 580 BCE). */
  private onGrid(t: number, spec: StepSpec): boolean {
    if (spec.unit === 'month') {
      const months = Math.round(t * 12);
      return Math.abs(t * 12 - months) < 1e-6 && ((months % spec.size) + spec.size) % spec.size === 0;
    }
    if (Math.abs(t - Math.round(t)) > 1e-6) return false;
    const hist = fromAstronomical(Math.round(t));
    return hist % spec.size === 0;
  }

  private gridUnit(spec: StepSpec): number {
    return spec.unit === 'month' ? 1 / 12 : 1;
  }

  /**
   * Next stop strictly after (dir = 1) or before (dir = -1) time t.
   * Moves along the local step grid but never skips a segment or fine-step boundary.
   */
  step(t: number, dir: 1 | -1): number {
    const tc = this.clampT(t);
    const stops = this.stops();
    const boundary = dir > 0 ? stops.find((x) => x > tc + EPS) ?? this.tMax : [...stops].reverse().find((x) => x < tc - EPS) ?? this.tMin;
    // The spec that governs the interval we are moving into.
    const probe = dir > 0 ? tc + EPS : tc - EPS;
    const spec = this.stepAt(Math.min(this.tMax - EPS, Math.max(this.tMin, probe)));
    const u = this.gridUnit(spec);
    // Walk unit by unit (at most `size` units) to the next grid point.
    let x = dir > 0 ? Math.floor(tc / u + 1e-6) * u : Math.ceil(tc / u - 1e-6) * u;
    for (let k = 0; k < spec.size * 2 + 2; k++) {
      x += dir * u;
      if (dir > 0 ? x >= boundary - EPS : x <= boundary + EPS) return boundary;
      if (this.onGrid(x, spec)) return Math.round(x / u) * u;
    }
    return boundary;
  }

  /** Snap t to the nearest stop on its local grid (used while dragging and playing). */
  snap(t: number): number {
    const tc = this.clampT(t);
    const prev = this.isStop(tc) ? tc : this.step(tc, -1);
    const next = this.step(prev, 1);
    if (next <= prev) return prev;
    return tc - prev < next - tc ? prev : next;
  }

  /** Like snap, but always rounds down, so playback shows a date only once reached. */
  floor(t: number): number {
    const tc = this.clampT(t);
    if (this.isStop(tc)) return tc;
    return this.step(tc, -1);
  }

  private isStop(t: number): boolean {
    if (this.stops().some((x) => Math.abs(x - t) < 1e-6)) return true;
    return this.onGrid(t, this.stepAt(t));
  }

  /**
   * Resolution to display t at: months in month-step segments, and also whenever t is not
   * at the start of a year (e.g. a segment that begins in August 1949).
   */
  displayUnit(t: number): 'year' | 'month' {
    if (this.stepAt(t).unit === 'month') return 'month';
    return Math.abs(t - Math.round(t)) > 1e-6 ? 'month' : 'year';
  }

  /** Start of the next / previous segment (Page Up / Page Down). */
  jumpSegment(t: number, dir: 1 | -1): number {
    const i = this.segmentIndexAt(t);
    const s = this.segments[i]!;
    if (dir > 0) return this.segments[i + 1]?.t0 ?? this.tMax;
    // Going back: to this segment's start, or the previous one if already there.
    if (t - s.t0 > 1e-6) return s.t0;
    return this.segments[i - 1]?.t0 ?? this.tMin;
  }
}
