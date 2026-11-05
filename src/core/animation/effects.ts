/** Floating text effects (hearts, z's, word bubbles). Owned by the engine, drawn by the renderer. */
export interface Effect {
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  size: number;
  bubble: boolean;
  accent: boolean;
}

export type EffectOptions = Partial<Omit<Effect, 'text' | 'maxLife'>>;

export function makeEffect(text: string, at: { x: number; y: number }, o: EffectOptions = {}): Effect {
  const life = o.life ?? 1.4;
  return {
    text,
    x: o.x ?? at.x,
    y: o.y ?? at.y,
    vx: o.vx ?? 0,
    vy: o.vy ?? -45,
    gravity: o.gravity ?? 0,
    life,
    maxLife: life,
    size: o.size ?? 18,
    bubble: o.bubble ?? false,
    accent: o.accent ?? false,
  };
}

export function stepEffects(list: Effect[], dt: number): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) list.splice(i, 1);
  }
}
