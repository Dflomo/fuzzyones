/** Dev evolution sheet: every species through all stages and elements, for art review. Open /sheet.html. */
import { createCreature } from './core/creature/state';
import { SPECIES, type Species } from './core/creature/species';
import { ELEMENT_STYLE, ELEMENTS, type Element } from './core/evolution/elements';
import { formName, resolveForm, type Form } from './core/evolution/forms';
import { emptyWorld } from './core/world';
import { CanvasRenderer } from './rendering/canvasRenderer';

const root = document.getElementById('grid')!;
const W = 140;
const theme = { ink: '#1c2331', paper: '#fff', accent: '#d94f78' };
const BLENDS: [Element, Element][] = [['fire', 'shadow'], ['water', 'light']];

function cell(parent: HTMLElement, base: Species, form: Form, caption: string): void {
  const fig = document.createElement('figure');
  const canvas = document.createElement('canvas');
  const cap = document.createElement('figcaption');
  cap.innerHTML = `<b>${formName(base, form)}</b><span>${caption}</span>`;
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

for (const base of SPECIES) {
  const sec = document.createElement('section');
  sec.innerHTML = `<header><h2>${base.name}</h2><p>${base.tagline}</p></header>`;
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
}
