/**
 * Browser host adapter. Translates the page into a WorldSnapshot and player
 * gestures into Buddy calls.
 *
 * Input safety rules (see docs/ARCHITECTURE.md):
 * - Only observe page events. Never preventDefault outside the buddy's own hit area.
 * - Typing reactions happen after the keystroke; nothing here delays input.
 * - Password and sensitive fields are ignored entirely, and no field values are read.
 * - Page text is read only when inspection is on for the site (off by default),
 *   never inside fields, editable regions or forms, and reduced to single words locally.
 * - The site's own cursor styling is saved and restored, never overwritten.
 */
import type { Buddy } from '../core/buddy';
import type { Surface, SurfaceKind, WorldSnapshot } from '../core/world';
import { SurfaceWords } from './pageWords';

export interface HostOptions {
  /** Which elements count as terrain. The playground marks them with data-surface. */
  surfaceSelector?: string;
  /** Radius (px) around the buddy that accepts dropped words. */
  dropRadius?: number;
  /**
   * Let the buddy read words off this page. Off by default: the extension
   * turns it on per site from the user's allow list. The playground is our own
   * page, so it opts in.
   */
  inspectText?: boolean;
}

/** Surfaces on arbitrary pages (used once the extension runs on real sites). */
export const REAL_PAGE_SELECTOR = 'h1, h2, h3, h4, img, figure, blockquote, pre, table, [data-surface]';

const SENSITIVE_INPUT = 'input[type=password], input[autocomplete*="cc-"], input[autocomplete="one-time-code"], [data-fuzzy-ignore]';

export class BrowserHost {
  readonly world: WorldSnapshot;
  private ids = new WeakMap<Element, string>();
  private nextId = 1;
  private surfaceEls: Element[] = [];
  /** Surfaces near the viewport, kept up to date by an IntersectionObserver. */
  private nearby = new Set<Element>();
  private io: IntersectionObserver | null = null;
  private pressed = false;
  private pressStart = { x: 0, y: 0 };
  private lastMoveTime = 0;
  private dragSeenAt = -99;
  private disposers: (() => void)[] = [];
  private readonly selector: string;
  private readonly dropRadius: number;
  private readonly inspect: boolean;
  private readonly words: SurfaceWords;
  private lastRescan = 0;
  /** The page's own inline cursor, saved while we show grab cursors. */
  private savedCursor: string | null = null;
  private cursorShown: '' | 'grab' | 'grabbing' = '';

  constructor(private buddy: Buddy, private clock: () => number, opts: HostOptions = {}) {
    this.selector = opts.surfaceSelector ?? '[data-surface]';
    this.dropRadius = opts.dropRadius ?? 110;
    this.inspect = opts.inspectText ?? false;
    this.words = new SurfaceWords(document.body);
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
    if (typeof IntersectionObserver === 'undefined') return;
    // Only surfaces within a margin of the viewport are measured each frame,
    // so cost tracks what is on screen rather than the length of the page.
    this.io?.disconnect();
    this.nearby.clear();
    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) this.nearby.add(e.target);
          else this.nearby.delete(e.target);
        }
      },
      { rootMargin: '200px 0px' },
    );
    for (const el of this.surfaceEls) this.io.observe(el);
  }

  /** Build this frame's snapshot. Only visible elements are measured. */
  snapshot(): WorldSnapshot {
    const w = this.world;
    w.width = innerWidth;
    w.height = innerHeight;
    // Elements were added or removed: re-scan, at most twice a second.
    const now = this.clock();
    if (this.words.structureChanged && now - this.lastRescan > 0.5) {
      this.words.structureChanged = false;
      this.lastRescan = now;
      this.refreshSurfaceList();
    }
    const out: Surface[] = [];
    let candidates: Iterable<Element> = this.surfaceEls;
    if (this.io) {
      // Always measure the platform the buddy stands on, even if the observer
      // has not caught up with a fast scroll yet.
      const plat = this.buddy.c.platformId ? this.surfaceEls.find((e) => this.ids.get(e) === this.buddy.c.platformId) : undefined;
      candidates = plat && !this.nearby.has(plat) ? [...this.nearby, plat] : this.nearby;
    }
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.bottom < -80 || r.top > w.height + 80) continue;
      const kind = kindOf(el);
      // Never read anything around form fields, and nothing at all unless inspection is on.
      const words = this.inspect && kind !== 'input' ? this.words.get(el) : [];
      out.push({ id: this.idFor(el), kind, top: r.top, left: r.left, right: r.right, bottom: r.bottom, words });
    }
    w.surfaces = out;
    if (this.clock() - this.dragSeenAt > 0.5) w.dragPoint = null;
    return w;
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
    this.words.dispose();
    this.io?.disconnect();
    this.setCursor('');
  }

  /** Show a grab cursor over the buddy without clobbering the site's own cursor style. */
  private setCursor(want: '' | 'grab' | 'grabbing'): void {
    if (want === this.cursorShown) return;
    const style = document.documentElement.style;
    if (want && this.savedCursor === null) this.savedCursor = style.cursor;
    if (want) style.cursor = want;
    else if (this.savedCursor !== null) {
      style.cursor = this.savedCursor;
      this.savedCursor = null;
    }
    this.cursorShown = want;
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
      this.setCursor(b.c.held ? 'grabbing' : over ? 'grab' : '');
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
      this.setCursor('');
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

export function kindOf(el: Element): SurfaceKind {
  const k = (el as HTMLElement).dataset?.surface;
  if (k === 'heading' || k === 'image' || k === 'input' || k === 'text') return k;
  if (/^H[1-6]$/.test(el.tagName)) return 'heading';
  if (el.tagName === 'IMG' || el.tagName === 'PICTURE') return 'image';
  return 'other';
}
