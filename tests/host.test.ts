// @vitest-environment jsdom
import { BrowserHost } from '../src/browser/host';
import { extractWords, SurfaceWords } from '../src/browser/pageWords';
import { Buddy } from '../src/core/buddy';
import { createRng } from '../src/core/random';

const tick = () => new Promise((r) => setTimeout(r, 0));

/** jsdom has no layout, so give every surface a visible box. */
function fakeLayout(): () => void {
  const orig = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    return { top: 100, left: 10, right: 400, bottom: 140, width: 390, height: 40, x: 10, y: 100, toJSON() {} } as DOMRect;
  };
  return () => {
    Element.prototype.getBoundingClientRect = orig;
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.style.cursor = '';
});

describe('extractWords', () => {
  it('reads plain words from a surface', () => {
    document.body.innerHTML = '<section data-surface="text"><h2>Orchard notes</h2><p>Honey on the windowsill</p></section>';
    expect(extractWords(document.querySelector('section')!)).toEqual(['Orchard', 'notes', 'Honey', 'windowsill']);
  });

  it('skips nested fields, editable regions, forms and ignored content', () => {
    document.body.innerHTML = `
      <section data-surface="text">
        <p>Visible meadow</p>
        <textarea>secretdraft</textarea>
        <div contenteditable="true">privatenote</div>
        <div role="textbox">composing</div>
        <form><label>Password hint <input type="password" value="hunter"></label></form>
        <select><option>optionword</option></select>
        <span data-fuzzy-ignore>ignoredword</span>
        <script>scriptword()</script>
        <div contenteditable="false">readable</div>
      </section>`;
    const words = extractWords(document.querySelector('section')!);
    expect(words).toEqual(['Visible', 'meadow', 'readable']);
  });

  it('reads nothing when the surface itself sits inside an editable region', () => {
    document.body.innerHTML = '<div contenteditable="true"><h2 data-surface="heading">Draft title here</h2></div>';
    expect(extractWords(document.querySelector('h2')!)).toEqual([]);
  });

  it('caps how much it reads', () => {
    document.body.innerHTML = `<p data-surface="text">${'word '.repeat(500)}</p>`;
    expect(extractWords(document.querySelector('p')!).length).toBe(40);
  });
});

describe('SurfaceWords cache', () => {
  it('refreshes words when the page text changes', async () => {
    document.body.innerHTML = '<p data-surface="text">Moss grows</p>';
    const p = document.querySelector('p')!;
    const cache = new SurfaceWords(document.body);
    expect(cache.get(p)).toEqual(['Moss', 'grows']);
    p.textContent = 'Thunder rolls';
    await tick();
    expect(cache.get(p)).toEqual(['Thunder', 'rolls']);
    cache.dispose();
  });

  it('refreshes when a word attribute changes and flags structure changes', async () => {
    document.body.innerHTML = '<div data-surface="image" data-word="moss"></div>';
    const d = document.querySelector('div')!;
    const cache = new SurfaceWords(document.body);
    expect(cache.get(d)).toEqual(['moss']);
    d.dataset.word = 'ember';
    d.appendChild(document.createElement('span'));
    await tick();
    expect(cache.get(d)).toEqual(['ember']);
    expect(cache.structureChanged).toBe(true);
    cache.dispose();
  });
});

describe('BrowserHost', () => {
  const make = (inspectText?: boolean) => {
    const buddy = new Buddy({ rng: createRng(1) });
    const host = new BrowserHost(buddy, () => 0, { inspectText });
    return { buddy, host };
  };

  it('keeps page inspection off by default', () => {
    const restore = fakeLayout();
    document.body.innerHTML = '<h2 data-surface="heading">Readable words here</h2>';
    const { host } = make();
    const s = host.snapshot().surfaces;
    expect(s).toHaveLength(1);
    expect(s[0].words).toEqual([]);
    host.dispose();
    restore();
  });

  it('reads words only when inspection is on, and never around inputs', () => {
    const restore = fakeLayout();
    document.body.innerHTML = '<h2 data-surface="heading">Readable words here</h2><div data-surface="input"><label>Note label</label><textarea>typed</textarea></div>';
    const { host } = make(true);
    const [h, field] = host.snapshot().surfaces;
    expect(h.words).toEqual(['Readable', 'words', 'here']);
    expect(field.words).toEqual([]);
    host.dispose();
    restore();
  });

  it('picks up surfaces added later', async () => {
    const restore = fakeLayout();
    document.body.innerHTML = '<h2 data-surface="heading">First</h2>';
    const buddy = new Buddy({ rng: createRng(1) });
    let now = 0;
    const host = new BrowserHost(buddy, () => now);
    expect(host.snapshot().surfaces).toHaveLength(1);
    const h = document.createElement('h2');
    h.dataset.surface = 'heading';
    document.body.appendChild(h);
    await tick();
    now = 1;
    expect(host.snapshot().surfaces).toHaveLength(2);
    host.dispose();
    restore();
  });

  it("restores the site's own cursor after hovering the buddy", () => {
    document.documentElement.style.cursor = 'crosshair';
    const { buddy, host } = make();
    buddy.c.x = 50;
    buddy.c.y = 50;
    const move = (x: number, y: number) => window.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: x, clientY: y, pointerType: 'mouse' }));
    move(50, 50);
    expect(document.documentElement.style.cursor).toBe('grab');
    move(500, 500);
    expect(document.documentElement.style.cursor).toBe('crosshair');
    move(50, 50);
    host.dispose();
    expect(document.documentElement.style.cursor).toBe('crosshair');
  });

  it('leaves the cursor alone when the pointer never touches the buddy', () => {
    document.documentElement.style.cursor = 'help';
    const { host } = make();
    window.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 900, clientY: 900, pointerType: 'mouse' }));
    window.dispatchEvent(new Event('pointerup'));
    expect(document.documentElement.style.cursor).toBe('help');
    host.dispose();
  });
});
