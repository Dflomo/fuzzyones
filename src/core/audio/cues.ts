/**
 * The engine asks for sounds by cue name; a host AudioPort decides how to
 * make them (Web Audio in the browser, silent in tests).
 */
export type SoundCue =
  | 'squeak' | 'chirp' | 'startle' | 'plop' | 'purr' | 'chew' | 'angry'
  | 'yawn' | 'burp' | 'bonk' | 'bleep' | 'note' | 'fanfare' | 'hum';

export interface AudioPort {
  /** intensity is 0 to 1 where the cue supports it (plop); note uses it as a frequency in Hz. */
  play(cue: SoundCue, intensity?: number): void;
}

export const silentAudio: AudioPort = { play() {} };
