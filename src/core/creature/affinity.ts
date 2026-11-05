/**
 * Word to affinity classification. Phase 1 uses a small local dictionary so no
 * text ever leaves the machine. A smarter (optional, opt-in) classifier can
 * implement the same signature later.
 */
export type Affinity =
  | 'nature'
  | 'food'
  | 'music'
  | 'technology'
  | 'weather'
  | 'emotion'
  | 'fantasy'
  | 'mystery';

export const AFFINITY_WORDS: Record<Affinity, readonly string[]> = {
  nature: ['moss', 'mushroom', 'tree', 'oak', 'leaf', 'clover', 'bee', 'bees', 'garden', 'flower', 'meadow', 'ledge', 'fern', 'orchard', 'acorn', 'seed', 'forest'],
  food: ['honey', 'sourdough', 'cheese', 'berry', 'apple', 'pie', 'toast', 'soup', 'bread', 'wheel'],
  music: ['synth', 'song', 'beat', 'bass', 'melody', 'drum', 'dance', 'music', 'hum', 'humming', 'tune', 'groove'],
  technology: ['laptop', 'code', 'robot', 'pixel', 'data', 'wifi', 'server', 'api', 'computer'],
  weather: ['thunder', 'storm', 'lightning', 'rain', 'drizzle', 'fog', 'sun', 'snow', 'cloud', 'wind'],
  emotion: ['hug', 'love', 'happy', 'joy', 'friend', 'cozy', 'smile'],
  fantasy: ['dragon', 'moonbeam', 'moon', 'wizard', 'magic', 'star', 'fairy', 'spell'],
  mystery: ['riddle', 'secret', 'shadow', 'gate', 'clue', 'puzzle', 'mystery'],
};

export const AFFINITIES = Object.keys(AFFINITY_WORDS) as Affinity[];

export function classifyWord(text: string): Affinity | null {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const w of words) {
    for (const a of AFFINITIES) if (AFFINITY_WORDS[a].includes(w)) return a;
  }
  return null;
}

export function isStormy(text: string): boolean {
  return /thunder|storm|lightning/i.test(text);
}

/** Phrases this long are "too big a bite" and earn a burp. */
export function isBigBite(text: string): boolean {
  return text.trim().split(/\s+/).length >= 3 || text.length > 18;
}
