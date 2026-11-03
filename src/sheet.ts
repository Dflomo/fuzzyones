/** Dev species lineup: every species across key poses and expressions, for art review. Open /sheet.html. */
import { createCreature, type CreatureState } from './core/creature/state';
import { SPECIES, type Species } from './core/creature/species';
import { emptyWorld } from './core/world';
import { CanvasRenderer } from './rendering/canvasRenderer';

interface Cell {
  label: string;
  setup: (c: CreatureState) => void;
}

const CELLS: Cell[] = [
  { label: 'neutral', setup: () => {} },
  { label: 'happy', setup: (c) => (c.expr = 'happy') },
  { label: 'curious', setup: (c) => { c.expr = 'curious'; c.rig.earL = c.rig.earR = -0.18; } },
  { label: 'surprised', setup: (c) => { c.expr = 'surprised'; c.rig.earL = c.rig.earR = -0.18; } },
  { label: 'sad', setup: (c) => { c.expr = 'sad'; c.tears = 2; c.rig.earL = c.rig.earR = 1; } },
  { label: 'sit', setup: (c) => { c.pose = 'sit'; } },
  { label: 'walking', setup: (c) => { c.walking = true; c.legPhase = 0.6; c.rig.lean = 0.15; } },
  { label: 'napping', setup: (c) => { c.pose = 'curl'; c.asleep = true; c.expr = 'sleep'; c.sx = 1.16; c.sy = 0.72; c.rig.earL = c.rig.earR = 1; c.rig.tail = 1.25; } },
];

const root = document.getElementById('grid')!;
const W = 132;
const H = 140;

function row(sp: Species): void {
  const wrap = document.createElement('section');
  wrap.className = 'row';
  const head = document.createElement('header');
  head.innerHTML = `<h2>${sp.name}</h2><p>${sp.tagline}</p>`;
  wrap.appendChild(head);
  const cells = document.createElement('div');
  cells.className = 'cells';
  for (const cell of CELLS) {
    const fig = document.createElement('figure');
    const canvas = document.createElement('canvas');
    const cap = document.createElement('figcaption');
    cap.textContent = cell.label;
    fig.append(canvas, cap);
    cells.appendChild(fig);
    const r = new CanvasRenderer(canvas);
    r.resize(W, H, devicePixelRatio);
    const c = createCreature(sp, W / 2, H / 2 + 16);
    Object.assign(c, { grounded: true, expr: 'neutral', blink: 1 });
    c.rig.earL = c.rig.earR = 0.12;
    c.rig.faceX = 0.15;
    cell.setup(c);
    const world = emptyWorld(W, H);
    for (let i = 0; i < 30; i++) r.draw(c, [], world, 0.5, { ink: '#1c2331', paper: '#fff', accent: '#d94f78' }, '');
  }
  wrap.appendChild(cells);
  root.appendChild(wrap);
}

SPECIES.forEach(row);
