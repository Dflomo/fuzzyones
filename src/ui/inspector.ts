/** Playground "creature inspector" panel: moods, decision scores, discoveries, affinities, event stream. */
import type { Buddy } from '../core/buddy';
import { AFFINITIES } from '../core/creature/affinity';
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

  constructor(private buddy: Buddy, private affinities: Record<string, number>) {
    buddy.bus.on((e) => this.onEvent(e));
    this.renderFound();
    this.renderAffinities();
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

  renderAffinities(): void {
    const rows = AFFINITIES.map((a) => [a[0].toUpperCase() + a.slice(1), this.affinities[a] ?? 0] as [string, number]);
    const max = Math.max(3, ...rows.map((r) => r[1]));
    this.el('aff').innerHTML = bars(rows, max, 0);
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
    if (e.type === 'word_eaten') this.renderAffinities();
  }
}
