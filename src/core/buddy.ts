/**
 * The Buddy engine: one creature living in a WorldSnapshot.
 *
 * Host adapters feed it a world each frame and forward player intent
 * (poke, pick up, feed, typing nearby). It owns all creature logic and never
 * touches the DOM, so the same engine can later run on the desktop or in the
 * sanctuary.
 */
import { makeEffect, stepEffects, type Effect, type EffectOptions } from './animation/effects';
import { silentAudio, type AudioPort, type SoundCue } from './audio/cues';
import { BEHAVIORS, behaviorById } from './behavior/library';
import { pushRecent, scoreBehaviors, type ScoredBehavior } from './behavior/selector';
import type { Behavior, BuddyContext, CompanionMode } from './behavior/types';
import { classifyWord, isBigBite, isStormy, type Affinity } from './creature/affinity';
import { createCreature, PUFF, type CreatureState, type Expression, type Mood, type Species } from './creature/state';
import { DISCOVERIES, type DiscoveryKey } from './events/discoveries';
import { EventBus, type BuddyEventType, type EventPayload } from './events/events';
import { findLanding, GRAVITY, launch, stepSprings } from './physics/physics';
import { clamp, createRng, sign, type Rng } from './random';
import { Scheduler } from './scheduler';
import { emptyWorld, floorSurface, type Surface, type WorldSnapshot } from './world';

export interface BuddyOptions {
  species?: Species;
  audio?: AudioPort;
  rng?: Rng;
  mode?: CompanionMode;
  /** Discoveries already made (from persistence). */
  discovered?: Iterable<string>;
  spawnX?: number;
}

type Activity =
  | { kind: 'behavior'; behavior: Behavior<any>; t: number; d: any }
  | { kind: 'reaction'; label: string; t: number; dur: number; waitGround: boolean; update?: (t: number, dt: number) => void }
  | { kind: 'held' };

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export class Buddy implements BuddyContext {
  readonly c: CreatureState;
  readonly bus = new EventBus();
  readonly effects: Effect[] = [];
  readonly discovered: Set<string>;
  readonly rng: Rng;
  world: WorldSnapshot = emptyWorld();
  now = 0;
  mode: CompanionMode;
  lastScores: ScoredBehavior[] = [];

  private audio: AudioPort;
  private scheduler = new Scheduler();
  private activity: Activity | null = null;
  private recent: string[] = [];
  private pokes: number[] = [];
  private rub = 0;
  private petCooldown = 0;
  private startleCooldown = 0;
  private escapeCooldown = 0;

  constructor(opts: BuddyOptions = {}) {
    this.c = createCreature(opts.species ?? PUFF, opts.spawnX ?? 240);
    this.audio = opts.audio ?? silentAudio;
    this.rng = opts.rng ?? createRng();
    this.mode = opts.mode ?? 'dynamic';
    this.discovered = new Set(opts.discovered ?? []);
    this.react('Arriving', 0.2, { waitGround: true });
  }

  // ---------- BuddyContext ----------
  surface(id: string | null): Surface | undefined {
    if (id === null) return floorSurface(this.world);
    return this.world.surfaces.find((s) => s.id === id);
  }
  currentSurface(): Surface {
    return this.surface(this.c.platformId) ?? floorSurface(this.world);
  }
  cursorRecent(seconds: number): boolean {
    const p = this.world.pointer;
    return p.inside && this.now - p.lastMoveAt < seconds;
  }
  setExpr(e: Expression, seconds: number): void {
    this.c.expr = e;
    this.c.exprUntil = this.now + seconds;
  }
  sound(cue: SoundCue, intensity?: number): void {
    this.audio.play(cue, intensity);
  }
  effect(text: string, o: EffectOptions = {}): void {
    const r = this.c.species.radius;
    this.effects.push(
      makeEffect(text, { x: this.c.x + this.rng.range(-10, 10), y: this.c.y - r - 6 }, { vx: this.rng.range(-20, 20), ...o }),
    );
  }
  emit(type: BuddyEventType, data: EventPayload = {}): void {
    this.bus.emit(type, this.now, data);
  }
  discover(key: DiscoveryKey): void {
    if (this.discovered.has(key)) return;
    this.discovered.add(key);
    this.emit('new_behavior_discovered', { key, label: DISCOVERIES[key] });
  }
  after(seconds: number, fn: () => void): void {
    this.scheduler.after(this.now, seconds, fn);
  }
  crouchThen(fn: () => void, seconds = 0.2): void {
    const c = this.c;
    c.restSy = 0.72;
    c.restSx = 1.2;
    this.after(seconds, () => {
      c.restSy = c.restSx = 1;
      c.sy = 1.25;
      c.sx = 0.85;
      fn();
    });
  }
  launch(vx: number, vy: number): void {
    launch(this.c, vx, vy);
  }
  adjustMood(key: keyof Mood, delta: number): void {
    this.c.mood[key] = clamp(this.c.mood[key] + delta, 0, 1);
  }
  wake(): void {
    if (this.c.asleep) {
      this.c.asleep = false;
      this.c.restSx = this.c.restSy = 1;
    }
  }
  startBehavior(id: string): void {
    const b = behaviorById(id);
    if (!b) return;
    this.endBehavior();
    const d = {};
    this.activity = { kind: 'behavior', behavior: b, t: 0, d };
    pushRecent(this.recent, id);
    b.start(this, d);
  }

  // ---------- read-outs for hosts ----------
  get activityLabel(): string {
    const a = this.activity;
    if (!a) return 'Deciding';
    if (a.kind === 'held') return 'Being carried';
    if (a.kind === 'reaction') return a.label;
    return a.behavior.label;
  }
  get activityIsInterrupt(): boolean {
    return !!this.activity && this.activity.kind !== 'behavior';
  }
  behaviorLabel(id: string): string {
    return behaviorById(id)?.label ?? id;
  }
  hitTest(x: number, y: number, slack = 1.15): boolean {
    return !this.c.hidden && Math.hypot(x - this.c.x, y - this.c.y) < this.c.species.radius * slack;
  }

  // ---------- player intent ----------
  poke(): void {
    const c = this.c;
    c.sy = 0.68;
    c.sx = 1.28;
    this.pokes = this.pokes.filter((p) => this.now - p < 3);
    this.pokes.push(this.now);
    this.emit('buddy_poked', { streak: this.pokes.length });
    this.discover('poke');
    if (c.asleep) {
      this.wake();
      this.setExpr('angry', 1.8);
      this.sound('angry');
      this.effect('!', { accent: true });
      this.discover('wake_grumpy');
      this.adjustMood('comfort', -0.15);
      if (c.grounded) this.launch(this.rng.range(-60, 60), -380);
      this.react('Rudely awakened', 1.6);
      return;
    }
    if (this.pokes.length >= 4) {
      this.setExpr('angry', 1.6);
      this.sound('angry');
      this.effect('#!', { accent: true });
      this.adjustMood('comfort', -0.1);
      this.react('Grumbling', 1.5);
    } else {
      this.setExpr('surprised', 0.7);
      this.sound('squeak');
      this.adjustMood('playfulness', 0.06);
      if (c.grounded && this.rng.chance(0.4)) this.launch(this.rng.range(-80, 80), -300);
      this.react('Poked', 0.8);
    }
  }

  /** Cursor rubbing over the buddy without pressing. Pass the distance moved. */
  rubbed(distance: number): void {
    this.rub += distance;
    if (this.rub > 170 && this.now > this.petCooldown) {
      this.rub = 0;
      this.petCooldown = this.now + 2.4;
      this.pet();
    }
  }
  rubStopped(): void {
    this.rub = Math.max(0, this.rub - 4);
  }

  pet(): void {
    const c = this.c;
    this.wake();
    this.setExpr('happy', 2.2);
    this.sound('purr');
    for (let i = 0; i < 3; i++) this.after(i * 0.25, () => this.effect('♥', { accent: true, size: 16 }));
    this.adjustMood('comfort', 0.22);
    c.restSy = 0.9;
    c.restSx = 1.08;
    this.after(1.4, () => {
      c.restSy = c.restSx = 1;
    });
    this.emit('buddy_petted', { comfort: +c.mood.comfort.toFixed(2) });
    this.discover('pet');
    this.react('Enjoying pets', 1.6);
  }

  pickUp(): void {
    const c = this.c;
    this.wake();
    this.endBehavior();
    Object.assign(c, { held: true, hang: null, leap: null, flipT: null, grounded: false, platformId: null, walkTo: null, restSy: 1.2, restSx: 0.86 });
    this.setExpr('surprised', 99);
    this.sound('chirp');
    this.emit('buddy_picked_up');
    this.discover('pickup');
    this.activity = { kind: 'held' };
  }

  release(vx: number, vy: number): void {
    const c = this.c;
    c.held = false;
    c.restSy = c.restSx = 1;
    c.vx = clamp(vx * 0.85, -1700, 1700);
    c.vy = clamp(vy * 0.85, -1700, 1700);
    c.vrot = c.vx * 0.006;
    const speed = Math.hypot(c.vx, c.vy);
    if (speed > 1000) {
      c.tumble = true;
      this.setExpr('panic', 99);
      this.sound('startle');
      this.emit('buddy_tossed', { speed: Math.round(speed) });
      this.discover('toss');
      this.effect('wheee', { size: 14, bubble: true });
    } else this.setExpr('surprised', 99);
    this.react('Falling', 0.3, { waitGround: true });
  }

  /**
   * The player focused or typed in a field. The buddy only ever reacts after
   * the fact; hosts must never delay or block the input itself.
   */
  inputActivity(field: Rect, buddyIsOnField: boolean): void {
    const c = this.c;
    if (c.hidden || c.held || this.now < this.escapeCooldown) return;
    const pad = 150;
    const r = c.species.radius;
    const nearby = c.x > field.left - pad && c.x < field.right + pad && c.y > field.top - pad - r && c.y < field.bottom + pad;
    if (!buddyIsOnField && !nearby) return;
    this.escapeCooldown = this.now + 2.5;
    this.wake();
    c.hang = null;
    const dir = sign(c.x - (field.left + field.right) / 2) * (this.rng.chance(0.15) ? -1 : 1);
    this.setExpr('panic', 99);
    this.sound('startle');
    this.effect('!!', { accent: true });
    const flee = () => {
      this.launch(dir * this.rng.range(420, 620), -this.rng.range(560, 760));
      c.tumble = this.rng.chance(0.4);
    };
    if (c.grounded) this.crouchThen(flee, 0.08);
    else {
      c.vx = dir * 500;
      c.vy = -300;
    }
    this.emit('input_escaped', { from: buddyIsOnField ? 'on field' : 'nearby' });
    this.discover('escape');
    this.react('Escaping your typing', 0.5, { waitGround: true });
  }

  feed(raw: string): void {
    const word = raw.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!word || this.c.hidden) return;
    this.wake();
    this.setExpr('chew', 1.4);
    const short = word.length > 16 ? word.slice(0, 15) + '…' : word;
    this.effect(short, { y: this.c.y - this.c.species.radius * 0.2, vy: 10, life: 0.35, size: 13, bubble: true });
    for (let i = 0; i < 6; i++)
      this.after(i * 0.2, () => {
        this.sound('chew');
        this.c.sy = 0.92;
      });
    this.react(`Chewing "${short}"`, 1.5);
    this.after(1.35, () => this.digest(word));
  }

  call(): void {
    const c = this.c;
    this.endBehavior();
    Object.assign(c, { hidden: false, held: false, hang: null, flipT: null, rot: 0, vx: 0, vy: 0, grounded: false, platformId: null, tumble: false });
    this.wake();
    c.x = clamp(this.world.width * 0.35, c.species.radius, this.world.width - c.species.radius);
    c.y = -c.species.radius * 2;
    this.setExpr('surprised', 99);
    this.sound('chirp');
    this.react('Dropping in', 0.2, { waitGround: true });
  }

  setHidden(hidden: boolean): void {
    this.c.hidden = hidden;
  }

  setMode(mode: CompanionMode): void {
    this.mode = mode;
    this.emit('mode_changed', { mode });
  }

  // ---------- simulation ----------
  update(world: WorldSnapshot, dt: number): void {
    this.world = world;
    this.now += dt;
    if (this.c.hidden) return;
    this.scheduler.run(this.now);
    this.driftMood(dt);
    this.c.walking = false;
    this.c.hungryNear = !!world.dragPoint && Math.hypot(world.dragPoint.x - this.c.x, world.dragPoint.y - this.c.y) < 110;
    this.checkStartle();

    if (this.c.held) this.stepHeld(dt);
    else if (this.c.hang) this.stepHang(dt);
    else if (this.c.grounded) this.stepGrounded(dt);
    else this.stepAirborne(dt);

    stepSprings(this.c, dt);
    if (this.c.flipT !== null && this.c.flipT < 0.8) this.c.legPhase += dt * 30;
    this.stepFace();
    this.stepActivity(dt);
    stepEffects(this.effects, dt);
  }

  private driftMood(dt: number): void {
    const c = this.c;
    this.adjustMood('curiosity', dt * 0.012);
    this.adjustMood('playfulness', dt * 0.009);
    this.adjustMood('comfort', -dt * 0.003);
    if (!c.asleep) this.adjustMood('energy', -dt * (c.walking ? 0.012 : c.grounded ? 0.004 : 0.02));
  }

  private checkStartle(): void {
    const c = this.c;
    const p = this.world.pointer;
    if (c.held || c.asleep || !c.grounded || this.now < this.startleCooldown) return;
    if (Math.hypot(p.vx, p.vy) > 2600 && Math.hypot(p.x - c.x, p.y - c.y) < 150 && this.cursorRecent(0.1)) {
      this.startleCooldown = this.now + 3;
      this.setExpr('panic', 0.9);
      this.sound('startle');
      this.effect('!', { accent: true });
      this.launch(-sign(p.x - c.x) * 280, -460);
      c.tumble = this.rng.chance(0.3);
      this.emit('buddy_startled', { cause: 'fast cursor' });
      this.discover('startle');
      this.react('Startled', 1.2);
    }
  }

  private stepHeld(dt: number): void {
    const c = this.c;
    const p = this.world.pointer;
    const k = Math.min(1, dt * 22);
    c.x += (p.x - c.x) * k;
    c.y += (p.y + c.species.radius * 0.75 - c.y) * k;
    c.rot += (clamp(-p.vx * 0.0004, -0.7, 0.7) - c.rot) * Math.min(1, dt * 8);
  }

  private stepHang(dt: number): void {
    const c = this.c;
    const h = c.hang!;
    const r = c.species.radius;
    const s = this.surface(h.surfaceId);
    h.t += dt;
    if (!s) {
      c.hang = null;
      this.fall('lost its grip');
      return;
    }
    c.x = h.side < 0 ? s.left - r * 0.35 : s.right + r * 0.35;
    c.y = s.top + r * 0.78;
    c.rot = Math.sin(this.now * 3.2) * 0.14;
    c.legPhase += dt * 16;
    if (h.t <= 1.8) return;
    c.hang = null;
    if (h.willClimb) {
      c.x = h.side < 0 ? s.left + r * 0.5 : s.right - r * 0.5;
      c.y = s.top - r;
      Object.assign(c, { grounded: true, platformId: s.id, platformTop: s.top, sy: 0.7, sx: 1.2 });
      this.sound('squeak');
      this.setExpr('happy', 1.2);
      this.emit('buddy_climbed', { surface: s.kind });
      this.discover('climb');
    } else {
      this.setExpr('panic', 99);
      this.sound('startle');
      c.vx = -h.side * 60;
      c.vy = 0;
      c.tumble = this.rng.chance(0.5);
      this.emit('buddy_fell', { cause: 'lost its grip' });
    }
    if (this.activity?.kind === 'reaction') this.activity.t = 99;
  }

  private stepGrounded(dt: number): void {
    const c = this.c;
    const r = c.species.radius;
    if (c.platformId) {
      const s = this.surface(c.platformId);
      if (!s || s.top < -r * 1.5) {
        this.fall('platform scrolled away');
      } else {
        const dy = s.top - c.platformTop;
        c.platformTop = s.top;
        if (Math.abs(dy) > 0.5) {
          c.vsy += dy * 1.6;
          c.vrot += dy * 0.006 * (c.x < (s.left + s.right) / 2 ? -1 : 1);
        }
        if (Math.abs(dy) > 24 && this.rng.chance(0.4) && c.flipT === null) this.loseBalance(dy);
        else c.y = s.top - r;
      }
    } else c.y = this.world.height - 6 - r;

    if (c.grounded && c.walkTo !== null && !c.asleep && c.flipT === null) {
      const dx = c.walkTo - c.x;
      if (Math.abs(dx) < 5) c.walkTo = null;
      else {
        c.facing = sign(dx);
        c.x += c.facing * Math.min(Math.abs(dx), c.walkSpeed * dt);
        c.legPhase += dt * c.walkSpeed * 0.1;
        c.walking = true;
      }
    }
    if (c.grounded && c.platformId) {
      const s = this.surface(c.platformId);
      if (s && (c.x < s.left - r * 0.3 || c.x > s.right + r * 0.3)) this.fall('edge');
    }
    c.x = clamp(c.x, r, this.world.width - r);
  }

  private stepAirborne(dt: number): void {
    const c = this.c;
    const r = c.species.radius;
    const prevBottom = c.y + r;
    c.vy += GRAVITY * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.vrot * dt;

    if (c.leap?.kind === 'hang' && c.vy >= 0) {
      const s = this.surface(c.leap.surfaceId);
      if (s && Math.abs(c.y - (s.top + r * 0.78)) < r * 1.2) {
        c.hang = { surfaceId: s.id, side: c.leap.side ?? 1, t: 0, willClimb: this.rng.chance(0.6) };
        Object.assign(c, { leap: null, vx: 0, vy: 0, tumble: false, pendingDizzy: false });
        this.setExpr('surprised', 1.8);
        this.sound('chirp');
        this.emit('buddy_hanging', { surface: s.kind });
        this.discover('hang');
        this.react('Hanging on', 99, { waitGround: false });
        return;
      }
      c.leap = null;
    }
    if (c.x < r) {
      c.x = r;
      if (Math.abs(c.vx) > 500) this.wallBonk();
      c.vx = Math.abs(c.vx) * 0.45;
    }
    if (c.x > this.world.width - r) {
      c.x = this.world.width - r;
      if (Math.abs(c.vx) > 500) this.wallBonk();
      c.vx = -Math.abs(c.vx) * 0.45;
    }
    const target = findLanding(prevBottom, c, [...this.world.surfaces, floorSurface(this.world)]);
    if (target) this.land(target);
    else if (c.y > this.world.height + r * 2) {
      c.y = this.world.height - 6 - r;
      this.land(floorSurface(this.world));
    }
  }

  private land(s: Surface): void {
    const c = this.c;
    const impact = c.vy;
    c.y = s.top - c.species.radius;
    Object.assign(c, { grounded: true, platformId: s.kind === 'floor' ? null : s.id, platformTop: s.top, vy: 0, vx: 0, leap: null });
    c.sy = 1 - Math.min(0.45, impact / 2600);
    c.sx = 1 + (1 - c.sy) * 0.9;
    this.sound('plop', clamp(impact / 2400, 0.1, 0.6));
    const wasTumble = c.tumble;
    c.tumble = false;

    if (wasTumble && this.rng.chance(0.55)) {
      c.rot = Math.PI;
      c.vrot = 0;
      c.flipT = 0;
      this.setExpr('dizzy', 99);
      this.discover('flip');
      this.emit('buddy_landed', { pose: 'upside down' });
      this.react('Upside down', 1.6, {
        update: (t) => {
          c.flipT = t;
          if (t > 0.8) c.rot = Math.PI + ((t - 0.8) / 0.8) * Math.PI;
          if (t >= 1.6 && c.flipT !== null) {
            c.rot = 0;
            c.flipT = null;
            this.setExpr('angry', 0.9);
            this.sound('angry');
            this.emit('buddy_recovered', { from: 'upside down' });
          }
        },
      });
      return;
    }
    if (impact > 1250 || c.pendingDizzy || wasTumble) {
      c.pendingDizzy = false;
      this.setExpr('dizzy', 1.5);
      this.effect('@', { size: 16 });
      let done = false;
      this.react('Seeing stars', 1.6, {
        update: (t) => {
          if (t >= 1.55 && !done) {
            done = true;
            this.setExpr('angry', 0.8);
            this.sound('angry');
            this.emit('buddy_recovered', { from: 'dizzy' });
          }
        },
      });
      return;
    }
    if (c.expr === 'surprised' || c.expr === 'panic') this.setExpr('neutral', 0);
    const a = this.activity;
    if (a?.kind === 'reaction' && a.waitGround) a.t = a.dur;
  }

  private fall(cause: string): void {
    const c = this.c;
    Object.assign(c, { grounded: false, platformId: null, walkTo: null });
    c.vy = Math.max(c.vy, 0);
    if (cause === 'edge') {
      this.setExpr('surprised', 1);
      this.effect('!', { accent: true });
    }
    this.emit('buddy_fell', { cause });
  }

  private loseBalance(dy: number): void {
    const c = this.c;
    Object.assign(c, { grounded: false, platformId: null, walkTo: null, tumble: true });
    this.wake();
    c.vy = dy < 0 ? -120 : -300;
    c.vx = this.rng.range(-220, 220);
    c.vrot = this.rng.range(-8, 8);
    this.setExpr('panic', 99);
    this.sound('startle');
    this.emit('buddy_fell', { cause: 'scroll' });
    this.discover('scroll_fall');
    this.react('Tumbling', 0.3, { waitGround: true });
  }

  private wallBonk(): void {
    this.sound('bonk');
    this.setExpr('dizzy', 1.4);
    this.c.pendingDizzy = true;
    this.effect('bonk', { size: 14, bubble: true });
    this.emit('buddy_bonked', { on: 'wall' });
    this.discover('wall_bonk');
  }

  private digest(word: string): void {
    const affinity: Affinity | null = classifyWord(word);
    this.emit('word_eaten', affinity ? { word, affinity } : { word, affinity: 'unknown' });
    this.discover('eat');
    if (isBigBite(word)) {
      this.after(0.1, () => {
        this.sound('burp');
        this.effect('BURP', { size: 15, bubble: true });
        this.setExpr('happy', 1.2);
        this.discover('burp');
      });
      return;
    }
    const c = this.c;
    switch (affinity) {
      case 'nature':
      case 'food':
        this.setExpr('happy', 2);
        this.sound('squeak');
        for (let i = 0; i < 3; i++) this.after(i * 0.2, () => this.effect('♥', { accent: true, size: 16 }));
        this.adjustMood('comfort', 0.15);
        if (c.grounded) this.after(0.3, () => this.crouchThen(() => this.launch(0, -420), 0.12));
        break;
      case 'music':
        this.setExpr('happy', 1);
        this.adjustMood('playfulness', 0.3);
        this.after(0.3, () => this.startBehavior('dance'));
        break;
      case 'technology':
        this.setExpr('curious', 1.6);
        this.sound('bleep');
        this.effect('01', { size: 13, bubble: true });
        this.adjustMood('curiosity', 0.2);
        break;
      case 'weather':
        if (isStormy(word)) {
          this.setExpr('panic', 1.4);
          this.sound('startle');
          this.effect('!', { accent: true });
          if (c.grounded) this.launch(this.rng.range(-150, 150), -520);
          c.tumble = this.rng.chance(0.4);
        } else {
          this.setExpr('happy', 1.4);
          this.sound('chirp');
          this.effect('~');
        }
        break;
      case 'emotion':
        this.setExpr('happy', 2.4);
        this.sound('purr');
        for (let i = 0; i < 5; i++) this.after(i * 0.15, () => this.effect('♥', { accent: true, size: 14, vx: this.rng.range(-40, 40) }));
        this.adjustMood('comfort', 0.25);
        break;
      case 'fantasy':
        this.setExpr('surprised', 1.2);
        this.sound('fanfare');
        for (let i = 0; i < 5; i++)
          this.after(i * 0.1, () => this.effect('✦', { size: 16, vx: this.rng.range(-60, 60), vy: this.rng.range(-80, -30) }));
        break;
      case 'mystery':
        this.setExpr('curious', 2);
        this.sound('chirp');
        this.effect('?', { size: 22 });
        this.adjustMood('curiosity', 0.25);
        break;
      default:
        if (this.rng.chance(0.45)) {
          this.setExpr('angry', 1.2);
          this.sound('angry');
          this.effect(word.slice(0, 14), { vx: c.facing * 260, vy: -160, gravity: 900, life: 1.2, size: 13, bubble: true });
          this.emit('word_spat', { word });
          this.discover('spit');
        } else {
          this.setExpr('curious', 1.2);
          this.effect('hm', { size: 13, bubble: true });
        }
    }
  }

  private stepFace(): void {
    const c = this.c;
    if (this.now > c.nextBlink) {
      c.blinkStart = this.now;
      c.nextBlink = this.now + this.rng.range(2, 5.5);
    }
    const bt = this.now - c.blinkStart;
    c.blink = bt < 0.13 ? Math.abs(1 - bt / 0.065) : 1;
    if (this.now > c.exprUntil && c.expr !== 'neutral') c.expr = c.asleep ? 'sleep' : 'neutral';
  }

  private react(label: string, dur: number, o: { waitGround?: boolean; update?: (t: number, dt: number) => void } = {}): void {
    this.endBehavior();
    this.c.walkTo = null;
    this.activity = { kind: 'reaction', label, t: 0, dur, waitGround: o.waitGround ?? true, update: o.update };
  }

  private endBehavior(): void {
    const a = this.activity;
    if (a?.kind === 'behavior') a.behavior.end?.(this, a.d);
  }

  private stepActivity(dt: number): void {
    const c = this.c;
    const a = this.activity;
    if (a?.kind === 'reaction') {
      a.t += dt;
      a.update?.(a.t, dt);
      if (a.t >= a.dur && (!a.waitGround || c.grounded) && !c.hang && c.flipT === null) this.activity = null;
    } else if (a?.kind === 'behavior') {
      a.t += dt;
      let done: boolean;
      try {
        done = a.behavior.update(this, a.d, dt, a.t);
      } catch (err) {
        console.warn(`[fuzzy-buddies] behavior ${a.behavior.id} threw`, err);
        done = true;
      }
      if (done && this.activity === a) {
        a.behavior.end?.(this, a.d);
        this.activity = null;
      }
    }
    if (!this.activity && c.grounded && !c.held && !c.hang && c.flipT === null && this.scheduler.pending < 3) this.think();
  }

  private think(): void {
    this.lastScores = scoreBehaviors(BEHAVIORS, this, this.recent, this.rng);
    this.startBehavior(this.lastScores[0].id);
  }
}
