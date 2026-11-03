/**
 * Species body parts. Each draws in the creature's local space (origin at the
 * body center, radius R, already rotated and squashed) and reads springs from
 * the rig so every species gets the same secondary motion.
 */
import type { CreatureState } from '../core/creature/state';

const TAU = Math.PI * 2;

export interface Tuft {
  a: number;
  len: number;
  w: number;
  p: number;
}

export interface PartAssets {
  outer: Tuft[];
  inner: Tuft[];
  bumps: { a: number; r: number; d: number }[];
}

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

function shaded(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, light: string, dark: string): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.05, x, y, r * 1.05);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  return g;
}

// ---------------------------------------------------------------- fringe
function tufts(ctx: CanvasRenderingContext2D, list: Tuft[], base: number, lenScale: number, fill: string, t: number, fluff: number, alpha: number): void {
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (const tu of list) {
    const a = tu.a + Math.sin(t * 2.1 + tu.p) * 0.05 * (1 + fluff * 5);
    const tip = base + tu.len * lenScale;
    const a0 = a - tu.w;
    const a1 = a + tu.w;
    ctx.moveTo(Math.cos(a0) * base, Math.sin(a0) * base);
    ctx.bezierCurveTo(Math.cos(a0) * (tip + 2), Math.sin(a0) * (tip + 2), Math.cos(a1) * (tip + 2), Math.sin(a1) * (tip + 2), Math.cos(a1) * base, Math.sin(a1) * base);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawFringe(ctx: CanvasRenderingContext2D, c: CreatureState, assets: PartAssets, t: number): void {
  const R = c.species.radius;
  const pal = c.species.palette;
  const fluff = c.fluff;
  switch (c.species.design.fur) {
    case 'cloud': {
      // marshmallow cloud: big soft bumps around the silhouette
      for (const layer of [0, 1]) {
        for (const b of assets.bumps) {
          const wob = Math.sin(t * 1.8 + b.a * 5) * 0.6 * (1 + fluff * 3);
          const rr = R * (0.2 + b.r * 0.08) * (1 + fluff * 0.25) + (layer ? 0 : 1.6) + wob * 0.3;
          const d = R * (0.86 + b.d * 0.04);
          ctx.fillStyle = layer ? pal.fur : pal.furDark;
          ell(ctx, Math.cos(b.a) * d, Math.sin(b.a) * d, rr, rr);
          ctx.fill();
        }
      }
      break;
    }
    case 'moss': {
      for (const layer of [0, 1]) {
        for (let i = 0; i < 38; i++) {
          const a = (i / 38) * TAU + (layer ? 0.08 : 0);
          const rr = R * (0.1 + ((i * 37) % 7) * 0.008) + (layer ? 0 : 1.4);
          const d = R * (0.98 + Math.sin(i * 2.3) * 0.02) + Math.sin(t * 1.5 + i) * 0.3 * (1 + fluff * 4);
          ctx.fillStyle = layer ? pal.fur : pal.furDark;
          ell(ctx, Math.cos(a) * d, Math.sin(a) * d, rr, rr);
          ctx.fill();
        }
      }
      break;
    }
    case 'sleek': {
      tufts(ctx, assets.outer, R - 2, 0.45 + fluff * 0.8, pal.furDark, t, fluff, 1);
      tufts(ctx, assets.inner, R - 3, 0.4 + fluff * 0.6, pal.fur, t, fluff, 0.9);
      // cowlick on the crown
      ctx.strokeStyle = pal.fur;
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2, -R + 2);
      ctx.quadraticCurveTo(4 + Math.sin(t * 3) * 2, -R - 11, 10, -R - 7);
      ctx.stroke();
      break;
    }
    default:
      tufts(ctx, assets.outer, R - 2, 1 + fluff * 0.8, pal.furDark, t, fluff, 1);
      tufts(ctx, assets.inner, R - 3, 1 + fluff * 0.6, pal.fur, t, fluff, 0.8);
  }
}

// ---------------------------------------------------------------- ears
export function drawEars(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void {
  const R = c.species.radius;
  const pal = c.species.palette;
  const rig = c.rig;
  const fx = rig.faceX * R * 0.06;
  const style = c.species.design.ears;
  for (const side of [-1, 1]) {
    const droop = side < 0 ? rig.earL : rig.earR;
    ctx.save();
    if (style === 'bunny' || (style === 'odd' && side < 0)) {
      // long floppy ear that bends more the more it droops
      const odd = style === 'odd';
      const L = R * (odd ? 0.8 : 1.15);
      const W = R * (odd ? 0.26 : 0.27);
      ctx.translate(side * R * (odd ? 0.5 : 0.3) + fx, -R * 0.78);
      ctx.rotate(side * (0.12 + droop * (odd ? 1.25 : 1.05) + (odd ? 0.5 : 0)));
      const bend = side * (0.25 + Math.max(0, droop)) * L * 0.35;
      const g = ctx.createLinearGradient(0, 0, 0, -L);
      g.addColorStop(0, pal.furDark);
      g.addColorStop(1, pal.fur);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-W, 0);
      ctx.bezierCurveTo(-W * 1.25, -L * 0.55, -W * 0.8 + bend, -L * 1.02, bend * 0.9, -L);
      ctx.bezierCurveTo(W * 0.9 + bend, -L * 0.98, W * 1.2, -L * 0.5, W, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.innerEar;
      ctx.beginPath();
      ctx.moveTo(-W * 0.5, -L * 0.1);
      ctx.bezierCurveTo(-W * 0.7, -L * 0.55, -W * 0.4 + bend * 0.8, -L * 0.86, bend * 0.75, -L * 0.84);
      ctx.bezierCurveTo(W * 0.4 + bend * 0.8, -L * 0.82, W * 0.65, -L * 0.5, W * 0.5, -L * 0.1);
      ctx.closePath();
      ctx.fill();
    } else if (style === 'odd') {
      // the other side is a curly antenna with a bobble
      ctx.translate(R * 0.42 + fx, -R * 0.82);
      const sway = Math.sin(t * 2.4) * 0.15 - droop * 0.4;
      ctx.rotate(0.25 + sway);
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-4, -R * 0.35, 10, -R * 0.5, 4, -R * 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, -R * 0.74, 4.5, Math.PI, Math.PI * 2.6);
      ctx.stroke();
      ctx.fillStyle = shaded(ctx, 10, -R * 0.8, 5, pal.furLight, pal.pad);
      ell(ctx, 11, -R * 0.8, 4.6, 4.6);
      ctx.fill();
    } else if (style === 'leaf') {
      ctx.translate(side * R * 0.56 + fx, -R * 0.66);
      ctx.rotate(side * (0.85 + droop * 0.75));
      const L = R * 0.62;
      const W = R * 0.24;
      const g = ctx.createLinearGradient(-W, 0, W, -L);
      g.addColorStop(0, pal.accentDark);
      g.addColorStop(1, pal.accent);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-W * 1.4, -L * 0.35, -W * 0.6, -L * 0.9, 0, -L);
      ctx.bezierCurveTo(W * 0.6, -L * 0.9, W * 1.4, -L * 0.35, 0, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,230,.55)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(0, -L * 0.88);
      for (let i = 1; i <= 3; i++) {
        ctx.moveTo(0, -L * 0.22 * i);
        ctx.lineTo(-W * 0.55, -L * 0.22 * i - L * 0.1);
        ctx.moveTo(0, -L * 0.22 * i);
        ctx.lineTo(W * 0.55, -L * 0.22 * i - L * 0.1);
      }
      ctx.stroke();
    } else if (style === 'bat') {
      ctx.translate(side * R * 0.5 + fx, -R * 0.62);
      ctx.rotate(side * (0.55 + droop * 0.8));
      const L = R * 0.72;
      const W = R * 0.38;
      ctx.fillStyle = shaded(ctx, 0, -L * 0.5, L, pal.fur, pal.furDark);
      ctx.beginPath();
      ctx.moveTo(-W, 0);
      ctx.quadraticCurveTo(-W * 0.9, -L * 0.6, side * W * 0.15, -L);
      ctx.quadraticCurveTo(W * 0.5, -L * 0.62, W * 0.75, -L * 0.42);
      ctx.quadraticCurveTo(W * 0.6, -L * 0.25, W, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.innerEar;
      ctx.beginPath();
      ctx.moveTo(-W * 0.55, -L * 0.06);
      ctx.quadraticCurveTo(-W * 0.5, -L * 0.5, side * W * 0.1, -L * 0.8);
      ctx.quadraticCurveTo(W * 0.35, -L * 0.45, W * 0.55, -L * 0.06);
      ctx.closePath();
      ctx.fill();
    } else if (style === 'fin') {
      // small translucent side fins with ribs
      ctx.translate(side * R * 0.9 + fx, -R * 0.22);
      ctx.rotate(side * (1.25 + droop * 0.5) + Math.sin(t * 3 + side) * 0.08);
      const L = R * 0.5;
      const W = R * 0.3;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = pal.innerEar;
      ctx.beginPath();
      ctx.moveTo(-W * 0.6, 0);
      ctx.quadraticCurveTo(-W * 1.1, -L * 0.8, 0, -L);
      ctx.quadraticCurveTo(W * 1.1, -L * 0.8, W * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const k of [-0.45, 0, 0.45]) {
        ctx.moveTo(k * W * 0.4, -2);
        ctx.lineTo(k * W * 1.1, -L * 0.85);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- head extras
export function drawHeadExtra(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void {
  const R = c.species.radius;
  const pal = c.species.palette;
  const rig = c.rig;
  const sway = Math.sin(t * 2) * 0.12 + (rig.earL + rig.earR) * -0.15 + rig.armLag * 0.6;
  const fx = rig.faceX * R * 0.08;
  switch (c.species.design.head) {
    case 'sprout': {
      ctx.save();
      ctx.translate(fx, -R * 0.92);
      ctx.rotate(sway);
      ctx.strokeStyle = pal.accentDark;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-3, -R * 0.25, 0, -R * 0.42);
      ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(0, -R * 0.4);
        ctx.rotate(side * (1.0 + Math.sin(t * 2.6 + side) * 0.08));
        const g = ctx.createLinearGradient(0, 0, 0, -R * 0.4);
        g.addColorStop(0, pal.accentDark);
        g.addColorStop(1, pal.accent);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-R * 0.2, -R * 0.12, -R * 0.12, -R * 0.36, 0, -R * 0.4);
        ctx.bezierCurveTo(R * 0.12, -R * 0.36, R * 0.2, -R * 0.12, 0, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,230,.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(0, -R * 0.34);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }
    case 'horns': {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * R * 0.32 + fx, -R * 0.86);
        ctx.rotate(side * 0.3);
        ctx.scale(1.45, 1.45);
        const g = ctx.createLinearGradient(0, 0, 0, -R * 0.36);
        g.addColorStop(0, pal.accentDark);
        g.addColorStop(1, pal.accent);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-R * 0.11, 0);
        ctx.quadraticCurveTo(-R * 0.1, -R * 0.24, side * R * 0.06, -R * 0.36);
        ctx.quadraticCurveTo(R * 0.12, -R * 0.2, R * 0.11, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(160,120,60,.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-R * 0.09, -R * 0.08);
        ctx.quadraticCurveTo(0, -R * 0.04, R * 0.09, -R * 0.09);
        ctx.moveTo(-R * 0.07, -R * 0.17);
        ctx.quadraticCurveTo(0, -R * 0.13, R * 0.07, -R * 0.18);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'antenna': {
      ctx.save();
      ctx.translate(fx, -R * 0.94);
      ctx.rotate(sway * 1.6);
      ctx.strokeStyle = pal.furDark;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(5, -R * 0.3, 0, -R * 0.5);
      ctx.stroke();
      const pulse = 0.75 + Math.sin(t * 3.2) * 0.25;
      const glow = ctx.createRadialGradient(0, -R * 0.56, 1, 0, -R * 0.56, R * 0.5);
      glow.addColorStop(0, `rgba(255,245,170,${0.75 * pulse})`);
      glow.addColorStop(1, 'rgba(255,245,170,0)');
      ctx.fillStyle = glow;
      ell(ctx, 0, -R * 0.56, R * 0.5, R * 0.5);
      ctx.fill();
      star(ctx, 0, -R * 0.56, R * 0.17, R * 0.075, pal.accent, t * 0.6);
      ctx.restore();
      break;
    }
  }
}

export function star(ctx: CanvasRenderingContext2D, x: number, y: number, ro: number, ri: number, fill: string, rot = 0): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro;
    const a = rot + (i / 10) * TAU - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- tails
export function drawTail(ctx: CanvasRenderingContext2D, c: CreatureState, t: number, front: boolean): void {
  const R = c.species.radius;
  const pal = c.species.palette;
  const f = c.facing;
  const style = c.species.design.tail;
  const swing = c.rig.tail * -f;
  ctx.save();
  if (front) {
    // curled: tail wraps around the front of the body
    ctx.translate(f * R * 0.35, R * 0.82);
    const puffs: [number, number, number][] = [[-R * 0.5, 0, 0.2], [-R * 0.2, R * 0.05, 0.24], [R * 0.12, R * 0.02, 0.24], [R * 0.42, -R * 0.06, 0.2]];
    const light = style === 'leaf' ? pal.accent : pal.furLight;
    const dark = style === 'leaf' ? pal.accentDark : pal.furDark;
    puffs.forEach(([px, py, pr], i) => {
      ctx.fillStyle = shaded(ctx, px, py, pr * R, light, style === 'ringed' && i % 2 ? pal.accent : dark);
      ell(ctx, px, py, pr * R * 0.9, pr * R * 0.9);
      ctx.fill();
    });
    ctx.restore();
    return;
  }
  ctx.translate(-f * R * 0.86, R * 0.42);
  ctx.rotate(swing);
  switch (style) {
    case 'cotton': {
      const puffs: [number, number, number][] = [[0, 0, 0.28], [-R * 0.15, -R * 0.1, 0.18], [R * 0.08, -R * 0.16, 0.17], [-R * 0.05, R * 0.13, 0.18]];
      for (const [px, py, pr] of puffs) {
        ctx.fillStyle = shaded(ctx, px, py, pr * R, '#ffffff', pal.furDark);
        ell(ctx, px, py, pr * R, pr * R);
        ctx.fill();
      }
      break;
    }
    case 'leaf': {
      ctx.rotate(-f * 0.9);
      const L = R * 0.75;
      ctx.strokeStyle = pal.accentDark;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -L * 0.25);
      ctx.stroke();
      const g = ctx.createLinearGradient(0, 0, 0, -L);
      g.addColorStop(0, pal.accentDark);
      g.addColorStop(1, pal.accent);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -L * 0.2);
      ctx.bezierCurveTo(-R * 0.32, -L * 0.45, -R * 0.15, -L * 0.95, 0, -L);
      ctx.bezierCurveTo(R * 0.15, -L * 0.95, R * 0.32, -L * 0.45, 0, -L * 0.2);
      ctx.fill();
      break;
    }
    case 'devil': {
      const wig = Math.sin(t * 4) * 0.25;
      ctx.rotate(-f * 0.6);
      ctx.strokeStyle = pal.furDark;
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      const ex = -f * R * 0.35;
      const ey = -R * 1.05;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-f * R * (0.55 + wig * 0.4), -R * 0.2, f * R * (0.35 + wig), -R * 0.55, ex, ey);
      ctx.stroke();
      // heart tip
      ctx.fillStyle = pal.innerEar;
      ctx.save();
      ctx.translate(ex, ey - 2);
      ctx.rotate(-f * 0.3);
      const s = R * 0.17;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.9);
      ctx.bezierCurveTo(-s * 1.4, -s * 0.1, -s * 0.6, -s * 1.1, 0, -s * 0.4);
      ctx.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.4, -s * 0.1, 0, s * 0.9);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'wisp': {
      ctx.rotate(-f * 0.3);
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(255,255,255,${0.7 - i * 0.18})`;
        ctx.lineWidth = 3.5 - i;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const off = Math.sin(t * 2.5 + i) * 5;
        ctx.moveTo(0, i * 3);
        ctx.quadraticCurveTo(-f * R * 0.4, -R * 0.1 + off + i * 6, -f * R * (0.7 + i * 0.12), R * 0.15 + i * 5 - off);
        ctx.stroke();
      }
      star(ctx, -f * R * 0.75, R * 0.18 + Math.sin(t * 2.5) * 5, 3.5, 1.5, pal.accent, t);
      break;
    }
    case 'ringed': {
      // thick curly tail with stripes, drawn as a chain of puffs along a spiral
      ctx.rotate(-f * 0.3);
      for (let i = 0; i < 7; i++) {
        const k = i / 6;
        const a = -Math.PI / 2 - k * 2.6 * f * -1;
        const rad = R * (0.25 + k * 0.32);
        const px = -f * Math.cos(a) * rad * 0.7 - f * R * 0.15;
        const py = Math.sin(a) * rad * 0.9 - R * 0.1;
        const pr = R * (0.2 - k * 0.06);
        ctx.fillStyle = shaded(ctx, px, py, pr, i % 2 ? pal.furLight : pal.accent, i % 2 ? pal.furDark : pal.accentDark);
        ell(ctx, px, py, pr, pr);
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- markings on the body
export function drawBodyMarkings(ctx: CanvasRenderingContext2D, c: CreatureState, t: number): void {
  const R = c.species.radius;
  switch (c.species.design.marking) {
    case 'flowers': {
      const spots: [number, number, number][] = [[-0.62, -0.55, 1], [0.66, -0.42, 0.85], [-0.82, 0.12, 0.75], [0.25, -0.86, 0.8]];
      for (const [x, y, s] of spots) {
        const px = x * R;
        const py = y * R;
        const pr = R * 0.065 * s;
        ctx.fillStyle = '#fffdf3';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + t * 0.2;
          ell(ctx, px + Math.cos(a) * pr, py + Math.sin(a) * pr, pr * 0.75, pr * 0.75);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd34d';
        ell(ctx, px, py, pr * 0.55, pr * 0.55);
        ctx.fill();
      }
      break;
    }
    case 'stars': {
      const spots: [number, number, number][] = [[-0.6, -0.5, 1], [0.62, -0.58, 0.8], [0.78, 0.05, 0.7], [-0.78, 0.1, 0.6], [0.1, -0.8, 0.6]];
      spots.forEach(([x, y, s], i) => {
        const tw = 0.6 + Math.sin(t * 3 + i * 1.7) * 0.4;
        star(ctx, x * R, y * R, R * 0.07 * s * tw + 1, R * 0.025 * s + 0.5, '#ffffff', i);
      });
      break;
    }
  }
}

export function drawBellyMarking(ctx: CanvasRenderingContext2D, c: CreatureState, bx: number): void {
  if (c.species.design.marking !== 'swirl') return;
  const R = c.species.radius;
  ctx.strokeStyle = c.species.palette.accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let a = 0; a < 12; a += 0.25) {
    const r = a * R * 0.018;
    const px = bx + Math.cos(a) * r;
    const py = R * 0.5 + Math.sin(a) * r * 0.8;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}
