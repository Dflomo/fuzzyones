/** Discoverable behaviors. First occurrence fires new_behavior_discovered. */
export const DISCOVERIES = {
  poke: 'Poke',
  pet: 'Purring pet',
  pickup: 'Picked up',
  toss: 'Big toss',
  escape: 'Typing escape',
  scroll_fall: 'Shaken off by scrolling',
  hang: 'Ledge hang',
  climb: 'Pull-up',
  bonk: 'Botched leap',
  trip: 'Tripped mid-hop',
  wall_bonk: 'Wall bonk',
  nap: 'Unexpected nap',
  wake_grumpy: 'Rude awakening',
  dance: 'Dance break',
  eat: 'First snack',
  spit: 'Spat it out',
  burp: 'Big bite',
  inspect: 'Read the page',
  chase: 'Cursor chase',
  startle: 'Too fast!',
  flip: 'Upside-down landing',
} as const;

export type DiscoveryKey = keyof typeof DISCOVERIES;
