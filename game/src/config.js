// BEELINE tuning: the field, the bee, the blooms, the wasps and the nine meadows.
// Everything the world and the renderer agree on lives here, so a balance pass touches one file.

export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'beeline-best-score';

export const BEE = {
  radius: 15,
  accel: 1650,
  maxSpeed: 305,
  drag: 2.6,
  dashSpeed: 760,
  dashSeconds: 0.22,
  dashCooldown: 0.85,
  hurtSeconds: 1.4,
  sipRadius: 46,
};

export const HEARTS_START = 3;
export const HEARTS_MAX = 5;

export const FLOWER = {
  count: 26,
  budMin: 1.6,
  budMax: 4.2,
  bloomSeconds: 9,
  sipSeconds: 0.85,
  trapShare: 0.22,
  trapSipSeconds: 0.5,
};

export const WASP = {
  radius: 16,
  baseSpeed: 168,
  speedPerLevel: 9,
  steer: 2.4,
  stunSeconds: 3,
  spawnStart: 6,
  spawnEvery: 5.5,
};

export const QUEEN = {
  radius: 30,
  speed: 208,
  chargeSpeed: 460,
  stunsToRepel: 3,
  levels: [3, 6, 9],
};

// The nine meadows: quota is the nectar to bank, dusk the seconds of light to bank it in.
export const MEADOWS = [
  { quota: 7, dusk: 78 },
  { quota: 9, dusk: 80 },
  { quota: 10, dusk: 82 },
  { quota: 12, dusk: 84 },
  { quota: 13, dusk: 86 },
  { quota: 15, dusk: 88 },
  { quota: 16, dusk: 90 },
  { quota: 18, dusk: 92 },
  { quota: 20, dusk: 95 },
];

export const SCORE = {
  nectar: 50,
  trapNectar: 120,
  stun: 25,
  queenRepelled: 250,
  duskSecondLeft: 10,
};

// The blessings offered between meadows: pick one of three after each clear.
export const BLESSINGS = [
  { id: 'wings', name: 'Swift Wings', text: '+12% flight speed, every meadow from here.' },
  { id: 'dash', name: 'Long Dash', text: '+45% dash length: cross the field in one breath.' },
  { id: 'magnet', name: 'Honey Magnet', text: 'A wider sip: drink blooms from farther away.' },
  { id: 'hide', name: 'Thick Hide', text: '+1 heart now, and room for one more.' },
  { id: 'dew', name: 'Early Dew', text: '+10 seconds of light in every meadow.' },
  { id: 'charm', name: 'Combo Charm', text: 'Combos pay double and forgive one sting.' },
];

// Warm meadow palette: dawn gold over teal-green shade, deepening to dusk violet as light runs out.
export const PALETTE = {
  skyDawnTop: '#ffd98a',
  skyDawnBottom: '#fff3c4',
  skyDuskTop: '#2c2350',
  skyDuskBottom: '#7a3b5e',
  hillFar: '#8fae6b',
  hillNear: '#5d8a4c',
  ground: '#3e6b35',
  groundDark: '#2c5227',
  nectar: '#ffcf3f',
  trap: '#b388ff',
  beeBody: '#ffca28',
  beeStripe: '#3a2c14',
  waspBody: '#8d5a2b',
  waspStripe: '#241a10',
  ink: '#2e2413',
  paper: '#fff8e1',
};
