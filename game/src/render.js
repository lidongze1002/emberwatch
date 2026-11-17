// 俯拍的歌剧院，按电影的样子打光：一条主光从台口下来，两处补光（吊灯、出口），其余交给暗部。
// 木头有漆面、座椅是绒布、幕布有褶、空气里有灰。人在光里只有轮廓和一点脸。

import { PALETTE, SEATS, SPAWNS, TUNING, VIEW, WALLS, ZONES } from './config.js';
import { L } from './text.js';

const CAM = { scale: 1.1, x: 640, y: 400 };
const KEY = { x: 840, y: 180 };

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
  ctx.save();
  ctx.translate(VIEW.width / 2, VIEW.height / 2);
  ctx.scale(CAM.scale, CAM.scale);
  ctx.translate(-CAM.x, -CAM.y);
  const shake = game.shake;
  ctx.translate(Math.sin(time * 71) * shake, Math.cos(time * 53) * shake);

  drawFloor(ctx, game, time);
  drawCarpet(ctx);
  drawStage(ctx, game, time);
  drawSeats(ctx);
  drawProps(ctx, game, time);
  drawWalls(ctx, game);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawFlashlights(ctx, game);
  ctx.restore();

  drawBullets(ctx, game);
  drawThralls(ctx, game, time);
  drawAgents(ctx, game, time);
  drawSpatter(ctx, game);
  if (!game.power) {
    ctx.fillStyle = 'rgba(4, 7, 12, 0.34)';
    ctx.fillRect(40, 40, VIEW.width - 80, VIEW.height - 80);
  }
  ctx.restore();

  drawPost(ctx, game, time);
}

function drawFloor(ctx, game, time) {
  const base = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  base.addColorStop(0, '#06080c');
  base.addColorStop(0.5, '#080a0f');
  base.addColorStop(1, '#04060a');
  ctx.fillStyle = base;
  ctx.fillRect(-80, -80, VIEW.width + 160, VIEW.height + 160);

  // the boards: grain, then varnish, then seams, then the shadow they sit in
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
  // contact darkening along every wall foot
  ctx.save();
  for (const [x, y, w, h] of WALLS) {
    const down = ctx.createLinearGradient(0, y + h, 0, y + h + 12);
    down.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    down.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = down;
    ctx.fillRect(x - 2, y + h, w + 4, 12);
  }
  ctx.restore();

  // the light that is in the room: stage key, chandelier fill, exit fill
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const key = ctx.createRadialGradient(840, 180, 20, 840, 220, 560);
  key.addColorStop(0, 'rgba(255, 198, 132, 0.16)');
  key.addColorStop(0.45, 'rgba(255, 160, 90, 0.06)');
  key.addColorStop(1, 'rgba(255, 140, 70, 0)');
  ctx.fillStyle = key;
  ctx.fillRect(300, -40, 900, 700);

  const chand = ctx.createRadialGradient(850, 470, 10, 850, 470, 230);
  chand.addColorStop(0, 'rgba(255, 214, 160, 0.1)');
  chand.addColorStop(1, 'rgba(255, 180, 100, 0)');
  ctx.fillStyle = chand;
  ctx.beginPath();
  ctx.arc(850, 470, 230, 0, Math.PI * 2);
  ctx.fill();

  const exit = ctx.createRadialGradient(SPAWNS.exit.x, SPAWNS.exit.y, 6, SPAWNS.exit.x, SPAWNS.exit.y, 190);
  exit.addColorStop(0, 'rgba(255, 196, 130, 0.2)');
  exit.addColorStop(1, 'rgba(255, 160, 90, 0)');
  ctx.fillStyle = exit;
  ctx.beginPath();
  ctx.arc(SPAWNS.exit.x, SPAWNS.exit.y, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // dust in the beam
  for (let i = 0; i < 40; i += 1) {
    const x = 520 + ((i * 137) % 640) + Math.sin(time * 0.5 + i) * 10;
    const y = 220 + ((i * 71) % 420) + Math.cos(time * 0.4 + i) * 8;
    ctx.fillStyle = `rgba(255, 222, 176, ${0.04 + (i % 4) * 0.012})`;
    ctx.fillRect(x, y, 1.4, 1.4);
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
    // weave
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
  const stage = ZONES.stage;
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
    const aria = ctx.createRadialGradient(840, 170, 20, 840, 200, 320);
    aria.addColorStop(0, `rgba(255, 200, 140, ${0.14 * pulse})`);
    aria.addColorStop(1, 'rgba(255, 170, 100, 0)');
    ctx.fillStyle = aria;
    ctx.fillRect(470, 40, 740, 400);
    ctx.restore();
  }
}

function drawSeats(ctx) {
  for (const s of SEATS) {
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

function drawProps(ctx, game, time) {
  const exit = SPAWNS.exit;
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
  const sw = SPAWNS.switchboard;
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

function drawWalls(ctx, game) {
  for (const [x, y, w, h] of WALLS) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#22262f');
    g.addColorStop(0.25, '#181c24');
    g.addColorStop(1, '#0d1016');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(190, 205, 225, 0.22)';
    ctx.fillRect(x, y, w, 1.5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(x, y + h - 2, w, 2);
    // a brass chair rail along long walls
    if (w > 120) {
      ctx.fillStyle = 'rgba(201, 162, 90, 0.16)';
      ctx.fillRect(x, y + h * 0.55, w, 1);
    }
  }
}

function drawFlashlights(ctx, game) {
  for (const a of game.agents) {
    if (a.down || a.taken || a.extracted || a.charmed) continue;
    const reach = 320;
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
  for (const t of game.thralls) {
    if (t.dead) continue;
    ctx.save();
    ctx.translate(t.x, t.y);

    // contact shadow
    const sh = ctx.createRadialGradient(5, 14, 2, 5, 14, 26);
    sh.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(5, 14, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(t.aim + Math.PI / 2);
    const swing = Math.sin(t.step * 1.4) * 3.4;

    ctx.fillStyle = '#141720';
    ctx.beginPath();
    ctx.roundRect(-10, 4 + swing, 8, 20, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(2, 4 - swing, 8, 20, 3);
    ctx.fill();

    // suit: shoulders, lapels, a white shirt
    ctx.fillStyle = '#9a9282';
    ctx.beginPath();
    ctx.ellipse(0, -2, 17, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(60, 52, 44, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 17, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 236, 224, 0.6)';
    ctx.beginPath();
    ctx.moveTo(-5, -16);
    ctx.lineTo(0, -1);
    ctx.lineTo(5, -16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(30, 24, 20, 0.55)';
    ctx.fillRect(-1, -16, 2, 15);
    // a tie, and two buttons catching the light
    ctx.fillStyle = 'rgba(40, 18, 18, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.lineTo(2, -14);
    ctx.lineTo(1, -4);
    ctx.lineTo(-1, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 240, 210, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 1, 1, 0, Math.PI * 2);
    ctx.arc(0, 6, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#807867';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-13, -6);
    ctx.lineTo(-15, 7 + swing * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(13, -6);
    ctx.lineTo(15, 7 - swing * 0.5);
    ctx.stroke();

    // the set, seen from above: a top panel, vents at the back, a sliver of screen at the front
    ctx.fillStyle = '#0a0c10';
    ctx.beginPath();
    ctx.roundRect(-15, -40, 30, 24, 3.5);
    ctx.fill();
    // bevel: lit on the stage side, dark at the back
    ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.fillRect(-13, -39.4, 26, 1.4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(-13, -17.6, 26, 1.6);
    // vents and a handle at the back of the set
    ctx.strokeStyle = 'rgba(120, 130, 120, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-9, -22 + i * 2.2);
      ctx.lineTo(9, -22 + i * 2.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#2b3028';
    ctx.fillRect(-5, -17, 10, 2);

    // the only screen you can see from above: a hot line at the front edge, and its spill
    const flick = 0.55 + Math.sin(time * 24 + t.step * 3) * 0.3;
    ctx.fillStyle = `rgba(150, 240, 222, ${0.85 * flick})`;
    ctx.fillRect(-13, -40.6, 26, 1.6);
    const spill = ctx.createLinearGradient(0, -40, 0, -78);
    spill.addColorStop(0, `rgba(140, 235, 215, ${0.22 * flick})`);
    spill.addColorStop(1, 'rgba(140, 235, 215, 0)');
    ctx.fillStyle = spill;
    ctx.beginPath();
    ctx.moveTo(-13, -40);
    ctx.lineTo(13, -40);
    ctx.lineTo(26, -78);
    ctx.lineTo(-26, -78);
    ctx.closePath();
    ctx.fill();

    // antennas, seen from above as two rods out of the back
    ctx.strokeStyle = '#4a5040';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-10, -17);
    ctx.lineTo(-17, -5);
    ctx.moveTo(10, -17);
    ctx.lineTo(17, -5);
    ctx.stroke();

    if (t.hitFlash > 0.02) {
      ctx.globalAlpha = Math.min(0.85, t.hitFlash);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -10, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (t.hp < t.maxHp) {
      const w = 32;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(t.x - w / 2, t.y - 50, w, 3);
      ctx.fillStyle = 'rgba(200, 90, 80, 0.9)';
      ctx.fillRect(t.x - w / 2, t.y - 50, (w * t.hp) / t.maxHp, 3);
    }
  }
}

function drawAgents(ctx, game, time) {
  for (const a of game.agents) {
    if (a.taken || a.extracted) continue;
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

    const sh = ctx.createRadialGradient(6, 15, 2, 6, 15, 28);
    sh.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
    sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(6, 15, 28, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(a.aim + Math.PI / 2);
    ctx.rotate(Math.sin(a.step) * 0.045);
    const swing = Math.sin(a.step) * 4.4;
    const coat = a.role === 'veteran' ? '#2f3743' : a.role === 'rookie' ? '#263d47' : '#3a3226';
    const coatLight = a.role === 'veteran' ? '#4b5566' : a.role === 'rookie' ? '#3d6070' : '#5c4e38';
    // the rim belongs to the light, not to the sprite: find the key light in local space
    const lightAngle = Math.atan2(KEY.y - a.y, KEY.x - a.x) - (a.aim + Math.PI / 2);
    const rimX = Math.cos(lightAngle) * 9.5;
    const rimY = Math.sin(lightAngle) * 11;
    const cloth = a.cloth || { x: 0, y: 0, sway: 0 };

    // the coat hem, trailing behind the walk and fuller on the far side from the light
    ctx.save();
    ctx.translate(cloth.x, cloth.y + 3);
    ctx.fillStyle = 'rgba(10, 13, 18, 0.85)';
    ctx.beginPath();
    ctx.ellipse(cloth.sway, 4, 17, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.ellipse(cloth.sway * 0.8, 1, 15.5, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cloth.sway * 0.8, 6, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#12161c';
    ctx.beginPath();
    ctx.roundRect(-9, 4 + swing, 8, 19, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(1, 4 - swing, 8, 19, 3);
    ctx.fill();

    // coat: shoulders, a collar, a warm rim from the stage side
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.ellipse(0, -2, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = coatLight;
    ctx.beginPath();
    ctx.ellipse(0, -11, 12.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // shoulder pads: two arcs, the light side brighter
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.ellipse(-9, -8, 5, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(9, -8, 5, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // collar and a strap across the chest
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -3, 7, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20, 24, 30, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(6, 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 214, 160, 0.2)';
    ctx.beginPath();
    ctx.ellipse(rimX, rimY, 4.6, 3.4, lightAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(18, 22, 28, 0.55)';
    ctx.fillRect(-10, -9, 20, 3);

    ctx.strokeStyle = coatLight;
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -7);
    ctx.lineTo(-3.5, -21);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, -7);
    ctx.lineTo(3.5, -21);
    ctx.stroke();
    // hands
    ctx.fillStyle = '#b98f74';
    ctx.beginPath();
    ctx.arc(-3.5, -22, 2.4, 0, Math.PI * 2);
    ctx.arc(3.5, -22, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // the rifle: stock, receiver, magazine, optic, barrel, and the glint along the top face
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(-2.8, -18, 5.6, 9);
    ctx.fillRect(-1.6, -40, 3.2, 23);
    ctx.save();
    ctx.translate(-3.4, -24);
    ctx.rotate(0.35);
    ctx.fillRect(0, 0, 3.2, 7);
    ctx.restore();
    ctx.fillStyle = '#161c24';
    ctx.fillRect(-2.2, -32, 4.4, 5);
    ctx.fillStyle = 'rgba(140, 220, 220, 0.55)';
    ctx.fillRect(-1.2, -31.2, 2.4, 1.6);
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(-2, -42, 4, 3);
    ctx.fillStyle = 'rgba(190, 205, 225, 0.45)';
    ctx.fillRect(-0.5, -40, 1, 10);
    ctx.strokeStyle = 'rgba(30, 34, 42, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.quadraticCurveTo(-4, -26, 2, -34);
    ctx.stroke();

    // head: the crown of the head, hair over it, a sliver of forehead at the front
    ctx.fillStyle = '#c69a7d';
    ctx.beginPath();
    ctx.arc(0, -4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = a.role === 'lamp' ? '#191d24' : a.role === 'rookie' ? '#221b18' : '#33363a';
    ctx.beginPath();
    ctx.arc(0, -4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b98f74';
    ctx.beginPath();
    ctx.ellipse(0, -11, 4.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // the veteran wears a cap: a dark disc with a brim toward the light
    if (a.role === 'veteran') {
      ctx.fillStyle = '#12161c';
      ctx.beginPath();
      ctx.arc(0, -4, 8.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b2028';
      ctx.beginPath();
      ctx.roundRect(-6, -14, 12, 3.6, 1.6);
      ctx.fill();
    }
    // a few strands, so the crown is not a flat disc
    ctx.strokeStyle = 'rgba(255, 235, 210, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-4 + i * 4, -8);
      ctx.lineTo(-6 + i * 4, -1);
      ctx.stroke();
    }
    ctx.restore();

    if (a.charmed) {
      const pulse = 0.5 + Math.sin(time * 5) * 0.3;
      ctx.strokeStyle = `rgba(220, 90, 90, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 28, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(a.x - 21, a.y + 26, 42, 4);
    ctx.fillStyle = a.colour;
    ctx.fillRect(a.x - 21, a.y + 26, (42 * Math.max(0, a.hp)) / a.maxHp, 4);

    if (a.flash > 0) {
      ctx.fillStyle = `rgba(255, 80, 70, ${a.flash * 0.45})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 26, 0, Math.PI * 2);
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
    ctx.strokeStyle = 'rgba(255, 232, 180, 0.9)';
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
  // teal in the shadows, amber in the light
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const grade = ctx.createLinearGradient(0, 0, VIEW.width, VIEW.height);
  grade.addColorStop(0, 'rgba(40, 90, 120, 0.35)');
  grade.addColorStop(0.55, 'rgba(20, 30, 45, 0.1)');
  grade.addColorStop(1, 'rgba(120, 70, 30, 0.35)');
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();

  const vig = ctx.createRadialGradient(640, 400, 260, 640, 420, 880);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  vig.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

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
    ctx.font = `600 15px ${L.fonts.ui}`;
    ctx.textAlign = 'center';
    const w = ctx.measureText(game.toastText).width + 36;
    ctx.fillStyle = 'rgba(6, 9, 14, 0.82)';
    ctx.beginPath();
    ctx.roundRect(VIEW.width / 2 - w / 2, 60, w, 30, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201, 162, 90, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 226, 180, 0.95)';
    ctx.fillText(game.toastText, VIEW.width / 2, 80);
    ctx.restore();
  }
}
