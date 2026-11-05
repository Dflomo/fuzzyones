/** Sim-time scheduler for short choreography (crouch, then launch; chew, then react). */
export class Scheduler {
  private items: { at: number; fn: () => void }[] = [];

  after(now: number, seconds: number, fn: () => void): void {
    this.items.push({ at: now + seconds, fn });
  }

  run(now: number): void {
    const due = this.items.filter((i) => i.at <= now);
    if (!due.length) return;
    this.items = this.items.filter((i) => i.at > now);
    for (const d of due) d.fn();
  }

  get pending(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}
