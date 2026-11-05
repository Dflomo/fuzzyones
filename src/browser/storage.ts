/** Local-only persistence. Nothing leaves the device. */
import type { GrowthSave } from '../core/evolution/progression';

export interface SaveData {
  version: 1;
  discovered: string[];
  affinities: Record<string, number>;
  species?: string;
  growth?: GrowthSave;
}

const KEY = 'fuzzy-buddies:v1';

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as SaveData;
      if (s.version === 1) return s;
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return { version: 1, discovered: [], affinities: {} };
}

export function writeSave(s: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
