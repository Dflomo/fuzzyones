/** Dev evolution sheet: every species through all stages and elements, for art review. Open /sheet.html. */
import { createCreature, type CreatureState } from './core/creature/state';
import { SPECIES, type Species } from './core/creature/species';
import { ELEMENT_STYLE, ELEMENTS, type Element } from './core/evolution/elements';
import { formName, resolveForm, type Form } from './core/evolution/forms';
import { emptyWorld } from './core/world';
import { CanvasRenderer } from './rendering/canvasRenderer';

const root = document.getElementById('grid')!;
const W = 140;
const theme = { ink: '#1c2331', paper: '#fff', accent: '#d94f78' };
const BLENDS: [Element, Element][] = [['fire', 'shadow'], ['water', 'light']];

function cell(parent: HTMLElement, base: Species, form: Form, caption: string, setup?: (c: CreatureState) => void, title?: string): void {
  const fig = document.createElement('figure');
  const canvas = document.createElement('canvas');
  const cap = document.createElement('figcaption');
  cap.innerHTML = `<b>${title ?? formName(base, form)}</b><span>${caption}</span>`;
  fig.append(canvas, cap);
  parent.appendChild(fig);
  const H = form.stage === 5 ? 190 : form.stage === 4 ? 165 : 140;
  const r = new CanvasRenderer(canvas);
  r.resize(W, H, devicePixelRatio);
  const sp = resolveForm(base, form);
  const c = createCreature(sp, W / 2, H - 16 - sp.radius);
  Object.assign(c, { grounded: true, expr: 'neutral', blink: 1 });
  c.rig.earL = c.rig.earR = 0.12;
  c.rig.faceX = 0.15;
  setup?.(c);
  for (let i = 0; i < 30; i++) r.draw(c, [], emptyWorld(W, H), 0.6, theme, '');
}

function group(parent: HTMLElement, title: string): HTMLElement {
  const g = document.createElement('div');
  g.className = 'group';
  g.innerHTML = `<h3>${title}</h3>`;
  const cells = document.createElement('div');
  cells.className = 'cells';
  g.appendChild(cells);
  parent.appendChild(g);
  return cells;
}

const POSES: [string, (c: CreatureState) => void][] = [
  ['happy', (c) => (c.expr = 'happy')],
  ['surprised', (c) => { c.expr = 'surprised'; c.rig.earL = c.rig.earR = -0.18; }],
  ['angry', (c) => { c.expr = 'angry'; c.rig.earL = c.rig.earR = 0.55; }],
  ['sad', (c) => { c.expr = 'sad'; c.tears = 2; c.rig.earL = c.rig.earR = 1; }],
  ['sit', (c) => { c.pose = 'sit'; }],
  ['walking', (c) => { c.walking = true; c.legPhase = 0.6; c.rig.lean = 0.15; }],
  ['napping', (c) => { c.pose = 'curl'; c.asleep = true; c.expr = 'sleep'; c.sx = 1.1; c.sy = 0.85; c.rig.earL = c.rig.earR = 1; }],
  ['held', (c) => { c.grounded = false; c.held = true; c.sy = 1.15; c.sx = 0.9; c.expr = 'surprised'; c.rig.earL = c.rig.earR = 0.75; }],
];

for (const base of SPECIES) {
  const sec = document.createElement('section');
  sec.innerHTML = `<header><h2>${base.name}</h2><p>${base.kind}. ${base.tagline}</p></header>`;
  const body = document.createElement('div');
  body.className = 'groups';
  sec.appendChild(body);
  root.appendChild(sec);
  const g1 = group(body, 'Growth');
  for (const stage of [1, 2, 3] as const) cell(g1, base, { stage, element: null, secondary: null }, `Stage ${['I', 'II', 'III'][stage - 1]}`);
  const g4 = group(body, 'Stage IV');
  for (const e of ELEMENTS) cell(g4, base, { stage: 4, element: e, secondary: null }, ELEMENT_STYLE[e].name);
  const g5 = group(body, 'Stage V');
  for (const e of ELEMENTS) cell(g5, base, { stage: 5, element: e, secondary: null }, ELEMENT_STYLE[e].name);
  for (const [a, b] of BLENDS) cell(g5, base, { stage: 5, element: a, secondary: b }, `${ELEMENT_STYLE[a].name} and ${ELEMENT_STYLE[b].name}`);
  const gp = group(body, 'Poses and expressions');
  for (const [label, setup] of POSES) cell(gp, base, { stage: 2, element: null, secondary: null }, label, setup, base.name);
}
