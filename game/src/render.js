// 俯拍的五层楼，按电影的样子打光：一条主光从各案的主方向下来，两处补光，其余交给暗部。
// 木头有漆面、水田有水光、后室的墙纸有接缝。人在光里只有轮廓和一点脸。

import { PALETTE, TUNING, VIEW } from './config.js';
import { L } from './text.js';

// The lens: a long lens on the floor, not the whole house. 1.4× puts a body at ~40 px and the
// camera rides the squad centroid, clamped so the matte never shows past the walls.
const CAM = { scale: 1.4, x: 640, y: 420 };
let BOUNDS = { x0: 56, y0: 56, x1: 1224, y1: 744 };
let KEY = { x: 840, y: 180 };
let camClock = -1;

export function screenToWorld(sx, sy) {
  return {
    x: CAM.x + (sx - VIEW.width / 2) / CAM.scale,
    y: CAM.y + (sy - VIEW.height / 2) / CAM.scale,
  };
}

function followSquad(game, time) {
  const base = game.case.cam.scale;
  BOUNDS = game.case.bounds;
  KEY = game.case.key;
  let cx = CAM.x;
  let cy = CAM.y;
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (const a of game.agents) {
    if (a.extracted || a.taken) continue;
    sx += a.x;
    sy += a.y;
    n += 1;
  }
  if (n) {
    cx = sx / n;
    cy = sy / n;
  }
  const dt = camClock < 0 ? 0.016 : Math.min(0.08, Math.max(0, time - camClock));
  camClock = time;
  // 镜头也有一场戏：亮相的时候推到台口，给完剪影再交还跟随。
  const shot = game.shot;
  let w = 0;
  let targetScale = base;
  let tx = cx;
  let ty = cy;
  if (shot) {
    shot.t += dt;
    const push = 0.8;
    const hold = 0.9;
    const pull = 0.9;
    const ease = (v) => (v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v));
    if (shot.t < push) w = ease(shot.t / push);
    else if (shot.t < push + hold) w = 1;
    else w = ease(Math.max(0, 1 - (shot.t - push - hold) / pull));
    if (shot.t > push + hold + pull) {
      game.shot = null;
      w = 0;
    }
    shot.w = w;
    tx = cx + (shot.x - cx) * w;
    ty = cy + (shot.y - cy) * w;
    targetScale = base + (shot.scale - base) * w;
  }
  CAM.scale = targetScale;
  const halfW = VIEW.width / 2 / CAM.scale;
  const halfH = VIEW.height / 2 / CAM.scale;
  const k = 1 - Math.exp(-dt * 5);
  if (shot && w > 0.001) {
    // 推镜是一次真正的推：0.8 秒内到位，不靠指数的尾巴慢慢蹭过去。
    CAM.x = tx;
    CAM.y = ty;
  } else {
    CAM.x += (tx - CAM.x) * k;
    CAM.y += (ty - CAM.y) * k;
  }
  CAM.x = Math.min(BOUNDS.x1 - halfW, Math.max(BOUNDS.x0 + halfW, CAM.x));
  CAM.y = Math.min(BOUNDS.y1 - halfH, Math.max(BOUNDS.y0 + halfH, CAM.y));
}

// Supersampling: the world is drawn at 2× into an offscreen plate and then resampled down, so
// every edge, rim and fold gets a real antialiased edge. The interface stays at 1× and crisp.
let plate = null;
function plateOf() {
  if (plate) return plate;
  const canvas = document.createElement('canvas');
  canvas.width = VIEW.width * 2;
  canvas.height = VIEW.height * 2;
  plate = { canvas, ctx: canvas.getContext('2d') };
  return plate;
}

export function drawFrame(ctx, game, time) {
  const p = plateOf();
  const w = p.ctx;
  w.setTransform(2, 0, 0, 2, 0, 0);
  w.clearRect(0, 0, VIEW.width, VIEW.height);
  drawWorld(w, game, time);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(p.canvas, 0, 0, VIEW.width, VIEW.height);
}

let grain = null;
function grainTile() {
  if (grain) return grain;
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + Math.random() * 135;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 26;
  }
  g.putImageData(img, 0, 0);
  grain = c;
  return c;
}

// Materials are four layers: grain, light, specular, contact shadow. These two tiles are the
// grain layer, generated once and repeated so the floor and the seats have a surface.
let wood = null;
function woodTile() {
  if (wood) return wood;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1512';
  g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 90; i += 1) {
    const y = Math.random() * 128;
    g.strokeStyle = `rgba(${90 + Math.random() * 60}, ${60 + Math.random() * 40}, ${40 + Math.random() * 26}, ${0.05 + Math.random() * 0.08})`;
    g.lineWidth = 0.6 + Math.random() * 1.2;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 2);
    g.stroke();
  }
  for (let i = 0; i < 4; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 128;
    g.strokeStyle = 'rgba(20, 14, 10, 0.55)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(x, y, 4 + Math.random() * 5, 2 + Math.random() * 2, Math.random(), 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = 'rgba(0, 0, 0, 0.35)';
  g.fillRect(0, 0, 256, 1);
  g.fillRect(0, 127, 256, 1);
  wood = c;
  return c;
}

// Wool: a twill weave at 32 px, one diagonal in the light and one against it. Generated once and
// laid over the coat inside its own silhouette, so the cloth moves with the body.
let wool = null;
let woolPattern = null;
function woolTile() {
  if (wool) return wool;
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d');
  for (let i = 0; i < 64; i += 1) {
    const y = i * 0.5;
    g.strokeStyle = i % 2 ? 'rgba(255, 240, 220, 0.06)' : 'rgba(0, 0, 0, 0.16)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(32, y);
    g.stroke();
  }
  for (let i = 0; i < 26; i += 1) {
    const x = Math.random() * 32;
    g.strokeStyle = 'rgba(255, 246, 232, 0.035)';
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(x, Math.random() * 32);
    g.lineTo(x + 3, Math.random() * 32);
    g.stroke();
  }
  wool = c;
  return c;
}

let velvet = null;
function velvetTile() {
  if (velvet) return velvet;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 900; i += 1) {
    const v = Math.random();
    g.fillStyle = v > 0.5 ? `rgba(170, 70, 70, ${0.05 + v * 0.08})` : `rgba(20, 6, 8, ${0.05 + v * 0.1})`;
    g.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
  }
  velvet = c;
  return c;
}

// One light, one shadow direction: +x a little, +y more, soft edge.
function castShadow(ctx, x, y, rx, ry, alpha = 0.5) {
  const g = ctx.createRadialGradient(x + 5, y + 9, 2, x + 5, y + 9, Math.max(rx, ry) * 1.25);
  g.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
  g.addColorStop(0.55, `rgba(0, 0, 0, ${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x + 5, y + 9, rx * 1.25, ry * 1.25, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawWorld(ctx, game, time) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  followSquad(game, time);
  if (typeof window !== 'undefined' && window.__nwCam) window.__nwCam(CAM);
  ctx.save();
  ctx.translate(VIEW.width / 2, VIEW.height / 2);
  ctx.scale(CAM.scale, CAM.scale);
  ctx.translate(-CAM.x, -CAM.y);
  const shake = game.shake;
  ctx.translate(Math.sin(time * 71) * shake, Math.cos(time * 53) * shake);

  drawFloor(ctx, game, time);
  drawDecor(ctx, game, time);
  drawProps(ctx, game, time);
  drawWalls(ctx, game);
  drawDoors(ctx, game, time);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawFlashlights(ctx, game);
  ctx.restore();

  drawBullets(ctx, game);
  drawThralls(ctx, game, time);
  drawAgents(ctx, game, time);
  drawSpatter(ctx, game);
  drawDebris(ctx, game);
  drawWorldMarks(ctx, game, time);
  if (game.case.rule.kind === 'power' && !game.power) {
    ctx.fillStyle = 'rgba(4, 7, 12, 0.34)';
    ctx.fillRect(40, 40, VIEW.width - 80, VIEW.height - 80);
  }
  ctx.restore();

  drawPost(ctx, game, time);
}

// ---- the floor of each floor ---------------------------------------------

function drawFloor(ctx, game, time) {
  const c = game.case;
  const [top, mid, bottom] = c.palette.floor;
  const base = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  base.addColorStop(0, top);
  base.addColorStop(0.5, mid);
  base.addColorStop(1, bottom);
  ctx.fillStyle = base;
  ctx.fillRect(-80, -80, VIEW.width + 160, VIEW.height + 160);

  if (c.decor === 'opera') drawOperaSurface(ctx, time);
  else if (c.decor === 'corridor') drawCorridorSurface(ctx, time);
  else if (c.decor === 'station') drawStationSurface(ctx, time);
  else if (c.decor === 'rice') drawRiceSurface(ctx, time);
  else drawBackroomsSurface(ctx, time);

  // contact darkening along every wall foot
  for (const [x, y, w, h] of c.walls) {
    const down = ctx.createLinearGradient(0, y + h, 0, y + h + 12);
    down.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    down.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = down;
    ctx.fillRect(x - 2, y + h, w + 4, 12);
  }

  // the light that is in the room: one key, one fill at the way out
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const warm = c.decor === 'opera' || c.decor === 'corridor';
  const keyTint = warm ? '255, 198, 132' : c.decor === 'station' ? '150, 210, 220' : c.decor === 'rice' ? '170, 200, 220' : '236, 216, 140';
  const key = ctx.createRadialGradient(c.key.x, c.key.y, 20, c.key.x, c.key.y + 40, 580);
  key.addColorStop(0, `rgba(${keyTint}, 0.15)`);
  key.addColorStop(0.45, `rgba(${keyTint}, 0.055)`);
  key.addColorStop(1, `rgba(${keyTint}, 0)`);
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  const exit = c.spawns.exit;
  if (exit) {
    const glow = ctx.createRadialGradient(exit.x, exit.y, 6, exit.x, exit.y, 180);
    glow.addColorStop(0, 'rgba(255, 196, 130, 0.16)');
    glow.addColorStop(1, 'rgba(255, 160, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, 180, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // dust in the beam
  if (c.decor !== 'rice') {
    for (let i = 0; i < 34; i += 1) {
      const x = 120 + ((i * 137) % 1040) + Math.sin(time * 0.5 + i) * 10;
      const y = 120 + ((i * 71) % 600) + Math.cos(time * 0.4 + i) * 8;
      ctx.fillStyle = `rgba(255, 222, 176, ${0.03 + (i % 4) * 0.01})`;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  }
}

function drawOperaSurface(ctx, time) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = ctx.createPattern(woodTile(), 'repeat');
  ctx.fillRect(40, 40, VIEW.width - 80, VIEW.height - 80);
  ctx.restore();
  const varnish = ctx.createLinearGradient(0, 40, 0, VIEW.height - 40);
  varnish.addColorStop(0, 'rgba(255, 200, 140, 0.1)');
  varnish.addColorStop(0.45, 'rgba(120, 150, 190, 0.02)');
  varnish.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = varnish;
  ctx.fillRect(40, 40, VIEW.width - 80, VIEW.height - 80);
  for (let y = 60; y < 740; y += 34) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(40, y + 32, VIEW.width - 80, 2);
    ctx.fillStyle = 'rgba(190, 205, 225, 0.05)';
    ctx.fillRect(40, y, VIEW.width - 80, 1);
  }
}

function drawCorridorSurface(ctx, time) {
  // old stone tile, one size, seams on a 64 grid
  for (let y = 40; y < 760; y += 64) {
    for (let x = 40; x < 1240; x += 64) {
      const v = ((x * 7 + y * 13) % 17) / 17;
      ctx.fillStyle = `rgba(${42 + v * 16}, ${40 + v * 14}, ${36 + v * 12}, 1)`;
      ctx.fillRect(x, y, 63, 63);
      ctx.fillStyle = 'rgba(255, 240, 220, 0.02)';
      ctx.fillRect(x, y, 63, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(x, y + 62, 63, 2);
      ctx.fillRect(x + 62, y, 2, 63);
    }
  }
  // the runner: two long strips of worn red carpet down the corridors
  const runner = (x, y, w, h) => {
    ctx.fillStyle = 'rgba(66, 24, 26, 0.72)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(150, 108, 70, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    for (let i = 0; i < w; i += 10) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(x + i, y + 5, 1, h - 10);
    }
  };
  runner(74, 152, 1132, 56);
  runner(74, 590, 1132, 56);
  runner(174, 74, 56, 652);
  runner(1060, 74, 56, 652);
  // water stains on the ceiling tiles
  for (let i = 0; i < 9; i += 1) {
    const x = 120 + ((i * 211) % 1000);
    const y = 120 + ((i * 157) % 560);
    ctx.fillStyle = 'rgba(30, 22, 14, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, 26 + (i % 4) * 9, 14 + (i % 3) * 8, i, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStationSurface(ctx, time) {
  // platform tiles: cool, wet, a 48 grid, with the tactile line at the track edge
  for (let y = 200; y < 740; y += 48) {
    for (let x = 40; x < 1240; x += 48) {
      const v = ((x * 3 + y * 11) % 13) / 13;
      ctx.fillStyle = `rgba(${30 + v * 12}, ${36 + v * 14}, ${38 + v * 14}, 1)`;
      ctx.fillRect(x, y, 47, 47);
      ctx.fillStyle = 'rgba(180, 220, 220, 0.05)';
      ctx.fillRect(x, y, 47, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x, y + 46, 47, 2);
    }
  }
  const line = ctx.createLinearGradient(0, 186, 0, 210);
  line.addColorStop(0, 'rgba(196, 172, 96, 0.34)');
  line.addColorStop(1, 'rgba(196, 172, 96, 0)');
  ctx.fillStyle = line;
  ctx.fillRect(74, 186, 1132, 24);
  ctx.fillStyle = 'rgba(210, 188, 110, 0.5)';
  ctx.fillRect(74, 200, 1132, 3);
  // puddles
  for (let i = 0; i < 7; i += 1) {
    const x = 160 + ((i * 263) % 940);
    const y = 300 + ((i * 131) % 380);
    ctx.fillStyle = 'rgba(120, 170, 175, 0.06)';
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + (i % 3) * 14, 12 + (i % 2) * 7, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRiceSurface(ctx, time) {
  // wet earth, then grass, then the paddies themselves (water is drawn in drawDecor)
  ctx.fillStyle = 'rgba(18, 22, 18, 0.9)';
  ctx.fillRect(40, 40, VIEW.width - 80, VIEW.height - 80);
  for (let i = 0; i < 700; i += 1) {
    const x = 40 + ((i * 97) % 1160);
    const y = 40 + ((i * 173) % 660);
    const h = 2 + (i % 4);
    ctx.strokeStyle = i % 3 ? 'rgba(58, 72, 46, 0.4)' : 'rgba(84, 96, 60, 0.28)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(time * 0.6 + i) * 1.2, y - h);
    ctx.stroke();
  }
}

function drawBackroomsSurface(ctx, time) {
  // damp mustard carpet: noise, seams every 80 px, and the stains that never dry
  for (let y = 40; y < 760; y += 80) {
    for (let x = 40; x < 1240; x += 80) {
      const v = ((x * 5 + y * 3) % 19) / 19;
      ctx.fillStyle = `rgba(${46 + v * 18}, ${42 + v * 16}, ${26 + v * 10}, 1)`;
      ctx.fillRect(x, y, 79, 79);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x, y + 78, 79, 2);
    }
  }
  for (let i = 0; i < 1200; i += 1) {
    const x = 40 + ((i * 131) % 1160);
    const y = 40 + ((i * 67) % 660);
    ctx.fillStyle = i % 4 ? 'rgba(20, 18, 10, 0.25)' : 'rgba(120, 108, 60, 0.12)';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  for (let i = 0; i < 8; i += 1) {
    const x = 220 + ((i * 197) % 860);
    const y = 160 + ((i * 149) % 500);
    const g = ctx.createRadialGradient(x, y, 6, x, y, 54);
    g.addColorStop(0, 'rgba(30, 26, 12, 0.4)');
    g.addColorStop(1, 'rgba(30, 26, 12, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 54, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- 每一层自己的东西 -----------------------------------------------------

function drawApartment(ctx, game, time) {
  const c = game.case;
  // 走廊顶灯：一个个暖黄的光池，间距比人走得快
  for (let y = 140; y < 720; y += 210) {
    for (const x of [180, 640, 1100]) {
      const flick = 0.8 + Math.sin(time * 3.1 + x + y) * 0.06;
      const g = ctx.createRadialGradient(x, y, 4, x, y, 150);
      g.addColorStop(0, `rgba(255, 214, 158, ${0.09 * flick})`);
      g.addColorStop(0.6, `rgba(255, 196, 130, ${0.035 * flick})`);
      g.addColorStop(1, 'rgba(255, 180, 110, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 150, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 中间那条横穿的近路：水磨石，和走廊的红毯分开
  ctx.fillStyle = 'rgba(52, 48, 42, 0.5)';
  ctx.fillRect(344, 366, 592, 68);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(344, 366, 592, 2);
  ctx.fillRect(344, 432, 592, 2);
  for (let x = 352; x < 936; x += 34) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.fillRect(x, 368, 1, 64);
  }
  // 每扇门旁边一盏小壁灯，门口才是暖的
  for (const d of c.doors) {
    const g = ctx.createRadialGradient(d.x, d.y, 2, d.x, d.y, 62);
    g.addColorStop(0, `rgba(255, 198, 132, ${0.1 + Math.sin(time * 2 + d.x) * 0.012})`);
    g.addColorStop(1, 'rgba(255, 180, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 226, 180, 0.55)';
    ctx.fillRect(d.x - 1.5, d.y - 1.5, 3, 3);
  }
  // 楼梯间：一扇门，门后是唯一不在这栋楼里的地方
  const zone = c.zones.stair;
  const lit = game.clock >= game.rule.dawn;
  ctx.fillStyle = lit ? 'rgba(255, 208, 150, 0.22)' : 'rgba(8, 10, 12, 0.85)';
  ctx.fillRect(zone.x + 10, zone.y + 10, zone.w - 20, zone.h - 20);
  ctx.strokeStyle = lit ? 'rgba(255, 214, 160, 0.75)' : 'rgba(201, 162, 90, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(zone.x + 10.5, zone.y + 10.5, zone.w - 21, zone.h - 21);
  ctx.fillStyle = lit ? 'rgba(255, 226, 180, 0.9)' : 'rgba(180, 176, 164, 0.4)';
  ctx.fillRect(zone.x + 16, zone.y + 14, 44, 2);
  ctx.fillRect(zone.x + 16, zone.y + 20, 28, 1.4);
  ctx.save();
  ctx.translate(zone.x + zone.w - 26, zone.y + 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = lit ? 'rgba(255, 236, 200, 0.7)' : 'rgba(150, 146, 136, 0.35)';
  ctx.font = `8px ${L.fonts.mono}`;
  ctx.letterSpacing = '2px';
  ctx.fillText('STAIRS', 0, 0);
  ctx.restore();
  // 墙上的门牌号
  for (let i = 0; i < c.doors.length; i += 1) {
    const d = c.doors[i];
    ctx.fillStyle = 'rgba(186, 180, 168, 0.28)';
    ctx.font = `7px ${L.fonts.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}`, d.x + 22, d.y + 26);
  }
}

function drawStation(ctx, game, time) {
  const c = game.case;
  const r = game.rule;
  // 轨道：站台与车之间的一条黑
  ctx.fillStyle = 'rgba(2, 4, 5, 0.9)';
  ctx.fillRect(74, 186, 1132, 18);
  ctx.fillStyle = 'rgba(120, 150, 155, 0.18)';
  ctx.fillRect(74, 190, 1132, 1);
  ctx.fillRect(74, 200, 1132, 1);

  // 站牌：三盏灯，只有这一班亮
  const bx = 610;
  const by = 236;
  ctx.fillStyle = 'rgba(8, 11, 12, 0.92)';
  ctx.fillRect(bx, by, 140, 44);
  ctx.strokeStyle = 'rgba(150, 200, 190, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, 139, 43);
  const names = ['south', 'west', 'east'];
  names.forEach((name, i) => {
    const gx = bx + 24 + i * 46;
    const live = r.open === name && r.admitted < 1;
    ctx.fillStyle = live ? 'rgba(214, 240, 228, 0.95)' : 'rgba(90, 110, 110, 0.4)';
    ctx.beginPath();
    ctx.arc(gx, by + 20, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = live ? 'rgba(214, 240, 228, 0.8)' : 'rgba(120, 140, 140, 0.4)';
    ctx.font = `7px ${L.fonts.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText(L.hud.gates[name], gx, by + 36);
  });
  // 站台钟：秒针在走，没人看
  const cx = 350;
  const cy = 240;
  ctx.strokeStyle = 'rgba(160, 200, 195, 0.32)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.stroke();
  const ang = -Math.PI / 2 + (game.clock % 60) / 60 * Math.PI * 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ang) * 11, cy + Math.sin(ang) * 11);
  ctx.stroke();
}

function drawPaddies(ctx, game, time) {
  const c = game.case;
  for (const [x, y, w, h] of c.soft) {
    // 泥埂
    ctx.fillStyle = 'rgba(30, 26, 18, 0.9)';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    // 水面
    const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
    g.addColorStop(0, '#15282c');
    g.addColorStop(0.5, '#0f1f22');
    g.addColorStop(1, '#091315');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // 月亮和天光：一条被水揉碎的亮带
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i += 1) {
      const yy = y + 18 + i * ((h - 30) / 9);
      const wob = Math.sin(time * 0.7 + i * 1.7 + x) * 14;
      ctx.fillStyle = `rgba(190, 220, 230, ${0.06 + (i % 3) * 0.02})`;
      ctx.fillRect(x + 16 + wob, yy, w * 0.6, 2.2);
    }
    // 水面上的稻行：一团团更暗的绿
    for (let i = 0; i < 26; i += 1) {
      const px = x + 8 + ((i * 73) % (w - 16));
      const py = y + 8 + ((i * 41) % (h - 16));
      ctx.fillStyle = 'rgba(54, 76, 50, 0.16)';
      ctx.beginPath();
      ctx.ellipse(px, py, 3.4, 7, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 稻：沿水边一圈短竖线
    for (let i = 0; i < w; i += 14) {
      const gy = y + 10 + Math.sin(time * 0.5 + i) * 1.2;
      ctx.strokeStyle = i % 3 ? 'rgba(74, 88, 50, 0.55)' : 'rgba(96, 108, 58, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + i + 4, gy);
      ctx.lineTo(x + i + 2 + Math.sin(time + i) * 2, gy - 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + i + 4, y + h - 10);
      ctx.lineTo(x + i + 5 + Math.sin(time + i) * 2, y + h - 17);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 农舍：木地板、门、门里那盏灯
  const zone = c.zones.gate;
  ctx.fillStyle = 'rgba(34, 26, 18, 0.95)';
  ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  for (let i = 0; i < zone.w; i += 22) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(zone.x + i, zone.y, 1.4, zone.h);
  }
  ctx.fillStyle = 'rgba(255, 200, 130, 0.12)';
  ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  ctx.strokeStyle = 'rgba(201, 162, 90, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(zone.x + 0.5, zone.y + 0.5, zone.w - 1, zone.h - 1);
  const lamp = ctx.createRadialGradient(zone.x + zone.w / 2, zone.y + zone.h - 14, 4, zone.x + zone.w / 2, zone.y + zone.h - 14, 120);
  lamp.addColorStop(0, 'rgba(255, 206, 140, 0.2)');
  lamp.addColorStop(1, 'rgba(255, 180, 110, 0)');
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(zone.x + zone.w / 2, zone.y + zone.h - 14, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 226, 180, 0.85)';
  ctx.fillRect(zone.x + zone.w / 2 - 8, zone.y + zone.h - 18, 16, 2);
}

function drawBackroomsDecor(ctx, game, time) {
  const c = game.case;
  // 日光灯管：每隔一段一根，会闪
  const tubes = [
    [180, 130], [420, 130], [760, 130], [1010, 130],
    [150, 380], [1100, 380], [400, 640], [900, 640],
  ];
  for (const [x, y] of tubes) {
    const flick = Math.sin(time * 9 + x) > 0.96 ? 0.35 : 1;
    const g = ctx.createLinearGradient(x - 52, 0, x + 52, 0);
    g.addColorStop(0, 'rgba(232, 216, 140, 0)');
    g.addColorStop(0.5, `rgba(240, 226, 160, ${0.1 * flick})`);
    g.addColorStop(1, 'rgba(232, 216, 140, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 52, y - 26, 104, 52);
    ctx.fillStyle = `rgba(246, 238, 200, ${0.35 * flick})`;
    ctx.fillRect(x - 44, y - 2, 88, 4);
    ctx.fillStyle = 'rgba(90, 86, 56, 0.8)';
    ctx.fillRect(x - 46, y - 4, 92, 1);
  }
  // 地毯上的 13
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#f0e2b0';
  ctx.font = `96px ${L.fonts.display}`;
  ctx.textAlign = 'center';
  ctx.fillText('13', 640, 690);
  ctx.restore();
  // 楼梯间
  const zone = c.zones.stair;
  const open = game.rule.gateOpen;
  ctx.fillStyle = open ? 'rgba(255, 214, 156, 0.3)' : 'rgba(10, 10, 8, 0.9)';
  ctx.fillRect(zone.x + 8, zone.y + 8, zone.w - 16, zone.h - 16);
  ctx.strokeStyle = open ? 'rgba(255, 226, 180, 0.8)' : 'rgba(120, 112, 84, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(zone.x + 8.5, zone.y + 8.5, zone.w - 17, zone.h - 17);
  ctx.fillStyle = open ? 'rgba(255, 240, 206, 0.9)' : 'rgba(160, 150, 110, 0.35)';
  ctx.font = `8px ${L.fonts.mono}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.fillText('STAIRS', zone.x + zone.w / 2, zone.y + 34);
}

// ---- 门：公寓的门、车站的卷帘、十三楼的门牌 ------------------------------

function drawDoors(ctx, game, time) {
  const c = game.case;
  const r = game.rule;
  if (c.decor === 'corridor') {
    for (let i = 0; i < c.doors.length; i += 1) {
      const d = c.doors[i];
      const knock = r.knock && r.knock.door === i;
      const w = d.face === 'n' || d.face === 's' ? 54 : 24;
      const h = d.face === 'n' || d.face === 's' ? 24 : 54;
      const x = d.x - w / 2;
      const y = d.y - h / 2;
      ctx.fillStyle = 'rgba(12, 10, 8, 0.85)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = knock ? 'rgba(214, 96, 80, 0.9)' : 'rgba(201, 162, 90, 0.34)';
      ctx.lineWidth = knock ? 2 : 1.2;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = 'rgba(201, 162, 90, 0.5)';
      const hx = d.face === 'n' || d.face === 's' ? d.x + 18 : d.x;
      const hy = d.face === 'n' || d.face === 's' ? d.y : d.y + 18;
      ctx.beginPath();
      ctx.arc(hx, hy, 1.8, 0, Math.PI * 2);
      ctx.fill();
      if (knock) {
        const pulse = (time * 1.6) % 1;
        for (let k = 0; k < 3; k += 1) {
          const t = Math.max(0, pulse - k * 0.28);
          if (t <= 0) continue;
          ctx.strokeStyle = `rgba(214, 96, 80, ${(1 - t) * 0.75})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 12 + t * 46, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  if (c.decor === 'station') {
    // 活着的那个门斗：里面是暖的，外面是冷的
    for (const [name, zone] of Object.entries(c.zones)) {
      if (name === 'platform') continue;
      const live = r.open === name && r.admitted < 1;
      if (!live) continue;
      const cx = zone.x + zone.w / 2;
      const cy = zone.y + zone.h / 2;
      const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.max(zone.w, zone.h) * 0.9);
      g.addColorStop(0, 'rgba(255, 226, 180, 0.16)');
      g.addColorStop(1, 'rgba(255, 200, 140, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      ctx.strokeStyle = 'rgba(255, 226, 180, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.strokeRect(zone.x + 6.5, zone.y + 6.5, zone.w - 13, zone.h - 13);
      ctx.setLineDash([]);
      // 地上的门名：只有一个字，亮的那一个是活的
      ctx.fillStyle = 'rgba(255, 236, 200, 0.12)';
      ctx.font = `54px ${L.fonts.display}`;
      ctx.textAlign = 'center';
      ctx.fillText(L.hud.gates[name], cx, cy + 18);
    }
    for (const [name, rect] of Object.entries(c.rule.shutters)) {
      const [x, y, w, h] = rect;
      const live = r.open === name && r.admitted < 1;
      if (live) {
        // 门开了：里面是白的，什么都看不见
        const g = ctx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, 'rgba(226, 236, 230, 0.12)');
        g.addColorStop(0.5, 'rgba(236, 244, 238, 0.38)');
        g.addColorStop(1, 'rgba(226, 236, 230, 0.1)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        continue;
      }
      // 卷帘：一条条横板
      ctx.fillStyle = 'rgba(26, 30, 30, 0.98)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(130, 150, 148, 0.22)';
      ctx.lineWidth = 1;
      if (w > h) {
        for (let i = 6; i < h; i += 9) {
          ctx.beginPath();
          ctx.moveTo(x, y + i);
          ctx.lineTo(x + w, y + i);
          ctx.stroke();
        }
      } else {
        for (let i = 6; i < w; i += 9) {
          ctx.beginPath();
          ctx.moveTo(x + i, y);
          ctx.lineTo(x + i, y + h);
          ctx.stroke();
        }
      }
      ctx.fillStyle = r.admitted >= 1 && r.open === name ? 'rgba(206, 96, 86, 0.7)' : 'rgba(160, 200, 195, 0.25)';
      ctx.fillRect(x + w / 2 - 10, y + (w > h ? 7 : h / 2 - 10), 20, 2);
    }
  }

  if (c.decor === 'backrooms') {
    // 十三扇门：一块深色的门板，门口一块搪瓷门牌。远处看不清，走近才读得出。
    for (let i = 0; i < c.doors.length; i += 1) {
      const d = c.doors[i];
      const depth = 26;
      const w = d.nx === 0 ? 58 : depth;
      const h = d.nx === 0 ? depth : 58;
      const x = d.nx === 0 ? d.x - 29 : d.nx > 0 ? d.x - 22 : d.x + 22 - depth;
      const y = d.ny === 0 ? d.y - 29 : d.ny > 0 ? d.y - 22 : d.y + 22 - depth;
      ctx.fillStyle = 'rgba(7, 7, 5, 0.94)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(240, 226, 160, 0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      // 门把手
      ctx.fillStyle = 'rgba(190, 176, 120, 0.4)';
      const hx = d.nx === 0 ? d.x + 22 : d.x;
      const hy = d.ny === 0 ? d.y : d.y + 22;
      ctx.beginPath();
      ctx.arc(hx, hy, 1.7, 0, Math.PI * 2);
      ctx.fill();

      // 门牌：在走廊一侧，不在门里
      const px = d.x + d.nx * 24;
      const py = d.y + d.ny * 24;
      let read = false;
      for (const a of game.agents) {
        if (a.extracted || a.taken) continue;
        if (Math.hypot(a.x - d.x, a.y - d.y) < c.rule.readRange) {
          read = true;
          break;
        }
      }
      const plate = c.rule.plates && c.rule.plates[i];
      ctx.fillStyle = read ? 'rgba(236, 226, 186, 0.95)' : 'rgba(120, 112, 82, 0.3)';
      ctx.fillRect(px - 11, py - 7, 22, 14);
      ctx.strokeStyle = read ? 'rgba(40, 36, 20, 0.7)' : 'rgba(60, 56, 36, 0.4)';
      ctx.strokeRect(px - 10.5, py - 6.5, 21, 13);
      if (read) {
        ctx.fillStyle = 'rgba(22, 20, 12, 0.95)';
        ctx.font = `9px ${L.fonts.mono}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${plate}`, px, py + 0.5);
        ctx.textBaseline = 'alphabetic';
      } else {
        ctx.fillStyle = 'rgba(30, 28, 18, 0.4)';
        ctx.fillRect(px - 5, py - 2, 10, 3);
      }
    }
  }
}

// 世界里的读数：敲门的门、注视条、移开目光
function drawWorldMarks(ctx, game, time) {
  const r = game.rule;
  if (r.kind === 'gaze') {
    const lamps = game.case.rule.lamps || [];
    const at = lamps[Math.min(r.lights, lamps.length - 1)];
    if (!r.lit && at) {
      const pulse = 0.45 + Math.sin(time * 2.4) * 0.2;
      ctx.strokeStyle = `rgba(214, 198, 160, ${pulse})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.arc(at.sx, at.sy, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 226, 180, 0.7)';
      ctx.fillRect(at.sx - 2, at.sy - 2, 4, 4);
    }
    for (let i = 0; i < lamps.length; i += 1) {
      if (!(r.lit || r.lights > i)) continue;
      const l = lamps[i];
      const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 90);
      g.addColorStop(0, 'rgba(255, 214, 150, 0.18)');
      g.addColorStop(1, 'rgba(255, 190, 110, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 90, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) continue;
      if (a.gaze > 0.02) {
        const pct = Math.min(1, a.gaze / game.case.rule.limit);
        ctx.strokeStyle = pct > 0.66 ? 'rgba(206, 108, 96, 0.9)' : 'rgba(214, 198, 160, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();
      }
      if (a.aversion > 0) {
        ctx.strokeStyle = 'rgba(168, 196, 182, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 27, 0.4, 2.6);
        ctx.stroke();
      }
    }
  }
  if (r.kind === 'knock' && r.knock) {
    const d = game.case.doors[r.knock.door];
    // 被门吸走的人：一条虚线，从人身上牵到门
    for (const a of game.agents) {
      if (a.answered !== r.knock.door || a.down || a.taken) continue;
      ctx.strokeStyle = 'rgba(206, 96, 86, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (r.knock.warn > 0) {
      // 提示期：地上一条红线，指向那扇门
      const pulse = 0.4 + Math.sin(time * 12) * 0.25;
      ctx.strokeStyle = `rgba(206, 96, 86, ${pulse})`;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(d.x, d.y, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (r.kind === 'timetable') {
    // 站台尽头的一列灯，下一班的方向
    const gate = game.case.rule.gates[r.open];
    const gx = 640;
    const gy = 214;
    ctx.strokeStyle = 'rgba(160, 226, 210, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx - 30, gy);
    ctx.lineTo(gx + 30, gy);
    ctx.stroke();
    const ang = Math.atan2(gate.y - gy, gate.x - gx);
    ctx.beginPath();
    ctx.moveTo(gx + Math.cos(ang) * 26, gy + Math.sin(ang) * 26);
    ctx.lineTo(gx + Math.cos(ang) * 34, gy + Math.sin(ang) * 34);
    ctx.stroke();
  }
}

function drawDecor(ctx, game, time) {
  const c = game.case;
  if (c.decor === 'opera') {
    drawCarpet(ctx);
    drawStage(ctx, game, time);
    drawSeats(ctx, c.seats || []);
  } else if (c.decor === 'corridor') {
    drawApartment(ctx, game, time);
  } else if (c.decor === 'station') {
    drawStation(ctx, game, time);
  } else if (c.decor === 'rice') {
    drawPaddies(ctx, game, time);
  } else {
    drawBackroomsDecor(ctx, game, time);
  }
}

function drawCarpet(ctx) {
  const mat = (x, y, w, h) => {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(96, 26, 30, 0.5)');
    g.addColorStop(0.5, 'rgba(72, 20, 24, 0.4)');
    g.addColorStop(1, 'rgba(58, 16, 20, 0.32)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(201, 162, 90, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
    for (let i = 0; i < h; i += 8) {
      ctx.beginPath();
      ctx.moveTo(x + 4, y + i);
      ctx.lineTo(x + w - 4, y + i);
      ctx.stroke();
    }
  };
  mat(448, 578, 70, 60);
  mat(704, 306, 38, 330);
  mat(704, 176, 156, 34);
}

function drawStage(ctx, game, time) {
  const stage = game.case.zones.stage;
  const cx = stage.x + stage.w / 2;
  const floor = ctx.createLinearGradient(0, stage.y - 18, 0, stage.y + stage.h + 18);
  floor.addColorStop(0, '#2a1c16');
  floor.addColorStop(0.5, '#1a1210');
  floor.addColorStop(1, '#100c0b');
  ctx.fillStyle = floor;
  ctx.fillRect(stage.x - 18, stage.y - 18, stage.w + 36, stage.h + 36);

  // the curtain: deep velvet, folds every 14 px, a gold valance along the top
  const curtain = (x, w) => {
    for (let i = 0; i < w; i += 14) {
      const sway = Math.sin(time * 0.55 + i * 0.08) * 2.2;
      const shade = 0.5 + Math.sin(i * 0.4) * 0.14;
      ctx.fillStyle = `rgba(${Math.round(112 * shade + 20)}, ${Math.round(26 * shade + 8)}, ${Math.round(30 * shade + 8)}, 0.95)`;
      ctx.fillRect(x + i + sway, stage.y - 18, 14, stage.h + 36);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(x + i + sway, stage.y - 18, 2, stage.h + 36);
    }
  };
  curtain(stage.x - 18, 220);
  curtain(stage.x + stage.w - 196, 214);

  ctx.fillStyle = 'rgba(201, 162, 90, 0.5)';
  ctx.fillRect(stage.x - 18, stage.y - 18, stage.w + 36, 3);
  ctx.fillRect(stage.x - 18, stage.y + stage.h + 14, stage.w + 36, 3);

  // footlights
  for (let x = stage.x + 40; x < stage.x + stage.w - 40; x += 54) {
    const flicker = 0.55 + Math.sin(time * 3 + x) * 0.12;
    const glow = ctx.createRadialGradient(x, stage.y + stage.h + 12, 2, x, stage.y + stage.h + 12, 30);
    glow.addColorStop(0, `rgba(255, 214, 156, ${0.55 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 170, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, stage.y + stage.h + 12, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // the aria: a slow wash over the boards while the power is on
  if (game.power) {
    const pulse = 0.5 + Math.sin(time * 1.3) * 0.14;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const aria = ctx.createRadialGradient(cx, 170, 20, cx, 200, 320);
    aria.addColorStop(0, `rgba(255, 200, 140, ${0.14 * pulse})`);
    aria.addColorStop(1, 'rgba(255, 170, 100, 0)');
    ctx.fillStyle = aria;
    ctx.fillRect(470, 40, 740, 400);
    ctx.restore();
  }
}

function drawSeats(ctx, seats) {
  for (const s of seats) {
    // contact shadow under the row
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(s.x - 2, s.y + s.h - 2, s.w + 6, 5);

    // the back: a velvet top surface, lit from the stage
    const grad = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
    grad.addColorStop(0, 'rgba(122, 34, 38, 1)');
    grad.addColorStop(0.35, 'rgba(84, 22, 26, 1)');
    grad.addColorStop(1, 'rgba(44, 12, 16, 1)');
    ctx.fillStyle = grad;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = ctx.createPattern(velvetTile(), 'repeat');
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.restore();

    // piping: a bright bead along the lit edge, a dark one at the foot
    ctx.fillStyle = 'rgba(232, 190, 150, 0.35)';
    ctx.fillRect(s.x + 1, s.y + 1, s.w - 2, 1.4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(s.x, s.y + s.h - 2.5, s.w, 2.5);
    // the seam down the middle of the back
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(s.x + s.w / 2 - 0.5, s.y + 4, 1, s.h - 7);
  }
}

// A piece of furniture from straight above: a top face, a lit edge, a shadow pocket at its foot.
function propBlock(ctx, x, y, w, h, top = 'rgba(34, 38, 44, 1)', base = 'rgba(16, 19, 24, 1)') {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(x + 3, y + 5, w + 3, h + 3);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, base);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(220, 230, 240, 0.16)';
  ctx.fillRect(x, y, w, 1.3);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x, y + h - 2, w, 2);
}

function drawProps(ctx, game, time) {
  const c = game.case;
  for (const [x, y, w, h] of c.props) {
    // 歌剧院的座椅与售票亭由 drawSeats / drawOperaProps 自己画，不能再压一层深色方块
    if (c.decor === 'opera') continue;
    if (c.decor === 'rice') {
      // 石灯：一个方座，一盏小灯。田里四块石头里只有两盏是真的，点着的那盏才亮。
      const lamps = c.rule.lamps || [];
      const cx = x + w / 2;
      const cy = y + h / 2;
      const idx = lamps.findIndex((l) => Math.abs(l.x - cx) < 6 && Math.abs(l.y - cy) < 6);
      const on = idx >= 0 && (game.rule.lights > idx || game.rule.lit);
      propBlock(ctx, x, y, w, h, '#3a3c32', '#191b16');
      const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 34);
      if (on) {
        g.addColorStop(0, `rgba(255, 208, 150, ${0.34 + Math.sin(time * 2 + x) * 0.05})`);
        g.addColorStop(1, 'rgba(255, 180, 110, 0)');
      } else {
        g.addColorStop(0, 'rgba(120, 126, 110, 0.12)');
        g.addColorStop(1, 'rgba(120, 126, 110, 0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = on ? 'rgba(255, 226, 180, 0.9)' : 'rgba(96, 100, 88, 0.7)';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
    } else if (c.decor === 'station' && w > 600) {
      // 停着的列车：车顶、车窗的一条冷光
      propBlock(ctx, x, y, w, h, '#2a3134', '#0b0f11');
      ctx.fillStyle = 'rgba(150, 200, 205, 0.16)';
      ctx.fillRect(x + 20, y + 12, w - 40, 10);
      for (let i = x + 24; i < x + w - 30; i += 76) {
        ctx.fillStyle = 'rgba(196, 226, 226, 0.28)';
        ctx.fillRect(i, y + 14, 44, 7);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(i + 44, y + 14, 3, 7);
      }
      ctx.fillStyle = 'rgba(210, 180, 110, 0.4)';
      ctx.fillRect(x + 10, y + h - 12, w - 20, 2);
    } else if (c.decor === 'station') {
      // 长椅与小卖亭
      propBlock(ctx, x, y, w, h, '#39322a', '#15120e');
      for (let i = 0; i < w; i += 16) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + i, y + 3, 1.4, h - 6);
      }
      ctx.fillStyle = 'rgba(220, 190, 140, 0.2)';
      ctx.fillRect(x, y, w, 1);
    } else {
      propBlock(ctx, x, y, w, h, '#22262e', '#0c0f14');
      ctx.strokeStyle = 'rgba(190, 205, 225, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    }
  }

  if (c.decor === 'opera') drawOperaProps(ctx, game);
  if (c.decor === 'corridor') drawApartmentProps(ctx, game);
}

function drawOperaProps(ctx, game) {
  const exit = game.case.spawns.exit;
  ctx.strokeStyle = 'rgba(201, 162, 90, 0.75)';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x - 18, exit.y - 28, 36, 56);
  const door = ctx.createLinearGradient(exit.x - 15, 0, exit.x + 15, 0);
  door.addColorStop(0, 'rgba(255, 210, 150, 0.12)');
  door.addColorStop(0.5, 'rgba(255, 226, 180, 0.4)');
  door.addColorStop(1, 'rgba(255, 210, 150, 0.14)');
  ctx.fillStyle = door;
  ctx.fillRect(exit.x - 15, exit.y - 25, 30, 50);
  ctx.fillStyle = 'rgba(20, 16, 12, 0.8)';
  ctx.fillRect(exit.x - 1.5, exit.y - 28, 3, 56);

  // ticket booth
  ctx.fillStyle = '#12161d';
  ctx.fillRect(280, 356, 108, 56);
  ctx.fillStyle = '#1b2029';
  ctx.fillRect(280, 356, 108, 4);
  ctx.strokeStyle = 'rgba(201, 162, 90, 0.18)';
  ctx.strokeRect(280.5, 356.5, 107, 55);
  const win = ctx.createLinearGradient(292, 368, 338, 392);
  win.addColorStop(0, 'rgba(255, 206, 146, 0.32)');
  win.addColorStop(1, 'rgba(255, 180, 110, 0.1)');
  ctx.fillStyle = win;
  ctx.fillRect(292, 368, 46, 24);
  ctx.fillStyle = 'rgba(255, 226, 180, 0.8)';
  ctx.fillRect(320, 380, 14, 2);

  // switchboard
  const sw = game.case.spawns.switchboard;
  ctx.fillStyle = '#10151c';
  ctx.fillRect(sw.x - 26, sw.y - 18, 52, 36);
  ctx.strokeStyle = '#2c3644';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(sw.x - 26, sw.y - 18, 52, 36);
  const lamp = game.power ? 'rgba(140, 240, 190, 0.95)' : 'rgba(140, 60, 60, 0.7)';
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(sw.x + 14, sw.y - 8, 3, 0, Math.PI * 2);
  ctx.fill();
  if (game.power) {
    const halo = ctx.createRadialGradient(sw.x + 14, sw.y - 8, 1, sw.x + 14, sw.y - 8, 20);
    halo.addColorStop(0, 'rgba(140, 240, 190, 0.35)');
    halo.addColorStop(1, 'rgba(140, 240, 190, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sw.x + 14, sw.y - 8, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(200, 214, 236, 0.35)';
  for (let i = 0; i < 3; i += 1) ctx.fillRect(sw.x - 18, sw.y - 8 + i * 8, 22, 2);
}

function drawApartmentProps(ctx, game) {
  // 电梯：两扇铜门，中间一道缝
  ctx.fillStyle = '#0d0f12';
  ctx.fillRect(590, 502, 100, 26);
  ctx.fillStyle = 'rgba(201, 162, 90, 0.22)';
  ctx.fillRect(590, 502, 100, 1.5);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(639, 502, 2, 26);
  ctx.fillStyle = 'rgba(201, 162, 90, 0.4)';
  ctx.fillRect(596, 508, 2, 2);
  ctx.fillRect(682, 508, 2, 2);
}

function drawWalls(ctx, game) {
  const c = game.case;
  for (const [x, y, w, h] of c.walls) {
    const big = w > 76 && h > 76;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, c.palette.wall);
    g.addColorStop(0.25, '#181c24');
    g.addColorStop(1, '#0b0e13');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    if (big) {
      // 一块楼板，不是一个洞：顶面、女儿墙、分格缝，几处屋顶设备
      ctx.fillStyle = 'rgba(120, 134, 150, 0.045)';
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
      ctx.strokeStyle = 'rgba(200, 216, 232, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      for (let i = 44; i < w - 20; i += 44) {
        ctx.beginPath();
        ctx.moveTo(x + i, y + 6);
        ctx.lineTo(x + i, y + h - 6);
        ctx.stroke();
      }
      for (let i = 40; i < h - 18; i += 40) {
        ctx.beginPath();
        ctx.moveTo(x + 6, y + i);
        ctx.lineTo(x + w - 6, y + i);
        ctx.stroke();
      }
      // 屋顶的两处设备：一截风管、一个水箱
      ctx.fillStyle = 'rgba(160, 176, 190, 0.09)';
      ctx.fillRect(x + w * 0.62, y + h * 0.3, 54, 22);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x + w * 0.62, y + h * 0.3 + 19, 54, 3);
      ctx.fillStyle = 'rgba(150, 166, 178, 0.08)';
      ctx.beginPath();
      ctx.arc(x + w * 0.26, y + h * 0.62, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 216, 232, 0.1)';
      ctx.beginPath();
      ctx.arc(x + w * 0.26, y + h * 0.62, 17, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(190, 205, 225, 0.22)';
    ctx.fillRect(x, y, w, 1.5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(x, y + h - 2, w, 2);
    if (c.decor === 'backrooms') {
      // 后室的墙纸：竖接缝，湿斑
      ctx.fillStyle = 'rgba(224, 206, 130, 0.07)';
      for (let i = 8; i < w; i += 26) ctx.fillRect(x + i, y + 2, 1, h - 4);
      ctx.fillStyle = 'rgba(30, 26, 12, 0.3)';
      ctx.fillRect(x, y + h * 0.4, w, 1);
    } else if (c.decor === 'station') {
      ctx.fillStyle = 'rgba(160, 200, 200, 0.12)';
      ctx.fillRect(x, y + h * 0.5, w, 1);
    } else if (c.decor === 'corridor') {
      // 走廊下半墙的护墙板
      ctx.fillStyle = 'rgba(120, 96, 66, 0.16)';
      ctx.fillRect(x, y + h * 0.62, w, h * 0.36);
    } else if (w > 120) {
      ctx.fillStyle = 'rgba(201, 162, 90, 0.16)';
      ctx.fillRect(x, y + h * 0.55, w, 1);
    }
    if (c.decor !== 'corridor' && c.decor !== 'backrooms') {
      // 女儿墙的投影落在地板上
      const shade = ctx.createLinearGradient(0, y + h, 0, y + h + 10);
      shade.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      shade.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shade;
      ctx.fillRect(x, y + h, w, 10);
    }
  }
}

function drawFlashlights(ctx, game) {
  for (const a of game.agents) {
    if (a.down || a.taken || a.extracted || a.charmed) continue;
    const reach = a.trait === 'nighteyes' ? 368 : 320;
    const half = 0.33;
    for (let i = 0; i < 8; i += 1) {
      const t = (i + 1) / 8;
      const h = half * (0.45 + t * 0.55);
      const grad = ctx.createRadialGradient(a.x, a.y, 10, a.x, a.y, reach * (0.7 + t * 0.3));
      grad.addColorStop(0, `rgba(255, 230, 190, ${0.2 * (1 - t) + 0.035})`);
      grad.addColorStop(1, 'rgba(255, 200, 140, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.arc(a.x, a.y, reach * (0.7 + t * 0.3), a.aim - h, a.aim + h);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (const a of game.agents) {
    if (a.role !== 'lamp' || a.down || a.taken || a.extracted) continue;
    const grad = ctx.createRadialGradient(a.x, a.y, 6, a.x, a.y, 150);
    grad.addColorStop(0, 'rgba(255, 214, 160, 0.28)');
    grad.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 150, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawThralls(ctx, game, time) {
  const dim = game.shot ? 1 - 0.42 * (game.shot.w || 0) : 1;
  for (const t of game.thralls) {
    if (t.dead && !(t.death && !t.death.done)) continue;
    if (t.kind === 'spider') {
      drawSpider(ctx, t, time, dim);
      continue;
    }
    if (t.kind === 'spiderling') {
      drawSpiderling(ctx, t, time);
      continue;
    }
    if (t.kind === 'hachi') {
      drawHachi(ctx, t, time);
      continue;
    }
    if (t.kind === 'kune') {
      drawKune(ctx, t, time);
      continue;
    }
    if (t.kind === 'mirror') continue;
    const fall = t.dead && t.death && !t.death.done ? 1 - t.death.t / t.death.dur : 0;
    ctx.save();
    ctx.translate(t.x, t.y);

    // contact shadow, cast the same way as everything else
    const sh = ctx.createRadialGradient(4, 7, 1, 4, 7, 20);
    sh.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
    sh.addColorStop(0.5, 'rgba(0, 0, 0, 0.26)');
    sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(4, 8, 19, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(t.aim + Math.PI / 2);
    if (fall > 0) {
      // 向前栽倒：整个身体顺着枪口方向扑出去，电视压在更前面。
      const p = Math.min(1, fall);
      ctx.translate(0, -9 * p);
      ctx.scale(1 + 0.12 * p, 1 - 0.2 * p);
    }
    const swing = Math.sin(t.step * 1.4) * 3.6;
    // winding up: the set goes red a beat before it comes at you
    if (t.charge > 0) {
      const pulse = 0.55 + Math.sin(time * 30) * 0.35;
      const glow = ctx.createRadialGradient(0, -28, 2, 0, -28, 36);
      glow.addColorStop(0, `rgba(255, 64, 52, ${0.4 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 40, 30, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -28, 36, 0, Math.PI * 2);
      ctx.fill();
    }
    const suit = '#4b453a';
    const suitLit = '#6f6758';
    const lb = Math.atan2(KEY.y - t.y, KEY.x - t.x) - (t.aim + Math.PI / 2);
    const litX = Math.cos(lb);
    const litY = Math.sin(lb);
    const suitGrad = ctx.createLinearGradient(litX * 12, litY * 12, -litX * 13, -litY * 13);
    suitGrad.addColorStop(0, suitLit);
    suitGrad.addColorStop(0.55, suit);
    suitGrad.addColorStop(1, '#15140f');

    // the legs: from above only the boots show, one ahead of the other
    for (const b of [{ x: -4.6, y: 8.6 - swing, a: -0.06 }, { x: 4.6, y: 8.6 + swing, a: 0.06 }]) {
      ctx.strokeStyle = '#191712';
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x * 0.9, 5.2);
      ctx.lineTo(b.x, b.y - 2.6);
      ctx.stroke();
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(1.2, 2, 3.2, 4.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0c0a08';
      ctx.beginPath();
      ctx.roundRect(-2.2, -3.4, 4.4, 7, 2.1);
      ctx.fill();
      ctx.fillStyle = 'rgba(190, 200, 210, 0.12)';
      ctx.beginPath();
      ctx.roundRect(-1.6, -3, 3.2, 2.9, 1.4);
      ctx.fill();
      ctx.restore();
    }

    // the jacket: shoulders, back, a short hem — no shirt, no tie, nothing from the front
    ctx.fillStyle = suitGrad;
    ctx.beginPath();
    ctx.moveTo(-10.6, -3);
    ctx.quadraticCurveTo(-12.4, 1, -9.6, 3.6);
    ctx.quadraticCurveTo(-8.6, 7.8, -7.4, 9);
    ctx.quadraticCurveTo(0, 10.4, 7.4, 9);
    ctx.quadraticCurveTo(8.6, 7.8, 9.6, 3.6);
    ctx.quadraticCurveTo(12.4, 1, 10.6, -3);
    ctx.quadraticCurveTo(0, -6.4, -10.6, -3);
    ctx.closePath();
    ctx.fill();
    // shoulder seams
    ctx.strokeStyle = 'rgba(10, 9, 7, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8.4, -2.6);
    ctx.quadraticCurveTo(-9.2, 2.4, -8, 8.4);
    ctx.moveTo(8.4, -2.6);
    ctx.quadraticCurveTo(9.2, 2.4, 8, 8.4);
    ctx.stroke();

    // the arms come forward to carry the set: both forearms under its front corners
    for (const side of [-1, 1]) {
      ctx.strokeStyle = suit;
      ctx.lineWidth = 5.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(side * 8.2, -0.4);
      ctx.lineTo(side * 8.6, -5.4);
      ctx.stroke();
      ctx.strokeStyle = suitLit;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(side * 8.7, -1.2);
      ctx.lineTo(side * 9.1, -5.2);
      ctx.stroke();
      ctx.fillStyle = '#8d7a63';
      ctx.beginPath();
      ctx.arc(side * 6.6, -6.6, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // the set on the shoulders, from above: a plastic top, the bevel, vents at the back,
    // a handle, and the only screen you can see — one crushed hot line at the front.
    const setGrad = ctx.createLinearGradient(-6, -11, 7, 3);
    setGrad.addColorStop(0, '#9a9180');
    setGrad.addColorStop(0.42, '#6b6558');
    setGrad.addColorStop(1, '#2a2923');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.roundRect(-7.4, -10.2, 15.4, 14.6, 2);
    ctx.fill();
    ctx.fillStyle = setGrad;
    ctx.beginPath();
    ctx.roundRect(-7.5, -11, 15, 14.4, 1.8);
    ctx.fill();
    // the case seam: a bezel line all the way round the top face
    ctx.strokeStyle = 'rgba(16, 16, 13, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(-6.1, -9.7, 12.2, 11.6, 1.2);
    ctx.stroke();
    // the bevel: lit along the front top edge, dark where the case turns away
    ctx.fillStyle = 'rgba(255, 250, 236, 0.2)';
    ctx.beginPath();
    ctx.roundRect(-6.9, -10.6, 13.8, 1.8, 0.9);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(-6.6, 2.2, 13.2, 1.2);
    // vents at the back of the top face
    ctx.strokeStyle = 'rgba(18, 18, 15, 0.5)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-4.4, 0.4 + i * 1.5);
      ctx.lineTo(4.4, 0.4 + i * 1.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#38352d';
    ctx.beginPath();
    ctx.roundRect(-2.8, 2.6, 5.6, 1.6, 0.6);
    ctx.fill();
    // the channel dial and the volume knob, along the right of the top face
    ctx.fillStyle = '#1d1c17';
    ctx.beginPath();
    ctx.arc(6.6, -4.4, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6.6, -1.2, 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 246, 220, 0.22)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(6.6, -5.4);
    ctx.lineTo(6.6, -3.4);
    ctx.stroke();
    // the gloss on the plastic: one soft streak, corner to corner
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#fff6e2';
    ctx.beginPath();
    ctx.moveTo(-6.4, -2.2);
    ctx.lineTo(-2.2, -9.2);
    ctx.lineTo(1.4, -9.2);
    ctx.lineTo(-2.6, -2.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // the screen line, and the light it throws on the floor in front of him
    const flick = 0.55 + Math.sin(time * 24 + t.step * 3) * 0.3;
    ctx.fillStyle = `rgba(168, 244, 228, ${0.9 * flick})`;
    ctx.fillRect(-7.8, -10.9, 15.6, 1.5);
    const spill = ctx.createLinearGradient(0, -10, 0, -38);
    spill.addColorStop(0, `rgba(140, 235, 215, ${0.24 * flick})`);
    spill.addColorStop(1, 'rgba(140, 235, 215, 0)');
    ctx.fillStyle = spill;
    ctx.beginPath();
    ctx.moveTo(-7.4, -10.4);
    ctx.lineTo(7.4, -10.4);
    ctx.lineTo(15, -36);
    ctx.lineTo(-15, -36);
    ctx.closePath();
    ctx.fill();

    // antennas out of the back of the case: rabbit ears, long and thin, with a bead at the tip
    ctx.strokeStyle = '#47453a';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-5, 2.6);
    ctx.lineTo(-9.4, 12.6);
    ctx.moveTo(5, 2.6);
    ctx.lineTo(9.4, 12.6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 246, 220, 0.28)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-4.8, 2.8);
    ctx.lineTo(-9.1, 12.2);
    ctx.moveTo(5.2, 2.8);
    ctx.lineTo(9.7, 12.2);
    ctx.stroke();
    ctx.fillStyle = '#5d5a4c';
    ctx.beginPath();
    ctx.arc(-9.4, 12.6, 1.1, 0, Math.PI * 2);
    ctx.arc(9.4, 12.6, 1.1, 0, Math.PI * 2);
    ctx.fill();

    if (t.hitFlash > 0.02) {
      // a short bloom on the set, not a white disc over the whole body
      const hit = ctx.createRadialGradient(0, -4, 1, 0, -4, 19);
      hit.addColorStop(0, `rgba(255, 246, 232, ${0.55 * t.hitFlash})`);
      hit.addColorStop(0.5, `rgba(255, 226, 196, ${0.16 * t.hitFlash})`);
      hit.addColorStop(1, 'rgba(255, 210, 170, 0)');
      ctx.fillStyle = hit;
      ctx.beginPath();
      ctx.arc(0, -4, 19, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (t.hp < t.maxHp && !t.dead) {
      const w = 32;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(t.x - w / 2, t.y - 50, w, 3);
      ctx.fillStyle = 'rgba(200, 90, 80, 0.9)';
      ctx.fillRect(t.x - w / 2, t.y - 50, (w * t.hp) / t.maxHp, 3);
    }
  }
}

// The tsuchigumo: a woman in a white dress on the boards, eight legs under the hem, and the
// screen only sees her crown. Everything here is local to her facing.
function drawSpider(ctx, t, time, dim = 1) {
  const rise = t.rise === undefined ? 1 : t.rise;
  const dying = t.dead && t.death && !t.death.done ? 1 - t.death.t / t.death.dur : 0;
  ctx.save();
  ctx.translate(t.x, t.y);
  if (dying > 0) {
    // 跪落：裙子先塌下去，头往下沉，八条腿收进来。
    const p = Math.min(1, dying);
    ctx.translate(4 * p, 9 * p);
    ctx.scale(0.94 + 0.1 * p, 1 - 0.42 * p);
    ctx.globalAlpha = 0.9;
    const pool = ctx.createRadialGradient(0, 14, 6, 0, 14, 54);
    pool.addColorStop(0, `rgba(10, 6, 8, ${0.5 * p})`);
    pool.addColorStop(1, 'rgba(10, 6, 8, 0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(0, 14, 50, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 起身：从台口地板下升上来，先是一团更黑的影，再是人。镜头里她先只是一个剪影。
  if (rise < 1 || dim < 1) {
    ctx.globalAlpha = (0.25 + 0.75 * rise) * dim;
    const glow = ctx.createRadialGradient(0, 10, 6, 0, 10, 88);
    glow.addColorStop(0, `rgba(255, 206, 150, ${(0.26 * (1 - rise) + 0.14) * (1.2 - dim)})`);
    glow.addColorStop(0.5, `rgba(210, 120, 70, ${0.14 * (1 - rise) + 0.06})`);
    glow.addColorStop(1, 'rgba(210, 120, 70, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 10, 88, 0, Math.PI * 2);
    ctx.fill();
  }
  const sh = ctx.createRadialGradient(6, 14, 4, 6, 14, 46);
  sh.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(6, 16, 44, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(t.aim + Math.PI / 2);
  const rs = 0.5 + 0.5 * rise;
  ctx.scale(1.5 * rs, 1.5 * rs);

  // eight legs, two joints each, alternating like a gait instead of waving together. The stage
  // behind her is almost black, so the legs carry their own rim: without it the silhouette — the
  // only thing that says "spider" — disappears into the boards.
  const lightA = Math.atan2(KEY.y - t.y, KEY.x - t.x) - (t.aim + Math.PI / 2);
  const litX = Math.cos(lightA);
  const litY = Math.sin(lightA);
  const legs = [];
  for (let i = 0; i < 8; i += 1) {
    const side = i < 4 ? -1 : 1;
    const k = i % 4;
    const baseY = -14 + k * 10;
    const phase = Math.sin(t.step * 3 + k * 1.7 + (side > 0 ? Math.PI : 0));
    legs.push({
      side,
      baseY,
      kneeX: side * 27,
      kneeY: baseY - 15 + phase * 5,
      footX: side * (43 + phase * 3),
      footY: baseY + 15 + phase * 7,
    });
  }
  // contact: each foot puts a small dark knot on the boards, offset with the main light
  ctx.fillStyle = 'rgba(6, 4, 6, 0.4)';
  for (const leg of legs) {
    ctx.beginPath();
    ctx.ellipse(leg.footX + 1.4, leg.footY + 2, 3.2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  // thigh thicker than shin: the joint reads as a joint, not as two straight wires
  ctx.strokeStyle = 'rgba(38, 30, 35, 0.96)';
  ctx.lineWidth = 3.2;
  for (const leg of legs) {
    ctx.beginPath();
    ctx.moveTo(leg.side * 14, leg.baseY);
    ctx.lineTo(leg.kneeX, leg.kneeY);
    ctx.stroke();
  }
  ctx.lineWidth = 1.9;
  for (const leg of legs) {
    ctx.beginPath();
    ctx.moveTo(leg.kneeX, leg.kneeY);
    ctx.lineTo(leg.footX, leg.footY);
    ctx.stroke();
  }
  // the lit side of each segment: a hair of warm light where the stage lamp catches the joint
  ctx.strokeStyle = 'rgba(232, 196, 164, 0.2)';
  ctx.lineWidth = 0.7;
  for (const leg of legs) {
    ctx.beginPath();
    ctx.moveTo(leg.side * 14 + litX * 1.2, leg.baseY + litY * 1.2);
    ctx.lineTo(leg.kneeX + litX * 1.2, leg.kneeY + litY * 1.2);
    ctx.lineTo(leg.footX + litX * 1.2, leg.footY + litY * 1.2);
    ctx.stroke();
  }
  // knees and feet: a hard little bead, already catching light on one side
  for (const leg of legs) {
    ctx.fillStyle = 'rgba(24, 19, 23, 0.98)';
    ctx.beginPath();
    ctx.arc(leg.kneeX, leg.kneeY, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(236, 198, 164, 0.34)';
    ctx.beginPath();
    ctx.arc(leg.kneeX + litX * 0.8, leg.kneeY + litY * 0.8, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // the dress: broad shoulders under the head, a kimono collar crossing at the nape, and a hem
  // that falls wider than the shoulders. A shape that tapers at both ends reads as a moth; the
  // blunt shoulder line is what makes it a person with something crawling out from under her.
  const dress = ctx.createLinearGradient(0, -34, 0, 30);
  dress.addColorStop(0, '#e6e0d4');
  dress.addColorStop(0.55, '#cfc8ba');
  dress.addColorStop(1, '#a8a195');
  ctx.fillStyle = dress;
  ctx.beginPath();
  ctx.moveTo(-12, -30);
  ctx.bezierCurveTo(-16, -23, -19, -8, -21, 8);
  ctx.lineTo(-21, 26);
  ctx.bezierCurveTo(-10, 32, 10, 32, 21, 26);
  ctx.lineTo(21, 8);
  ctx.bezierCurveTo(19, -8, 16, -23, 12, -30);
  ctx.bezierCurveTo(6, -33, -6, -33, -12, -30);
  ctx.closePath();
  ctx.fill();
  // kimono sleeves: two pale wings hanging off the shoulders, so the top of the figure is not a
  // bare teardrop. The cuff fold is the only dark line on them.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 11, -23);
    const sleeve = ctx.createLinearGradient(0, -4, side * 10, 15);
    sleeve.addColorStop(0, '#eae4d8');
    sleeve.addColorStop(1, '#b4ada0');
    ctx.fillStyle = sleeve;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * 10, 1, side * 11, 10);
    ctx.quadraticCurveTo(side * 9, 17, side * 2.5, 16);
    ctx.quadraticCurveTo(-side * 2, 9, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(76, 66, 62, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(side * 1.6, 2);
    ctx.quadraticCurveTo(side * 7, 7, side * 5.4, 14);
    ctx.stroke();
    ctx.restore();
  }
  ctx.lineCap = 'round';
  // the collar: two dark edges crossing at the nape, with a pale inner band on the lit side
  ctx.strokeStyle = 'rgba(74, 62, 60, 0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, -29.5);
  ctx.lineTo(0, -23.5);
  ctx.lineTo(10, -29.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(236, 230, 214, 0.6)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-8.2, -31.6);
  ctx.lineTo(0, -26.4);
  ctx.lineTo(8.2, -31.6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(120, 30, 36, 0.9)';
  ctx.fillRect(-17, -2, 34, 5.5);
  // the folds of the skirt falling from the obi
  ctx.strokeStyle = 'rgba(96, 90, 82, 0.42)';
  ctx.lineWidth = 0.9;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 7, 1);
    ctx.quadraticCurveTo(i * 9, 12, i * 6.4, 25);
    ctx.stroke();
  }
  // the obi knot at the back, over the folds
  ctx.fillStyle = 'rgba(132, 34, 40, 1)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 5.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(158, 58, 60, 0.8)';
  ctx.beginPath();
  ctx.ellipse(-1.4, 7.2, 3.2, 2.2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // long black hair: from the crown to the obi. One tapered mass with a single sheen, no interior
  // lines — at this size a few dark locks read as eyes on the back of the dress.
  ctx.fillStyle = 'rgba(22, 17, 20, 0.94)';
  ctx.beginPath();
  ctx.moveTo(-7, -33.5);
  ctx.bezierCurveTo(-7.6, -23, -5.6, -12, -3, -4.6);
  ctx.quadraticCurveTo(0, -3.2, 3, -4.6);
  ctx.bezierCurveTo(5.6, -12, 7.6, -23, 7, -33.5);
  ctx.closePath();
  ctx.fill();
  // a single strand of light down the lit side of the hair
  ctx.strokeStyle = 'rgba(198, 178, 168, 0.16)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-5.4, -31);
  ctx.bezierCurveTo(-5.4, -22, -4, -12, -2.2, -6);
  ctx.stroke();

  // arms forward, pale, hands at the ends
  ctx.strokeStyle = '#d8d2c6';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12.6, -26);
  ctx.lineTo(-9.6, -34);
  ctx.moveTo(12.6, -26);
  ctx.lineTo(9.6, -34);
  ctx.stroke();
  ctx.fillStyle = '#e4d8c8';
  ctx.beginPath();
  ctx.ellipse(-9.2, -35.4, 1.9, 1.4, 0.5, 0, Math.PI * 2);
  ctx.ellipse(9.2, -35.4, 1.9, 1.4, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // the head: black hair, a sliver of face, no features from above. She stands in front of an
  // unlit backdrop, so the crown needs its own rim or the head is a hole in the dress.
  ctx.fillStyle = '#1a1416';
  ctx.beginPath();
  ctx.arc(0, -40, 8, 0, Math.PI * 2);
  ctx.fill();
  const headA = Math.atan2(KEY.y - t.y, KEY.x - t.x) - (t.aim + Math.PI / 2);
  ctx.strokeStyle = 'rgba(226, 190, 156, 0.38)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, -40, 7.5, headA - 1.1, headA + 1.1);
  ctx.stroke();
  // the parting, a hair's width of light
  ctx.strokeStyle = 'rgba(150, 132, 126, 0.26)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-1.2, -47.4);
  ctx.lineTo(-0.4, -34.6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(214, 182, 152, 0.82)';
  ctx.beginPath();
  ctx.ellipse(0, -46.6, 2.7, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (t.hitFlash > 0.02) {
    // 受击不是一块白饼：一层软晕，边缘吃掉
    const hit = ctx.createRadialGradient(0, -8, 4, 0, -8, 40);
    hit.addColorStop(0, `rgba(255, 250, 240, ${0.5 * t.hitFlash})`);
    hit.addColorStop(0.5, `rgba(255, 228, 210, ${0.16 * t.hitFlash})`);
    hit.addColorStop(1, 'rgba(255, 220, 200, 0)');
    ctx.fillStyle = hit;
    ctx.beginPath();
    ctx.arc(0, -8, 40, 0, Math.PI * 2);
    ctx.fill();
    // 裙面上被打出的裂纹
    ctx.strokeStyle = `rgba(90, 30, 30, ${0.5 * t.hitFlash})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      const a = i * 2.1 + 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, -12 + Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 20, -12 + Math.sin(a) * 22);
      ctx.stroke();
    }
  }
  ctx.restore();

  // her condition, in the same language as the squad
  if (rise >= 1 && !dying) {
    const w = 54;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(t.x - w / 2, t.y - 62, w, 3);
    ctx.fillStyle = 'rgba(206, 108, 96, 0.95)';
    ctx.fillRect(t.x - w / 2, t.y - 62, (w * t.hp) / t.maxHp, 3);
  }
}

// 八尺様：白裙、黑长发从头盖到腰、赤脚。她比人高，但俯视看不到个子——只能靠更长更软的投影，
// 以及比人宽一圈的裙摆。正面没有脸，只有头发。
function drawHachi(ctx, t, time) {
  ctx.save();
  const appear = t.appear || 0;
  ctx.globalAlpha = t.dormant ? 0.32 : appear > 0 ? Math.max(0.15, 1 - appear / 0.9) : 1;
  ctx.translate(t.x, t.y);
  if (appear > 0) {
    // 从门后出来的一瞬：脚下一圈更深的黑，像门缝里漏出来的
    const door = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
    door.addColorStop(0, `rgba(4, 5, 8, ${0.55 * (appear / 0.9)})`);
    door.addColorStop(1, 'rgba(4, 5, 8, 0)');
    ctx.fillStyle = door;
    ctx.beginPath();
    ctx.ellipse(0, 6, 46, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const sh = ctx.createRadialGradient(10, 22, 4, 10, 22, 58);
  sh.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
  sh.addColorStop(0.6, 'rgba(0, 0, 0, 0.28)');
  sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(10, 24, 34, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(t.aim + Math.PI / 2);
  const sway = Math.sin(time * 1.2 + t.step) * 1.4;
  // 裙摆：比肩宽，前短后长
  const dress = ctx.createLinearGradient(0, -22, 0, 30);
  dress.addColorStop(0, '#efe9dc');
  dress.addColorStop(0.55, '#d8d2c4');
  dress.addColorStop(1, '#a9a396');
  ctx.fillStyle = dress;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.bezierCurveTo(16, -14, 21 + sway, 10, 23, 26);
  ctx.bezierCurveTo(10, 32, -10, 32, -23, 26);
  ctx.bezierCurveTo(-21 + sway, 10, -16, -14, 0, -20);
  ctx.closePath();
  ctx.fill();
  // 一条被主光压出来的暗边，让她从地上立起来
  ctx.strokeStyle = 'rgba(16, 14, 16, 0.5)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // 裙褶
  ctx.strokeStyle = 'rgba(120, 114, 104, 0.4)';
  ctx.lineWidth = 0.9;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 6, -12);
    ctx.quadraticCurveTo(i * 8 + sway, 6, i * 7, 26);
    ctx.stroke();
  }
  // 长发：从头顶盖到腰，但收窄，别把整条白裙吃掉
  const hair = ctx.createLinearGradient(0, -30, 0, 24);
  hair.addColorStop(0, '#141013');
  hair.addColorStop(1, '#2a2026');
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(8, -22, 8.5, 4, 6.5, 22);
  ctx.bezierCurveTo(0, 25, -6, 24, -6.5, 22);
  ctx.bezierCurveTo(-8.5, 4, -8, -22, 0, -30);
  ctx.closePath();
  ctx.fill();
  // 头顶：只有颅顶和一条被头发压住的高光
  ctx.fillStyle = '#191317';
  ctx.beginPath();
  ctx.ellipse(0, -24, 9.4, 9.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 236, 210, 0.16)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(0, -24, 8.4, 8.8, 0, -2.2, 0.5);
  ctx.stroke();
  // 前伸的两只手，苍白
  ctx.strokeStyle = '#d7cfc0';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.lineTo(-13, -24 + Math.sin(time * 1.6) * 1.6);
  ctx.moveTo(9, -12);
  ctx.lineTo(13, -24 - Math.sin(time * 1.6) * 1.6);
  ctx.stroke();
  // 赤脚：裙摆下露出的两个脚趾
  ctx.fillStyle = '#cbbfae';
  ctx.beginPath();
  ctx.ellipse(-6, 29, 3.1, 4.2, 0.1, 0, Math.PI * 2);
  ctx.ellipse(6, 29, 3.1, 4.2, -0.1, 0, Math.PI * 2);
  ctx.fill();

  if (t.feed > 0) {
    // 她俯下身看那个倒下的人
    ctx.strokeStyle = `rgba(206, 96, 86, ${0.25 + Math.sin(time * 8) * 0.15})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 2, 30, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (t.hitFlash > 0.02) {
    ctx.globalAlpha *= Math.min(1, t.hitFlash);
    ctx.fillStyle = 'rgba(220, 236, 240, 0.5)';
    ctx.beginPath();
    ctx.arc(0, -4, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// くねくね：田里一根会弯的、半透明的白。不可杀，越看动得越快。
function drawKune(ctx, t, time) {
  const s = t.size || 1;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.globalAlpha = 0.9;
  const sh = ctx.createRadialGradient(4, 7, 2, 4, 7, 22 * s);
  sh.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(4, 7, 16 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const agit = (t.agitation || 0) * 1.4;
  const phase = t.sway || 0;
  // 一根弯来弯去的白：从水里立起来的一条细长身子，越往上越细，头上一个小结
  ctx.strokeStyle = 'rgba(234, 238, 228, 0.62)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 5.2 * s;
  ctx.beginPath();
  for (let i = 0; i <= 8; i += 1) {
    const k = i / 8;
    const bx = Math.sin(phase * (1 + agit) + k * 0.9) * 7 * s * (1 - k * 0.5);
    const by = 6 * s - k * 30 * s;
    if (i === 0) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(248, 250, 242, 0.5)';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  for (let i = 0; i <= 8; i += 1) {
    const k = i / 8;
    const bx = Math.sin(phase * (1 + agit) + k * 0.9) * 7 * s * (1 - k * 0.5) + 1;
    const by = 6 * s - k * 30 * s;
    if (i === 0) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  ctx.stroke();
  // 顶上的小结
  ctx.fillStyle = 'rgba(240, 244, 234, 0.8)';
  ctx.beginPath();
  ctx.ellipse(Math.sin(phase * (1 + agit)) * 3.6 * s, -25 * s, 4.4 * s, 3.4 * s, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // 水纹：它脚下一圈一圈
  ctx.strokeStyle = `rgba(170, 200, 200, ${0.14 + agit * 0.08})`;
  ctx.lineWidth = 0.9;
  for (let i = 1; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 7 * s, (10 + i * 7) * s, (4 + i * 3) * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 四条细肢，挥
  ctx.strokeStyle = 'rgba(232, 236, 226, 0.5)';
  ctx.lineWidth = 1.5 * s;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i += 1) {
    const a = phase * 0.7 + i * 1.7;
    const reach = (16 + Math.sin(phase * 3 + i) * 5) * s * (1 + agit * 0.15);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 4 * s, Math.sin(a) * 4 * s);
    ctx.quadraticCurveTo(
      Math.cos(a + 0.5) * reach * 0.6,
      Math.sin(a + 0.5) * reach * 0.6,
      Math.cos(a + Math.sin(phase + i) * 0.5) * reach,
      Math.sin(a + Math.sin(phase + i) * 0.5) * reach,
    );
    ctx.stroke();
  }
  // 被看的时候，它周围有一层很淡的白
  if (agit > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 44 * s);
    g.addColorStop(0, `rgba(226, 236, 226, ${0.1 + agit * 0.08})`);
    g.addColorStop(1, 'rgba(226, 236, 226, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 44 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawSpiderling(ctx, t, time) {  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.aim + Math.PI / 2);
  ctx.strokeStyle = 'rgba(20, 16, 20, 0.9)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i += 1) {
    const side = i < 3 ? -1 : 1;
    const y = -4 + (i % 3) * 4;
    const sway = Math.sin(time * 8 + i) * 1.8;
    ctx.beginPath();
    ctx.moveTo(side * 3, y);
    ctx.lineTo(side * 10, y + 5 + sway);
    ctx.stroke();
  }
  ctx.fillStyle = '#17131a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(220, 90, 80, 0.8)';
  ctx.fillRect(-2, -6, 1.6, 1.6);
  ctx.fillRect(0.6, -6, 1.6, 1.6);
  ctx.restore();
}

function drawDebris(ctx, game) {
  if (!game.debris || !game.debris.length) return;
  for (const d of game.debris) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(3, 5, 17, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0d10';
    ctx.beginPath();
    ctx.roundRect(-13, -9, 26, 18, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(90, 200, 190, 0.22)';
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(3, -2);
    ctx.lineTo(-4, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -7);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(190, 210, 230, 0.25)';
    ctx.fillRect(6, -7, 2, 3);
    ctx.restore();
  }
}

function drawAgents(ctx, game, time) {
  const mirrors = game.thralls.filter((t) => t.kind === 'mirror' && !t.dead);
  for (const a of [...game.agents, ...mirrors]) {
    if (a.taken || a.extracted) continue;
    const mirror = a.kind === 'mirror';
    const down = a.down;
    ctx.save();
    ctx.translate(a.x, a.y);

    if (down) {
      const pool = ctx.createRadialGradient(0, 8, 2, 0, 8, 30);
      pool.addColorStop(0, 'rgba(64, 14, 14, 0.6)');
      pool.addColorStop(1, 'rgba(40, 8, 8, 0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.ellipse(0, 8, 30, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(a.aim + Math.PI / 2);
      ctx.fillStyle = '#1d222a';
      ctx.beginPath();
      ctx.roundRect(-10, -22, 20, 44, 9);
      ctx.fill();
      ctx.fillStyle = a.colour;
      ctx.beginPath();
      ctx.arc(0, -20, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawDownRing(ctx, a);
      continue;
    }

    // one light, one shadow: the pool falls down-right, the body sits in a tighter pocket of
    // its own dark so the boots touch the floor instead of hovering over it.
    const sh = ctx.createRadialGradient(4, 7, 1, 4, 7, 22);
    sh.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    sh.addColorStop(0.5, 'rgba(0, 0, 0, 0.26)');
    sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(4, 8, 21, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(1.5, 3.5, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(a.facing + Math.PI / 2);
    ctx.rotate(Math.sin(a.step) * 0.05 * Math.min(1, Math.hypot(a.vx, a.vy) / 110));
    ctx.translate(Math.sin(a.step * 0.5) * 0.5 * Math.min(1, Math.hypot(a.vx, a.vy) / 110), 0);
    // the body leans a touch into the turn instead of snapping to it
    const lean = Math.atan2(Math.sin(a.aim - a.facing), Math.cos(a.aim - a.facing));
    ctx.rotate(Math.max(-0.4, Math.min(0.4, lean)) * 0.07);
    const shortAngle = (v) => Math.atan2(Math.sin(v), Math.cos(v));
    const swing = Math.sin(a.step) * 4.4;
    let coat = a.role === 'veteran' ? '#2f3743' : a.role === 'rookie' ? '#263d47' : '#3a3226';
    let coatLight = a.role === 'veteran' ? '#4b5566' : a.role === 'rookie' ? '#3d6070' : '#5c4e38';
    if (mirror) {
      // 重复品：外套反着穿，里衬朝外，没有灯
      coat = a.role === 'veteran' ? '#43323c' : a.role === 'rookie' ? '#3d3038' : '#463a30';
      coatLight = a.role === 'veteran' ? '#8d7c84' : a.role === 'rookie' ? '#8a7d86' : '#8d8168';
    }
    // the rim belongs to the light, not to the sprite: find the key light in local space
    const lightAngle = Math.atan2(KEY.y - a.y, KEY.x - a.x) - (a.facing + Math.PI / 2);
    const cloth = a.cloth || { x: 0, y: 0, sway: 0 };
    const litX = Math.cos(lightAngle);
    const litY = Math.sin(lightAngle);
    const coatGrad = ctx.createLinearGradient(litX * 12, litY * 12, -litX * 14, -litY * 14);
    coatGrad.addColorStop(0, coatLight);
    coatGrad.addColorStop(0.5, coat);
    coatGrad.addColorStop(1, '#0d1016');

    // legs, seen from above: two thin shins under the hem, boots at the ends. One foot is
    // forward, the other back — never two legs in parallel, which is a front view. The stride
    // is as long as the speed deserves: a creep shuffles, a run reaches.
    const speed = Math.hypot(a.vx, a.vy);
    const moving = speed > 10;
    const gait = moving ? Math.sin(a.step) : Math.sin(a.step) * 0.12;
    const stride = 7.4 * Math.min(1, speed / 120);
    const boot = [
      { x: -4.6, y: 8.8 - gait * stride, a: -0.06 },
      { x: 4.6, y: 8.8 + gait * stride, a: 0.06 },
    ];
    for (const b of boot) {
      ctx.strokeStyle = '#171c23';
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x * 0.9, 5.2);
      ctx.lineTo(b.x, b.y - 2.6);
      ctx.stroke();
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      // the boot's own contact shadow, cast with everything else
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(1.2, 2, 3.3, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // the boot from above: a leather shell, a toe, a heel
      ctx.fillStyle = '#0a0d12';
      ctx.beginPath();
      ctx.roundRect(-2.2, -3.4, 4.4, 7, 2.1);
      ctx.fill();
      ctx.fillStyle = 'rgba(150, 168, 190, 0.16)';
      ctx.beginPath();
      ctx.roundRect(-1.7, -3, 3.4, 3.1, 1.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.roundRect(-1.8, 1.9, 3.6, 1.4, 0.7);
      ctx.fill();
      ctx.restore();
    }

    // the coat hem, trailing behind the walk: a short bell, not a pillow
    ctx.save();
    ctx.translate(cloth.x * 0.5, cloth.y * 0.5);
    ctx.fillStyle = '#0c0f14';
    ctx.beginPath();
    ctx.moveTo(-9.4, 1);
    ctx.quadraticCurveTo(-11, 6, -8.2, 9.2);
    ctx.quadraticCurveTo(0, 11.2, 8.2, 9.2);
    ctx.quadraticCurveTo(11, 6, 9.4, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = coatGrad;
    ctx.beginPath();
    ctx.moveTo(-8.8, -1);
    ctx.quadraticCurveTo(-10.2, 5.4, -7.6, 8);
    ctx.quadraticCurveTo(0, 9.6, 7.6, 8);
    ctx.quadraticCurveTo(10.2, 5.4, 8.8, -1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // shoulders and back: 22 px across at the shoulder line, tapering to the hips
    const bodyPath = new Path2D();
    bodyPath.moveTo(-10.4, -3.2);
    bodyPath.quadraticCurveTo(-12.2, 0.8, -9.4, 3.4);
    bodyPath.quadraticCurveTo(-8.2, 7.6, -7.4, 8.4);
    bodyPath.quadraticCurveTo(0, 9.8, 7.4, 8.4);
    bodyPath.quadraticCurveTo(8.2, 7.6, 9.4, 3.4);
    bodyPath.quadraticCurveTo(12.2, 0.8, 10.4, -3.2);
    bodyPath.quadraticCurveTo(0, -6.8, -10.4, -3.2);
    bodyPath.closePath();
    ctx.fillStyle = coatGrad;
    ctx.fill(bodyPath);
    // the weave, laid inside the silhouette with a second fill of the same path
    if (!woolPattern) woolPattern = ctx.createPattern(woolTile(), 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = woolPattern;
    ctx.fill(bodyPath);
    ctx.restore();
    // three folds down the back of the coat, lit side first
    ctx.strokeStyle = 'rgba(6, 9, 13, 0.28)';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 5.2, -1);
      ctx.quadraticCurveTo(i * 6.6 + 1, 4, i * 5.4, 8);
      ctx.stroke();
    }
    // shoulder pads: two domes, lit from the stage side and dark on the other
    for (const side of [-1, 1]) {
      const pad = ctx.createRadialGradient(
        side * 7.4 + Math.cos(lightAngle) * 2.4, -1.4 + Math.sin(lightAngle) * 2.4, 0.6,
        side * 7.4, -1.4, 6,
      );
      pad.addColorStop(0, coatLight);
      pad.addColorStop(0.7, coat);
      pad.addColorStop(1, 'rgba(8, 11, 15, 0.65)');
      ctx.fillStyle = pad;
      ctx.beginPath();
      ctx.ellipse(side * 7.4, -1.4, 4.6, 4.9, side * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    // the seam down the spine
    ctx.strokeStyle = 'rgba(8, 10, 14, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 1.5);
    ctx.lineTo(0, 10);
    ctx.stroke();
    // collar and a strap across the chest
    ctx.fillStyle = 'rgba(10, 13, 18, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, -4.4, 5.4, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 24, 30, 0.5)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-7.2, -4);
    ctx.lineTo(6.4, 1.6);
    ctx.stroke();
    // the rim belongs to the light: a hairline along the lit half of the coat, fading to nothing
    const rimGrad = ctx.createLinearGradient(litX * 13, litY * 13, -litX * 10, -litY * 10);
    rimGrad.addColorStop(0, mirror ? 'rgba(190, 210, 214, 0.16)' : 'rgba(255, 220, 172, 0.4)');
    rimGrad.addColorStop(0.38, mirror ? 'rgba(190, 210, 214, 0.04)' : 'rgba(255, 220, 172, 0.06)');
    rimGrad.addColorStop(1, 'rgba(255, 220, 172, 0)');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 1.15;
    ctx.stroke(bodyPath);

    // the upper body turns toward the target, but only so far: hips face the walk, chest and
    // weapon face the work. The arms are two joints, not one noodle.
    const wantTwist = shortAngle(a.aim - a.facing) * 0.8;
    const twist = Math.max(-0.6, Math.min(0.6, wantTwist));
    ctx.save();
    ctx.rotate(twist);
    const poseT = typeof a.poseT === 'number' ? a.poseT : a.pose === 'carry' ? 0 : 1;
    const dip = (a.poseDip || 0) * 1.7;
    const carry = -0.42 * (1 - poseT) + 0.05 * dip;
    const recoil = poseT > 0.5 ? a.recoil * 2.4 : 0;
    const gunY = 4 + recoil + dip;
    const ca = Math.cos(carry);
    const sa = Math.sin(carry);
    // a point on the weapon, mapped back into the body's frame so the hands sit on it
    const wp = (x, y) => ({
      x: x * ca - (y - gunY) * sa,
      y: gunY + x * sa + (y - gunY) * ca,
    });
    const grip = wp(3.2, -9.6);
    const support = wp(2.4, -18.4);
    const shoulderR = { x: 8.4, y: -1.6 };
    const shoulderL = { x: -8.2, y: -1.2 };
    const elbowR = { x: 11.6, y: -3.4 };
    const elbowL = { x: -6.4, y: -8.8 };

    const sleeve = (from, to, width) => {
      ctx.lineCap = 'round';
      // the cloth itself
      ctx.strokeStyle = coat;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      // the lit edge is on the stage side, and only a quarter of the limb wide
      const ox = Math.cos(lightAngle) * width * 0.26;
      const oy = Math.sin(lightAngle) * width * 0.26;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = coatLight;
      ctx.lineWidth = width * 0.62;
      ctx.beginPath();
      ctx.moveTo(from.x + ox, from.y + oy);
      ctx.lineTo(to.x + ox, to.y + oy);
      ctx.stroke();
      ctx.restore();
      // the underside falls away from the stage light
      ctx.strokeStyle = 'rgba(7, 10, 14, 0.42)';
      ctx.lineWidth = width * 0.34;
      ctx.beginPath();
      ctx.moveTo(from.x - ox * 0.9, from.y - oy * 0.9 + width * 0.22);
      ctx.lineTo(to.x - ox * 0.9, to.y - oy * 0.9 + width * 0.22);
      ctx.stroke();
    };
    sleeve(shoulderR, elbowR, 5.8);
    sleeve(elbowR, grip, 4.2);
    sleeve(shoulderL, elbowL, 5.8);
    sleeve(elbowL, support, 4.2);
    // hands: leather gloves, working in the dark
    for (const h of [grip, support]) {
      ctx.fillStyle = '#6f5746';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 228, 192, 0.24)';
      ctx.beginPath();
      ctx.arc(h.x + 0.5, h.y - 0.7, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // the rifle: butt at the shoulder, 26 px to the muzzle, all top faces
    ctx.save();
    ctx.translate(0, gunY);
    ctx.rotate(carry);
    ctx.translate(0, -4);
    const gunX = 3.2;
    // the weapon lies over a thin shadow of its own, so it is not pasted on the coat
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.roundRect(gunX - 2.4, -26.4, 4.8, 25.6, 1.6);
    ctx.fill();
    // butt stock: oiled walnut
    const stockGrad = ctx.createLinearGradient(gunX - 2, 0, gunX + 2, 0);
    stockGrad.addColorStop(0, '#5a4028');
    stockGrad.addColorStop(0.5, '#3c2a1a');
    stockGrad.addColorStop(1, '#22170f');
    ctx.fillStyle = stockGrad;
    ctx.beginPath();
    ctx.roundRect(gunX - 1.9, -3.4, 3.8, 4.6, 1.2);
    ctx.fill();
    // receiver: parkerised steel, flat top face lit from the stage
    const steel = ctx.createLinearGradient(gunX - 2.4, 0, gunX + 2.4, 0);
    steel.addColorStop(0, '#4a5563');
    steel.addColorStop(0.35, '#2b333d');
    steel.addColorStop(1, '#0e1319');
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.roundRect(gunX - 2.2, -12.8, 4.4, 9.8, 1);
    ctx.fill();
    ctx.fillStyle = 'rgba(236, 244, 255, 0.5)';
    ctx.fillRect(gunX - 1.9, -12.2, 0.8, 8.4);
    // magazine, angled out of the receiver
    ctx.save();
    ctx.translate(gunX - 1.4, -11.2);
    ctx.rotate(0.4);
    ctx.fillStyle = '#0e131a';
    ctx.beginPath();
    ctx.roundRect(-1.4, 0, 2.8, 6.2, 0.8);
    ctx.fill();
    ctx.restore();
    // optic on the flat top, with a cold lens
    ctx.fillStyle = '#1a2129';
    ctx.beginPath();
    ctx.roundRect(gunX - 1.2, -14.6, 2.4, 4.4, 0.8);
    ctx.fill();
    ctx.fillStyle = 'rgba(150, 220, 224, 0.5)';
    ctx.fillRect(gunX - 0.8, -14.2, 1.6, 1.2);
    // barrel and muzzle
    const barrel = ctx.createLinearGradient(gunX - 1, 0, gunX + 1, 0);
    barrel.addColorStop(0, '#5a6675');
    barrel.addColorStop(0.45, '#232a33');
    barrel.addColorStop(1, '#0b0f14');
    ctx.fillStyle = barrel;
    ctx.beginPath();
    ctx.roundRect(gunX - 1, -24.4, 2, 11.8, 0.7);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(gunX - 1.3, -25.6, 2.6, 2.2, 0.6);
    ctx.fill();
    // one glint along the top of the barrel: the only hard specular on the weapon
    ctx.fillStyle = 'rgba(224, 236, 252, 0.62)';
    ctx.fillRect(gunX - 0.55, -23.6, 0.65, 9.4);
    // sling, sagging under the receiver
    ctx.strokeStyle = 'rgba(24, 28, 34, 0.9)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(gunX - 0.6, -4.6);
    ctx.quadraticCurveTo(gunX - 5.4, -10.6, gunX - 0.4, -17.4);
    ctx.stroke();
    ctx.restore();

    // head: a skull under hair, 11 px across and a touch longer than wide. From straight above
    // there is no face — only the crown, a hairline at the front, and the light on one side.
    // The neck turns a little further than the chest: people look where they are about to shoot.
    const headTurn = Math.max(-0.34, Math.min(0.34, wantTwist - twist));
    ctx.save();
    ctx.translate(0, -1.2);
    ctx.rotate(headTurn);
    ctx.translate(0, 1.2);
    const hair = a.role === 'veteran' ? '#37302a' : a.role === 'rookie' ? '#332c24' : '#2e291f';
    // the head rests on the collar and drops its own small shadow away from the light.
    // Flat crown + a hairline of rim on the lit edge reads better than a shaded ball at 11 px.
    ctx.fillStyle = 'rgba(6, 8, 12, 0.2)';
    ctx.beginPath();
    ctx.ellipse(-litX * 1.4 + 0.4, -3.1 - litY * 1.4 + 0.7, 5.6, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(0, -3.4, 5.2, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 226, 186, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -3.4, 4.7, 5, 0, lightAngle - 0.85, lightAngle + 0.85);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.beginPath();
    ctx.ellipse(-litX * 3, -3.4 - litY * 3, 3.6, 3.9, 0, 0, Math.PI * 2);
    ctx.fill();

    if (a.role === 'veteran') {
      // a peaked cap: the crown, the band, then the visor toward the front
      ctx.fillStyle = '#191e25';
      ctx.beginPath();
      ctx.ellipse(0, -3.4, 5.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20262e';
      ctx.beginPath();
      ctx.roundRect(-5.1, -8.9, 10.2, 2.9, 1.4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 232, 200, 0.18)';
      ctx.fillRect(-4.3, -8.5, 8.6, 0.8);
    } else if (a.role === 'rookie') {
      // a knit cap: a soft crown and a rolled band at the back
      ctx.fillStyle = '#33444f';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 5.3, 5.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(12, 18, 22, 0.7)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, -3.5, 4.4, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 236, 210, 0.1)';
      ctx.beginPath();
      ctx.ellipse(litX * 2.6, -3.6 + litY * 2.6, 2.6, 2.2, lightAngle, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // a hood, wet with the cold: cloth around the skull
      ctx.fillStyle = '#1e221b';
      ctx.beginPath();
      ctx.ellipse(0, -3.4, 5.2, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(104, 112, 94, 0.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -3.4, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    ctx.restore();

    if (a.charmed) {
      const pulse = 0.5 + Math.sin(time * 5) * 0.3;
      ctx.strokeStyle = `rgba(220, 90, 90, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 28, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (a.hp < a.maxHp) {
      // a hairline, only when there is something to say
      const w = 22;
      const ratio = Math.max(0, a.hp) / a.maxHp;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(a.x - w / 2, a.y + 21, w, 1.6);
      ctx.fillStyle = ratio <= 0.35 ? 'rgba(196, 92, 78, 0.9)' : 'rgba(226, 220, 206, 0.6)';
      ctx.fillRect(a.x - w / 2, a.y + 21, w * ratio, 1.6);
    }

    if (a.flash > 0) {
      ctx.fillStyle = `rgba(255, 80, 70, ${a.flash * 0.45})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mirror && a.hitFlash > 0.02) {
      ctx.fillStyle = `rgba(210, 226, 230, ${a.hitFlash * 0.35})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 24, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDownRing(ctx, a) {
  ctx.strokeStyle = 'rgba(220, 226, 236, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(a.x, a.y, 22, 0, Math.PI * 2);
  ctx.stroke();
  if (a.revive > 0) {
    ctx.strokeStyle = 'rgba(255, 214, 150, 0.9)';
    ctx.beginPath();
    ctx.arc(a.x, a.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, a.revive / TUNING.reviveSeconds));
    ctx.stroke();
  }
}

function drawBullets(ctx, game) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of game.bullets) {
    ctx.strokeStyle = b.team === 'enemy' ? 'rgba(180, 226, 236, 0.85)' : 'rgba(255, 232, 180, 0.9)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.stroke();
  }
  for (const m of game.muzzle) {
    const g = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, 26);
    g.addColorStop(0, 'rgba(255, 248, 226, 0.95)');
    g.addColorStop(0.3, 'rgba(255, 208, 140, 0.5)');
    g.addColorStop(1, 'rgba(255, 180, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpatter(ctx, game) {
  if (!game.spatter.length) return;
  ctx.save();
  for (const s of game.spatter) {
    ctx.globalAlpha = Math.min(1, s.life * 3) * 0.8;
    ctx.fillStyle = '#4c1313';
    ctx.fillRect(s.x, s.y, 2.6, 2.6);
  }
  ctx.restore();
}

// The frame itself: two black bars, 2.1:1, over everything including the interface.
export function drawBars(ctx) {
  ctx.fillStyle = '#020305';
  ctx.fillRect(0, 0, VIEW.width, 40);
  ctx.fillRect(0, VIEW.height - 40, VIEW.width, 40);
  const edge = ctx.createLinearGradient(0, 40, 0, 48);
  edge.addColorStop(0, 'rgba(0,0,0,0.8)');
  edge.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 40, VIEW.width, 8);
  const edge2 = ctx.createLinearGradient(0, VIEW.height - 48, 0, VIEW.height - 40);
  edge2.addColorStop(0, 'rgba(0,0,0,0)');
  edge2.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = edge2;
  ctx.fillRect(0, VIEW.height - 48, VIEW.width, 8);
}

// The print: a grade, a vignette, grain, and 2.2:1 bars.
function drawPost(ctx, game, time) {
  // 每一案一张不同的印片：歌剧院暖、公寓土黄、车站青、稻田冷、后室芥末
  const decor = game.case.decor;
  const tint = {
    opera: ['40, 90, 120', '120, 70, 30'],
    corridor: ['60, 66, 44', '110, 74, 34'],
    station: ['36, 92, 96', '30, 60, 70'],
    rice: ['30, 74, 96', '40, 74, 52'],
    backrooms: ['96, 88, 30', '110, 92, 30'],
  }[decor] || ['40, 90, 120', '120, 70, 30'];
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const grade = ctx.createLinearGradient(0, 0, VIEW.width, VIEW.height);
  grade.addColorStop(0, `rgba(${tint[0]}, 0.35)`);
  grade.addColorStop(0.55, `rgba(${tint[0]}, 0.1)`);
  grade.addColorStop(1, `rgba(${tint[1]}, 0.35)`);
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();

  // 每一案都有自己的那一圈颜色：她站在台上、她比门高、田里那个东西、还有走廊里的你
  const boss = game.thralls && game.thralls.find((t) => !t.dead && (t.kind === 'spider' || t.kind === 'hachi' || (t.kind === 'kune' && t.size > 1.4)));
  const mirror = game.thralls && game.thralls.find((t) => !t.dead && t.kind === 'mirror');
  const pulse = 0.5 + Math.sin(time * 1.4) * 0.2;
  if (boss) {
    const [r0, g0, b0] = boss.kind === 'spider' ? [120, 18, 16] : boss.kind === 'hachi' ? [26, 34, 48] : [120, 130, 120];
    const wash = ctx.createRadialGradient(boss.x, boss.y, 40, boss.x, boss.y, 430);
    wash.addColorStop(0, `rgba(${r0}, ${g0}, ${b0}, ${(boss.kind === 'spider' ? 0.16 : 0.2) * pulse})`);
    wash.addColorStop(1, `rgba(${r0}, ${g0}, ${b0}, 0)`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  if (mirror) {
    const edge = ctx.createLinearGradient(0, 0, VIEW.width, VIEW.height);
    edge.addColorStop(0, 'rgba(150, 170, 180, 0.05)');
    edge.addColorStop(1, 'rgba(150, 170, 180, 0.02)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  // 第二案：天亮的那一刻，画面从蓝转暖
  if (game.case.decor === 'corridor') {
    const dawn = Math.max(0, Math.min(1, (game.clock - (game.case.rule.dawn - 2)) / 6));
    if (dawn > 0) {
      ctx.fillStyle = `rgba(255, 220, 170, ${dawn * 0.06})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  const vig = ctx.createRadialGradient(640, 400, 260, 640, 420, 880);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  vig.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // 亮相那颗镜头：上下压两条黑边，收回去的时候一起退掉
  if (game.shot && game.shot.w > 0.01) {
    const h = 54 * game.shot.w;
    ctx.fillStyle = `rgba(2, 3, 5, ${0.92 * game.shot.w})`;
    ctx.fillRect(0, 0, VIEW.width, h);
    ctx.fillRect(0, VIEW.height - h, VIEW.width, h);
  }

  const g = grainTile();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.globalCompositeOperation = 'overlay';
  const ox = Math.floor(Math.random() * 160);
  const oy = Math.floor(Math.random() * 160);
  for (let y = -160; y < VIEW.height + 160; y += 160) {
    for (let x = -160; x < VIEW.width + 160; x += 160) {
      ctx.drawImage(g, x + ox, y + oy);
    }
  }
  ctx.restore();

  // letterbox is drawn last, over the interface, so the frame is the frame
  if (game.flashWhite > 0.01) {
    ctx.fillStyle = `rgba(255, 220, 180, ${Math.min(0.35, game.flashWhite * 0.35)})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  if (game.toastText && game.toast > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.toast * 2);
    ctx.font = `9px ${L.fonts.mono}`;
    ctx.letterSpacing = '2px';
    ctx.textAlign = 'left';
    const w = ctx.measureText(game.toastText).width + 24;
    const x = VIEW.width / 2 - w / 2;
    // a strip of paper, not a panel: one rule above, one below, a thin amber tick at the left
    ctx.fillStyle = 'rgba(5, 7, 11, 0.7)';
    ctx.fillRect(x, 56, w, 22);
    ctx.fillStyle = 'rgba(201, 162, 90, 0.55)';
    ctx.fillRect(x, 56, 2, 22);
    ctx.fillStyle = 'rgba(206, 200, 186, 0.22)';
    ctx.fillRect(x, 56, w, 1);
    ctx.fillRect(x, 77, w, 1);
    ctx.fillStyle = 'rgba(233, 227, 214, 0.92)';
    ctx.fillText(game.toastText, x + 12, 71);
    ctx.restore();
  }
}
