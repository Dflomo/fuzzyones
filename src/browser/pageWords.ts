/**
 * Reading words off the page, safely.
 *
 * Rules:
 * - Off unless the host turns inspection on for this site.
 * - Never read inside form fields, editable regions, forms, scripts or
 *   anything marked data-fuzzy-ignore, including when they are nested inside
 *   an otherwise readable surface.
 * - Only short single words are kept, capped per surface, and the result is
 *   cached until that part of the page changes.
 */

/** Subtrees whose text is never read. */
export const EXCLUDED_SUBTREES = [
  'input',
  'textarea',
  'select',
  'option',
  'form',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="textbox"]',
  'script',
  'style',
  'noscript',
  'template',
  '[data-fuzzy-ignore]',
].join(', ');

export const MAX_WORDS = 40;
/** Stop scanning a surface after this many characters, so long articles stay cheap. */
export const MAX_CHARS = 4000;

const WORD = /[A-Za-z]{4,}/g;

/** Words a buddy may notice on one surface. Pure DOM read, no caching. */
export function extractWords(el: Element): string[] {
  if (el.closest(EXCLUDED_SUBTREES)) return [];
  const explicit = (el as HTMLElement).dataset?.word;
  if (explicit) return explicit.split(',').map((s) => s.trim()).filter(Boolean).slice(0, MAX_WORDS);
  const doc = el.ownerDocument;
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      return parent && parent !== el && parent.closest(EXCLUDED_SUBTREES) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const out: string[] = [];
  let chars = 0;
  for (let n = walker.nextNode(); n && out.length < MAX_WORDS && chars < MAX_CHARS; n = walker.nextNode()) {
    const text = n.nodeValue ?? '';
    chars += text.length;
    for (const m of text.match(WORD) ?? []) {
      out.push(m);
      if (out.length >= MAX_WORDS) break;
    }
  }
  return out;
}

/**
 * Per-host word cache. A MutationObserver drops the cached words of any
 * surface whose text, children or relevant attributes change.
 */
export class SurfaceWords {
  private cache = new WeakMap<Element, string[]>();
  private observer: MutationObserver | null = null;
  /** Set when elements were added or removed, so the host can re-scan surfaces. */
  structureChanged = false;

  constructor(root: Node | null) {
    if (!root || typeof MutationObserver === 'undefined') return;
    this.observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'childList' && (r.addedNodes.length || r.removedNodes.length)) this.structureChanged = true;
        this.invalidateFrom(r.target);
      }
    });
    this.observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-word', 'contenteditable', 'data-fuzzy-ignore', 'role'],
    });
  }

  get(el: Element): string[] {
    let w = this.cache.get(el);
    if (!w) {
      w = extractWords(el);
      this.cache.set(el, w);
    }
    return w;
  }

  /** Drop cached words for the changed node and every ancestor surface. */
  invalidateFrom(node: Node | null): void {
    for (let n: Node | null = node; n; n = n.parentNode) {
      if (n.nodeType === 1) this.cache.delete(n as Element);
    }
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
