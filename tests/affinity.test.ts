import { classifyWord, isBigBite, isStormy } from '../src/core/creature/affinity';

describe('classifyWord', () => {
  it('maps known words to affinities', () => {
    expect(classifyWord('mushroom')).toBe('nature');
    expect(classifyWord('Synth')).toBe('music');
    expect(classifyWord('an entire wheel of cheese')).toBe('food');
  });
  it('returns null for unknown words', () => {
    expect(classifyWord('quarterly synergy')).toBeNull();
    expect(classifyWord('')).toBeNull();
  });
  it('detects storms and big bites', () => {
    expect(isStormy('thunder')).toBe(true);
    expect(isStormy('drizzle')).toBe(false);
    expect(isBigBite('an entire wheel of cheese')).toBe(true);
    expect(isBigBite('honey')).toBe(false);
  });
});
