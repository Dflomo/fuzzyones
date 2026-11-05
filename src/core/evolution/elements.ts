/**
 * The six elements that shape Stage IV and Stage V forms. Fed words are
 * classified locally: an explicit word list first, then a fallback from the
 * word's affinity.
 */
import { classifyWord, isStormy } from '../creature/affinity';

export type Element = 'fire' | 'water' | 'earth' | 'air' | 'light' | 'shadow';

export const ELEMENTS: readonly Element[] = ['fire', 'water', 'earth', 'air', 'light', 'shadow'];

export interface ElementStyle {
  name: string;
  /** Fur tint mixed into the species palette. */
  tint: string;
  /** Bright accent for crests and particles. */
  glow: string;
  /** Deep accent for outlines and shading. */
  deep: string;
  /** Iris color at Stage IV and V. */
  iris: string;
  /** Prefix for Stage IV names, prefix for Stage V names. */
  prefix: [string, string];
}

export const ELEMENT_STYLE: Record<Element, ElementStyle> = {
  fire: { name: 'Fire', tint: '#ff8a4c', glow: '#ffd25e', deep: '#d9481f', iris: '#b5380f', prefix: ['Ember', 'Blaze'] },
  water: { name: 'Water', tint: '#5aaee8', glow: '#c9f1ff', deep: '#2a6fb8', iris: '#1d4ed8', prefix: ['Tide', 'Abyss'] },
  earth: { name: 'Earth', tint: '#9c7a4e', glow: '#9fd67a', deep: '#5f4527', iris: '#3f6212', prefix: ['Pebble', 'Boulder'] },
  air: { name: 'Air', tint: '#cfeaf3', glow: '#ffffff', deep: '#8fc3d6', iris: '#0e7490', prefix: ['Breeze', 'Tempest'] },
  light: { name: 'Light', tint: '#ffe38f', glow: '#fff7cf', deep: '#e0a92e', iris: '#b45309', prefix: ['Halo', 'Radiant'] },
  shadow: { name: 'Shadow', tint: '#5a4785', glow: '#c4a8ff', deep: '#2c2147', iris: '#8b5cf6', prefix: ['Dusk', 'Eclipse'] },
};

export const ELEMENT_WORDS: Record<Element, readonly string[]> = {
  fire: ['fire', 'flame', 'ember', 'embers', 'lava', 'volcano', 'chili', 'pepper', 'spicy', 'hot', 'candle', 'campfire', 'dragon', 'torch', 'blaze', 'spark', 'smoke', 'toast'],
  water: ['water', 'rain', 'raindrop', 'drizzle', 'ocean', 'sea', 'wave', 'waves', 'river', 'tide', 'lake', 'fish', 'snow', 'ice', 'puddle', 'bubble', 'bubbles', 'soup', 'tea', 'fog'],
  earth: ['earth', 'moss', 'mushroom', 'stone', 'rock', 'pebble', 'tree', 'oak', 'soil', 'mud', 'seed', 'acorn', 'mountain', 'clover', 'garden', 'fern', 'leaf', 'root', 'crystal', 'sourdough', 'bread', 'cheese'],
  air: ['air', 'wind', 'breeze', 'cloud', 'clouds', 'sky', 'bird', 'feather', 'kite', 'storm', 'thunder', 'lightning', 'whistle', 'song', 'flute', 'synth', 'bubbles'],
  light: ['light', 'sun', 'sunbeam', 'sunshine', 'star', 'stars', 'moonbeam', 'glow', 'gold', 'honey', 'rainbow', 'lantern', 'love', 'joy', 'hug', 'smile', 'magic', 'fairy', 'pixel'],
  shadow: ['shadow', 'shadows', 'night', 'dark', 'dusk', 'midnight', 'moon', 'secret', 'riddle', 'mystery', 'gate', 'ghost', 'cave', 'void', 'whisper', 'clue', 'puzzle'],
};

export function classifyElement(text: string): Element | null {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const w of words) {
    for (const e of ELEMENTS) if (ELEMENT_WORDS[e].includes(w)) return e;
  }
  switch (classifyWord(text)) {
    case 'nature':
    case 'food':
      return 'earth';
    case 'weather':
      return isStormy(text) ? 'air' : 'water';
    case 'music':
      return 'air';
    case 'emotion':
    case 'fantasy':
    case 'technology':
      return 'light';
    case 'mystery':
      return 'shadow';
    default:
      return null;
  }
}

export function emptyElements(): Record<Element, number> {
  return { fire: 0, water: 0, earth: 0, air: 0, light: 0, shadow: 0 };
}

/** Strongest element and its points; ties go to the first in ELEMENTS order. */
export function dominant(points: Record<Element, number>, except?: Element): { element: Element | null; points: number } {
  let best: Element | null = null;
  let bp = 0;
  for (const e of ELEMENTS) {
    if (e === except) continue;
    if (points[e] > bp) {
      bp = points[e];
      best = e;
    }
  }
  return { element: best, points: bp };
}
