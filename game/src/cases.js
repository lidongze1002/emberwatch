// 五份卷宗：墙、家具、出生点、区域、规则、Boss、道具。游戏的其余部分都不认识「歌剧院」，
// 只认识 CASE。要加第六案，就在这里再加一个对象。

import { VIEW } from './config.js';

const B = { x0: 56, y0: 56, x1: 1224, y1: 744 };

const BORDER = [
  [56, 56, 1168, 18],
  [56, 726, 1168, 18],
  [56, 56, 18, 688],
  [1206, 56, 18, 688],
];

// ---- 第一案：歌剧院 -------------------------------------------------------

const SEATS = (() => {
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

const OPERA = {
  id: 'opera',
  no: 1,
  fee: 1200,
  decor: 'opera',
  bounds: B,
  cam: { scale: 1.4, x: 640, y: 420 },
  key: { x: 840, y: 180 },
  palette: {
    ink: '#0c1018',
    wall: '#22262f',
    floor: ['#06080c', '#080a0f', '#04060a'],
    accent: 'rgba(201, 162, 90, 0.75)',
  },
  walls: [
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
  ].concat(BORDER),
  soft: [],
  props: [
    ...SEATS.map((s) => [s.x - 2, s.y - 2, s.w + 4, s.h + 4]),
    [280, 356, 108, 56],
  ],
  seats: SEATS,
  zones: {
    house: { x: 482, y: 306, w: 724, h: 420 },
    stage: { x: 482, y: 74, w: 724, h: 214 },
    foyer: { x: 74, y: 306, w: 390, h: 420 },
    backstage: { x: 74, y: 74, w: 390, h: 214 },
  },
  spawns: {
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
    exit: { x: 106, y: 470 },
    switchboard: { x: 150, y: 150 },
    stageMark: { x: 840, y: 180 },
  },
  rule: { kind: 'power', charmSeconds: 3, pullSeconds: 1.2 },
  boss: { kind: 'spider', x: 840, y: 160 },
  objectives: ['power', 'clear', 'out'],
};

// ---- 第二案：公寓走廊 · 八尺様 -------------------------------------------

const CORRIDOR_DOORS = [
  { x: 200, y: 96, face: 'n' },
  { x: 760, y: 96, face: 'n' },
  { x: 1186, y: 230, face: 'e' },
  { x: 1186, y: 430, face: 'e' },
  { x: 760, y: 704, face: 's' },
  { x: 340, y: 704, face: 's' },
  { x: 96, y: 560, face: 'w' },
  { x: 96, y: 240, face: 'w' },
];

const APARTMENT = {
  id: 'apartment',
  no: 2,
  fee: 1800,
  decor: 'corridor',
  bounds: B,
  cam: { scale: 1.4, x: 640, y: 420 },
  key: { x: 640, y: 74 },
  palette: {
    ink: '#0b0d10',
    wall: '#2a2723',
    floor: ['#0a0908', '#0d0b09', '#070606'],
    accent: 'rgba(201, 162, 90, 0.55)',
  },
  walls: [
    // 回字中间的两块住户块，中间留一条横穿近路
    [344, 226, 592, 140],
    [344, 434, 592, 140],
    // 走廊里的三处收窄，打断长射线
    [224, 452, 120, 18],
    [936, 240, 120, 18],
    [600, 166, 18, 60],
    [700, 574, 18, 60],
  ].concat(BORDER),
  soft: [],
  props: [
    // 电梯口
    [590, 502, 100, 26],
  ],
  doors: CORRIDOR_DOORS,
  zones: {
    stair: { x: 74, y: 612, w: 168, h: 114 },
    corridor: { x: 74, y: 74, w: 1132, h: 652 },
  },
  spawns: {
    agents: [
      { role: 'veteran', x: 150, y: 660 },
      { role: 'rookie', x: 196, y: 686 },
      { role: 'lamp', x: 108, y: 690 },
    ],
    thralls: [],
    exit: { x: 130, y: 668 },
  },
  rule: {
    kind: 'knock',
    dawn: 75,
    knockEvery: 9,
    warn: 2.0,
    radius: 340,
    grab: 28,
    dismissCd: 3,
    // 她会从看不见的地方提前站到队伍前面的门口/过道收窄处，把走廊截成两段
    manifest: 14,
    cuts: [{ x: 392, y: 400 }, { x: 900, y: 400 }],
    loop: [
      { x: 200, y: 170 }, { x: 640, y: 150 }, { x: 1080, y: 150 },
      { x: 1140, y: 400 }, { x: 1080, y: 660 }, { x: 640, y: 680 },
      { x: 260, y: 660 }, { x: 110, y: 420 },
    ],
  },
  boss: { kind: 'hachi', x: 1090, y: 140 },
  objectives: ['survive', 'out'],
};

// ---- 第三案：不存在的车站 ------------------------------------------------

const WEST_ZONE = { x: 74, y: 308, w: 168, h: 204 };
const EAST_ZONE = { x: 1052, y: 308, w: 154, h: 204 };
const SOUTH_ZONE = { x: 518, y: 604, w: 226, h: 104 };

const STATION = {
  id: 'station',
  no: 3,
  fee: 2400,
  decor: 'station',
  bounds: B,
  cam: { scale: 1.2, x: 640, y: 430 },
  key: { x: 640, y: 120 },
  palette: {
    ink: '#0a0c0f',
    wall: '#242a2b',
    floor: ['#080a0b', '#0b0d0e', '#060808'],
    accent: 'rgba(150, 200, 190, 0.55)',
  },
  walls: [
    // 三个出口门斗
    [74, 290, 180, 18],
    [74, 512, 180, 18],
    [1026, 290, 180, 18],
    [1026, 512, 180, 18],
    [500, 586, 18, 140],
    [762, 586, 18, 140],
  ].concat(BORDER),
  soft: [],
  props: [
    // 北侧停着的列车（挡视线）
    [74, 100, 1132, 86],
    // 站台柱、长椅、小卖亭
    [408, 300, 26, 26],
    [846, 300, 26, 26],
    [300, 630, 118, 26],
    [862, 630, 118, 26],
    [560, 360, 96, 54],
  ],
  zones: {
    platform: { x: 74, y: 210, w: 1132, h: 516 },
    west: WEST_ZONE,
    east: EAST_ZONE,
    south: SOUTH_ZONE,
  },
  spawns: {
    agents: [
      { role: 'veteran', x: 596, y: 470 },
      { role: 'rookie', x: 648, y: 508 },
      { role: 'lamp', x: 700, y: 466 },
    ],
    thralls: [],
    exit: { x: 640, y: 300 },
    wait: { x: 640, y: 486 },
  },
  rule: {
    kind: 'timetable',
    firstTrain: 18,
    phaseSeconds: 16,
    lastTrain: 96,
    order: ['south', 'west', 'east'],
    kiosk: { x: 608, y: 387, w: 96, h: 54 },
    shutters: {
      west: [236, 308, 18, 204],
      east: [1026, 308, 18, 204],
      south: [518, 586, 226, 18],
    },
    gates: {
      west: { x: 140, y: 410 },
      east: { x: 1122, y: 410 },
      south: { x: 631, y: 660 },
    },
  },
  boss: null,
  objectives: ['board', 'all'],
};

// ---- 第四案：稻田 · くねくね ---------------------------------------------

const PADDIES = [
  [74, 74, 446, 200], [74, 324, 446, 200], [74, 574, 446, 110],
  // 东边被第二条田埂（x 950–984）切成两半：从南头走到中段，才有第二条路
  [760, 74, 190, 200], [760, 324, 190, 200], [760, 574, 190, 110],
  [984, 74, 222, 200], [984, 324, 222, 200], [984, 574, 222, 110],
];

const RICEFIELD = {
  id: 'ricefield',
  no: 4,
  fee: 3000,
  decor: 'rice',
  bounds: B,
  cam: { scale: 1.4, x: 640, y: 420 },
  key: { x: 640, y: 640 },
  palette: {
    ink: '#080b0a',
    wall: '#232722',
    floor: ['#070a08', '#0a0d0a', '#050706'],
    accent: 'rgba(190, 210, 170, 0.5)',
  },
  walls: [
    // 农舍：中央田埂的尽头
    [540, 74, 18, 96],
    [742, 74, 18, 96],
  ].concat(BORDER),
  soft: PADDIES,
  props: [
    // 田埂上的石灯：第一盏在中段横埂的东头，第二盏在田尾水口的尽头。两处都要借火。
    // 石头本身不能站人，借火点（sx/sy）在它旁边的埂上。
    [1130, 288, 22, 22],
    [76, 686, 22, 22],
    [560, 286, 22, 22],
    [724, 470, 22, 22],
  ],
  zones: {
    gate: { x: 558, y: 84, w: 184, h: 106 },
    yard: { x: 520, y: 74, w: 240, h: 120 },
  },
  spawns: {
    agents: [
      { role: 'veteran', x: 1090, y: 700 },
      { role: 'rookie', x: 1136, y: 706 },
      { role: 'lamp', x: 1042, y: 702 },
    ],
    thralls: [],
    exit: { x: 650, y: 130 },
  },
  rule: {
    kind: 'gaze',
    range: 240,
    cone: 0.5,
    limit: 2.8,
    decay: 2.6,
    avertTime: 1.8,
    avertCd: 1.6,
    // 两盏石灯：西南那盏点亮之后，第二条田埂与中段横埂拐角那盏还要再借一次火。
    // sx/sy 是「站在哪里借火」，石头本身不能站人。
    lamps: [
      { x: 1141, y: 299, sx: 1100, sy: 300 },
      { x: 87, y: 697, sx: 124, sy: 705 },
    ],
    dike: [
      { x: 900, y: 300 }, { x: 720, y: 300 }, { x: 640, y: 300 },
      { x: 640, y: 214 }, { x: 640, y: 150 },
    ],
  },
  boss: { kind: 'kunekune', x: 644, y: 236, size: 1.9, hunt: { speed: 26, gazeSpeed: 88, standoff: 110 } },
  gazers: [
    { x: 496, y: 190, size: 1 },
    { x: 792, y: 190, size: 1 },
    { x: 496, y: 452, size: 1 },
    { x: 792, y: 646, size: 1 },
    { x: 330, y: 300, size: 1 },
    { x: 792, y: 430, size: 1 },
    { x: 500, y: 620, size: 1 },
    { x: 792, y: 300, size: 1 },
  ],
  objectives: ['lamp', 'watch'],
};

// ---- 第五案：十三楼 · 后室 -----------------------------------------------

const DOOR_LAYOUT = [
  // 沿外墙排开的十三扇门：内法线上的门牌中心，以及门朝走廊的法线
  { x: 150, y: 96, nx: 0, ny: 1 },
  { x: 290, y: 96, nx: 0, ny: 1 },
  { x: 430, y: 96, nx: 0, ny: 1 },
  { x: 570, y: 96, nx: 0, ny: 1 },
  { x: 710, y: 96, nx: 0, ny: 1 },
  { x: 850, y: 96, nx: 0, ny: 1 },
  { x: 990, y: 96, nx: 0, ny: 1 },
  { x: 1130, y: 96, nx: 0, ny: 1 },
  { x: 1186, y: 200, nx: -1, ny: 0 },
  { x: 1186, y: 330, nx: -1, ny: 0 },
  { x: 1186, y: 460, nx: -1, ny: 0 },
  { x: 1186, y: 590, nx: -1, ny: 0 },
  { x: 1100, y: 704, nx: 0, ny: -1 },
];

const BACKROOMS = {
  id: 'backrooms',
  no: 5,
  fee: 3600,
  decor: 'backrooms',
  bounds: B,
  cam: { scale: 1.4, x: 640, y: 420 },
  key: { x: 640, y: 380 },
  palette: {
    ink: '#0d0d09',
    wall: '#3a3826',
    floor: ['#0c0c08', '#11110c', '#090907'],
    accent: 'rgba(224, 206, 130, 0.55)',
  },
  walls: [
    // 电梯井
    [304, 206, 672, 330],
  ].concat(BORDER),
  soft: [],
  props: [
    [560, 236, 160, 120],
  ],
  doors: DOOR_LAYOUT,
  zones: {
    hall: { x: 74, y: 74, w: 1132, h: 652 },
    stair: { x: 74, y: 606, w: 170, h: 120 },
  },
  spawns: {
    agents: [
      { role: 'veteran', x: 146, y: 660 },
      { role: 'rookie', x: 190, y: 686 },
      { role: 'lamp', x: 108, y: 688 },
    ],
    thralls: [],
    exit: { x: 132, y: 664 },
  },
  rule: {
    kind: 'floors',
    floors: 4,
    readRange: 220,
    // 每层门牌的重排（13 个数），以及这一层要求走进的号
    plates: [
      [3, 9, 1, 12, 7, 2, 11, 6, 4, 13, 5, 8, 10],
      [11, 2, 8, 4, 13, 6, 3, 1, 9, 7, 12, 5, 10],
      [6, 12, 4, 9, 2, 11, 5, 13, 3, 8, 1, 10, 7],
      [8, 5, 13, 2, 7, 1, 12, 4, 10, 6, 9, 3, 11],
    ],
    wanted: [7, 11, 5, 13],
    mirrorEvery: 1,
  },
  boss: { kind: 'mirror', count: 3 },
  objectives: ['floor', 'exit'],
};

// ---- 第二批：第 6–15 案 ---------------------------------------------------
// 每宗都用现有相机/光照/走位/武器/经济；只有楼层、道具、规则和怪物是新的。

const SPAWN3 = [
  { role: 'veteran', x: 110, y: 640 },
  { role: 'rookie', x: 152, y: 672 },
  { role: 'lamp', x: 78, y: 678 },
];

const SCHOOL = {
  id: 'school', no: 6, fee: 4200, decor: 'school', bounds: B,
  cam: { scale: 1.4, x: 640, y: 420 }, key: { x: 900, y: 120 },
  palette: { ink: '#0a0c10', wall: '#2b2f33', floor: ['#080a0d', '#0b0d10', '#050608'], accent: 'rgba(180, 200, 190, 0.5)' },
  walls: [[620, 56, 18, 300], [620, 430, 18, 314], [900, 260, 300, 18]].concat(BORDER),
  soft: [],
  props: [[1080, 110, 92, 160], [700, 110, 80, 70], [700, 220, 80, 70]],
  lamps: [
    { x: 300, y: 180, r: 150, color: '210, 235, 225', glow: 0.07 },
    { x: 300, y: 520, r: 150, color: '210, 235, 225', glow: 0.07 },
    { x: 1000, y: 170, r: 130, color: '220, 240, 230', glow: 0.08 },
  ],
  zones: {
    bath: { x: 638, y: 74, w: 566, h: 226 },
    hall: { x: 74, y: 74, w: 540, h: 652 },
  },
  spawns: { agents: SPAWN3, thralls: [], exit: { x: 110, y: 640 } },
  rule: { batch2: true, kind: 'school', alpha: 0.66, stall: { x: 1120, y: 290 }, queue: { x: 560, y: 380 }, deadline: 200 },
  boss: { kind: 'hanako', x: 1120, y: 170 },
  objectives: ['queue', 'stall', 'out'],
};

const SHOPPING = {
  id: 'shopping', no: 7, fee: 4800, decor: 'shopping', bounds: B,
  cam: { scale: 1.35, x: 640, y: 420 }, key: { x: 640, y: 110 },
  palette: { ink: '#0b0c0d', wall: '#33302c', floor: ['#0a0908', '#0d0c0a', '#070606'], accent: 'rgba(210, 180, 120, 0.5)' },
  walls: [[74, 74, 360, 120], [520, 74, 300, 120], [900, 74, 250, 120], [300, 420, 240, 18], [820, 420, 240, 18]].concat(BORDER),
  soft: [],
  props: [[180, 260, 120, 40], [980, 260, 120, 40]],
  lamps: [
    { x: 300, y: 300, r: 170, color: '255, 200, 140', glow: 0.1 },
    { x: 900, y: 300, r: 170, color: '255, 200, 140', glow: 0.1 },
    { x: 640, y: 640, r: 150, color: '255, 210, 150', glow: 0.08 },
  ],
  zones: { street: { x: 74, y: 200, w: 1132, h: 526 } },
  spawns: { agents: SPAWN3, thralls: [], exit: { x: 1160, y: 680 } },
  rule: {
    batch2: true, kind: 'mask', alpha: 0.6, mask: { x: 250, y: 620 }, give: { x: 960, y: 330 },
    stand: { x: 860, y: 330 }, backLimit: 1.5, deadline: 220,
  },
  boss: { kind: 'slit', x: 1000, y: 300 },
  objectives: ['mask', 'give', 'out'],
};

const HOSPITAL = {
  id: 'hospital', no: 8, fee: 5400, decor: 'hospital', bounds: B,
  cam: { scale: 1.35, x: 640, y: 420 }, key: { x: 640, y: 90 },
  palette: { ink: '#0a0d0e', wall: '#2a3133', floor: ['#080b0c', '#0b0e0f', '#060809'], accent: 'rgba(160, 210, 205, 0.5)' },
  walls: [[620, 56, 18, 240], [620, 360, 18, 240], [620, 650, 18, 94], [300, 300, 180, 18], [820, 300, 180, 18]].concat(BORDER),
  soft: [],
  props: [[220, 160, 90, 60], [220, 560, 90, 60], [940, 560, 90, 60]],
  lamps: [
    { x: 220, y: 220, r: 160, color: '200, 240, 230', glow: 0.08 },
    { x: 940, y: 620, r: 160, color: '200, 240, 230', glow: 0.07 },
  ],
  zones: { left: { x: 74, y: 74, w: 540, h: 652 }, right: { x: 638, y: 74, w: 566, h: 652 } },
  spawns: { agents: SPAWN3, thralls: [], exit: { x: 1160, y: 680 } },
  rule: {
    batch2: true, kind: 'dark', alpha: 0.7, points: [{ x: 280, y: 220 }, { x: 280, y: 600 }, { x: 1000, y: 600 }],
    every: 20, deadline: 220,
  },
  boss: { kind: 'facedog', x: 300, y: 400 },
  objectives: ['wards', 'dark', 'out'],
};

const SUBWAY = {
  id: 'subway', no: 9, fee: 6000, decor: 'subway', bounds: B,
  cam: { scale: 1.3, x: 640, y: 420 }, key: { x: 640, y: 110 },
  palette: { ink: '#0a0b0d', wall: '#2a2b2e', floor: ['#08090b', '#0b0c0e', '#060708'], accent: 'rgba(190, 180, 150, 0.5)' },
  walls: [[74, 74, 160, 120], [1000, 74, 190, 120]].concat(BORDER),
  soft: [],
  props: [[56, 260, 304, 8], [400, 260, 304, 8], [744, 260, 304, 8], [1088, 260, 136, 8],
    [56, 380, 304, 8], [400, 380, 304, 8], [744, 380, 304, 8], [1088, 380, 136, 8],
    [56, 500, 304, 8], [400, 500, 304, 8], [744, 500, 304, 8], [1088, 500, 136, 8],
    [300, 580, 180, 26], [800, 580, 180, 26]],
  lamps: [
    { x: 300, y: 150, r: 160, color: '220, 230, 210', glow: 0.07 },
    { x: 900, y: 150, r: 160, color: '220, 230, 210', glow: 0.07 },
    { x: 640, y: 620, r: 150, color: '220, 230, 210', glow: 0.07 },
  ],
  zones: { track: { x: 74, y: 220, w: 1132, h: 340 } },
  spawns: { agents: SPAWN3, thralls: [], exit: { x: 1168, y: 680 } },
  rule: {
    batch2: true, kind: 'rail', alpha: 0.72, points: [{ x: 260, y: 200 }, { x: 640, y: 200 }, { x: 1000, y: 200 }],
    rails: [260, 380, 500], deadline: 220,
  },
  boss: { kind: 'teketeke', x: 1000, y: 380, rail: 380 },
  objectives: ['signals', 'rail', 'out'],
};

const APARTMENT404 = {
  id: 'apartment404', no: 10, fee: 6600, decor: 'apartment404', bounds: B,
  cam: { scale: 1.35, x: 640, y: 420 }, key: { x: 400, y: 120 },
  palette: { ink: '#0b0a09', wall: '#332e28', floor: ['#0a0908', '#0d0b09', '#060505'], accent: 'rgba(210, 180, 130, 0.5)' },
  walls: [[700, 56, 18, 300], [700, 460, 18, 284], [300, 430, 220, 18]].concat(BORDER),
  soft: [],
  props: [[240, 280, 80, 60], [980, 160, 90, 80]],
  lamps: [
    { x: 400, y: 240, r: 150, color: '255, 205, 150', glow: 0.09 },
    { x: 1000, y: 420, r: 140, color: '255, 205, 150', glow: 0.07 },
  ],
  zones: { room: { x: 74, y: 74, w: 1132, h: 652 }, phone: { x: 250, y: 290, w: 120, h: 80 } },
  doors: [{ x: 200, y: 96, face: 'n' }, { x: 900, y: 96, face: 'n' }, { x: 1186, y: 600, face: 'e' }],
  spawns: { agents: SPAWN3, thralls: [], exit: { x: 1160, y: 680 } },
  rule: {
    batch2: true, kind: 'phone', alpha: 0.7, phone: { x: 300, y: 320 }, every: 15, answerWindow: 8, calls: 3, deadline: 220,
  },
  boss: { kind: 'mary', x: 900, y: 120 },
  objectives: ['phone', 'calls', 'out'],
};

const STORE = {
  id: 'store', no: 11, fee: 7200, decor: 'store', bounds: B,
  cam: { scale: 1.35, x: 640, y: 420 }, key: { x: 640, y: 110 },
  palette: { ink: '#0b0a09', wall: '#3a332a', floor: ['#0a0907', '#0d0b08', '#070605'], accent: 'rgba(220, 190, 140, 0.5)' },
  walls: [[74, 74, 1132, 18], [300, 300, 18, 180], [900, 300, 18, 180]].concat(BORDER),
  soft: [],
  props: [[180, 92, 120, 60], [360, 92, 120, 60], [540, 92, 120, 60]],
  lamps: [
    { x: 300, y: 250, r: 150, color: '255, 210, 160', glow: 0.09 },
    { x: 900, y: 250, r: 150, color: '255, 210, 160', glow: 0.09 },
  ],
  zones: {
    lock1: { x: 180, y: 170, w: 120, h: 60 }, lock2: { x: 360, y: 170, w: 120, h: 60 }, lock3: { x: 540, y: 170, w: 120, h: 60 },
  },
  spawns: { agents: SPAWN3, thralls: [], exit: { x: 1160, y: 680 } },
  rule: {
    batch2: true, kind: 'hide', alpha: 0.64, count: 12, hides: [{ x: 240, y: 190 }, { x: 420, y: 190 }, { x: 600, y: 190 }], deadline: 180,
  },
  boss: { kind: 'doll', x: 900, y: 420 },
  objectives: ['count', 'hide', 'out'],
};

const OBSERVATORY = {
  id: 'observatory', no: 12, fee: 7800, decor: 'observatory', bounds: B,
  cam: { scale: 1.3, x: 640, y: 420 }, key: { x: 640, y: 90 },
  palette: { ink: '#080b10', wall: '#26303a', floor: ['#06090d', '#090c11', '#040608'], accent: 'rgba(150, 190, 230, 0.5)' },
  walls: [[300, 260, 18, 220], [960, 320, 18, 160], [500, 500, 280, 18]].concat(BORDER),
  soft: [],
  props: [[280, 180, 60, 60], [620, 180, 60, 60], [960, 180, 60, 60]],
  lamps: [
    { x: 640, y: 320, r: 190, color: '150, 190, 235', glow: 0.06 },
    { x: 300, y: 560, r: 130, color: '255, 200, 140', glow: 0.06 },
  ],
  zones: { dome: { x: 74, y: 74, w: 1132, h: 652 } },
  spawns: { agents: SPAWN3, thralls: [], exit: { x: 1160, y: 680 } },
  rule: {
    batch2: true, kind: 'watch', alpha: 0.68, points: [{ x: 310, y: 260 }, { x: 650, y: 260 }, { x: 990, y: 260 }], stand: 1.2, deadline: 220,
  },
  boss: { kind: 'slender', x: 640, y: 480 },
  objectives: ['scope', 'watch', 'out'],
};

const OLDFLAT = {
  id: 'oldflat', no: 13, fee: 8400, decor: 'oldflat', bounds: B,
  cam: { scale: 1.35, x: 640, y: 420 }, key: { x: 640, y: 90 },
  palette: { ink: '#0b0a08', wall: '#3a3226', floor: ['#0a0907', '#0d0b08', '#060505'], accent: 'rgba(210, 190, 140, 0.5)' },
  walls: [[74, 300, 420, 18], [760, 300, 446, 18]].concat(BORDER),
  soft: [],
  props: [[180, 120, 40, 52], [620, 120, 40, 52], [1060, 120, 40, 52]],
  lamps: [
    { x: 400, y: 260, r: 160, color: '255, 205, 150', glow: 0.07 },
    { x: 1000, y: 260, r: 160, color: '255, 205, 150', glow: 0.07 },
  ],
  zones: { flat: { x: 74, y: 74, w: 1132, h: 652 } },
  spawns: { agents: SPAWN3, thralls: [], exit: { x: 1160, y: 680 } },
  rule: {
    batch2: true, kind: 'photos', alpha: 0.7, points: [{ x: 200, y: 210 }, { x: 640, y: 210 }, { x: 1080, y: 210 }], stand: 1.2, deadline: 220,
  },
  boss: { kind: 'smile', x: 640, y: 430 },
  objectives: ['photos', 'burn', 'out'],
};

const LOCKER = {
  id: 'locker', no: 14, fee: 9000, decor: 'locker', bounds: B,
  cam: { scale: 1.35, x: 640, y: 420 }, key: { x: 640, y: 90 },
  palette: { ink: '#090a0b', wall: '#2c3033', floor: ['#08090a', '#0b0c0e', '#050607'], accent: 'rgba(180, 200, 210, 0.5)' },
  walls: [[300, 260, 18, 240], [960, 260, 18, 240]].concat(BORDER),
  soft: [],
  props: [[280, 140, 30, 84], [620, 140, 30, 84], [960, 140, 30, 84]],
  lamps: [
    { x: 400, y: 320, r: 150, color: '210, 235, 235', glow: 0.07 },
    { x: 900, y: 320, r: 150, color: '210, 235, 235', glow: 0.07 },
  ],
  zones: { room: { x: 74, y: 74, w: 1132, h: 652 } },
  spawns: { agents: SPAWN3, thralls: [], exit: { x: 1160, y: 680 } },
  rule: {
    batch2: true, kind: 'mirrors', alpha: 0.74, points: [{ x: 295, y: 182 }, { x: 635, y: 182 }, { x: 975, y: 182 }], stand: 1.2, deadline: 220,
  },
  boss: { kind: 'mimic', x: 640, y: 440 },
  objectives: ['mirrors', 'turn', 'out'],
};

const DEPARTMENT = {
  id: 'department', no: 15, fee: 9600, decor: 'department', bounds: B,
  cam: { scale: 1.3, x: 640, y: 420 }, key: { x: 640, y: 90 },
  palette: { ink: '#0a0908', wall: '#3a332c', floor: ['#090807', '#0c0a08', '#060504'], accent: 'rgba(220, 190, 140, 0.55)' },
  walls: [[74, 300, 400, 18], [740, 300, 250, 18], [1050, 300, 156, 18], [74, 560, 400, 18], [740, 560, 250, 18], [1050, 560, 156, 18]].concat(BORDER),
  soft: [],
  props: [[300, 600, 60, 30], [900, 600, 60, 30]],
  lamps: [
    { x: 300, y: 200, r: 160, color: '255, 215, 160', glow: 0.09 },
    { x: 640, y: 200, r: 160, color: '255, 215, 160', glow: 0.09 },
    { x: 980, y: 200, r: 160, color: '255, 215, 160', glow: 0.09 },
    { x: 640, y: 640, r: 170, color: '255, 220, 170', glow: 0.08 },
  ],
  zones: {
    esc1: { x: 200, y: 150, w: 180, h: 70 }, esc2: { x: 550, y: 150, w: 180, h: 70 }, esc3: { x: 900, y: 150, w: 180, h: 70 },
    ground: { x: 74, y: 580, w: 1132, h: 146 },
  },
  spawns: { agents: SPAWN3, thralls: [], exit: { x: 1160, y: 680 } },
  rule: {
    batch2: true, kind: 'escalator', alpha: 0.58, points: [{ x: 290, y: 185 }, { x: 640, y: 185 }, { x: 990, y: 185 }],
    every: 40, open: 10, deadline: 200,
  },
  boss: { kind: 'mannequin', x: 640, y: 440 },
  objectives: ['escalator', 'window', 'out'],
};

export const CASES = [OPERA, APARTMENT, STATION, RICEFIELD, BACKROOMS, SCHOOL, SHOPPING, HOSPITAL, SUBWAY, APARTMENT404, STORE, OBSERVATORY, OLDFLAT, LOCKER, DEPARTMENT];

export function caseById(id) {
  return CASES.find((c) => c.id === id) || CASES[0];
}

export const CAM_VIEW = VIEW;
