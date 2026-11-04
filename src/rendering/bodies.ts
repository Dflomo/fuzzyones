/**
 * The five starter bodies in squishy vinyl, drawn in design units (about 100
 * wide, ground at y = 80). Each body reads the rig springs so ears, antennae,
 * caps, sprouts and tails move with the creature.
 *
 * Layers: back (behind the main mass), body (the main mass and its surface),
 * front (after the face). path() is the main silhouette, used for clipping
 * elemental marks and the evolution glow.
 */
import type { CreatureState } from '../core/creature/state';
import { dark, ell, light, plainEll, seeded, shape, strand } from './vinyl';

export interface BodyDrawer {
  path(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void;
  back(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void;
  body(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void;
  front(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void;
}

const TAU = Math.PI * 2;
const ear = (c: CreatureState, side: number) => (side < 0 ? c.rig.earL : c.rig.earR) - 0.12;
const stage3 = (c: CreatureState) => c.species.design.stage >= 3;

// ------------------------------------------------------------------ Cappy, mushroom
const cappyStem = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.moveTo(-26, -4);
  ctx.bezierCurveTo(-34, 30, -36, 74, 0, 76);
  ctx.bezierCurveTo(36, 74, 34, 30, 26, -4);
  ctx.closePath();
};

function cap(ctx: CanvasRenderingContext2D, c: CreatureState, x: number, y: number, s: number, spots: boolean): void {
  const p = c.species.palette;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-66, 2);
    ctx.bezierCurveTo(-68, -46, -36, -68, 0, -68);
    ctx.bezierCurveTo(36, -68, 68, -46, 66, 2);
    ctx.bezierCurveTo(44, -8, 22, 6, 0, -2);
    ctx.bezierCurveTo(-22, 6, -44, -8, -66, 2);
    ctx.closePath();
  }, p.fur, [-68, -68, 136, 72]);
  if (spots) for (const [sx, sy, r] of [[-34, -34, 9], [10, -50, 11], [38, -26, 7], [-8, -22, 6], [-50, -10, 5], [52, -6, 5]]) ell(ctx, sx, sy, r, r * 0.85, p.accent, { flat: true });
  ctx.restore();
}

const cappy: BodyDrawer = {
  path: (ctx) => cappyStem(ctx),
  back() {},
  body(ctx, c, t) {
    const p = c.species.palette;
    shape(ctx, () => cappyStem(ctx), p.belly, [-34, -4, 68, 80]);
    ell(ctx, 0, 2, 52, 10, p.innerEar, { flat: true });
    ctx.strokeStyle = 'rgba(120,70,50,.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = -4; i <= 4; i++) {
      ctx.moveTo(i * 10, -2);
      ctx.lineTo(i * 8.5, 8);
    }
    ctx.stroke();
    // the cap bobs on the stem: tilts with the ears' springs, stretches when falling
    const lift = (ear(c, -1) + ear(c, 1)) / 2;
    const tilt = (ear(c, 1) - ear(c, -1)) * 0.12 + c.rig.armLag * 0.3 + Math.sin(t * 1.3) * 0.015;
    const s = (c.species.design.headScale + 1) / 2;
    ctx.save();
    ctx.translate(0, 2);
    ctx.rotate(tilt);
    ctx.scale(1 + lift * 0.04, 1 - lift * 0.08);
    cap(ctx, c, 0, -2, s, true);
    ctx.restore();
    if (stage3(c)) {
      // a baby mushroom has sprouted on the cap
      ctx.save();
      ctx.rotate(tilt);
      ell(ctx, 44, -34, 4, 8, p.belly);
      cap(ctx, c, 44, -38, 0.2, false);
      ell(ctx, 42, -48, 2.4, 2, p.accent, { flat: true });
      ctx.restore();
    }
  },
  front() {},
};

// ------------------------------------------------------------------ Pip, seed
const pipShell = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.bezierCurveTo(30, -46, 52, 6, 48, 40);
  ctx.bezierCurveTo(44, 80, -44, 80, -48, 40);
  ctx.bezierCurveTo(-52, 6, -30, -46, 0, -58);
  ctx.closePath();
};

function leaf(ctx: CanvasRenderingContext2D, color: string, side: number, len: number): void {
  shape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(side * len * 0.45, -len * 0.55, side * len, -len * 0.3, side * len, 0.06 * len);
    ctx.bezierCurveTo(side * len * 0.75, len * 0.3, side * len * 0.25, len * 0.2, 0, 0);
    ctx.closePath();
  }, color, side < 0 ? [-len, -len * 0.55, len, len * 0.85] : [0, -len * 0.55, len, len * 0.85]);
}

const pip: BodyDrawer = {
  path: (ctx) => pipShell(ctx),
  back(ctx, c, t) {
    const p = c.species.palette;
    const h = c.species.design.headScale;
    const sway = c.rig.armLag * 0.6 + Math.sin(t * 1.8) * 0.06 + (ear(c, -1) - ear(c, 1)) * 0.15;
    ctx.save();
    ctx.translate(0, -54);
    ctx.rotate(sway);
    ctx.scale(h, h);
    strand(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(-4, -14, 2, -28);
    }, 3.4, p.accentDark, dark(p.accentDark, 0.2));
    ctx.translate(2, -27);
    const droop = Math.max(0, ear(c, -1)) * 0.5;
    ctx.save();
    ctx.rotate(-0.25 + droop);
    leaf(ctx, p.accent, -1, 30);
    ctx.restore();
    ctx.save();
    ctx.rotate(0.2 - droop);
    leaf(ctx, light(p.accent, 0.12), 1, 32);
    ctx.restore();
    if (stage3(c)) {
      // a third leaf and a bud
      ctx.save();
      ctx.rotate(Math.sin(t * 2.2) * 0.1);
      strand(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -12);
      }, 2.4, p.accentDark);
      ell(ctx, 0, -16, 6, 7, '#ffb7c9');
      ell(ctx, 0, -19, 3, 3, '#ffd76a', { flat: true });
      ctx.restore();
    }
    ctx.restore();
  },
  body(ctx, c) {
    const p = c.species.palette;
    shape(ctx, () => pipShell(ctx), p.fur, [-50, -58, 100, 136]);
    ctx.strokeStyle = 'rgba(110,60,20,.25)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, -34);
    ctx.quadraticCurveTo(-30, 10, -26, 50);
    ctx.moveTo(18, -34);
    ctx.quadraticCurveTo(30, 10, 26, 50);
    ctx.stroke();
    ell(ctx, 0, 54, 22, 15, p.belly, { flat: true });
  },
  front() {},
};

// ------------------------------------------------------------------ Blorp, squishy alien
function blorpPath(ctx: CanvasRenderingContext2D, t: number): void {
  const w = Math.sin(t * 3) * 1.5;
  ctx.beginPath();
  ctx.moveTo(-54, 70);
  ctx.bezierCurveTo(-60 - w, 10, -40, -44, 0, -44 + w * 0.5);
  ctx.bezierCurveTo(40, -44, 60 + w, 10, 54, 70);
  // drippy bottom that ripples
  const d = (i: number) => Math.sin(t * 4 + i) * 1.5;
  ctx.quadraticCurveTo(46, 82 + d(0), 34, 74);
  ctx.quadraticCurveTo(22, 84 + d(1), 10, 76);
  ctx.quadraticCurveTo(0, 84 + d(2), -10, 76);
  ctx.quadraticCurveTo(-22, 84 + d(3), -34, 74);
  ctx.quadraticCurveTo(-46, 82 + d(4), -54, 70);
  ctx.closePath();
}

const blorp: BodyDrawer = {
  path: (ctx, _c, t) => blorpPath(ctx, t),
  back(ctx, c) {
    const p = c.species.palette;
    const s = c.species.design.earScale;
    for (const side of [-1, 1]) {
      const bend = ear(c, side) * 0.7;
      ctx.save();
      ctx.translate(side * 16, -34);
      ctx.rotate(side * bend);
      ctx.scale(s, s);
      strand(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.quadraticCurveTo(side * 14, -20, side * 6, -38);
      }, 3.6, p.furDark, dark(p.furDark, 0.25));
      ell(ctx, side * 6, -40, 8, 8, p.accent);
      ctx.restore();
    }
  },
  body(ctx, c, t) {
    const p = c.species.palette;
    shape(ctx, () => blorpPath(ctx, t), p.fur, [-58, -44, 116, 124], { alpha: 0.93 });
    ctx.save();
    blorpPath(ctx, t);
    ctx.clip();
    const g = ctx.createRadialGradient(0, 34, 4, 0, 34, 46);
    g.addColorStop(0, 'rgba(235,255,245,.7)');
    g.addColorStop(1, 'rgba(235,255,245,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-60, -50, 120, 140);
    // bubbles drift up through the jelly
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.12 + i / 6) % 1;
      const x = Math.sin(i * 2.4) * 32 + Math.sin(t + i) * 2;
      const y = 70 - ph * 70;
      const r = 1.8 + (i % 3);
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    // the little third eye blinks with the others
    const b = Math.max(0.12, c.blink);
    ctx.fillStyle = '#1b1220';
    plainEll(ctx, 0, -18, 4, 5 * b);
    ctx.fill();
    if (b > 0.5) {
      ctx.fillStyle = '#fff';
      plainEll(ctx, -1.2, -19.6, 1.4, 1.2);
      ctx.fill();
    }
  },
  front(ctx, c, t) {
    if (!stage3(c)) return;
    // a tiny moon orbits its head
    const a = t * 1.2;
    const x = Math.cos(a) * 58;
    const y = -24 + Math.sin(a) * 14;
    if (Math.sin(a) > -0.3) ell(ctx, x, y, 6, 6, '#fff3b0');
  },
};

// ------------------------------------------------------------------ Bean, cuddly cyclops
const bean: BodyDrawer = {
  path: (ctx) => plainEll(ctx, 0, 6, 44, 64),
  back(ctx, c, t) {
    const p = c.species.palette;
    for (const side of [-1, 1]) {
      const droop = ear(c, side) * 6;
      ell(ctx, side * 44, -20 + droop, 11, 13, p.fur);
      ell(ctx, side * 44, -20 + droop, 5.5, 7, p.innerEar, { flat: true, rim: false });
    }
    // hair tuft sways
    ctx.save();
    ctx.translate(2, -56);
    ctx.rotate(c.rig.armLag * 0.8 + Math.sin(t * 2) * 0.08);
    ctx.scale(c.species.design.headScale, c.species.design.headScale);
    shape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-12, 2);
      ctx.quadraticCurveTo(-16, -18, -2, -16);
      ctx.quadraticCurveTo(-6, -8, 2, -2);
      ctx.quadraticCurveTo(8, -18, 16, -10);
      ctx.quadraticCurveTo(8, -2, 8, 4);
      ctx.closePath();
    }, p.furDark, [-16, -18, 32, 22]);
    ctx.restore();
    if (stage3(c)) {
      for (const side of [-1, 1]) {
        shape(ctx, () => {
          ctx.beginPath();
          ctx.moveTo(side * 20, -50);
          ctx.quadraticCurveTo(side * 26, -68, side * 34, -66);
          ctx.quadraticCurveTo(side * 32, -54, side * 32, -44);
          ctx.closePath();
        }, p.accent, [side < 0 ? -34 : 20, -68, 14, 24]);
      }
    }
  },
  body(ctx, c) {
    const p = c.species.palette;
    shape(ctx, () => plainEll(ctx, 0, 6, 44, 64), p.fur, [-44, -58, 88, 128]);
    ell(ctx, 0, 44, 25, 22, p.belly, { flat: true });
  },
  front() {},
};

// ------------------------------------------------------------------ Oddling, wire tangle
function tangle(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void {
  const p = c.species.palette;
  const R = 50;
  const cy = 14;
  const colors = [p.fur, p.accent, p.furLight, p.furDark, p.innerEar];
  ell(ctx, 0, cy, R, R * 0.96, p.accentDark, { flat: true, rim: false });
  const rnd = seeded(23);
  ctx.save();
  plainEll(ctx, 0, cy, R, R * 0.96);
  ctx.clip();
  for (let i = 0; i < 34; i++) {
    const rx = R * (0.55 + rnd() * 0.55);
    const ry = R * (0.18 + rnd() * 0.5);
    const rot = rnd() * Math.PI + Math.sin(t * 0.4 + i) * 0.02;
    const ox = (rnd() - 0.5) * R * 0.5;
    const oy = (rnd() - 0.5) * R * 0.5;
    const col = colors[i % colors.length];
    strand(ctx, () => plainEll(ctx, ox, cy + oy, rx, ry, rot), 2.6, col);
  }
  const s = ctx.createRadialGradient(-R * 0.38, cy - R * 0.45, 1, -R * 0.38, cy - R * 0.45, R * 0.75);
  s.addColorStop(0, 'rgba(255,255,255,.7)');
  s.addColorStop(0.3, 'rgba(255,255,255,.22)');
  s.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = s;
  ctx.fillRect(-R, cy - R, R * 2, R * 2);
  const sh = ctx.createRadialGradient(R * 0.2, cy + R * 0.9, R * 0.2, R * 0.2, cy + R * 0.9, R * 1.2);
  sh.addColorStop(0, 'rgba(30,15,10,.28)');
  sh.addColorStop(1, 'rgba(30,15,10,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(-R, cy - R, R * 2, R * 2);
  ctx.restore();
  // springy strays poke out and wiggle
  const strays = c.species.design.stage === 1 ? 7 : 12;
  for (let i = 0; i < strays; i++) {
    const a = (i / strays) * TAU + rnd() * 0.4;
    const col = colors[(i + 1) % colors.length];
    const x0 = Math.cos(a) * R * 0.94;
    const y0 = cy + Math.sin(a) * R * 0.92;
    const len = R * (0.22 + rnd() * 0.22) * (1 + c.fluff * 0.5);
    const curl = (rnd() - 0.5) * 2 + Math.sin(t * 2.4 + i) * 0.2;
    if (i % 2 === 0) {
      const boing = 1 + Math.sin(t * 5 + i) * 0.08;
      strand(ctx, () => {
        ctx.beginPath();
        for (let k = 0; k <= 24; k++) {
          const q = k / 24;
          const px = x0 + Math.cos(a) * len * q * boing - Math.cos(q * 18) * 4 * Math.sin(a);
          const py = y0 + Math.sin(a) * len * q * boing + Math.cos(q * 18) * 4 * Math.cos(a);
          if (k) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
      }, 1.8, col);
    } else {
      strand(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, x0 + Math.cos(a + curl) * len * 1.3, y0 + Math.sin(a + curl) * len * 1.3, x0 + Math.cos(a + curl * 1.6) * len * 0.6, y0 + Math.sin(a + curl * 1.6) * len * 0.6);
      }, 2.1, col);
    }
  }
}

const oddling: BodyDrawer = {
  path: (ctx) => plainEll(ctx, 0, 14, 50, 48),
  back(ctx, c, t) {
    const p = c.species.palette;
    const d = c.species.design;
    // ringed tail swings
    ctx.save();
    ctx.translate(-44 * c.facing, 44);
    ctx.rotate(-c.rig.tail * c.facing * 0.8);
    ctx.scale(d.tailScale * -c.facing, d.tailScale);
    for (let i = 0; i < 6; i++) {
      const k = i / 5;
      ell(ctx, 8 + k * 16, -k * 26 + Math.sin(k * 3 + t * 2) * 3, 11 - k * 4, 11 - k * 4, i % 2 ? p.furLight : dark(p.furDark, 0.2));
    }
    ctx.restore();
    // one floppy ear on the left
    ctx.save();
    ctx.translate(-30, -26);
    ctx.rotate(-0.9 - ear(c, -1) * 0.9);
    ctx.scale(d.earScale, d.earScale);
    shape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.bezierCurveTo(-14, -26, -6, -46, 4, -44);
      ctx.bezierCurveTo(14, -40, 14, -18, 10, 0);
      ctx.closePath();
    }, p.furLight, [-14, -46, 28, 46]);
    shape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.bezierCurveTo(-7, -22, -2, -34, 4, -34);
      ctx.bezierCurveTo(9, -30, 8, -16, 5, -4);
      ctx.closePath();
    }, p.pad, [-6, -34, 14, 30], { flat: true, rim: false });
    ctx.restore();
    // curly antenna with a bobble on the right; it glows from Stage III
    ctx.save();
    ctx.translate(22, -32);
    ctx.rotate(ear(c, 1) * 0.6 + Math.sin(t * 2.2) * 0.05);
    ctx.scale(d.earScale, d.earScale);
    strand(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-4, -20, 18, -30, 10, -44);
      ctx.arc(18, -46, 7, Math.PI, Math.PI * 2.6);
    }, 2.8, p.furDark);
    if (stage3(c)) {
      const glow = ctx.createRadialGradient(26, -48, 1, 26, -48, 18);
      glow.addColorStop(0, `rgba(255,240,170,${0.6 + Math.sin(t * 4) * 0.2})`);
      glow.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = glow;
      plainEll(ctx, 26, -48, 18, 18);
      ctx.fill();
      ell(ctx, 26, -48, 7, 7, '#fff1a8');
    } else ell(ctx, 26, -48, 7, 7, p.pad);
    ctx.restore();
  },
  body(ctx, c, t) {
    tangle(ctx, c, t);
    // cream disc behind the eye follows the face's head turn
    const fx = c.rig.faceX * 6.5;
    ell(ctx, fx, 9 + c.rig.faceY * 3, 25, 28, c.species.palette.belly, { flat: true });
  },
  front() {},
};

export const BODIES: Record<string, BodyDrawer> = { cappy, pip, blorp, bean, oddling };
