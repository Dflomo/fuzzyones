/** Procedural Web Audio voice for Puff. No audio files. Starts only after a user gesture. */
import type { AudioPort, SoundCue } from '../core/audio/cues';

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  delay?: number;
  vib?: number;
}

export class WebAudioPort implements AudioPort {
  enabled = true;
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;

  /** Call from a user gesture (pointerdown, keydown). Safe to call repeatedly. */
  unlock(): void {
    if (!this.ac) {
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ac = new Ctor();
        this.master = this.ac.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ac.destination);
      } catch {
        this.ac = null;
      }
    }
    if (this.ac?.state === 'suspended') void this.ac.resume();
  }

  setVolume(v: number): void {
    if (this.master) this.master.gain.value = v;
  }

  private tone(f0: number, f1: number, dur: number, o: ToneOpts = {}): void {
    const ac = this.ac;
    if (!this.enabled || !ac || !this.master || ac.state !== 'running') return;
    const t = ac.currentTime + (o.delay ?? 0);
    const os = ac.createOscillator();
    const g = ac.createGain();
    os.type = o.type ?? 'sine';
    os.frequency.setValueAtTime(f0, t);
    os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g).connect(this.master);
    os.start(t);
    os.stop(t + dur + 0.05);
    if (o.vib) {
      const l = ac.createOscillator();
      const lg = ac.createGain();
      l.frequency.value = o.vib;
      lg.gain.value = f0 * 0.07;
      l.connect(lg).connect(os.frequency);
      l.start(t);
      l.stop(t + dur);
    }
  }

  play(cue: SoundCue, intensity = 0.3): void {
    const p = 0.9 + Math.random() * 0.25; // pitch variance keeps repeats from grating
    switch (cue) {
      case 'squeak':
        this.tone(950 * p, 1700 * p, 0.11, { type: 'triangle', vol: 0.32 });
        if (Math.random() < 0.5) this.tone(1200 * p, 1900 * p, 0.08, { type: 'triangle', vol: 0.25, delay: 0.12 });
        break;
      case 'chirp':
        this.tone(700 * p, 1300 * p, 0.09, { vol: 0.3 });
        this.tone(1300 * p, 950 * p, 0.08, { vol: 0.25, delay: 0.1 });
        break;
      case 'startle':
        this.tone(1700, 480, 0.17, { type: 'square', vol: 0.09 });
        break;
      case 'plop':
        this.tone(240, 60, 0.13, { vol: Math.min(0.6, Math.max(0.1, intensity)) });
        break;
      case 'purr':
        this.tone(72, 64, 1.1, { type: 'sawtooth', vol: 0.07, vib: 23 });
        break;
      case 'chew':
        this.tone(260 + Math.random() * 80, 160, 0.05, { type: 'square', vol: 0.05 });
        break;
      case 'angry':
        this.tone(270, 170, 0.32, { type: 'sawtooth', vol: 0.09, vib: 15 });
        break;
      case 'yawn':
        this.tone(560, 230, 0.85, { vol: 0.16, vib: 4 });
        break;
      case 'burp':
        this.tone(150, 75, 0.4, { type: 'sawtooth', vol: 0.12, vib: 32 });
        break;
      case 'bonk':
        this.tone(420, 110, 0.1, { type: 'square', vol: 0.1 });
        break;
      case 'bleep':
        [880, 1320, 660, 1760].forEach((f, i) => this.tone(f, f, 0.06, { type: 'square', vol: 0.05, delay: i * 0.07 }));
        break;
      case 'note':
        this.tone(intensity, intensity * 1.01, 0.32, { vol: 0.14, vib: 5 });
        break;
      case 'fanfare':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.14, { type: 'triangle', vol: 0.18, delay: i * 0.09 }));
        break;
      case 'hum':
        [392, 440, 392, 330].forEach((f, i) => this.tone(f, f, 0.4, { vol: 0.06, vib: 4, delay: i * 0.4 }));
        break;
    }
  }
}
