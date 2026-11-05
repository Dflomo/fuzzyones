/**
 * Pip's flowers. Stage III grows a closed bud, Stage IV opens an elemental
 * bud, and Stage V blooms into one flower per element:
 * fire poppy, water lotus, earth sunflower, air dandelion, light starflower,
 * shadow moonflower. A blended Stage V alternates petals with the second
 * element's colors. Drawn in design units with the flower center at (0, 0).
 */
import type { Element } from '../core/evolution/elements';
import { dark, ell, light, mix, plainEll, rgba, shape, star } from './vinyl';

const TAU = Math.PI * 2;

interface FlowerColors {
  petal: string;
  tip: string;
  center: string;
  centerDark: string;
}

export const FLOWER: Record<Element, FlowerColors> = {
  fire: { petal: '#ff5a3c', tip: '#ffb347', center: '#3a1f1a', centerDark: '#1e0f0c' },
  water: { petal: '#8ab8ff', tip: '#eef6ff', center: '#ffd86a', centerDark: '#d8a531' },
  earth: { petal: '#ffc93c', tip: '#ffe58a', center: '#7a4a24', centerDark: '#4a2c14' },
  air: { petal: '#ffffff', tip: '#e6f3f8', center: '#d9cfb8', centerDark: '#a89a7c' },
  light: { petal: '#fff4c2', tip: '#ffffff', center: '#ffc93a', centerDark: '#e59a12' },
  shadow: { petal: '#6b3fa0', tip: '#a98be0', center: '#e2d4ff', centerDark: '#9b84d6' },
};

/** Petal color for petal i: alternates with the second element on blends. */
function petalColor(el: Element, sec: Element | null, i: number): FlowerColors {
  return sec && i % 2 ? FLOWER[sec] : FLOWER[el];
}

function teardrop(ctx: CanvasRenderingContext2D, len: number, w: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-w, -len * 0.3, -w * 0.8, -len * 0.85, 0, -len);
  ctx.bezierCurveTo(w * 0.8, -len * 0.85, w, -len * 0.3, 0, 0);
  ctx.closePath();
}

function roundPetal(ctx: CanvasRenderingContext2D, len: number, w: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-w * 1.1, -len * 0.35, -w, -len * 1.05, 0, -len);
  ctx.bezierCurveTo(w, -len * 1.05, w * 1.1, -len * 0.35, 0, 0);
  ctx.closePath();
}

function petalRing(ctx: CanvasRenderingContext2D, n: number, len: number, w: number, el: Element, sec: Element | null, rot: number, kind: 'tear' | 'round', wob: (i: number) => number): void {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    const col = petalColor(el, sec, i);
    const L = len * wob(i);
    ctx.save();
    ctx.rotate(a);
    const build = () => (kind === 'tear' ? teardrop(ctx, L, w) : roundPetal(ctx, L, w));
    shape(ctx, build, col.petal, [-w, -L, w * 2, L]);
    // lighter tips
    ctx.save();
    build();
    ctx.clip();
    const g = ctx.createLinearGradient(0, -L * 0.45, 0, -L);
    g.addColorStop(0, rgba(col.tip, 0));
    g.addColorStop(1, rgba(col.tip, 0.85));
    ctx.fillStyle = g;
    ctx.fillRect(-w, -L, w * 2, L);
    ctx.restore();
    ctx.restore();
  }
}

/**
 * Full bloom. open is 0 to 1: petals fold in while Pip sleeps.
 * size is the petal reach in design units.
 */
export function drawFlower(ctx: CanvasRenderingContext2D, el: Element, sec: Element | null, t: number, open: number, size: number): void {
  const o = 0.35 + 0.65 * open;
  const R = size * o;
  const c = FLOWER[el];
  const cs = sec ? FLOWER[sec] : c;
  const breathe = (i: number) => 1 + Math.sin(t * 2 + i * 1.3) * 0.03;
  switch (el) {
    case 'fire': {
      // poppy: five wide cupped petals, petal tips flicker like flame
      petalRing(ctx, 5, R, R * 0.62, el, sec, t * 0.05, 'round', (i) => breathe(i) * (1 + Math.sin(t * 9 + i * 2) * 0.03));
      ell(ctx, 0, 0, R * 0.32, R * 0.32, c.center);
      ctx.fillStyle = mix(c.tip, cs.tip, 0.5);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        plainEll(ctx, Math.cos(a) * R * 0.38, Math.sin(a) * R * 0.38, 1.8, 1.8);
        ctx.fill();
      }
      break;
    }
    case 'water': {
      // lotus: a pale back ring and a colored front ring of pointed petals
      petalRing(ctx, 8, R * 0.95, R * 0.28, el, sec, Math.PI / 8, 'tear', breathe);
      ctx.save();
      ctx.scale(0.75, 0.75);
      petalRing(ctx, 6, R, R * 0.3, el, sec, 0, 'tear', breathe);
      ctx.restore();
      ell(ctx, 0, 0, R * 0.24, R * 0.2, c.center);
      ctx.fillStyle = c.centerDark;
      for (const [x, y] of [[-4, -2], [4, -2], [0, 3], [-6, 3], [6, 3]]) {
        plainEll(ctx, x * R * 0.03, y * R * 0.03, 1.4, 1.4);
        ctx.fill();
      }
      // a droplet resting on a petal
      ell(ctx, R * 0.55, -R * 0.45, 3, 3.6, '#e6f7ff');
      break;
    }
    case 'earth': {
      // sunflower: two rings of narrow petals around a big seedy center
      petalRing(ctx, 16, R, R * 0.17, el, sec, 0.1, 'tear', breathe);
      petalRing(ctx, 16, R * 0.85, R * 0.16, el, sec, 0.3, 'tear', breathe);
      ell(ctx, 0, 0, R * 0.46, R * 0.46, c.center);
      ctx.fillStyle = rgba(c.centerDark, 0.7);
      for (let ring = 1; ring <= 3; ring++)
        for (let i = 0; i < ring * 6; i++) {
          const a = (i / (ring * 6)) * TAU + ring;
          plainEll(ctx, Math.cos(a) * R * 0.12 * ring, Math.sin(a) * R * 0.12 * ring, 1.6, 1.6);
          ctx.fill();
        }
      break;
    }
    case 'air': {
      // dandelion: a soft puff of seed filaments
      const n = 34;
      const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 1.05);
      glow.addColorStop(0, 'rgba(225,236,242,.9)');
      glow.addColorStop(0.7, 'rgba(215,228,236,.55)');
      glow.addColorStop(1, 'rgba(215,228,236,0)');
      ctx.fillStyle = glow;
      plainEll(ctx, 0, 0, R * 1.05, R * 1.05);
      ctx.fill();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + Math.sin(t * 1.5 + i) * 0.03;
        const L = R * (0.82 + ((i * 7) % 5) * 0.04);
        const x = Math.cos(a) * L;
        const y = Math.sin(a) * L;
        const col = sec && i % 2 ? FLOWER[sec].petal : '#9fb2bc';
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.strokeStyle = sec && i % 2 ? FLOWER[sec].tip : '#8aa0ab';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = -2; k <= 2; k++) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a + k * 0.35) * 5, y + Math.sin(a + k * 0.35) * 5);
        }
        ctx.stroke();
      }
      ell(ctx, 0, 0, R * 0.16, R * 0.16, c.center);
      break;
    }
    case 'light': {
      // starflower: five pointed petals around a glowing gold heart
      const halo = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.5);
      halo.addColorStop(0, rgba('#fff3b0', 0.55 + Math.sin(t * 3) * 0.1));
      halo.addColorStop(1, 'rgba(255,243,176,0)');
      ctx.fillStyle = halo;
      plainEll(ctx, 0, 0, R * 1.5, R * 1.5);
      ctx.fill();
      petalRing(ctx, 5, R, R * 0.36, el, sec, 0, 'tear', breathe);
      ctx.save();
      ctx.scale(0.6, 0.6);
      petalRing(ctx, 5, R, R * 0.3, el, sec, Math.PI / 5, 'tear', breathe);
      ctx.restore();
      ell(ctx, 0, 0, R * 0.22, R * 0.22, c.center);
      star(ctx, 0, 0, R * 0.14, R * 0.06, '#ffffff', t * 0.4);
      break;
    }
    case 'shadow': {
      // moonflower: layered dark petals spiraling in to a pale heart
      petalRing(ctx, 6, R, R * 0.6, el, sec, 0.2, 'round', breathe);
      ctx.save();
      ctx.scale(0.68, 0.68);
      petalRing(ctx, 5, R, R * 0.6, el, sec, 0.8, 'round', breathe);
      ctx.restore();
      ctx.save();
      ctx.scale(0.4, 0.4);
      petalRing(ctx, 4, R, R * 0.6, el, sec, 1.4, 'round', breathe);
      ctx.restore();
      ell(ctx, 0, 0, R * 0.16, R * 0.16, c.center);
      // a little crescent tucked in the petals
      ctx.fillStyle = rgba('#efe6ff', 0.9);
      ctx.beginPath();
      ctx.arc(R * 0.5, -R * 0.55, 5, 0.6, 0.6 + Math.PI * 1.4);
      ctx.arc(R * 0.5 + 2.4, -R * 0.55 - 1.2, 4, 0.6 + Math.PI * 1.4, 0.6, true);
      ctx.fill();
      break;
    }
  }
}

/**
 * Stage III and IV buds. Without an element it is a closed green bud;
 * with one, the element's petals peek out of the sepals.
 */
export function drawBud(ctx: CanvasRenderingContext2D, el: Element | null, t: number, size: number, sepal: string): void {
  const h = size;
  const w = size * 0.58;
  const sway = Math.sin(t * 2.2) * 0.04;
  ctx.save();
  ctx.rotate(sway);
  if (el) {
    const col = FLOWER[el];
    if (el === 'air') {
      // a dandelion bud shows a white tuft at the top
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = -3; k <= 3; k++) {
        ctx.moveTo(0, -h * 0.8);
        ctx.lineTo(k * 2.4, -h * 1.15);
      }
      ctx.stroke();
    } else {
      // petals peeking out, slightly open
      for (const [rot, s] of [[-0.35, 0.95], [0.35, 0.95], [0, 1.05]] as const) {
        ctx.save();
        ctx.rotate(rot);
        shape(ctx, () => teardrop(ctx, h * s, w * 0.42), col.petal, [-w * 0.4, -h * s, w * 0.8, h * s]);
        ctx.restore();
      }
      if (el === 'light') {
        const g = ctx.createRadialGradient(0, -h * 0.6, 1, 0, -h * 0.6, h);
        g.addColorStop(0, 'rgba(255,240,170,.5)');
        g.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = g;
        plainEll(ctx, 0, -h * 0.6, h, h);
        ctx.fill();
      }
    }
  }
  // green bud body with sepals hugging it
  shape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.bezierCurveTo(-w, -h * 0.1, -w * 0.7, -h * 0.7, 0, -h * (el ? 0.62 : 0.95));
    ctx.bezierCurveTo(w * 0.7, -h * 0.7, w, -h * 0.1, 0, 2);
    ctx.closePath();
  }, el ? dark(sepal, 0.05) : light(sepal, 0.05), [-w, -h, w * 2, h]);
  if (!el) {
    // a hint of pink at the tip of the closed bud
    ell(ctx, 0, -h * 0.86, w * 0.2, h * 0.12, '#ffb7c9', { flat: true, rim: false });
  }
  ctx.strokeStyle = rgba(dark(sepal, 0.35), 0.6);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, -h * 0.15);
  ctx.quadraticCurveTo(-w * 0.2, -h * 0.4, -w * 0.05, -h * 0.55);
  ctx.moveTo(w * 0.5, -h * 0.15);
  ctx.quadraticCurveTo(w * 0.2, -h * 0.4, w * 0.05, -h * 0.55);
  ctx.stroke();
  ctx.restore();
}
