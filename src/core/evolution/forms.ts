/**
 * Turns a base species plus a form (stage and elements) into a resolved
 * Species the engine and renderer use directly. Size, palette and feature
 * scales change; behavior stays shared.
 */
import type { Species, Stage } from '../creature/species';
import { ELEMENT_STYLE, type Element } from './elements';

export interface Form {
  stage: Stage;
  /** Chosen at Stage IV. */
  element: Element | null;
  /** Only set when Stage V blends in a second element. */
  secondary: Element | null;
}

export const BASE_FORM: Form = { stage: 1, element: null, secondary: null };

const STAGE_SCALE: Record<Stage, { radius: number; eye: number; ear: number; head: number; tail: number; tint: number }> = {
  1: { radius: 0.74, eye: 1.2, ear: 0.72, head: 0.55, tail: 0.6, tint: 0 },
  2: { radius: 1, eye: 1, ear: 1, head: 1, tail: 1, tint: 0 },
  3: { radius: 1.1, eye: 0.97, ear: 1.1, head: 1.15, tail: 1.15, tint: 0 },
  4: { radius: 1.18, eye: 0.95, ear: 1.12, head: 1.15, tail: 1.2, tint: 0.4 },
  5: { radius: 1.28, eye: 0.93, ear: 1.15, head: 1.2, tail: 1.3, tint: 0.6 },
};

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'] as const;

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}

export function formName(base: Species, form: Form): string {
  if (form.stage <= 3) return base.stageNames[form.stage - 1];
  if (!form.element) return base.stageNames[2];
  if (base.formNames) {
    const name = base.formNames[form.stage as 4 | 5][form.element];
    if (form.stage === 5 && form.secondary) return `${ELEMENT_STYLE[form.secondary].prefix[0]} ${name}`;
    return name;
  }
  const stem = base.formStems[form.stage === 4 ? 0 : 1];
  const p = ELEMENT_STYLE[form.element].prefix[form.stage === 4 ? 0 : 1];
  if (form.stage === 5 && form.secondary) {
    const s = ELEMENT_STYLE[form.secondary].prefix[0];
    return `${p}-${s} ${cap(stem)}`;
  }
  return `${p}${stem}`;
}

export function formLabel(form: Form): string {
  if (!form.element) return `Stage ${ROMAN[form.stage]}`;
  const e = ELEMENT_STYLE[form.element].name;
  const s = form.secondary ? ` and ${ELEMENT_STYLE[form.secondary].name}` : '';
  return `Stage ${ROMAN[form.stage]} · ${e}${s}`;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function resolveForm(base: Species, form: Form): Species {
  const k = STAGE_SCALE[form.stage];
  const el = form.stage >= 4 ? form.element : null;
  const sec = form.stage === 5 ? form.secondary : null;
  const pal = { ...base.palette };
  if (el) {
    const st = ELEMENT_STYLE[el];
    const t = k.tint;
    pal.fur = mixHex(pal.fur, st.tint, t);
    pal.furLight = mixHex(pal.furLight, st.glow, t * 0.7);
    pal.furDark = mixHex(pal.furDark, st.deep, t);
    pal.belly = mixHex(pal.belly, st.glow, t * 0.35);
    pal.limb = mixHex(pal.limb, st.tint, t * 0.7);
    pal.lid = mixHex(pal.lid, st.tint, pal.lid === base.palette.fur ? t : t * 0.35);
    pal.iris = st.iris;
    if (sec) pal.pad = mixHex(pal.pad, ELEMENT_STYLE[sec].tint, 0.6);
  }
  return {
    ...base,
    name: formName(base, form),
    radius: Math.round(base.radius * k.radius * 10) / 10,
    palette: pal,
    design: {
      ...base.design,
      eyeScale: base.design.eyeScale * k.eye,
      earScale: k.ear,
      headScale: k.head,
      tailScale: k.tail,
      stage: form.stage,
      element: el,
      secondary: sec,
      // Air forms float; floaters stay floaters.
      floats: base.design.floats || (el === 'air' && form.stage >= 4),
    },
    // Growing up slows the bounce a little.
    traits: { ...base.traits, jump: base.traits.jump * (form.stage === 1 ? 1.1 : form.stage >= 4 ? 0.95 : 1) },
  };
}
