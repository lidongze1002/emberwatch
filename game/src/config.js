// 夜巡科 · 数值与调色。楼层怎么长的不在这里，在 cases.js；这里只放「一个人多快、一只怪多疼」。

export const VIEW = { width: 1280, height: 800 };

export const PALETTE = {
  void: '#05070c',
  floor: '#0c1018',
  floorWarm: '#141018',
  wall: '#1a1d26',
  wallTop: '#2b2f3a',
  gold: '#c9a25a',
  red: '#7d1f26',
  redLit: '#b33a3a',
  lamp: '#ffd9a0',
  lampHot: '#fff3d6',
  cyan: '#8fd8e8',
  pale: '#dfe6f0',
  dim: '#6d7a8c',
  blood: '#5a1a18',
  screen: '#7fe3d0',
};

export const TUNING = {
  step: 1 / 60,
  cell: 40,
  agentRadius: 11,
  vision: 330,
  charmSeconds: 3,
  reviveSeconds: 4,
  bulletSpeed: 1100,
  bulletRadius: 4,
};

export const AGENTS = {
  veteran: { hp: 22, speed: 92, range: 300, damage: 6, fireRate: 0.42, spread: 0.05, colour: '#e0b276' },
  rookie: { hp: 13, speed: 132, range: 300, damage: 4.5, fireRate: 0.34, spread: 0.09, colour: '#9fc6d8' },
  lamp: { hp: 16, speed: 104, range: 360, damage: 5, fireRate: 0.46, spread: 0.04, colour: '#ffd9a0' },
};

export const POSSESS_SECONDS = 8;

export const SPIDER = { hp: 80, speed: 18, damage: 14, reach: 48, cooldown: 1.3, radius: 40 };
export const SPIDERLING = { hp: 2, speed: 70, damage: 4, reach: 22, cooldown: 0.9, radius: 9 };

export const THRALL = {
  hp: 6,
  speed: 40,
  damage: 5,
  reach: 26,
  cooldown: 1.15,
  special: { range: 116, damage: 4, stun: 1.1, cooldown: 3.6 },
};

// 第二案：不可杀的八尺様。子弹只让她顿一下。
export const HACHI = {
  hp: 999,
  speed: 38,
  damage: 16,
  reach: 46,
  cooldown: 1.5,
  radius: 26,
  stunOnHit: 0.25,
  feed: 1.5,
};

// 第四案：不可杀的くねくね。数值只有「看多久会疯」。
export const KUNE = { radius: 20, rate: 1, bossRate: 1.6 };

// 第五案：复制品。用的是同一套骨架，皮更厚：一个守一扇门。
export const MIRROR = { hp: 32, speed: 96, damage: 4, range: 260, fireRate: 1.25, radius: 12, spread: 0.1, leash: 190, race: 3.2 };
