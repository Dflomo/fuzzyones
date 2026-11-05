/** Playground "creature inspector" panel: growth, moods, decision scores, discoveries, event stream. */
import type { Buddy } from '../core/buddy';
import { ELEMENT_STYLE, ELEMENTS } from '../core/evolution/elements';
import type { GrowthStatus } from '../core/evolution/progression';
import { DISCOVERIES } from '../core/events/discoveries';
import type { BuddyEvent } from '../core/events/events';

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

function bars(rows: [string, number][], max = 1, decimals = 2): string {
  return rows
    .map(
      ([k, v]) =>
        `<div class="bar"><span>${esc(k)}</span><div class="track"><div class="fill" style="width:${Math.max(0, Math.min(1, v / max)) * 100}%"></div></div><span class="num">${v.toFixed(decimals)}</span></div>`,
    )
    .join('');
}

function formatPayload(e: BuddyEvent): string {
  return Object.entries(e.data)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
}

export class Inspector {
  private log: BuddyEvent[] = [];
  private el = (id: string) => document.getElementById(id)!;

  constructor(private buddy: Buddy) {
    buddy.bus.on((e) => this.onEvent(e));
    this.renderFound();
    this.el('why').innerHTML = '<span class="small">Waiting for the first decision.</span>';
  }

  /** Called a few times per second. */
  tick(): void {
    const m = this.buddy.c.mood;
    this.el('moods').innerHTML = bars([
      ['Energy', m.energy],
      ['Curiosity', m.curiosity],
      ['Playful', m.playfulness],
      ['Comfort', m.comfort],
    ]);
    this.el('doing').innerHTML = `${esc(this.buddy.activityLabel)} <span>· ${this.buddy.activityIsInterrupt ? 'interrupt' : 'chosen by mood'}</span>`;
    const top = this.buddy.lastScores.slice(0, 3);
    if (top.length) this.el('why').innerHTML = bars(top.map((s) => [this.buddy.behaviorLabel(s.id).split(' ')[0], Math.max(0, s.score)]), 1.2);
  }

  renderGrowth(g: GrowthStatus): void {
    this.el('gname').textContent = g.name;
    this.el('glabel').textContent = g.label;
    this.el('bname').textContent = g.name;
    const pct = g.need ? Math.min(100, (g.growth / g.need) * 100) : 100;
    (this.el('gbar') as HTMLElement).style.width = `${pct}%`;
    this.el('gtrack').setAttribute('aria-valuenow', String(Math.round(pct)));
    this.el('ghint').textContent = g.hint ?? (g.need ? `${Math.round(pct)}% to Stage ${['', 'II', 'III', 'IV', 'V'][g.form.stage]}` : '');
    const max = Math.max(3, ...ELEMENTS.map((e) => g.elements[e]));
    this.el('elements').innerHTML = ELEMENTS.map((e) => {
      const st = ELEMENT_STYLE[e];
      const v = g.elements[e];
      const mark = g.form.element === e ? ' ★' : g.form.secondary === e ? ' ☆' : '';
      return `<div class="bar"><span>${st.name}${mark}</span><div class="track"><div class="fill" style="width:${(v / max) * 100}%;background:${st.deep}"></div></div><span class="num">${v}</span></div>`;
    }).join('');
  }

  renderFound(): void {
    const found = this.buddy.discovered;
    this.el('found').innerHTML = Object.entries(DISCOVERIES)
      .map(([k, v]) => `<span class="${found.has(k) ? 'on' : ''}">${found.has(k) ? esc(v) : '???'}</span>`)
      .join('');
    this.el('dcount').textContent = `· ${found.size}/${Object.keys(DISCOVERIES).length}`;
  }

  toast(msg: string): void {
    const t = this.el('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout((t as unknown as { _h: number })._h);
    (t as unknown as { _h: number })._h = window.setTimeout(() => t.classList.remove('show'), 2200);
  }

  private onEvent(e: BuddyEvent): void {
    this.log.unshift(e);
    if (this.log.length > 30) this.log.pop();
    const clock = new Date().toTimeString().slice(0, 8);
    (e as BuddyEvent & { clock?: string }).clock = clock;
    this.el('log').innerHTML = this.log
      .map((x) => `<div><i>${(x as BuddyEvent & { clock?: string }).clock}</i> <b>${x.type}</b> ${esc(formatPayload(x))}</div>`)
      .join('');
    if (e.type === 'new_behavior_discovered') {
      this.toast(`Discovered: ${e.data.label}`);
      this.renderFound();
    }
    if (e.type === 'buddy_evolved') this.toast(`Evolved into ${e.data.form}!`);
  }
}
