/**
 * Procedural Canvas 2D renderer. Reads CreatureState and effects only; it has
 * no game logic. A future rig (more species, evolutions) swaps parts here.
 */
import type { Effect } from '../core/animation/effects';
import type { CreatureState } from '../core/creature/state';
import type { WorldSnapshot } from '../core/world';

export interface Theme {
  ink: string;
  paper: string;
  accent: string;
}

interface Strand {
  a: number;
  l: number;
  p: number;
  dark: boolean;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private fur: Strand[] = [];
  private dpr = 1;
  width = 0;
  height = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    for (let i = 0; i < 72; i++) {
      this.fur.push({ a: (i / 72) * Math.PI * 2 + (Math.random() - 0.5) * 0.08, l: 5 + Math.random() * 6, p: Math.random() * 6.28, dark: Math.random() < 0.35 });
    }
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
    if (!c.hidden) this.drawCreature(c, world, now, activity);
    this.drawEffects(effects, theme);
  }

  private ell(x: number, y: number, rx: number, ry: number): void {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  }

  private lookVector(c: CreatureState, world: WorldSnapshot, now: number): [number, number] {
    const p = world.pointer;
    let tx: number | null = null;
    let ty = 0;
    if (world.dragPoint) {
      tx = world.dragPoint.x;
      ty = world.dragPoint.y;
    } else if (p.inside && now - p.lastMoveAt < 2.5 && Math.hypot(p.x - c.x, p.y - c.y) < 520) {
      tx = p.x;
      ty = p.y;
    } else if (c.look) {
      tx = c.look.x;
      ty = c.look.y;
    }
    if (tx === null) return [c.facing * 0.3, 0];
    const dx = tx - c.x;
    const dy = ty - c.y;
    const d = Math.hypot(dx, dy) || 1;
    const f = Math.min(1, d / 110);
    return [(dx / d) * f, (dy / d) * f];
  }

  private drawCreature(c: CreatureState, world: WorldSnapshot, t: number, activity: string): void {
    const ctx = this.ctx;
    const R = c.species.radius;
    const pal = c.species.palette;
    const airborne = !c.grounded && !c.hang;
    const dancing = activity === 'Dancing';

    if (c.grounded && !c.hang) {
      ctx.fillStyle = 'rgba(0,0,0,.14)';
      this.ell(c.x, c.y + R + 3, R * 0.85 * c.sx, 5);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    // squash anchored at the feet
    ctx.translate(0, R);
    ctx.scale(c.sx, c.sy);
    ctx.translate(0, -R);

    if (!c.asleep) {
      ctx.fillStyle = pal.furDark;
      for (const side of [-1, 1]) {
        let lx = side * R * 0.38;
        let ly = R * 0.93;
        let lift = 0;
        if (c.walking) {
          const p = c.legPhase + (side > 0 ? Math.PI : 0);
          lx += Math.sin(p) * 7;
          lift = Math.max(0, Math.cos(p)) * 5;
        } else if (c.held || airborne || c.hang) {
          ly = R * 1.08 + (c.held ? 5 : 2);
          lx += Math.sin(t * 14 + side) * 3;
        }
        if (c.flipT !== null || c.hang) lx += Math.sin(c.legPhase + side * 2) * 6;
        this.ell(lx, ly - lift, 7.5, 6);
        ctx.fill();
      }
    }

    const arms: [number, number][] = [];
    for (const side of [-1, 1]) {
      let ax = side * R * 0.93;
      let ay = R * 0.25;
      if (c.hang) {
        ax = side * R * 0.32;
        ay = -R * 1.02;
      } else if (c.held) {
        ax = side * R;
        ay = R * 0.05 + Math.sin(t * 20 + side) * 7;
      } else if (airborne && c.expr === 'panic') {
        ax = side * R * 1.05;
        ay = -R * 0.35 + Math.sin(t * 24 + side) * 6;
      } else if (dancing) {
        ay = Math.sin(t * 9 + side * 1.5) > 0 ? -R * 0.55 : R * 0.2;
        ax = side * R;
      } else if (c.arm === 'chin' && side === c.facing) {
        ax = side * R * 0.45;
        ay = R * 0.32;
      }
      arms.push([ax, ay]);
    }
    if (c.hang) {
      ctx.fillStyle = pal.fur;
      for (const [ax, ay] of arms) {
        this.ell(ax, ay, 6, 9);
        ctx.fill();
      }
    }

    // fur halo
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.3;
    for (const f of this.fur) {
      const a = f.a + Math.sin(t * 2.2 + f.p) * 0.05 * (1 + c.fluff * 5);
      const r2 = R + f.l * (1 + c.fluff * 0.7);
      ctx.strokeStyle = f.dark ? pal.furDark : pal.fur;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (R - 4), Math.sin(a) * (R - 4));
      ctx.lineTo(Math.cos(a + 0.04) * r2, Math.sin(a + 0.04) * r2);
      ctx.stroke();
    }
    ctx.strokeStyle = pal.furDark;
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 5, -R + 2);
      ctx.quadraticCurveTo(i * 9 + Math.sin(t * 3) * 3, -R - 14, i * 14, -R - 10 + Math.abs(i) * 4);
      ctx.stroke();
    }
    ctx.fillStyle = pal.fur;
    this.ell(0, 0, R, R);
    ctx.fill();
    ctx.fillStyle = pal.belly;
    this.ell(0, R * 0.38, R * 0.6, R * 0.44);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    this.ell(-R * 0.45, -R * 0.5, R * 0.22, R * 0.13);
    ctx.fill();

    this.drawFace(c, world, t, activity);

    if (!c.hang) {
      for (const [ax, ay] of arms) {
        ctx.fillStyle = pal.fur;
        this.ell(ax, ay, 6, 8);
        ctx.fill();
        ctx.strokeStyle = pal.furDark;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawFace(c: CreatureState, world: WorldSnapshot, t: number, activity: string): void {
    const ctx = this.ctx;
    const R = c.species.radius;
    const pal = c.species.palette;
    const e = c.expr;
    const [lx, ly] = this.lookVector(c, world, t);
    const fo = c.facing * R * 0.06;
    const ey = -R * 0.12;
    const hungry = e === 'hungry' || c.hungryNear;

    if (e === 'happy' || e === 'chew' || activity === 'Enjoying pets') {
      ctx.fillStyle = 'rgba(255,110,150,.45)';
      this.ell(-R * 0.6 + fo, R * 0.14, R * 0.15, R * 0.09);
      ctx.fill();
      this.ell(R * 0.6 + fo, R * 0.14, R * 0.15, R * 0.09);
      ctx.fill();
    }
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const x = side * R * 0.36 + fo;
      const y = ey;
      if (e === 'happy' || e === 'chew') {
        ctx.beginPath();
        ctx.arc(x, y + 3, R * 0.17, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        continue;
      }
      if (e === 'sleep') {
        ctx.beginPath();
        ctx.arc(x, y - 1, R * 0.16, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        continue;
      }
      if (e === 'dizzy') {
        ctx.beginPath();
        for (let a = 0; a < 12; a += 0.3) {
          const ang = a * 1.1 + t * 8 * side;
          const px = x + Math.cos(ang) * a * 0.85;
          const py = y + Math.sin(ang) * a * 0.85;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        continue;
      }
      let s = 1;
      let ps = 1;
      let bl = c.blink;
      let jx = 0;
      if (e === 'surprised') s = 1.22;
      if (e === 'panic') {
        s = 1.25;
        ps = 0.45;
        jx = Math.sin(t * 50) * 1.2;
      }
      if (hungry) s = 1.18;
      if (e === 'curious') s = side === c.facing ? 1.18 : 0.92;
      if (e === 'sleepy') bl = Math.min(bl, 0.42);
      if (e === 'angry') s = 0.92;
      ctx.fillStyle = '#fff';
      this.ell(x + jx, y, R * 0.25 * s, R * 0.31 * s * bl);
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (bl > 0.3) {
        const px = x + jx + lx * R * 0.11;
        const py = y + ly * R * 0.11;
        ctx.fillStyle = pal.pupil;
        this.ell(px, py, R * 0.13 * s * ps, R * 0.15 * s * ps * Math.min(1, bl));
        ctx.fill();
        ctx.fillStyle = '#fff';
        this.ell(px - R * 0.045, py - R * 0.06, R * 0.04, R * 0.04);
        ctx.fill();
      }
      if (e === 'angry') {
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(x - side * R * 0.2, y - R * 0.38);
        ctx.lineTo(x + side * R * 0.16, y - R * 0.26);
        ctx.stroke();
      }
    }

    const my = R * 0.32;
    const mx = fo * 0.6;
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = pal.line;
    ctx.fillStyle = pal.line;
    if (e === 'chew') {
      if (Math.sin(t * 18) > 0) {
        this.ell(mx, my, R * 0.1, R * 0.08);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(mx - R * 0.1, my);
        ctx.lineTo(mx + R * 0.1, my);
        ctx.stroke();
      }
    } else if (e === 'happy') {
      ctx.beginPath();
      ctx.arc(mx, my - 2, R * 0.15, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#ff7f9f';
      this.ell(mx, my + R * 0.07, R * 0.07, R * 0.04);
      ctx.fill();
    } else if (e === 'surprised' || e === 'panic' || hungry) {
      const big = hungry ? 1.35 + Math.sin(t * 10) * 0.2 : 1;
      this.ell(mx, my + 2, R * 0.09 * big, R * 0.12 * big);
      ctx.fill();
    } else if (e === 'angry' || e === 'dizzy') {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const px = mx - R * 0.16 + i * R * 0.04;
        const py = my + (i % 2 ? -2 : 2);
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    } else if (e === 'sleep') {
      this.ell(mx, my, R * 0.05, R * 0.05);
      ctx.fill();
    } else if (e === 'sleepy') {
      this.ell(mx, my, R * 0.08, R * 0.1);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(mx, my - R * 0.06, R * 0.12, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
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
