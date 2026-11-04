/**
 * Elemental overlays for Stage IV and V forms. Each element has an aura,
 * a head crest, body marks, a Stage V mantle and ambient particles. A blended
 * Stage V adds the second element's marks and particles at lower strength.
 */
import type { CreatureState } from '../core/creature/state';
import { ELEMENT_STYLE, type Element } from '../core/evolution/elements';
import { drawWings, star } from './parts';

const TAU = Math.PI * 2;

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const level = (c: CreatureState) => (c.species.design.stage >= 5 ? 1.45 : 1);
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function flame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lean: number, el: Element): void {
  const st = ELEMENT_STYLE[el];
  const g = ctx.createLinearGradient(x, y, x, y - h);
  g.addColorStop(0, st.deep);
  g.addColorStop(0.45, st.tint);
  g.addColorStop(1, st.glow);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w * 1.1, y - h * 0.45, x + lean - w * 0.3, y - h * 0.7, x + lean, y - h);
  ctx.bezierCurveTo(x + lean + w * 0.3, y - h * 0.7, x + w * 1.1, y - h * 0.45, x + w, y);
  ctx.closePath();
  ctx.fill();
}

// ------------------------------------------------------------------ aura (world space, behind)
export function drawAura(ctx: CanvasRenderingContext2D, c: CreatureState, x: number, y: number): void {
  const el = c.species.design.element;
  if (!el) return;
  const R = c.species.radius;
  const L = level(c);
  const st = ELEMENT_STYLE[el];
  const col = el === 'shadow' ? st.deep : st.glow;
  const g = ctx.createRadialGradient(x, y, R * 0.7, x, y, R * (1.7 + L * 0.3));
  g.addColorStop(0, rgba(col, 0.22 * L));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ell(ctx, x, y, R * (1.7 + L * 0.3), R * (1.7 + L * 0.3));
  ctx.fill();
}

// ------------------------------------------------------------------ mantle (local, behind body, Stage V)
export function drawMantle(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void {
  const d = c.species.design;
  const el = d.element;
  if (!el || d.stage < 5) return;
  const R = c.species.radius;
  const st = ELEMENT_STYLE[el];
  switch (el) {
    case 'fire':
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.08 + (i / 6) * 0.84);
        const h = R * (0.5 + 0.15 * Math.sin(t * 9 + i * 1.7)) * (i === 3 ? 1.3 : 1);
        ctx.save();
        ctx.translate(Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82);
        ctx.rotate(a + Math.PI / 2);
        flame(ctx, 0, 0, R * 0.16, h, Math.sin(t * 6 + i) * 3, el);
        ctx.restore();
      }
      break;
    case 'water': {
      // dorsal fin and side fins
      ctx.fillStyle = rgba(st.tint, 0.9);
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-R * 0.35, -R * 0.75);
      ctx.quadraticCurveTo(R * 0.05, -R * 1.65 + Math.sin(t * 2) * 3, R * 0.5, -R * 1.05);
      ctx.quadraticCurveTo(R * 0.25, -R * 0.95, R * 0.35, -R * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * R * 0.9, R * 0.1);
        ctx.rotate(side * (0.9 + Math.sin(t * 3 + side) * 0.15));
        ctx.beginPath();
        ctx.moveTo(-R * 0.15, 0);
        ctx.quadraticCurveTo(0, -R * 0.7, R * 0.25, -R * 0.45);
        ctx.quadraticCurveTo(R * 0.1, -R * 0.2, R * 0.15, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'earth':
      // crystal shards on the back
      for (const [x, y, h, rot] of [[-0.55, -0.7, 0.55, -0.5], [-0.15, -0.95, 0.7, -0.1], [0.3, -0.88, 0.5, 0.3], [0.7, -0.5, 0.4, 0.7]] as const) {
        crystal(ctx, x * R, y * R, R * 0.16, h * R, rot);
      }
      break;
    case 'air':
      drawWings(ctx, c, t, 'feather', '#ffffff', st.deep);
      break;
    case 'light': {
      ctx.save();
      ctx.rotate(t * 0.25);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const len = R * (i % 2 ? 1.45 : 1.75);
        const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
        g.addColorStop(0.5, rgba(st.glow, 0.85));
        g.addColorStop(1, rgba(st.glow, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.09) * R * 0.7, Math.sin(a - 0.09) * R * 0.7);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.lineTo(Math.cos(a + 0.09) * R * 0.7, Math.sin(a + 0.09) * R * 0.7);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'shadow':
      // smoky cape that drifts behind
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.15 + (i / 5) * 0.7);
        const sway = Math.sin(t * 2 + i) * 4;
        ctx.fillStyle = rgba(st.deep, 0.55 - i * 0.04);
        ell(ctx, Math.cos(a) * R * 0.95 + sway, Math.sin(a) * R * 0.75 + R * 0.25, R * 0.38, R * 0.3);
        ctx.fill();
      }
      break;
  }
}

function crystal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createLinearGradient(-w, 0, w, -h);
  g.addColorStop(0, '#c98a2e');
  g.addColorStop(1, '#ffe39a');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#8a5a1c';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(-w * 0.8, -h * 0.75);
  ctx.lineTo(0, -h);
  ctx.lineTo(w * 0.8, -h * 0.75);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, -h * 0.15);
  ctx.lineTo(-w * 0.2, -h * 0.75);
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ crest (local, on the head)
export function drawCrest(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void {
  const el = c.species.design.element;
  if (!el) return;
  const R = c.species.radius;
  const L = level(c);
  const st = ELEMENT_STYLE[el];
  const fx = c.rig.faceX * R * 0.08;
  ctx.save();
  ctx.translate(fx, -R * 0.9);
  ctx.scale(L * 0.85 + 0.15, L * 0.85 + 0.15);
  switch (el) {
    case 'fire':
      flame(ctx, -R * 0.14, R * 0.08, R * 0.1, R * (0.32 + Math.sin(t * 11) * 0.05), -2, el);
      flame(ctx, R * 0.14, R * 0.08, R * 0.1, R * (0.3 + Math.sin(t * 9 + 1) * 0.05), 2, el);
      flame(ctx, 0, R * 0.06, R * 0.14, R * (0.5 + Math.sin(t * 7 + 2) * 0.07), Math.sin(t * 5) * 3, el);
      break;
    case 'water': {
      // droplet crest with a highlight
      const g = ctx.createLinearGradient(0, R * 0.05, 0, -R * 0.55);
      g.addColorStop(0, st.deep);
      g.addColorStop(1, st.glow);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.55 + Math.sin(t * 2) * 1.5);
      ctx.bezierCurveTo(R * 0.08, -R * 0.35, R * 0.22, -R * 0.15, R * 0.2, 0);
      ctx.bezierCurveTo(R * 0.18, R * 0.12, -R * 0.18, R * 0.12, -R * 0.2, 0);
      ctx.bezierCurveTo(-R * 0.22, -R * 0.15, -R * 0.08, -R * 0.35, 0, -R * 0.55 + Math.sin(t * 2) * 1.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ell(ctx, -R * 0.07, -R * 0.12, R * 0.04, R * 0.08, -0.3);
      ctx.fill();
      break;
    }
    case 'earth':
      crystal(ctx, -R * 0.16, R * 0.06, R * 0.08, R * 0.3, -0.35);
      crystal(ctx, R * 0.04, R * 0.04, R * 0.11, R * 0.45, 0.05);
      crystal(ctx, R * 0.22, R * 0.08, R * 0.07, R * 0.24, 0.45);
      ctx.fillStyle = st.glow;
      for (let i = 0; i < 5; i++) {
        ell(ctx, (i - 2) * R * 0.1, R * 0.1, R * 0.07, R * 0.05);
        ctx.fill();
      }
      break;
    case 'air':
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.rotate(side * (0.35 + Math.sin(t * 3 + side) * 0.08));
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = st.deep;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, R * 0.05);
        ctx.bezierCurveTo(-R * 0.14, -R * 0.2, -R * 0.08, -R * 0.5, side * R * 0.08, -R * 0.62);
        ctx.bezierCurveTo(R * 0.12, -R * 0.45, R * 0.12, -R * 0.15, 0, R * 0.05);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, R * 0.02);
        ctx.quadraticCurveTo(side * R * 0.02, -R * 0.3, side * R * 0.07, -R * 0.58);
        ctx.stroke();
        ctx.restore();
      }
      break;
    case 'light': {
      const y = -R * 0.42 + Math.sin(t * 2.2) * 2;
      ctx.strokeStyle = rgba(st.glow, 0.55);
      ctx.lineWidth = 6;
      ell(ctx, 0, y, R * 0.42, R * 0.12);
      ctx.stroke();
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = 2.4;
      ell(ctx, 0, y, R * 0.42, R * 0.12);
      ctx.stroke();
      star(ctx, R * 0.36, y - R * 0.08, 4, 1.6, '#ffffff', t);
      break;
    }
    case 'shadow': {
      // crescent moon crest
      ctx.fillStyle = st.glow;
      ctx.beginPath();
      ctx.arc(0, -R * 0.12, R * 0.26, Math.PI * 0.75, Math.PI * 2.25);
      ctx.arc(R * 0.1, -R * 0.2, R * 0.2, Math.PI * 2.25, Math.PI * 0.75, true);
      ctx.closePath();
      ctx.fill();
      star(ctx, -R * 0.24, -R * 0.42, 3.5, 1.4, '#ffffff', t * 0.5);
      break;
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ marks (local, on the body)
export function drawMarks(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void {
  const d = c.species.design;
  if (d.element) marks(ctx, c, d.element, t, 1);
  if (d.secondary) marks(ctx, c, d.secondary, t, 0.8);
}

function marks(ctx: CanvasRenderingContext2D, c: CreatureState, el: Element, t: number, k: number): void {
  const R = c.species.radius;
  const st = ELEMENT_STYLE[el];
  const sides = [-1, 1];
  ctx.lineCap = 'round';
  switch (el) {
    case 'fire':
      for (const s of sides) {
        ctx.save();
        ctx.translate(s * R * 0.74, R * 0.05);
        ctx.rotate(s * 0.4);
        ctx.globalAlpha = 0.85 * k;
        flame(ctx, 0, R * 0.12, R * 0.07, R * 0.28, 0, el);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      break;
    case 'water':
      ctx.strokeStyle = rgba('#ffffff', 0.7 * k);
      ctx.lineWidth = 1.6;
      for (const s of sides)
        for (let j = 0; j < 2; j++) {
          ctx.beginPath();
          const y = R * (0.15 + j * 0.16);
          for (let i = 0; i <= 8; i++) {
            const x = s * R * (0.58 + i * 0.04);
            const yy = y + Math.sin(i * 1.4 + t * 2) * 1.6;
            if (i) ctx.lineTo(x, yy);
            else ctx.moveTo(x, yy);
          }
          ctx.stroke();
        }
      break;
    case 'earth':
      for (const [x, y, r] of [[-0.66, -0.25, 0.08], [0.7, -0.1, 0.07], [-0.5, -0.62, 0.06], [0.58, -0.55, 0.05]] as const) {
        ctx.fillStyle = rgba('#8c7a64', 0.85 * k);
        ell(ctx, x * R, y * R, r * R * 1.2, r * R);
        ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.4 * k);
        ell(ctx, x * R - 1, y * R - 1, r * R * 0.4, r * R * 0.3);
        ctx.fill();
      }
      break;
    case 'air':
      ctx.strokeStyle = rgba('#ffffff', 0.85 * k);
      ctx.lineWidth = 1.6;
      for (const s of sides) {
        ctx.beginPath();
        for (let a = 0; a < 9; a += 0.3) {
          const r = a * R * 0.016;
          const x = s * R * 0.62 + Math.cos(a * s + t) * r;
          const y = -R * 0.2 + Math.sin(a * s + t) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    case 'light':
      for (const [x, y, s] of [[-0.66, -0.3, 1], [0.68, -0.38, 0.8], [-0.4, -0.72, 0.6], [0.5, -0.72, 0.7]] as const) {
        star(ctx, x * R, y * R, R * 0.08 * s + 1, R * 0.03 * s + 0.6, rgba(st.deep, k), 0.3);
      }
      break;
    case 'shadow':
      ctx.fillStyle = rgba(st.deep, 0.75 * k);
      for (const s of sides) {
        ctx.beginPath();
        const x = s * R * 0.66;
        const y = -R * 0.3;
        ctx.arc(x, y, R * 0.12, 0, TAU);
        ctx.arc(x + s * R * 0.05, y - R * 0.03, R * 0.1, TAU, 0, true);
        ctx.fill();
      }
      break;
  }
}

// ------------------------------------------------------------------ particles (world space, front)
export function drawParticles(ctx: CanvasRenderingContext2D, c: CreatureState, x: number, y: number, t: number): void {
  const d = c.species.design;
  if (d.element) particles(ctx, c, d.element, x, y, t, level(c), 0);
  if (d.secondary) particles(ctx, c, d.secondary, x, y, t, 0.6, 50);
}

function particles(ctx: CanvasRenderingContext2D, c: CreatureState, el: Element, cx: number, cy: number, t: number, L: number, seed: number): void {
  const R = c.species.radius;
  const st = ELEMENT_STYLE[el];
  const calm = c.asleep ? 0.5 : 1;
  const N = Math.round((el === 'earth' || el === 'air' ? 4 : 6) * L * calm);
  for (let i = 0; i < N; i++) {
    const h = hash(i + seed);
    switch (el) {
      case 'fire': {
        const p = (t * 0.55 + h) % 1;
        const x = cx + (h - 0.5) * R * 1.4 + Math.sin(t * 3 + i) * 4;
        const y = cy - R * 0.2 - p * R * 1.7;
        ctx.fillStyle = rgba(p < 0.5 ? st.glow : st.tint, 1 - p);
        ell(ctx, x, y, 2.4 * (1 - p) + 0.6, 2.4 * (1 - p) + 0.6);
        ctx.fill();
        break;
      }
      case 'water': {
        const p = (t * 0.3 + h) % 1;
        const x = cx + (h - 0.5) * R * 1.6 + Math.sin(t * 2 + i * 2) * 5;
        const y = cy + R * 0.4 - p * R * 2;
        const r = 2 + h * 3;
        ctx.strokeStyle = rgba('#ffffff', 0.85 * (1 - p));
        ctx.lineWidth = 1.2;
        ell(ctx, x, y, r, r);
        ctx.stroke();
        ctx.fillStyle = rgba(st.glow, 0.35 * (1 - p));
        ctx.fill();
        break;
      }
      case 'earth': {
        const a = t * 0.7 + (i / N) * TAU;
        const x = cx + Math.cos(a) * R * 1.2;
        const y = cy + R * 0.55 + Math.sin(a) * R * 0.18;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a * 2);
        ctx.fillStyle = i % 2 ? st.glow : '#a08a6c';
        ell(ctx, 0, 0, i % 2 ? 4 : 2.6, i % 2 ? 2 : 2.2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'air': {
        const a = t * 1.6 + (i / N) * TAU;
        ctx.strokeStyle = rgba('#ffffff', 0.8);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 1.3, R * 0.55, -0.2, a, a + 0.7);
        ctx.stroke();
        break;
      }
      case 'light': {
        const tw = Math.max(0, Math.sin(t * 2.5 + h * 20));
        const a = h * TAU;
        const r = R * (1.1 + hash(i + 9 + seed) * 0.5);
        star(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, 1 + tw * 4, 0.5 + tw * 1.5, rgba('#ffffff', tw), t);
        break;
      }
      case 'shadow': {
        const p = (t * 0.35 + h) % 1;
        const x = cx + (h - 0.5) * R * 1.8;
        const y = cy + R * 0.75 - p * R * 0.9;
        const r = 3 + p * 7;
        ctx.fillStyle = rgba(st.deep, 0.35 * (1 - p));
        ell(ctx, x, y, r, r);
        ctx.fill();
        break;
      }
    }
  }
}
