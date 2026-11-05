/**
 * Growth and evolution, driven purely by the buddy's event stream.
 *
 * - Varied interactions earn growth points. Repeating the same thing within a
 *   minute is worth less each time, so clicking cannot farm growth.
 * - Fed words add element points.
 * - Stage IV takes the dominant element (needs a little feeding first).
 * - Stage V deepens that element, or blends in a second element when the
 *   buddy has eaten a lot of something else since Stage IV.
 *
 * Tuning numbers are prototype values sized for minutes of play; the real
 * game will stretch later stages across weeks.
 */
import type { Buddy } from '../buddy';
import { speciesById, type Species, type Stage } from '../creature/species';
import type { BuddyEvent, BuddyEventType } from '../events/events';
import { dominant, ELEMENTS, emptyElements, type Element } from './elements';
import { formLabel, formName, resolveForm, type Form } from './forms';

export const GROWTH_POINTS: Partial<Record<BuddyEventType, number>> = {
  buddy_petted: 4,
  buddy_poked: 1,
  word_eaten: 5,
  new_behavior_discovered: 8,
  object_inspected: 2,
  surface_reached: 2,
  buddy_climbed: 3,
  buddy_danced: 2,
  buddy_cuddled: 4,
  buddy_napped: 3,
  buddy_peeked: 2,
  input_escaped: 1,
  buddy_tossed: 1,
  cursor_pounced: 2,
};

/** Growth needed to leave each stage. */
export const THRESHOLDS: Record<1 | 2 | 3 | 4, number> = { 1: 40, 2: 110, 3: 220, 4: 380 };
/** Element points needed before Stage IV, and fed since Stage IV before Stage V. */
export const ELEMENT_NEED = { toIV: 3, toV: 4 };
/** A second element at least this fraction of the first blends into Stage V. */
export const BLEND_RATIO = 0.6;
const REPEAT_WINDOW = 60;

export interface GrowthSave {
  base: string;
  stage: Stage;
  growth: number;
  elements: Record<Element, number>;
  sinceIV: Record<Element, number>;
  element: Element | null;
  secondary: Element | null;
}

export interface GrowthStatus {
  form: Form;
  name: string;
  label: string;
  growth: number;
  need: number | null;
  /** Why evolution is waiting, in player words. Null when growing normally. */
  hint: string | null;
  elements: Record<Element, number>;
}

export function newGrowth(base: string): GrowthSave {
  return { base, stage: 1, growth: 0, elements: emptyElements(), sinceIV: emptyElements(), element: null, secondary: null };
}

/** Pure: what Stage V would be given the Stage IV element and what was fed since. */
export function stageFiveForm(primary: Element, sinceIV: Record<Element, number>): Form {
  const p = sinceIV[primary];
  const other = dominant(sinceIV, primary);
  const blend = other.element && other.points >= Math.max(2, p * BLEND_RATIO) ? other.element : null;
  return { stage: 5, element: primary, secondary: blend };
}

/** Normalize persisted JSON at the core boundary; old or edited saves are untrusted. */
function safeElementCounts(value: unknown): Record<Element, number> {
  const out = emptyElements();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  const record = value as Record<string, unknown>;
  for (const element of ELEMENTS) {
    const count = record[element];
    if (typeof count === 'number' && Number.isFinite(count) && count >= 0) out[element] = count;
  }
  return out;
}

function safeElement(value: unknown): Element | null {
  return typeof value === 'string' && ELEMENTS.some((element) => element === value) ? value as Element : null;
}

export function sanitizeGrowthSave(saved: GrowthSave): GrowthSave {
  const stage = [1, 2, 3, 4, 5].includes(saved.stage) ? saved.stage : 1;
  const primary = safeElement(saved.element);
  // A Stage IV/V form cannot exist without its primary element.
  const safeStage = stage >= 4 && !primary ? 3 : stage;
  const growth = typeof saved.growth === 'number' && Number.isFinite(saved.growth) && saved.growth >= 0 ? saved.growth : 0;
  const secondary = safeStage === 5 ? safeElement(saved.secondary) : null;
  return {
    base: saved.base,
    stage: safeStage as Stage,
    growth,
    elements: safeElementCounts(saved.elements),
    sinceIV: safeElementCounts(saved.sinceIV),
    element: safeStage >= 4 ? primary : null,
    secondary: secondary === primary ? null : secondary,
  };
}

export class Progression {
  readonly state: GrowthSave;
  private recent = new Map<string, { at: number; n: number }>();
  private unsub: () => void;
  base: Species;

  constructor(private buddy: Buddy, base: Species, saved?: GrowthSave | null) {
    this.state = saved && speciesById(saved.base) ? sanitizeGrowthSave(saved) : newGrowth(base.id);
    this.base = speciesById(this.state.base) ?? base;
    buddy.c.species = resolveForm(this.base, this.form);
    this.unsub = buddy.bus.on((e) => this.onEvent(e));
  }

  get form(): Form {
    const s = this.state;
    return { stage: s.stage, element: s.stage >= 4 ? s.element : null, secondary: s.stage === 5 ? s.secondary : null };
  }

  dispose(): void {
    this.unsub();
  }

  /** Switch the base species while keeping stage and elements. */
  setBase(sp: Species): void {
    this.base = sp;
    this.state.base = sp.id;
    this.buddy.c.species = resolveForm(sp, this.form);
  }

  status(): GrowthStatus {
    const s = this.state;
    const need = s.stage < 5 ? THRESHOLDS[s.stage as 1 | 2 | 3 | 4] : null;
    let hint: string | null = null;
    const total = (r: Record<Element, number>) => ELEMENTS.reduce((a, e) => a + r[e], 0);
    if (s.stage === 3 && total(s.elements) < ELEMENT_NEED.toIV) hint = 'Feed it elemental words to unlock Stage IV';
    else if (s.stage === 4 && total(s.sinceIV) < ELEMENT_NEED.toV) hint = 'Keep feeding it to reach Stage V';
    else if (s.stage === 5) hint = 'Fully grown';
    return { form: this.form, name: formName(this.base, this.form), label: formLabel(this.form), growth: s.growth, need, hint, elements: { ...s.elements } };
  }

  /** Call every frame after buddy.update(). Evolves when ready and the buddy is free. */
  tick(): void {
    const next = this.readyForm();
    if (!next || !this.buddy.canEvolve()) return;
    const s = this.state;
    s.growth = 0;
    s.stage = next.stage;
    if (next.stage === 4) {
      s.element = next.element;
      s.sinceIV = emptyElements();
    }
    if (next.stage === 5) s.secondary = next.secondary;
    const resolved = resolveForm(this.base, next);
    this.buddy.evolve(resolved, {
      stage: next.stage,
      form: resolved.name,
      element: next.element ?? 'none',
      secondary: next.secondary ?? 'none',
    });
  }

  /** Playtest helper: fill the growth bar for the current stage. */
  fastForward(): void {
    const s = this.state;
    if (s.stage < 5) s.growth = Math.max(s.growth, THRESHOLDS[s.stage as 1 | 2 | 3 | 4]);
  }

  reset(): void {
    Object.assign(this.state, newGrowth(this.base.id));
    this.buddy.c.species = resolveForm(this.base, this.form);
  }

  readyForm(): Form | null {
    const s = this.state;
    if (s.stage >= 5 || s.growth < THRESHOLDS[s.stage as 1 | 2 | 3 | 4]) return null;
    const total = (r: Record<Element, number>) => ELEMENTS.reduce((a, e) => a + r[e], 0);
    if (s.stage <= 2) return { stage: (s.stage + 1) as Stage, element: null, secondary: null };
    if (s.stage === 3) {
      if (total(s.elements) < ELEMENT_NEED.toIV) return null;
      return { stage: 4, element: dominant(s.elements).element, secondary: null };
    }
    if (total(s.sinceIV) < ELEMENT_NEED.toV || !s.element) return null;
    return stageFiveForm(s.element, s.sinceIV);
  }

  private onEvent(e: BuddyEvent): void {
    // Event payloads are runtime data, so TypeScript casts cannot validate them.
    // Ignore unknown element identifiers rather than corrupting the counters.
    if (e.type === 'word_eaten' && typeof e.data.element === 'string') {
      const el = e.data.element;
      if (ELEMENTS.some((candidate) => candidate === el)) {
        const validElement = el as Element;
        this.state.elements[validElement] += 1;
        if (this.state.stage >= 4) this.state.sinceIV[validElement] += 1;
      }
    }
    const pts = GROWTH_POINTS[e.type];
    if (!pts || this.state.stage >= 5) return;
    // Diminishing returns for repeating the same kind of moment.
    const key = e.type === 'word_eaten' ? `word:${e.data.word}` : e.type;
    const r = this.recent.get(key);
    const n = r && e.at - r.at < REPEAT_WINDOW ? r.n + 1 : 0;
    this.recent.set(key, { at: e.at, n });
    this.state.growth += pts * Math.pow(0.5, n);
  }
}
