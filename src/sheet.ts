/** Dev pose sheet: every pose and expression side by side, for art review. Open /sheet.html. */
import { createCreature, type CreatureState, type Expression, type Pose } from './core/creature/state';
import { emptyWorld } from './core/world';
import { CanvasRenderer } from './rendering/canvasRenderer';

interface Cell {
  label: string;
  setup: (c: CreatureState) => void;
}

const exprCell = (e: Expression, extra: (c: CreatureState) => void = () => {}): Cell => ({ label: e, setup: (c) => { c.expr = e; extra(c); } });
const poseCell = (p: Pose, label: string, extra: (c: CreatureState) => void = () => {}): Cell => ({ label, setup: (c) => { c.pose = p; extra(c); } });

const CELLS: Cell[] = [
  exprCell('neutral'),
  exprCell('happy'),
  exprCell('curious'),
  exprCell('surprised'),
  exprCell('panic'),
  exprCell('angry'),
  exprCell('sad', (c) => (c.tears = 2)),
  exprCell('smug'),
  exprCell('sleepy'),
  exprCell('dizzy'),
  exprCell('hungry'),
  { label: 'blep', setup: (c) => (c.rig.blepUntil = 1e9) },
  poseCell('sit', 'sit'),
  poseCell('curl', 'curl nap', (c) => { c.asleep = true; c.expr = 'sleep'; c.sx = 1.16; c.sy = 0.72; c.rig.earL = c.rig.earR = 1; c.rig.tail = 1.25; }),
  poseCell('flop', 'belly flop', (c) => { c.expr = 'happy'; c.legPhase = 1; }),
  poseCell('peek', 'peek', (c) => { c.poseSide = 1; c.rig.lean = 0.42; c.expr = 'curious'; c.rig.faceY = 0.8; c.rig.faceX = 0.4; }),
  poseCell('hug', 'cursor hug', (c) => { c.reach = { x: c.x + 10, y: c.y - 70 }; c.rig.faceY = -0.8; }),
  { label: 'walking', setup: (c) => { c.walking = true; c.legPhase = 0.6; c.rig.lean = 0.15; } },
  { label: 'held', setup: (c) => { c.grounded = false; c.held = true; c.sy = 1.2; c.sx = 0.86; c.expr = 'surprised'; c.rig.earL = c.rig.earR = 0.75; } },
  { label: 'falling', setup: (c) => { c.grounded = false; c.expr = 'panic'; c.rig.earL = c.rig.earR = -0.5; c.vy = 600; } },
  { label: 'hanging', setup: (c) => { c.grounded = false; c.hang = { surfaceId: 'x', side: 1, t: 0, willClimb: true }; c.expr = 'surprised'; } },
  { label: 'upside down', setup: (c) => { c.rot = Math.PI; c.flipT = 0.2; c.expr = 'dizzy'; c.legPhase = 2; } },
  { label: 'grooming', setup: (c) => { c.fluff = 1; c.expr = 'happy'; } },
  { label: 'facing left', setup: (c) => { c.facing = -1; c.rig.faceX = -0.4; } },
];

const grid = document.getElementById('grid')!;
const W = 150;
const H = 150;
for (const cell of CELLS) {
  const fig = document.createElement('figure');
  const canvas = document.createElement('canvas');
  const cap = document.createElement('figcaption');
  cap.textContent = cell.label;
  fig.append(canvas, cap);
  grid.appendChild(fig);
  const r = new CanvasRenderer(canvas);
  r.resize(W, H, devicePixelRatio);
  const c = createCreature(undefined, W / 2, H / 2 + 8);
  Object.assign(c, { grounded: true, expr: 'neutral', blink: 1 });
  c.rig.earL = c.rig.earR = 0.12;
  c.rig.faceX = 0.15;
  cell.setup(c);
  const world = { ...emptyWorld(W, H) };
  // Draw a few frames so the renderer's pose blending settles.
  for (let i = 0; i < 30; i++) r.draw(c, [], world, 0.5, { ink: '#1c2331', paper: '#fff', accent: '#d94f78' }, '');
}
