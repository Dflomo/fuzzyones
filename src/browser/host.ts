/**
 * Browser host adapter. Translates the page into a WorldSnapshot and player
 * gestures into Buddy calls.
 *
 * Input safety rules (see docs/ARCHITECTURE.md):
 * - Only observe page events. Never preventDefault outside the buddy's own hit area.
 * - Typing reactions happen after the keystroke; nothing here delays input.
 * - Password and sensitive fields are ignored entirely, and no field values are read.
 * - Page text is reduced to single words, locally, only for approved surfaces.
 */
import type { Buddy } from '../core/buddy';
import type { Surface, SurfaceKind, WorldSnapshot } from '../core/world';

export interface HostOptions {
  /** Which elements count as terrain. The playground marks them with data-surface. */
  surfaceSelector?: string;
  /** Radius (px) around the buddy that accepts dropped words. */
  dropRadius?: number;
}

const SENSITIVE_INPUT = 'input[type=password], input[autocomplete*="cc-"], input[autocomplete="one-time-code"], [data-fuzzy-ignore]';

export class BrowserHost {
  readonly world: WorldSnapshot;
  private ids = new WeakMap<Element, string>();
  private nextId = 1;
  private surfaceEls: Element[] = [];
  private pressed = false;
  private pressStart = { x: 0, y: 0 };
  private lastMoveTime = 0;
  private dragSeenAt = -99;
  private disposers: (() => void)[] = [];
  private readonly selector: string;
  private readonly dropRadius: number;

  constructor(private buddy: Buddy, private clock: () => number, opts: HostOptions = {}) {
    this.selector = opts.surfaceSelector ?? '[data-surface]';
    this.dropRadius = opts.dropRadius ?? 110;
    this.world = {
      width: innerWidth,
      height: innerHeight,
      surfaces: [],
      pointer: { x: -999, y: -999, vx: 0, vy: 0, lastMoveAt: -99, inside: false },
      dragPoint: null,
    };
    this.refreshSurfaceList();
    this.bind();
  }

  /** Re-scan for surface elements (call after page content changes). */
  refreshSurfaceList(): void {
    this.surfaceEls = [...document.querySelectorAll(this.selector)];
  }

  /** Build this frame's snapshot. Only visible elements are measured. */
  snapshot(): WorldSnapshot {
    const w = this.world;
    w.width = innerWidth;
    w.height = innerHeight;
    const out: Surface[] = [];
    for (const el of this.surfaceEls) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.bottom < -80 || r.top > w.height + 80) continue;
      out.push({ id: this.idFor(el), kind: kindOf(el), top: r.top, left: r.left, right: r.right, bottom: r.bottom, words: wordsOf(el) });
    }
    w.surfaces = out;
    if (this.clock() - this.dragSeenAt > 0.5) w.dragPoint = null;
    return w;
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
  }

  private idFor(el: Element): string {
    let id = this.ids.get(el);
    if (!id) {
      id = `s${this.nextId++}`;
      this.ids.set(el, id);
    }
    return id;
  }

  private on<K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions): void {
    addEventListener(type, fn as EventListener, opts);
    this.disposers.push(() => removeEventListener(type, fn as EventListener, opts));
  }

  private bind(): void {
    const b = this.buddy;
    const p = this.world.pointer;

    this.on('pointermove', (e) => {
      const now = this.clock();
      const dt = Math.max(0.008, now - this.lastMoveTime);
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (p.inside) {
        p.vx += (dx / dt - p.vx) * 0.45;
        p.vy += (dy / dt - p.vy) * 0.45;
      }
      p.x = e.clientX;
      p.y = e.clientY;
      p.lastMoveAt = now;
      p.inside = true;
      this.lastMoveTime = now;
      if (this.pressed && !b.c.held && Math.hypot(p.x - this.pressStart.x, p.y - this.pressStart.y) > 6) b.pickUp();
      const over = b.hitTest(p.x, p.y);
      document.documentElement.style.cursor = b.c.held ? 'grabbing' : over ? 'grab' : '';
      if (!b.c.held && !this.pressed && over && e.pointerType === 'mouse') b.rubbed(Math.hypot(dx, dy));
      else if (!over) b.rubStopped();
    }, { passive: true });

    const leave = () => {
      p.inside = false;
    };
    document.addEventListener('pointerleave', leave);
    this.disposers.push(() => document.removeEventListener('pointerleave', leave));

    // Capture phase so we can claim presses on the buddy before the page sees them.
    this.on('pointerdown', (e) => {
      if (e.button !== 0 || !b.hitTest(e.clientX, e.clientY)) return;
      e.preventDefault();
      this.pressed = true;
      this.pressStart = { x: e.clientX, y: e.clientY };
      p.x = e.clientX;
      p.y = e.clientY;
      p.vx = p.vy = 0;
    }, { capture: true });
    this.on('touchstart', (e) => {
      const t = e.touches[0];
      if (t && b.hitTest(t.clientX, t.clientY)) e.preventDefault(); // stop page scroll only when grabbing the buddy
    }, { capture: true, passive: false });
    this.on('pointerup', () => {
      if (b.c.held) b.release(p.vx, p.vy);
      else if (this.pressed) b.poke();
      this.pressed = false;
      document.documentElement.style.cursor = '';
    }, { capture: true });
    this.on('pointercancel', () => {
      if (b.c.held) b.release(p.vx, p.vy);
      this.pressed = false;
    }, { capture: true });

    // Typing escape: observe only.
    const onField = (e: Event) => {
      const el = e.target as Element | null;
      if (!el || !el.matches?.('textarea, input, [contenteditable=""], [contenteditable="true"]') || el.matches(SENSITIVE_INPUT)) return;
      const r = el.getBoundingClientRect();
      const plat = b.c.platformId ? this.surfaceEls.find((s) => this.ids.get(s) === b.c.platformId) : undefined;
      b.inputActivity({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }, !!plat && plat.contains(el));
    };
    document.addEventListener('focusin', onField);
    document.addEventListener('input', onField);
    this.disposers.push(() => {
      document.removeEventListener('focusin', onField);
      document.removeEventListener('input', onField);
    });

    // Word feeding via native drag and drop (pantry chips or any selected text).
    const near = (x: number, y: number) => b.hitTest(x, y, this.dropRadius / b.c.species.radius);
    const dragover = (e: DragEvent) => {
      this.world.dragPoint = { x: e.clientX, y: e.clientY };
      this.dragSeenAt = this.clock();
      if (near(e.clientX, e.clientY) && e.dataTransfer) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    };
    const drop = (e: DragEvent) => {
      if (near(e.clientX, e.clientY)) {
        e.preventDefault();
        b.feed(e.dataTransfer?.getData('text/plain') ?? '');
      }
      this.world.dragPoint = null;
    };
    const dragend = () => {
      this.world.dragPoint = null;
    };
    document.addEventListener('dragover', dragover);
    document.addEventListener('drop', drop);
    document.addEventListener('dragend', dragend);
    this.disposers.push(() => {
      document.removeEventListener('dragover', dragover);
      document.removeEventListener('drop', drop);
      document.removeEventListener('dragend', dragend);
    });
  }
}

function kindOf(el: Element): SurfaceKind {
  const k = (el as HTMLElement).dataset?.surface;
  if (k === 'heading' || k === 'image' || k === 'input' || k === 'text') return k;
  if (/^H[1-6]$/.test(el.tagName)) return 'heading';
  if (el.tagName === 'IMG' || el.tagName === 'PICTURE') return 'image';
  return 'other';
}

const wordCache = new WeakMap<Element, string[]>();
function wordsOf(el: Element): string[] {
  let w = wordCache.get(el);
  if (w) return w;
  const explicit = (el as HTMLElement).dataset?.word;
  if (explicit) w = explicit.split(',').map((s) => s.trim()).filter(Boolean);
  else if (kindOf(el) === 'input') w = []; // never read anything near form fields
  else w = (el.textContent?.match(/[A-Za-z]{4,}/g) ?? []).slice(0, 40);
  wordCache.set(el, w);
  return w;
}
