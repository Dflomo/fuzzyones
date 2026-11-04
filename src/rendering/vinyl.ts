/**
 * Squishy vinyl finish: a glossy gradient, a soft bounce light along the
 * bottom, a big specular highlight and a faint darker rim. Every shape on a
 * creature goes through here so the whole cast shares one material.
 */

export type Box = [x: number, y: number, w: number, h: number];

export interface VinylOpts {
  alpha?: number;
  /** Skip the specular highlight (small details, faces). */
  flat?: boolean;
  rim?: boolean;
}

const TAU = Math.PI * 2;

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(c(pa, s) + (c(pb, s) - c(pa, s)) * t);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}
export const light = (c: string, t: number) => mix(c, '#ffffff', t);
export const dark = (c: string, t: number) => mix(c, '#000000', t);
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function shape(ctx: CanvasRenderingContext2D, build: () => void, color: string, box: Box, o: VinylOpts = {}): void {
  const [x, y, w, h] = box;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  const g = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
  g.addColorStop(0, light(color, 0.28));
  g.addColorStop(0.55, color);
  g.addColorStop(1, dark(color, 0.24));
  build();
  ctx.fillStyle = g;
  ctx.fill();
  if (w > 10 && !o.flat) {
    ctx.save();
    build();
    ctx.clip();
    const b = ctx.createRadialGradient(x + w * 0.5, y + h * 1.15, h * 0.1, x + w * 0.5, y + h * 1.15, h * 0.7);
    b.addColorStop(0, 'rgba(255,255,255,.32)');
    b.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = b;
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    const s = ctx.createRadialGradient(x + w * 0.32, y + h * 0.22, 0.5, x + w * 0.32, y + h * 0.22, Math.max(w, h) * 0.3);
    s.addColorStop(0, 'rgba(255,255,255,.85)');
    s.addColorStop(0.35, 'rgba(255,255,255,.32)');
    s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s;
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.restore();
  }
  if (o.rim !== false) {
    build();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = dark(color, 0.35);
    ctx.globalAlpha *= 0.5;
    ctx.stroke();
  }
  ctx.restore();
}

export function ell(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, o: VinylOpts & { rot?: number } = {}): void {
  rx = Math.max(0.1, rx);
  ry = Math.max(0.1, ry);
  shape(
    ctx,
    () => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, o.rot ?? 0, 0, TAU);
    },
    color,
    [cx - rx, cy - ry, rx * 2, ry * 2],
    o,
  );
}

/** A stroked strand with a darker edge (antennae, stems, wires). */
export function strand(ctx: CanvasRenderingContext2D, build: () => void, w: number, color: string, edge = dark(color, 0.28)): void {
  ctx.save();
  build();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = w + 2;
  ctx.strokeStyle = edge;
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
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

export function plainEll(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

/** Small deterministic noise so procedural details (wires, spots) stay put frame to frame. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
