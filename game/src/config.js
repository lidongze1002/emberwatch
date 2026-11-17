// The tuning table. Every number the game feels with lives here, so a run can be retuned
// without touching a rule. This file draws nothing and updates nothing.

export const VIEW = { width: 1280, height: 800 };

export const LAMP = { x: 640, y: 570 };

export const TUNING = {
  step: 1 / 60,
  hearts: 3,
  maxHearts: 5,
  invulnerable: 0.45,
  comboWindow: 1.8,
  comboMax: 9,
  overdriveMax: 100,
  overdrivePerKill: 8,
  overdriveLightTick: 0.6,
  overdriveSeconds: 1.6,
  overdriveCone: 2,
  overdriveDamage: 2.2,
  spawnRing: { inner: 390, outer: 450 },
  spawnArc: { from: 1.16, to: 1.84 },
  towerRadius: 86,
  shakeDecay: 7,
  beam: {
    halfAngle: (14 * Math.PI) / 180,
    reach: 260,
    dps: 6.5,
    falloffAt: 0.85,
    falloffFloor: 0.45,
    litSlow: 0.55,
    aimLag: 0.45,
  },
  hpPerWave: 0.08,
  speedPerWave: 0.02,
  spawnEvery: 1.1,
  spawnTighten: 0.05,
  spawnFloor: 0.55,
  armour: { bulwark: 0.9, leviathan: 1.2 },
  nearTower: 170,
  nearTowerSlow: 0.8,
};

// Cold indigo sea, cold stone, warm fire. No shadow is a neon colour and no light is white
// except at the heart of the lamp.
export const PALETTE = {
  skyTop: '#04060d',
  skyMid: '#0a1220',
  horizon: '#16243a',
  seaNear: '#0a1626',
  seaFar: '#132338',
  foam: '#3d5a70',
  cliff: '#0a0d13',
  cliffRim: '#26313f',
  stone: '#1b222c',
  stoneLit: '#39424e',
  glass: '#3a2b1e',
  ink: '#04060b',
  shadow: '#04060c',
  shadowRim: '#22303f',
  shadowLit: '#7a4526',
  fire: '#ffb347',
  fireHot: '#ffe6b3',
  fireDeep: '#ff6a1e',
  ember: '#ff9a3c',
  text: '#dfe6f0',
  textDim: '#7f8ea3',
  textWarm: '#f0c98d',
  good: '#8fd6b0',
  bad: '#e0554a',
};

export const FONTS = {
  display: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
  ui: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
  mono: '"Consolas", "Courier New", monospace',
};

// hp, speed px/s, radius px, score, and the sentence the HUD shows when a new one appears.
export const SHADOWS = {
  crawler: { hp: 4, speed: 30, radius: 16, score: 10, name: 'Crawler' },
  skitter: { hp: 3, speed: 52, radius: 13, score: 15, name: 'Skitter' },
  bulwark: { hp: 12, speed: 22, radius: 23, score: 40, name: 'Bulwark' },
  splitter: { hp: 6, speed: 38, radius: 20, score: 25, name: 'Splitter' },
  spawnling: { hp: 1.5, speed: 64, radius: 10, score: 5, name: 'Spawnling' },
  moth: { hp: 5, speed: 46, radius: 15, score: 25, name: 'Moth' },
  boss: { hp: 60, speed: 22, radius: 54, score: 500, name: 'Leviathan' },
};

// The eight tides. A wave is a bag of shadows; the game deals them out in an interleaved
// order so a wave never arrives as one species at a time.
export const WAVES = [
  { title: 'The tide rises', spawn: { crawler: 10 } },
  { title: 'Quick water', spawn: { crawler: 12, skitter: 6 } },
  { title: 'Stone in the surf', spawn: { crawler: 8, skitter: 8, bulwark: 3 } },
  { title: 'They come apart', spawn: { skitter: 10, splitter: 5 } },
  { title: 'Wings over water', spawn: { bulwark: 5, moth: 8, crawler: 8 } },
  { title: 'The long dark', spawn: { skitter: 12, splitter: 6, bulwark: 4 } },
  { title: 'All of them', spawn: { moth: 8, bulwark: 5, crawler: 10, skitter: 8 } },
  { title: 'Leviathan', spawn: { boss: 1, skitter: 8, crawler: 8 }, boss: true },
];

export const KEYS = {
  overdrive: ['Space'],
  restart: ['KeyR', 'Enter'],
  mute: 'KeyM',
};
