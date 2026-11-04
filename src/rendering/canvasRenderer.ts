/**
 * Squishy vinyl renderer (Canvas 2D). Reads CreatureState and effects only.
 * Each species body is drawn in design units (see core/creature/species.ts)
 * and scaled so its physics radius matches; faces, arms and feet are shared
 * and anchored per species.
 */
import type { Effect } from '../core/animation/effects';
import { lookTarget } from '../core/animation/rig';
import type { CreatureState, Pose } from '../core/creature/state';
import type { WorldSnapshot } from '../core/world';
import { BODIES } from './bodies';
import { drawAura, drawCrest, drawMantle, drawMarks, drawParticles } from './elementFx';
import { dark, ell as vEll, light } from './vinyl';

export interface Theme {
  ink: string;
  paper: string;
  accent: string;
}

const TAU = Math.PI * 2;
const POSES: Pose[] = ['stand', 'sit', 'curl', 'flop', 'peek', 'hug'];
/** Design units per physics radius. */
const DESIGN_R = 52;
const GROUND = 80;

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  /** Render-only smoothing so pose changes ease instead of snapping. */
  private blend: Record<Pose, number> = { stand: 1, sit: 0, curl: 0, flop: 0, peek: 0, hug: 0 };
  /** Pixels per design unit for the creature being drawn. */
  private unit = 1;
  private mouthDy = 0.27;
  width = 0;
  height = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
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

  private ell(x: number, y: number, rx: number, ry: number, rot = 0): void {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  }

  /** A soft vinyl limb: capsule from a to b with an edge and a shine. */
  private limb(ax: number, ay: number, bx: number, by: number, w: number, fill: string, edge: string): void {
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.strokeStyle = edge;
    ctx.lineWidth = w + 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.strokeStyle = fill;
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = w * 0.3;
    ctx.beginPath();
    ctx.moveTo(ax - w * 0.15, ay - w * 0.18);
    ctx.lineTo(bx - w * 0.15, by - w * 0.18);
    ctx.stroke();
  }

  private drawCreature(c: CreatureState, world: WorldSnapshot, t: number, activity: string): void {
    const ctx = this.ctx;
    const sp = c.species;
    const d = sp.design;
    const A = sp.anatomy;
    const R = sp.radius;
    const rig = c.rig;
    const b = this.blend;
    const airborne = !c.grounded && !c.hang;
    const body = BODIES[d.body];
    this.unit = R / DESIGN_R;
    const hover = d.floats && !c.held && !c.hang && !c.asleep ? 6 + Math.sin(t * 2.2) * 3 : 0;

    drawAura(ctx, c, c.x, c.y - hover);
    if (c.grounded && !c.hang) {
      ctx.fillStyle = `rgba(40,10,25,${0.16 - hover * 0.008})`;
      this.ell(c.x, c.y + R + 3, R * (0.95 + b.flop * 0.35) * c.sx * (1 - hover * 0.025), 5.5);
      ctx.fill();
    }

    // pose squash and breathing
    const br = Math.sin(rig.breath);
    let sx = c.sx * (1 + b.flop * 0.26 + b.sit * 0.04 + b.curl * 0.08) * (1 - br * 0.012);
    let sy = c.sy * (1 - b.flop * 0.32 - b.sit * 0.06 - b.curl * 0.1) * (1 + br * 0.022);

    // gait: how each species carries itself
    let gaitRot = 0;
    let gaitY = 0;
    const lp = c.legPhase;
    if (c.walking) {
      if (d.gait === 'waddle') gaitRot = Math.sin(lp) * 0.1;
      else if (d.gait === 'scamper') gaitY = -Math.abs(Math.sin(lp)) * R * 0.16;
      else if (d.gait === 'stride') gaitY = -Math.abs(Math.sin(lp)) * R * 0.05;
      else if (d.gait === 'wobble') gaitRot = Math.sin(lp * 0.5) * 0.18;
      else if (d.gait === 'jiggle') {
        sx *= 1 + Math.sin(lp * 1.2) * 0.07;
        sy *= 1 - Math.sin(lp * 1.2) * 0.07;
      }
    }
    if (d.gait === 'wobble' && c.grounded && !c.asleep) gaitRot += Math.sin(t * 4.3) * 0.04;
    if (d.gait === 'jiggle' && !c.asleep) {
      sx *= 1 + Math.sin(t * 5) * 0.012;
      sy *= 1 - Math.sin(t * 5) * 0.012;
    }

    ctx.save();
    ctx.translate(c.x, c.y - hover + gaitY);
    ctx.rotate(c.rot + rig.lean + gaitRot);
    ctx.translate(0, R);
    ctx.scale(sx * this.unit, sy * this.unit);
    ctx.translate(0, -GROUND);

    const atCore = (fn: () => void) => {
      ctx.save();
      ctx.translate(0, A.core.cy);
      fn();
      ctx.restore();
    };
    atCore(() => drawMantle(ctx, c, t, A.core.r));
    this.drawFeet(c, airborne, t);
    const armsFront = c.arm === 'chin' || c.pose === 'hug' || c.held || !!c.hang || activity === 'Dancing';
    body.back(ctx, c, t);
    if (!armsFront) atCore(() => this.drawArms(c, airborne, t, activity, A.core.r));
    body.body(ctx, c, t);
    ctx.save();
    body.path(ctx, c, t);
    ctx.clip();
    atCore(() => drawMarks(ctx, c, t, A.core.r));
    ctx.restore();

    ctx.save();
    ctx.translate(A.face.x, A.face.y);
    this.mouthDy = A.face.mouthDy;
    this.drawFace(c, world, t, activity, A.face.size);
    ctx.restore();

    body.front(ctx, c, t);
    ctx.save();
    ctx.translate(0, A.top + 0.9 * 40);
    drawCrest(ctx, c, t, 40);
    ctx.restore();
    if (armsFront) atCore(() => this.drawArms(c, airborne, t, activity, A.core.r));

    if (c.evolveGlow > 0) {
      ctx.fillStyle = `rgba(255,255,245,${0.85 * c.evolveGlow})`;
      body.path(ctx, c, t);
      ctx.fill();
    }
    ctx.restore();

    drawParticles(ctx, c, c.x, c.y - hover, t);
    if (c.evolveGlow > 0) {
      const eg = ctx.createRadialGradient(c.x, c.y, R * 0.5, c.x, c.y, R * 3);
      eg.addColorStop(0, `rgba(255,250,210,${0.55 * c.evolveGlow})`);
      eg.addColorStop(1, 'rgba(255,250,210,0)');
      ctx.fillStyle = eg;
      this.ell(c.x, c.y, R * 3, R * 3);
      ctx.fill();
    }
  }

  /** Nub feet in design units. Pads show when a sole turns toward you. */
  private drawFeet(c: CreatureState, airborne: boolean, t: number): void {
    const F = c.species.anatomy.feet;
    if (!F.w) return;
    const ctx = this.ctx;
    const pal = c.species.palette;
    const b = this.blend;
    const footY = GROUND - F.h * 0.4;
    for (const side of [-1, 1]) {
      let x = side * F.dx;
      let y = footY;
      let rot = 0;
      let showPad = false;
      if (b.flop > 0.5) {
        // kicking in the air behind
        const k = Math.sin(c.legPhase + side * 1.7);
        x = -c.facing * (F.dx * 1.6 + side * 6);
        y = GROUND - 46 + k * 6;
        rot = -c.facing * 0.9;
        showPad = true;
      } else if (c.asleep || b.curl > 0.5) {
        x = side * F.dx * 0.8;
        y = footY + 2;
      } else if (b.sit > 0.5) {
        x = side * F.dx * 1.15;
        rot = side * 0.35;
        showPad = true;
      } else if (c.walking) {
        const p = c.legPhase + (side > 0 ? Math.PI : 0);
        x += Math.sin(p) * F.dx * 0.5;
        y -= Math.max(0, Math.cos(p)) * F.h * 0.9;
        showPad = Math.cos(p) > 0.4;
      } else if (c.held || airborne || c.hang) {
        y = footY + 8;
        x += Math.sin(t * 13 + side * 2) * 3;
        showPad = true;
      }
      if (c.flipT !== null) {
        x += Math.sin(c.legPhase + side * 2) * 5;
        showPad = true;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      vEll(ctx, 0, 0, F.w, F.h, pal.limb);
      if (showPad) {
        vEll(ctx, 0, 1, F.w * 0.45, F.h * 0.45, pal.pad, { flat: true, rim: false });
        for (const k of [-1, 0, 1]) vEll(ctx, k * F.w * 0.42, -F.h * 0.5, F.w * 0.16, F.h * 0.2, pal.pad, { flat: true, rim: false });
      } else for (const k of [-1, 0, 1]) vEll(ctx, k * F.w * 0.4, F.h * 0.35, F.w * 0.17, F.h * 0.22, pal.pad, { flat: true, rim: false });
      ctx.restore();
    }
  }

  private drawArms(c: CreatureState, airborne: boolean, t: number, activity: string, R: number): void {
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
        const L = Math.min(d / this.unit, R * 1.2);
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
      const w = Math.min(R * 0.26, 11);
      this.limb(sx, sy, hx, hy, w, pal.limb, dark(pal.limb, 0.3));
      vEll(this.ctx, hx, hy, w * 0.62, w * 0.58, pal.limb);
    }
  }

  private drawFace(c: CreatureState, world: WorldSnapshot, t: number, activity: string, R: number): void {
    const ctx = this.ctx;
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
      this.drawEye(c, side, ex, lx, ly, t, hungry, R);
      ctx.restore();
    }

    // brows
    this.drawBrows(c, t, two, R);


    // nose
    if (c.species.design.nose) {
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

}

    this.drawMouth(c, t, hungry, blep, R);

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

  private drawEye(c: CreatureState, side: number, x: number, lx: number, ly: number, t: number, hungry: boolean, R: number): void {
    const ctx = this.ctx;
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

    if (c.species.design.sclera) {
      // cyclops eye: white, colored iris that tracks, dark pupil
      ctx.fillStyle = '#ffffff';
      this.ell(ex, y, rx, ry);
      ctx.fill();
      ctx.strokeStyle = 'rgba(58,42,48,.55)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      const ir = rx * 0.62;
      const ix = ex + lx * rx * 0.3;
      const iy = y + ly * ry * 0.25;
      const ig = ctx.createRadialGradient(ix, iy + ir * 0.4, 1, ix, iy, ir);
      ig.addColorStop(0, light(pal.iris, 0.45));
      ig.addColorStop(1, dark(pal.iris, 0.3));
      ctx.fillStyle = ig;
      this.ell(ix, iy, ir, ir);
      ctx.fill();
      ctx.fillStyle = pal.pupil;
      this.ell(ix, iy, ir * 0.52 * ps, ir * 0.52 * ps);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      this.ell(ix - ir * 0.32, iy - ir * 0.36, ir * 0.36, ir * 0.28, -0.5);
      ctx.fill();
      this.ell(ix + ir * 0.5, iy + ir * 0.5, ir * 0.13, ir * 0.13);
      ctx.fill();
    } else {
      // vinyl eye: deep top fading to a colored glow at the bottom, big fixed shine
      const g = ctx.createLinearGradient(ex, y - ry, ex, y + ry);
      g.addColorStop(0, pal.pupil);
      g.addColorStop(0.62, pal.iris);
      g.addColorStop(1, light(pal.iris, 0.5));
      ctx.fillStyle = g;
      this.ell(ex, y, rx, ry);
      ctx.fill();
      ctx.fillStyle = 'rgba(10,6,12,.55)';
      this.ell(ex + lx * rx * 0.3, y + ly * ry * 0.26 - ry * 0.05, rx * 0.5 * ps, ry * 0.48 * ps);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      this.ell(ex - rx * 0.28, y - ry * 0.42, rx * 0.4, ry * 0.3, -0.4);
      ctx.fill();
      this.ell(ex + rx * 0.34, y + ry * 0.38, rx * 0.16, ry * 0.13);
      ctx.fill();
    }
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
      ctx.fillStyle = pal.lid;
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

  private drawBrows(c: CreatureState, t: number, two: boolean, R: number): void {
    const ctx = this.ctx;
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

  private drawMouth(c: CreatureState, t: number, hungry: boolean, blep: boolean, R: number): void {
    const ctx = this.ctx;
    const pal = c.species.palette;
    const e = c.expr;
    const my = R * this.mouthDy;
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
    const teeth = () => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 0.8;
      for (const s of [-1, 1]) {
        const fx = s * R * 0.08;
        ctx.beginPath();
        ctx.moveTo(fx - R * 0.04, my + R * 0.03);
        ctx.lineTo(fx + R * 0.04, my + R * 0.03);
        ctx.lineTo(fx, my + R * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
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
    if (c.species.design.teeth) teeth();
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

