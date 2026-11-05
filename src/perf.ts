/**
 * Surface discovery benchmark: a long, realistic article page, the real-page
 * selector, inspection on, and a scroll from top to bottom. Measures
 * BrowserHost.snapshot() per frame (page measurement), with the creature
 * engine's update timed separately. Scrolls 40 px per frame (2400 px/s, a
 * brisk flick) from the middle of the page.
 * Run in a browser at /perf.html, or headless with scripts/perf-surfaces.mjs.
 */
import { BrowserHost, REAL_PAGE_SELECTOR } from './browser/host';
import { Buddy } from './core/buddy';

const params = new URLSearchParams(location.search);
const sections = Number(params.get('sections') ?? 60);
const words = 'orchard honey thunder moss ember river lantern whisper garden meadow riddle feather pebble shadow sunbeam clover'.split(' ');
const para = (i: number) => Array.from({ length: 70 }, (_, k) => words[(i * 7 + k * 3) % words.length]).join(' ') + '.';

const article = document.getElementById('article')!;
const parts: string[] = [];
for (let i = 0; i < sections; i++) {
  parts.push(`<h2>Section ${i + 1}: ${words[i % words.length]} notes</h2>`);
  for (let p = 0; p < 4; p++) parts.push(`<p>${para(i * 4 + p)}</p>`);
  if (i % 2 === 0) parts.push(`<figure><img alt=""><figcaption>Figure ${i + 1}</figcaption></figure>`);
  if (i % 3 === 0) parts.push(`<blockquote>${para(i)}</blockquote>`);
  if (i % 5 === 0) parts.push(`<h3>Aside</h3><pre>const x = ${i};</pre>`);
  if (i % 7 === 0) parts.push(`<form><label>Comment <textarea>private draft</textarea></label><input type="password"></form>`);
  if (i % 9 === 0) parts.push(`<table><tr><td>${words[i % words.length]}</td><td>${i}</td></tr></table>`);
}
article.innerHTML = parts.join('\n');

const buddy = new Buddy();
let sim = 0;
const inspect = params.get('inspect') !== '0';
const host = new BrowserHost(buddy, () => sim, { surfaceSelector: REAL_PAGE_SELECTOR, inspectText: inspect });

const total = document.querySelectorAll(REAL_PAGE_SELECTOR).length;
const frames: number[] = [];
const engine: number[] = [];
const start = Math.max(0, (document.documentElement.scrollHeight - innerHeight) / 2 - 12000);
const N = 600;
let i = 0;
let visibleSum = 0;

function frame(): void {
  scrollTo(0, start + i * 40);
  sim += 1 / 60;
  const t0 = performance.now();
  const w = host.snapshot();
  const t1 = performance.now();
  buddy.update(w, 1 / 60);
  frames.push(t1 - t0);
  engine.push(performance.now() - t1);
  visibleSum += w.surfaces.length;
  if (++i <= N) requestAnimationFrame(frame);
  else finish();
}

function finish(): void {
  const first = frames[0];
  const rest = frames.slice(1).sort((a, b) => a - b);
  const q = (p: number) => rest[Math.min(rest.length - 1, Math.floor(rest.length * p))];
  const over = rest.filter((x) => x > 1).length;
  const result = {
    inspect,
    surfacesOnPage: total,
    avgVisible: Math.round(visibleSum / frames.length),
    firstFrameMs: +first.toFixed(3),
    medianMs: +q(0.5).toFixed(3),
    p95Ms: +q(0.95).toFixed(3),
    maxMs: +rest[rest.length - 1].toFixed(3),
    engineMedianMs: +[...engine].sort((a, b) => a - b)[engine.length >> 1].toFixed(3),
    framesOver1ms: over,
    frames: frames.length,
  };
  (window as unknown as { __perf: unknown }).__perf = result;
  document.getElementById('result')!.textContent = Object.entries(result).map(([k, v]) => `${k}: ${v}`).join('\n');
}

// let the IntersectionObserver deliver its first batch before timing
scrollTo(0, start);
requestAnimationFrame(() => requestAnimationFrame(frame));
