/**
 * Procedural plush-toy renderer (Canvas 2D). Reads CreatureState and effects
 * only; it has no game logic. Layer order, back to front:
 * shadow, tail, back foot soles, ears, fur fringe, body, felt texture,
 * surface fuzz, belly patch, tag, face, arms, front tail (curl).
 */
import type { Effect } from '../core/animation/effects';
import { lookTarget } from '../core/animation/rig';
import type { CreatureState, Pose } from '../core/creature/state';
import type { WorldSnapshot } from '../core/world';
import { drawBellyMarking, drawBodyMarkings, drawEars, drawFringe, drawHeadExtra, drawTail, type PartAssets, type Tuft } from './parts';

export interface Theme {
  ink: string;
  paper: string;
  accent: string;
}

interface Fuzz {
  x: number;
  y: number;
  a: number;
  l: number;
  light: boolean;
}

const TAU = Math.PI * 2;
const POSES: Pose[] = ['stand', 'sit', 'curl', 'flop', 'peek', 'hug'];

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private outer: Tuft[] = [];
  private inner: Tuft[] = [];
  private bumps: PartAssets['bumps'] = [];
  private fuzz: Fuzz[] = [];
  private felt: CanvasPattern | null = null;
  private dpr = 1;
  /** Render-only smoothing so pose changes ease instead of snapping. */
  private blend: Record<Pose, number> = { stand: 1, sit: 0, curl: 0, flop: 0, peek: 0, hug: 0 };
  width = 0;
  height = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    const rnd = mulberry(7);
    for (let i = 0; i < 40; i++) this.outer.push({ a: (i / 40) * TAU + (rnd() - 0.5) * 0.05, len: 3.5 + rnd() * 3.5, w: 0.19 + rnd() * 0.05, p: rnd() * TAU });
    for (let i = 0; i < 34; i++) this.inner.push({ a: (i / 34) * TAU + 0.09 + (rnd() - 0.5) * 0.05, len: 2 + rnd() * 2.5, w: 0.2 + rnd() * 0.05, p: rnd() * TAU });
    for (let i = 0; i < 15; i++) this.bumps.push({ a: (i / 15) * TAU + (rnd() - 0.5) * 0.12, r: rnd(), d: rnd() });
    for (let i = 0; i < 34; i++) {
      const r = Math.sqrt(rnd()) * 0.82;
      const a = rnd() * TAU;
      this.fuzz.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, a: rnd() * TAU, l: 0.05 + rnd() * 0.06, light: rnd() < 0.55 });
    }
    this.felt = this.makeFelt(rnd);
  }

  private makeFelt(rnd: () => number): CanvasPattern | null {
    if (typeof document === 'undefined') return null;
    const n = document.createElement('canvas');
    n.width = n.height = 64;
    const g = n.getContext('2d');
    if (!g) return null;
    for (let i = 0; i < 900; i++) {
      const v = rnd();
      g.fillStyle = v < 0.5 ? `rgba(255,255,255,${0.25 + rnd() * 0.3})` : `rgba(90,20,50,${0.12 + rnd() * 0.18})`;
      const x = rnd() * 64;
      const y = rnd() * 64;
      g.save();
      g.translate(x, y);
      g.rotate(rnd() * TAU);
      g.fillRect(-1.2, -0.35, 2.4, 0.7);
      g.restore();
    }
    return this.ctx.createPattern(n, 'repeat');
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = Math.min(2, dpr || 1);
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  draw(c: CreatureState, effects: readonly Effect[], world: WorldSnapshot, now: number, theme: Theme, activity: string): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    for (const p of POSES) this.blend[p] += ((c.pose === p ? 1 : 0) - this.blend[p]) * 0.18;
    if (!c.hidden) this.drawCreature(c, world, now, activity);
    this.drawEffects(effects, theme);
  }

  // ---------- helpers ----------
  private ell(x: number, y: number, rx: number, ry: number, rot = 0): void {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  }

  /** A soft, rounded limb: capsule from a to b. */
  private limb(ax: number, ay: number, bx: number, by: number, w: number, fill: string, edge: string): void {
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.strokeStyle = edge;
    ctx.lineWidth = w + 2.4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.strokeStyle = fill;
    ctx.lineWidth = w;
    ctx.stroke();
  }

  private sole(x: number, y: number, s: number, rot: number, c: CreatureState): void {
    const ctx = this.ctx;
    const R = c.species.radius;
    const pal = c.species.palette;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = pal.fur;
    this.ell(0, 0, R * 0.25 * s, R * 0.21 * s);
    ctx.fill();
    ctx.strokeStyle = pal.furDark;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = pal.pad;
    this.ell(0, R * 0.04 * s, R * 0.12 * s, R * 0.09 * s);
    ctx.fill();
    for (let i = -1; i <= 1; i++) {
      this.ell(i * R * 0.1 * s, -R * 0.1 * s + Math.abs(i) * R * 0.03 * s, R * 0.045 * s, R * 0.04 * s);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- creature ----------
  private drawCreature(c: CreatureState, world: WorldSnapshot, t: number, activity: string): void {
    const ctx = this.ctx;
    const R = c.species.radius;
    const pal = c.species.palette;
    const rig = c.rig;
    const b = this.blend;
    const airborne = !c.grounded && !c.hang;
    const f = c.facing;

    const d = c.species.design;
    const hover = d.floats && !c.held && !c.hang && !c.asleep ? 6 + Math.sin(t * 2.2) * 3 : 0;

    // contact shadow (fainter and smaller while hovering)
    if (c.grounded && !c.hang) {
      ctx.fillStyle = `rgba(40,10,25,${0.16 - hover * 0.008})`;
      this.ell(c.x, c.y + R + 3, R * (0.85 + b.flop * 0.35) * c.sx * (1 - hover * 0.025), 5.5);
      ctx.fill();
    }

    // pose squash, breathing
    const br = Math.sin(rig.breath);
    const poseSx = 1 + b.flop * 0.26 + b.sit * 0.04 + b.curl * 0.06;
    const poseSy = 1 - b.flop * 0.32 - b.sit * 0.06 - b.curl * 0.04;
    const sx = c.sx * poseSx * (1 - br * 0.012) * d.bodyW;
    const sy = c.sy * poseSy * (1 + br * 0.022) * d.bodyH;

    if (d.floats && !c.asleep) {
      const glow = ctx.createRadialGradient(c.x, c.y - hover, R * 0.6, c.x, c.y - hover, R * 1.9);
      glow.addColorStop(0, 'rgba(255,248,190,.35)');
      glow.addColorStop(1, 'rgba(255,248,190,0)');
      ctx.fillStyle = glow;
      this.ell(c.x, c.y - hover, R * 1.9, R * 1.9);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(c.x, c.y - hover);
    ctx.rotate(c.rot + rig.lean);
    ctx.translate(0, R);
    ctx.scale(sx, sy);
    ctx.translate(0, -R);

    // --- tail (behind unless curled) ---
    const tailBack = b.curl < 0.5;
    if (tailBack) drawTail(ctx, c, t, false);

    // --- feet behind body when flopping (kicking soles in the air) ---
    if (b.flop > 0.3 && !c.asleep) {
      for (const side of [-1, 1]) {
        const k = Math.sin(c.legPhase + side * 1.7) * 0.5;
        this.sole(-f * R * (0.55 + side * 0.16), -R * 0.55 + k * R * 0.25, 0.95, -f * (0.8 + k), c);
      }
    }

    // --- ears ---
    drawEars(ctx, c, t);

    // raised arms (hanging, hugging) go behind the head
    const armsBehind = !!c.hang || c.pose === 'hug';
    if (armsBehind) this.drawArms(c, airborne, t, activity);

    // --- fur fringe (two layers of clumps) ---
    const fluff = c.fluff;
    drawFringe(ctx, c, { outer: this.outer, inner: this.inner, bumps: this.bumps }, t);

    // --- body ---
    const g = ctx.createRadialGradient(-R * 0.38, -R * 0.48, R * 0.1, 0, 0, R * 1.05);
    g.addColorStop(0, pal.furLight);
    g.addColorStop(0.55, pal.fur);
    g.addColorStop(1, pal.furDark);
    ctx.fillStyle = g;
    this.ell(0, 0, R, R);
    ctx.fill();

    // felt texture
    if (this.felt) {
      ctx.save();
      this.ell(0, 0, R, R);
      ctx.clip();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = this.felt;
      ctx.fillRect(-R, -R, R * 2, R * 2);
      ctx.restore();
    }
    // surface fuzz strokes
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.3;
    for (const z of this.fuzz) {
      ctx.strokeStyle = z.light ? 'rgba(255,255,250,.5)' : 'rgba(60,30,50,.2)';
      const a = z.a + Math.sin(t * 1.6 + z.x * 9) * 0.25 * (1 + fluff * 3);
      const x = z.x * R;
      const y = z.y * R;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * z.l * R, y + Math.sin(a) * z.l * R);
      ctx.stroke();
    }
    // rim light, upper left
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, R - 2.5, Math.PI * 1.08, Math.PI * 1.52);
    ctx.stroke();
    drawBodyMarkings(ctx, c, t);

    // belly patch with stitches
    const bx = rig.faceX * R * 0.05;
    const bg = ctx.createRadialGradient(bx - R * 0.1, R * 0.22, R * 0.05, bx, R * 0.38, R * 0.62);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(1, pal.belly);
    ctx.fillStyle = bg;
    this.ell(bx, R * 0.4, R * 0.56, R * 0.42);
    ctx.fill();
    ctx.setLineDash([2.6, 2.6]);
    ctx.strokeStyle = pal.stitch;
    ctx.lineWidth = 1.2;
    this.ell(bx, R * 0.4, R * 0.5, R * 0.36);
    ctx.stroke();
    ctx.setLineDash([]);
    drawBellyMarking(ctx, c, bx);

    // fabric tag from the side seam
    if (b.stand + b.sit > 0.6 && !c.held) this.drawTag(c, -f, t);

    // --- horns, sprout, antenna ---
    drawHeadExtra(ctx, c, t);

    // --- face ---
    this.drawFace(c, world, t, activity);

    // --- feet (front) ---
    this.drawFeet(c, airborne, t);

    // --- arms ---
    if (!armsBehind) this.drawArms(c, airborne, t, activity);

    // --- tail wrapped in front when curled ---
    if (!tailBack) drawTail(ctx, c, t, true);

    ctx.restore();
  }




  private drawTag(c: CreatureState, side: number, t: number): void {
    const ctx = this.ctx;
    const R = c.species.radius;
    const pal = c.species.palette;
    ctx.save();
    ctx.translate(side * R * 0.93, R * 0.32);
    ctx.rotate(side * (0.25 + Math.sin(t * 2.3) * 0.08 + c.rig.armLag * 0.4));
    ctx.fillStyle = pal.tag;
    ctx.strokeStyle = 'rgba(120,70,60,.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.rect(side > 0 ? 0 : -9, -4, 9, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.stitch;
    ctx.fillRect(side > 0 ? 2.5 : -6.5, -1.2, 4, 0.9);
    ctx.fillRect(side > 0 ? 2.5 : -6.5, 0.8, 3, 0.9);
    ctx.restore();
  }

  private drawFeet(c: CreatureState, airborne: boolean, t: number): void {
    const R = c.species.radius;
    const pal = c.species.palette;
    const b = this.blend;
    const ctx = this.ctx;
    if (c.asleep || b.curl > 0.5 || b.flop > 0.5) return;
    const f = c.facing;
    if (b.sit > 0.5) {
      // sitting: soles toward the viewer, feet poking forward
      this.sole(-R * 0.36 + f * R * 0.06, R * 0.9, 1.05, -0.25, c);
      this.sole(R * 0.36 + f * R * 0.06, R * 0.9, 1.05, 0.25, c);
      return;
    }
    for (const side of [-1, 1]) {
      let fx = side * R * 0.38;
      let fy = R * 0.94;
      let lift = 0;
      let showSole = false;
      if (c.walking) {
        const p = c.legPhase + (side > 0 ? Math.PI : 0);
        fx += Math.sin(p) * R * 0.22;
        lift = Math.max(0, Math.cos(p)) * R * 0.17;
        showSole = lift > R * 0.1;
      } else if (c.held || airborne || c.hang) {
        fy = R * 1.08 + (c.held ? 5 : 2);
        fx += Math.sin(t * 13 + side * 2) * 3.5;
        showSole = true;
      }
      if (c.flipT !== null || c.hang) {
        fx += Math.sin(c.legPhase + side * 2) * 6;
        showSole = true;
      }
      if (showSole) this.sole(fx, fy - lift, 0.85, side * 0.2, c);
      else {
        const g = ctx.createLinearGradient(0, fy - R * 0.16, 0, fy + R * 0.16);
        g.addColorStop(0, pal.fur);
        g.addColorStop(1, pal.furDark);
        ctx.fillStyle = g;
        this.ell(fx + f * 2, fy - lift, R * 0.26, R * 0.16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,40,70,.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fx + f * 2 - R * 0.05, fy - lift - R * 0.02);
        ctx.lineTo(fx + f * 2 - R * 0.05, fy - lift + R * 0.12);
        ctx.moveTo(fx + f * 2 + R * 0.07, fy - lift - R * 0.02);
        ctx.lineTo(fx + f * 2 + R * 0.07, fy - lift + R * 0.12);
        ctx.stroke();
      }
    }
  }

  private drawArms(c: CreatureState, airborne: boolean, t: number, activity: string): void {
    const R = c.species.radius;
    const pal = c.species.palette;
    const b = this.blend;
    const lag = c.rig.armLag;
    const f = c.facing;
    if (c.asleep || b.curl > 0.5) return;
    for (const side of [-1, 1]) {
      let sx = side * R * 0.74;
      let sy = R * 0.3;
      let hx = side * R * 0.94;
      let hy = R * 0.64 + lag * R * 0.3;
      if (c.hang) {
        sy = -R * 0.3;
        sx = side * R * 0.5;
        hx = side * R * 0.34;
        hy = -R * 1.12;
      } else if (c.held) {
        hx = side * R * 1.18;
        hy = R * 0.3 + Math.sin(t * 18 + side) * R * 0.22;
      } else if (airborne && (c.expr === 'panic' || c.tumble)) {
        sy = R * 0.15;
        hx = side * R * 1.18;
        hy = -R * 0.35 + Math.sin(t * 24 + side) * R * 0.2;
      } else if (airborne) {
        hx = side * R * 1.1;
        hy = R * 0.2 + lag * R * 0.6;
      } else if (b.flop > 0.5) {
        sx = f * R * 0.55 + side * R * 0.3;
        sy = R * 0.6;
        hx = f * R * 0.92 + side * R * 0.32;
        hy = R * 0.92;
      } else if (c.pose === 'hug' && c.reach) {
        const dx = c.reach.x - c.x;
        const dy = c.reach.y - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const L = Math.min(d, R * 1.2);
        sx = side * R * 0.62;
        sy = -R * 0.1;
        hx = side * R * 0.42 + (dx / d) * L * 0.8;
        hy = sy + (dy / d) * L + Math.sin(t * 5 + side) * 1.5;
      } else if (c.pose === 'peek' && side === c.poseSide) {
        hx = side * R * 1.0;
        hy = R * 0.74;
      } else if (activity === 'Dancing') {
        hy = Math.sin(t * 9 + side * 1.5) > 0 ? -R * 0.6 : R * 0.3;
        hx = side * R * 1.05;
      } else if (c.arm === 'chin' && side === f) {
        hx = side * R * 0.36;
        hy = R * 0.48;
      } else if (c.expr === 'sad') {
        hx = side * R * 0.48;
        hy = R * 0.7;
      } else if (b.sit > 0.5) {
        hx = side * R * 0.66;
        hy = R * 0.74;
      }
      this.limb(sx, sy, hx, hy, R * 0.26, pal.fur, pal.furDark);
      this.ctx.fillStyle = pal.furLight;
      this.ell(hx, hy, R * 0.13, R * 0.12);
      this.ctx.fill();
      this.ctx.fillStyle = pal.pad;
      this.ell(hx + side * 1, hy + R * 0.03, R * 0.05, R * 0.04);
      this.ctx.fill();
    }
  }

  private drawFace(c: CreatureState, world: WorldSnapshot, t: number, activity: string): void {
    const ctx = this.ctx;
    const R = c.species.radius;
    const pal = c.species.palette;
    const e = c.expr;
    const rig = c.rig;
    const hungry = e === 'hungry' || c.hungryNear;
    const blep = t < rig.blepUntil;

    ctx.save();
    ctx.translate(rig.faceX * R * 0.13, rig.faceY * R * 0.08 - R * 0.04);

    // felt cheeks
    const blushy = e === 'happy' || e === 'chew' || e === 'smug' || c.pose === 'hug' || activity === 'Enjoying pets';
    ctx.fillStyle = blushy ? 'rgba(255,95,140,.55)' : 'rgba(255,120,155,.28)';
    this.ell(-R * 0.55, R * 0.16, R * 0.15, R * 0.09);
    ctx.fill();
    this.ell(R * 0.55, R * 0.16, R * 0.15, R * 0.09);
    ctx.fill();
    if (blushy) {
      ctx.strokeStyle = 'rgba(220,60,110,.5)';
      ctx.lineWidth = 1;
      for (const sx of [-1, 1])
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(sx * R * 0.6 + (i - 1) * 4 - 1.5, R * 0.13);
          ctx.lineTo(sx * R * 0.6 + (i - 1) * 4 + 1.5, R * 0.19);
          ctx.stroke();
        }
    }

    // eyes
    const tgt = lookTarget(c, world, t);
    let lx = c.facing * 0.3;
    let ly = 0;
    if (tgt) {
      const dx = tgt.x - c.x;
      const dy = tgt.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 110);
      lx = (dx / d) * k;
      ly = (dy / d) * k;
    }
    const two = c.species.design.eyes === 2;
    const K = c.species.design.eyeScale * (two ? 1 : 1.6);
    for (const side of two ? [-1, 1] : [1]) {
      const ex = two ? side * R * 0.34 : 0;
      const ey = -R * 0.12;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(K, K);
      ctx.translate(-ex, -ey);
      this.drawEye(c, side, ex, lx, ly, t, hungry);
      ctx.restore();
    }

    // brows
    this.drawBrows(c, t, two);

    // freckles
    if (c.species.design.marking === 'freckles') {
      ctx.fillStyle = 'rgba(200,120,100,.55)';
      for (const side of [-1, 1])
        for (const [fx, fy] of [[0.5, 0.06], [0.6, 0.02], [0.57, 0.11]] as const) {
          this.ell(side * R * fx, R * fy, 1.1, 1.1);
          ctx.fill();
        }
    }

    // nose
    ctx.fillStyle = pal.nose;
    ctx.beginPath();
    const ny = R * 0.13;
    ctx.moveTo(-R * 0.07, ny - R * 0.035);
    ctx.quadraticCurveTo(0, ny - R * 0.07, R * 0.07, ny - R * 0.035);
    ctx.quadraticCurveTo(R * 0.05, ny + R * 0.04, 0, ny + R * 0.055);
    ctx.quadraticCurveTo(-R * 0.05, ny + R * 0.04, -R * 0.07, ny - R * 0.035);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    this.ell(-R * 0.025, ny - R * 0.025, R * 0.022, R * 0.012);
    ctx.fill();

    this.drawMouth(c, t, hungry, blep);

    // tears and sweat
    if (c.tears > 0) {
      ctx.fillStyle = 'rgba(120,190,255,.85)';
      for (const side of [-1, 1]) {
        const ph = (t * 1.3 + (side > 0 ? 0.5 : 0)) % 1;
        const tx = side * R * 0.42;
        const ty = R * 0.02 + ph * R * 0.45;
        ctx.globalAlpha = Math.min(1, c.tears) * (1 - ph * 0.6);
        ctx.beginPath();
        ctx.moveTo(tx, ty - 4);
        ctx.quadraticCurveTo(tx + 3, ty + 1, tx, ty + 3);
        ctx.quadraticCurveTo(tx - 3, ty + 1, tx, ty - 4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (e === 'panic') {
      ctx.fillStyle = 'rgba(140,200,255,.9)';
      const sx = -c.facing * R * 0.78;
      const sy = -R * 0.45 + Math.sin(t * 6) * 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 6);
      ctx.quadraticCurveTo(sx + 4, sy + 1, sx, sy + 4);
      ctx.quadraticCurveTo(sx - 4, sy + 1, sx, sy - 6);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawEye(c: CreatureState, side: number, x: number, lx: number, ly: number, t: number, hungry: boolean): void {
    const ctx = this.ctx;
    const R = c.species.radius;
    const pal = c.species.palette;
    const e = c.expr;
    const y = -R * 0.12;
    ctx.strokeStyle = pal.line;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.3;

    if (e === 'happy' || e === 'chew') {
      ctx.beginPath();
      ctx.arc(x, y + 4, R * 0.15, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      return;
    }
    if (e === 'sleep' || c.pose === 'curl') {
      ctx.beginPath();
      ctx.arc(x, y - 1, R * 0.14, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const a = Math.PI * (0.35 + i * 0.15);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * R * 0.14, y - 1 + Math.sin(a) * R * 0.14);
        ctx.lineTo(x + Math.cos(a) * R * 0.2, y - 1 + Math.sin(a) * R * 0.2);
        ctx.stroke();
      }
      return;
    }
    if (e === 'dizzy') {
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let a = 0; a < 12; a += 0.3) {
        const ang = a * 1.1 + t * 8 * side;
        const px = x + Math.cos(ang) * a * 0.85;
        const py = y + Math.sin(ang) * a * 0.85;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      return;
    }

    let s = 1;
    let ps = 1;
    let jx = 0;
    if (e === 'surprised') {
      s = 1.2;
      ps = 0.7;
    }
    if (e === 'panic') {
      s = 1.22;
      ps = 0.5;
      jx = Math.sin(t * 50) * 1.1;
    }
    if (hungry) {
      s = 1.15;
      ps = 1.25;
    }
    if (e === 'curious') {
      s = side === c.facing ? 1.15 : 0.95;
      ps = 1.15;
    }
    if (e === 'sad') ps = 1.3;
    const rx = R * 0.2 * s;
    const ry = R * 0.245 * s;
    const ex = x + jx;

    // bead eye: dark iris with warm ring
    const g = ctx.createRadialGradient(ex + lx * rx * 0.3, y + ly * ry * 0.3 + ry * 0.2, 1, ex, y, ry * 1.05);
    g.addColorStop(0, pal.iris);
    g.addColorStop(0.7, pal.pupil);
    g.addColorStop(1, pal.pupil);
    ctx.fillStyle = g;
    this.ell(ex, y, rx, ry);
    ctx.fill();
    // pupil drifts with gaze
    ctx.fillStyle = '#000';
    this.ell(ex + lx * rx * 0.32, y + ly * ry * 0.28, rx * 0.5 * ps, ry * 0.5 * ps);
    ctx.fill();
    // glossy highlights stay put, which is what makes beads read as glass
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    this.ell(ex - rx * 0.32, y - ry * 0.38, rx * 0.34, ry * 0.26, -0.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    this.ell(ex + rx * 0.35, y + ry * 0.35, rx * 0.14, ry * 0.12);
    ctx.fill();
    if (c.tears > 0) {
      ctx.fillStyle = 'rgba(160,210,255,.45)';
      this.ell(ex, y + ry * 0.55, rx * 0.8, ry * 0.3);
      ctx.fill();
    }

    // eyelid: blink plus expression
    let lid = 1 - c.blink;
    let slant = 0;
    if (e === 'sleepy') lid = Math.max(lid, 0.55);
    if (e === 'angry') {
      lid = Math.max(lid, 0.35);
      slant = -side * 0.5;
    }
    if (e === 'sad') {
      lid = Math.max(lid, 0.3);
      slant = side * 0.45;
    }
    if (e === 'smug') lid = Math.max(lid, 0.5);
    if (lid > 0.02) {
      ctx.save();
      this.ell(ex, y, rx + 0.6, ry + 0.6);
      ctx.clip();
      const top = y - ry - 1;
      const edge = top + lid * (ry * 2 + 2);
      ctx.fillStyle = pal.fur;
      ctx.beginPath();
      ctx.moveTo(ex - rx - 2, top);
      ctx.lineTo(ex + rx + 2, top);
      ctx.lineTo(ex + rx + 2, edge + slant * rx);
      ctx.quadraticCurveTo(ex, edge + R * 0.03, ex - rx - 2, edge - slant * rx);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ex + rx + 2, edge + slant * rx);
      ctx.quadraticCurveTo(ex, edge + R * 0.03, ex - rx - 2, edge - slant * rx);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawBrows(c: CreatureState, t: number, two: boolean): void {
    const ctx = this.ctx;
    const R = c.species.radius;
    const pal = c.species.palette;
    const e = c.expr;
    if (e === 'sleep' || c.pose === 'curl') return;
    ctx.strokeStyle = pal.furDark;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    if (!two) {
      // a single expressive brow over the big eye
      const w = R * 0.24;
      const lift = e === 'surprised' || e === 'panic' ? -6 : e === 'curious' || e === 'happy' ? -3 : 0;
      const by = -R * 0.66 + lift + Math.sin(t * 2) * 0.3;
      const bend = e === 'angry' ? 6 : e === 'sad' ? -6 : e === 'smug' ? 0 : -3;
      ctx.beginPath();
      ctx.moveTo(-w, by + (e === 'smug' ? 2 : 0));
      ctx.quadraticCurveTo(0, by + bend, w, by - (e === 'smug' ? 3 : 0));
      ctx.stroke();
      return;
    }
    for (const side of [-1, 1]) {
      let lift = 0;
      let tilt = 0.12;
      if (e === 'angry') {
        lift = 2;
        tilt = -0.55;
      } else if (e === 'sad') {
        lift = -2;
        tilt = 0.6;
      } else if (e === 'surprised' || e === 'panic') lift = -6;
      else if (e === 'curious') {
        lift = side === c.facing ? -6 : 0;
        tilt = side === c.facing ? 0.25 : -0.1;
      } else if (e === 'smug') {
        lift = side === c.facing ? -4 : 1;
        tilt = 0.1;
      } else if (e === 'happy') lift = -3;
      const bx = side * R * 0.34;
      const by = -R * 0.47 + lift + Math.sin(t * 2) * 0.3;
      const ang = side * tilt;
      const w = R * 0.13;
      ctx.beginPath();
      ctx.moveTo(bx - Math.cos(ang) * w, by + Math.sin(ang) * w * side);
      ctx.quadraticCurveTo(bx, by - 2.5, bx + Math.cos(ang) * w, by - Math.sin(ang) * w * side);
      ctx.stroke();
    }
  }

  private drawMouth(c: CreatureState, t: number, hungry: boolean, blep: boolean): void {
    const ctx = this.ctx;
    const R = c.species.radius;
    const pal = c.species.palette;
    const e = c.expr;
    const my = R * 0.27;
    ctx.strokeStyle = pal.line;
    ctx.fillStyle = pal.line;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const catMouth = () => {
      ctx.beginPath();
      ctx.arc(-R * 0.07, my - R * 0.02, R * 0.07, Math.PI * 0.1, Math.PI * 0.9);
      ctx.moveTo(R * 0.14, my - R * 0.02);
      ctx.arc(R * 0.07, my - R * 0.02, R * 0.07, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    };
    const fang = () => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const fx = c.facing * R * 0.1;
      ctx.moveTo(fx - R * 0.035, my + R * 0.015);
      ctx.lineTo(fx + R * 0.035, my + R * 0.015);
      ctx.lineTo(fx, my + R * 0.11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 2;
    };
    const tongue = (w: number, h: number, y: number) => {
      ctx.fillStyle = '#ff7f9f';
      this.ell(0, y, w, h);
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,40,80,.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, y - h * 0.6);
      ctx.lineTo(0, y + h * 0.3);
      ctx.stroke();
    };

    if (e === 'chew') {
      if (Math.sin(t * 18) > 0) {
        this.ell(0, my + 1, R * 0.09, R * 0.07);
        ctx.fill();
      } else catMouth();
      return;
    }
    if (e === 'happy' || c.pose === 'hug') {
      ctx.beginPath();
      ctx.moveTo(-R * 0.15, my - R * 0.03);
      ctx.quadraticCurveTo(0, my + R * 0.2, R * 0.15, my - R * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      tongue(R * 0.08, R * 0.06, my + R * 0.09);
      ctx.restore();
      return;
    }
    if (hungry) {
      const k = 1 + Math.sin(t * 10) * 0.15;
      this.ell(0, my + 2, R * 0.11 * k, R * 0.14 * k);
      ctx.fill();
      tongue(R * 0.06, R * 0.04, my + R * 0.11);
      return;
    }
    if (e === 'surprised') {
      this.ell(0, my + 2, R * 0.06, R * 0.08);
      ctx.fill();
      return;
    }
    if (e === 'panic') {
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const px = -R * 0.13 + i * R * 0.026;
        const py = my - R * 0.02 + Math.sin(i * 1.6 + t * 30) * 1.2;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.quadraticCurveTo(0, my + R * 0.2, -R * 0.13, my - R * 0.02);
      ctx.fill();
      return;
    }
    if (e === 'angry' || e === 'dizzy') {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const px = -R * 0.14 + i * R * 0.035;
        const py = my + (i % 2 ? -1.6 : 1.6);
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
      return;
    }
    if (e === 'sad') {
      ctx.beginPath();
      ctx.moveTo(-R * 0.12, my + R * 0.06);
      ctx.quadraticCurveTo(-R * 0.04, my - R * 0.03 + Math.sin(t * 9) * 0.8, 0, my - R * 0.02);
      ctx.quadraticCurveTo(R * 0.04, my - R * 0.03 + Math.sin(t * 9 + 1) * 0.8, R * 0.12, my + R * 0.06);
      ctx.stroke();
      return;
    }
    if (e === 'smug') {
      ctx.beginPath();
      ctx.moveTo(-R * 0.1 * c.facing, my);
      ctx.quadraticCurveTo(R * 0.02 * c.facing, my + R * 0.06, R * 0.14 * c.facing, my - R * 0.06);
      ctx.stroke();
      return;
    }
    if (e === 'sleep' || c.pose === 'curl') {
      this.ell(0, my, R * 0.035, R * 0.035);
      ctx.fill();
      return;
    }
    if (e === 'sleepy') {
      this.ell(0, my + 1, R * 0.06, R * 0.08);
      ctx.fill();
      return;
    }
    catMouth();
    if (c.species.design.fang) fang();
    if (blep) tongue(R * 0.05, R * 0.06, my + R * 0.07);
  }

  private drawEffects(effects: readonly Effect[], theme: Theme): void {
    const ctx = this.ctx;
    for (const p of effects) {
      ctx.globalAlpha = Math.min(1, p.life / Math.min(0.5, p.maxLife));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (p.bubble) {
        ctx.font = `600 ${p.size}px "JetBrains Mono", ui-monospace, monospace`;
        const w = ctx.measureText(p.text).width + 14;
        const h = p.size + 10;
        ctx.fillStyle = theme.paper;
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(p.x - w / 2, p.y - h / 2, w, h, h / 2);
        else ctx.rect(p.x - w / 2, p.y - h / 2, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = theme.ink;
        ctx.fillText(p.text, p.x, p.y + 1);
      } else {
        ctx.font = `700 ${p.size}px "Atkinson Hyperlegible", system-ui, sans-serif`;
        ctx.fillStyle = p.accent ? theme.accent : theme.ink;
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;
    }
  }
}

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
