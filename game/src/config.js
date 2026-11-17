// 夜巡科 · 第一案：歌剧院
// 值班记录 / 美术与数值。规则：电闸没拉下时，礼堂里一直在唱；在里面待满三秒的人就不再听指令，
// 自己走上台。去后台把电闸拉下来。

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

// The house: a shallow U of rooms. Numbers are the top-left of solid blocks.
export const WALLS = [
  [56, 56, 1168, 18],
  [56, 726, 1168, 18],
  [56, 56, 18, 688],
  [1206, 56, 18, 688],
  [470, 288, 310, 18],
  [864, 288, 342, 18],
  [464, 288, 18, 278],
  [464, 650, 18, 76],
  [464, 56, 18, 94],
  [464, 236, 18, 52],
  [56, 288, 144, 18],
  [286, 288, 178, 18],
  [700, 420, 22, 22],
  [980, 560, 22, 22],
];

export const ZONES = {
  house: { x: 482, y: 306, w: 724, h: 420 },
  stage: { x: 482, y: 74, w: 724, h: 214 },
  foyer: { x: 74, y: 306, w: 390, h: 420 },
  backstage: { x: 74, y: 74, w: 390, h: 214 },
};

export const SEATS = (() => {
  const rows = [];
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 11; c += 1) {
      const x = 520 + c * 58;
      const y = 360 + r * 54;
      if (x > 690 && x < 760) continue;
      if (x > 960 && x < 1030) continue;
      rows.push({ x, y, w: 26, h: 30 });
    }
  }
  return rows;
})();

export const SPAWNS = {
  agents: [
    { role: 'veteran', x: 132, y: 640 },
    { role: 'rookie', x: 176, y: 672 },
    { role: 'lamp', x: 96, y: 682 },
  ],
  thralls: [
    { x: 735, y: 470 },
    { x: 995, y: 420 },
    { x: 1160, y: 690 },
    { x: 820, y: 690 },
  ],
  switchboard: { x: 150, y: 150 },
  exit: { x: 106, y: 470 },
  stageMark: { x: 840, y: 180 },
};

// Things a body cannot walk through but light and bullets pass over: seat rows and the booth.
export const PROPS = [
  ...SEATS.map((s) => [s.x - 2, s.y - 2, s.w + 4, s.h + 4]),
  [280, 356, 108, 56],
];

export const POSSESS_SECONDS = 8;

export const THRALL = { hp: 6, speed: 40, damage: 5, reach: 26, cooldown: 1.15 };
