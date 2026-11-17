// The whole picture, in painting order: sky, sea, the cliff, the tower, the beam, the shadows,
// the particles, then the light that sits over everything. One 1280 x 800 canvas, no images,
// no DOM. The only thing cached is the stone: the sky and cliff are built once into offscreen
// canvases because they never move, and the water, light and shadows are drawn every frame.

import { LAMP, PALETTE, VIEW } from './config.js';
import { drawShadow } from './enemies.js';
import { beamShape } from './beam.js';
import { Rng } from './rng.js';

export function drawScene(ctx, game, time) {
  const scene = game.scene;
  const shake = game.shake;
  const sx = Math.sin(time * 61.7) * shake;
  const sy = Math.cos(time * 47.3) * shake * 0.7;

  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  ctx.save();
  ctx.translate(sx, sy);

  ctx.drawImage(scene.sky, 0, 0);
  drawSea(ctx, scene, time, game);
  ctx.drawImage(scene.cliff, 0, 0);
  drawWaterReflection(ctx, time, game);

  drawTower(ctx, game, time);
  if (!(game.state === 'results' && game.result === 'defeat')) drawBeam(ctx, game, time);
  // shadows belong to a run in progress: the title is a still night, and an ended run has
  // nothing left on the water
  if (game.state === 'playing' || game.state === 'upgrades') {
    for (const shadow of game.shadows) drawShadow(ctx, shadow, time);
  }
  game.particles.draw(ctx);
  drawMotes(ctx, scene, game, time);
  drawLamp(ctx, game, time);

  ctx.restore();
  drawAir(ctx, game, time);
}

function buildSky() {
  const canvas = document.createElement('canvas');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 200);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.5, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, 200);

  // stars: seeded, so the sky is the same sky every run
  const rng = new Rng(9931);
  for (let i = 0; i < 130; i += 1) {
    const x = rng.float(0, VIEW.width);
    const y = rng.float(0, 158);
    const r = rng.float(0.4, 1.5);
    ctx.globalAlpha = rng.float(0.16, 0.8) * (1 - y / 300);
    ctx.fillStyle = rng.chance(0.16) ? '#ffd9a8' : '#dbe7f5';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // a cold moon behind thin cloud, high and off to one side
  const moon = ctx.createRadialGradient(300, 74, 8, 300, 74, 180);
  moon.addColorStop(0, 'rgba(206, 222, 240, 0.26)');
  moon.addColorStop(0.2, 'rgba(190, 210, 232, 0.13)');
  moon.addColorStop(0.55, 'rgba(150, 175, 205, 0.045)');
  moon.addColorStop(1, 'rgba(120, 150, 190, 0)');
  ctx.fillStyle = moon;
  ctx.fillRect(70, 0, 460, 300);
  const disc = ctx.createRadialGradient(290, 64, 3, 300, 74, 34);
  disc.addColorStop(0, 'rgba(238, 246, 255, 0.44)');
  disc.addColorStop(0.72, 'rgba(214, 230, 246, 0.3)');
  disc.addColorStop(1, 'rgba(180, 202, 224, 0.08)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(300, 74, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(150, 170, 196, 0.1)';
  ctx.beginPath();
  ctx.arc(289, 67, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(311, 84, 9, 0, Math.PI * 2);
  ctx.fill();

  // cloud bands along the horizon
  for (let i = 0; i < 4; i += 1) {
    const y = 84 + i * 22;
    const g = ctx.createLinearGradient(0, y, 0, y + 24);
    g.addColorStop(0, 'rgba(120, 148, 182, 0)');
    g.addColorStop(0.5, `rgba(120, 148, 182, ${0.05 + (i % 2) * 0.03})`);
    g.addColorStop(1, 'rgba(120, 148, 182, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, VIEW.width, 24);
  }
  return canvas;
}

function buildCliff() {
  const canvas = document.createElement('canvas');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d');

  // distant headlands, cold and nearly flat, to give the horizon depth
  const drawHeadland = (flip) => {
    ctx.save();
    if (flip) {
      ctx.translate(VIEW.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.fillStyle = 'rgba(9, 16, 26, 0.95)';
    ctx.beginPath();
    ctx.moveTo(0, 166);
    ctx.lineTo(0, 136);
    ctx.lineTo(52, 124);
    ctx.lineTo(96, 132);
    ctx.lineTo(142, 116);
    ctx.lineTo(186, 130);
    ctx.lineTo(224, 144);
    ctx.lineTo(246, 154);
    ctx.lineTo(258, 166);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90, 120, 152, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };
  drawHeadland(false);
  drawHeadland(true);

  // the cliff the tower stands on
  const rock = ctx.createLinearGradient(0, 640, 0, 800);
  rock.addColorStop(0, '#141a24');
  rock.addColorStop(0.35, '#0b0f16');
  rock.addColorStop(1, '#05080d');
  ctx.fillStyle = rock;
  ctx.beginPath();
  ctx.moveTo(150, 800);
  ctx.lineTo(214, 776);
  ctx.lineTo(286, 760);
  ctx.lineTo(360, 746);
  ctx.lineTo(430, 736);
  ctx.lineTo(500, 728);
  ctx.lineTo(570, 722);
  ctx.lineTo(620, 718);
  ctx.lineTo(720, 718);
  ctx.lineTo(790, 724);
  ctx.lineTo(860, 736);
  ctx.lineTo(926, 752);
  ctx.lineTo(998, 776);
  ctx.lineTo(1064, 800);
  ctx.closePath();
  ctx.fill();

  // wet rim along the top, catching the moon
  ctx.strokeStyle = 'rgba(104, 132, 164, 0.34)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // facets of stone
  const facets = [
    [[380, 800], [430, 742], [520, 726], [560, 800]],
    [[520, 726], [600, 718], [700, 718], [760, 742], [780, 800], [560, 800]],
    [[760, 742], [840, 756], [900, 782], [930, 800], [780, 800]],
    [[214, 800], [290, 762], [360, 750], [404, 800]],
    [[900, 782], [960, 792], [1000, 800], [930, 800]],
  ];
  const shades = ['rgba(28, 35, 46, 0.55)', 'rgba(6, 9, 14, 0.6)', 'rgba(22, 29, 39, 0.5)', 'rgba(9, 12, 18, 0.6)', 'rgba(24, 32, 42, 0.45)'];
  facets.forEach((points, i) => {
    ctx.fillStyle = shades[i % shades.length];
    ctx.beginPath();
    points.forEach(([x, y], n) => (n === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fill();
  });

  // a few tufts of grass on the ledge, drawn as short strokes
  const rng = new Rng(4471);
  ctx.strokeStyle = 'rgba(70, 92, 84, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i += 1) {
    const x = rng.float(300, 980);
    const y = 726 + Math.abs(x - 640) * 0.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + rng.float(-4, 4), y - 9, x + rng.float(-7, 7), y - 16);
    ctx.stroke();
  }
  return canvas;
}

function buildWaves() {
  const rng = new Rng(2027);
  return Array.from({ length: 30 }, () => ({
    y: rng.float(168, 796),
    amp: rng.float(1.5, 5),
    length: rng.float(90, 260),
    speed: rng.float(0.15, 0.5),
    phase: rng.float(0, Math.PI * 2),
    alpha: rng.float(0.06, 0.2),
  }));
}

function buildMotes() {
  const rng = new Rng(7181);
  return Array.from({ length: 40 }, () => ({
    x: rng.float(80, VIEW.width - 80),
    y: rng.float(190, 700),
    size: rng.float(0.8, 2.1),
    drift: rng.float(4, 16),
    phase: rng.float(0, Math.PI * 2),
    rate: rng.float(0.4, 1.2),
  }));
}

export function createScene() {
  return {
    sky: buildSky(),
    cliff: buildCliff(),
    waves: buildWaves(),
    motes: buildMotes(),
  };
}

function drawSea(ctx, scene, time, game) {
  const sea = ctx.createLinearGradient(0, 150, 0, VIEW.height);
  sea.addColorStop(0, '#1a2c42');
  sea.addColorStop(0.18, '#122238');
  sea.addColorStop(0.55, '#0b1929');
  sea.addColorStop(1, '#07101b');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 150, VIEW.width, VIEW.height - 150);

  // the horizon line itself, a thin cold seam
  ctx.fillStyle = 'rgba(140, 180, 210, 0.3)';
  ctx.fillRect(0, 150, VIEW.width, 1);

  for (const wave of scene.waves) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(126, 172, 205, ${wave.alpha * (1 - (wave.y - 150) / 900)})`;
    ctx.lineWidth = 1;
    const span = VIEW.width + 200;
    for (let x = -100; x <= span; x += 14) {
      const y = wave.y + Math.sin(x / wave.length + time * wave.speed + wave.phase) * wave.amp
        + Math.sin(x / (wave.length * 0.37) - time * wave.speed * 0.7) * wave.amp * 0.4;
      if (x === -100) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // moon-glitter, cold and thin
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 52; i += 1) {
    const y = 164 + i * 9;
    const w = 6 + i * 1.2 + Math.sin(time * 0.8 + i) * 6;
    ctx.fillStyle = `rgba(170, 200, 230, ${0.06 * (1 - i / 60)})`;
    ctx.fillRect(300 - w / 2 + Math.sin(time * 0.5 + i * 0.7) * 9, y, w, 1.2);
  }
  ctx.restore();

  // the sea calms a little between waves: fewer, softer crests
  if (game.state === 'upgrades') {
    ctx.fillStyle = 'rgba(6, 12, 20, 0.35)';
    ctx.fillRect(0, 150, VIEW.width, VIEW.height - 150);
  }
}

function drawWaterReflection(ctx, time, game) {
  // warm light spilling from the lamp down the cliff, and a slow ripple at the waterline
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pool = ctx.createRadialGradient(LAMP.x, 726, 10, LAMP.x, 726, 180);
  pool.addColorStop(0, 'rgba(255, 168, 88, 0.16)');
  pool.addColorStop(0.5, 'rgba(255, 130, 55, 0.06)');
  pool.addColorStop(1, 'rgba(255, 110, 40, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(LAMP.x - 200, 640, 400, 160);
  for (let i = 0; i < 5; i += 1) {
    const spread = 90 + i * 34;
    const a = 0.09 - i * 0.015;
    ctx.strokeStyle = `rgba(255, 160, 80, ${Math.max(0, a)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(LAMP.x, 742, spread + Math.sin(time * 0.6 + i) * 8, 8 + i * 3, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTower(ctx, game, time) {
  const baseY = 730;
  const topY = 590;

  // plinth
  ctx.fillStyle = '#0a0e15';
  ctx.beginPath();
  ctx.moveTo(578, baseY + 30);
  ctx.lineTo(590, baseY - 4);
  ctx.lineTo(690, baseY - 4);
  ctx.lineTo(702, baseY + 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(104, 132, 164, 0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // the tower body: tapered, dark stone with a warm edge on the beam side
  const body = ctx.createLinearGradient(600, 0, 690, 0);
  body.addColorStop(0, '#10151d');
  body.addColorStop(0.35, '#1e2631');
  body.addColorStop(0.78, '#333c48');
  body.addColorStop(1, '#454f5c');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(612, topY);
  ctx.lineTo(668, topY);
  ctx.lineTo(684, baseY);
  ctx.lineTo(596, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 170, 202, 0.32)';
  ctx.stroke();

  // a warm rim where the lamp's own light catches the stone
  ctx.strokeStyle = 'rgba(255, 176, 96, 0.28)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(668, topY);
  ctx.lineTo(684, baseY);
  ctx.stroke();

  // stone courses
  ctx.strokeStyle = 'rgba(8, 11, 16, 0.55)';
  for (let y = topY + 18; y < baseY; y += 22) {
    const t = (y - topY) / (baseY - topY);
    const half = 28 + t * 16;
    ctx.beginPath();
    ctx.moveTo(640 - half, y);
    ctx.lineTo(640 + half, y);
    ctx.stroke();
  }

  // two small windows, and the door with a little light under it
  for (const [wy, scale] of [[topY + 92, 1], [topY + 150, 0.85]]) {
    ctx.fillStyle = 'rgba(255, 172, 92, 0.5)';
    ctx.beginPath();
    ctx.ellipse(640, wy, 4 * scale, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#05080c';
  ctx.beginPath();
  ctx.moveTo(626, baseY);
  ctx.lineTo(626, baseY - 34);
  ctx.quadraticCurveTo(640, baseY - 52, 654, baseY - 34);
  ctx.lineTo(654, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 150, 70, 0.22)';
  ctx.fillRect(626, baseY - 3, 28, 2);

  // gallery: a wider walkway around the lamp room, with a railing above it
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(596, topY - 12, 88, 14);
  ctx.strokeStyle = 'rgba(160, 190, 220, 0.34)';
  ctx.strokeRect(596.5, topY - 11.5, 87, 13);
  for (let i = 0; i < 11; i += 1) {
    ctx.fillStyle = 'rgba(125, 155, 185, 0.4)';
    ctx.fillRect(600 + i * 8, topY - 28, 1.4, 17);
  }
  ctx.fillStyle = 'rgba(150, 180, 210, 0.45)';
  ctx.fillRect(596, topY - 29, 88, 1.4);

  // lamp room: glass and mullions, warm from inside
  const glass = ctx.createLinearGradient(0, topY - 48, 0, topY - 10);
  glass.addColorStop(0, 'rgba(104, 70, 42, 0.95)');
  glass.addColorStop(0.55, 'rgba(70, 48, 32, 0.95)');
  glass.addColorStop(1, 'rgba(46, 32, 24, 0.95)');
  ctx.fillStyle = glass;
  ctx.fillRect(608, topY - 48, 64, 38);
  ctx.strokeStyle = 'rgba(214, 168, 112, 0.45)';
  ctx.strokeRect(608.5, topY - 47.5, 63, 37);
  for (let i = 1; i < 5; i += 1) {
    ctx.fillStyle = 'rgba(10, 10, 12, 0.75)';
    ctx.fillRect(608 + i * 12.8, topY - 48, 1.6, 38);
  }
  ctx.fillStyle = 'rgba(255, 196, 120, 0.16)';
  ctx.fillRect(608, topY - 48, 64, 5);

  // roof: a conical cap with a warm underside and a finial
  const roof = ctx.createLinearGradient(0, topY - 82, 0, topY - 48);
  roof.addColorStop(0, '#0d1219');
  roof.addColorStop(1, '#1c232d');
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(604, topY - 48);
  ctx.lineTo(640, topY - 84);
  ctx.lineTo(676, topY - 48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 190, 220, 0.35)';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 186, 120, 0.3)';
  ctx.beginPath();
  ctx.moveTo(610, topY - 48);
  ctx.lineTo(640, topY - 78);
  ctx.lineTo(670, topY - 48);
  ctx.stroke();
  ctx.fillStyle = 'rgba(190, 210, 230, 0.4)';
  ctx.fillRect(638.5, topY - 96, 3, 14);
  ctx.beginPath();
  ctx.arc(640, topY - 97, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawBeam(ctx, game, time) {
  const shape = beamShape(game);
  const half = shape.half;
  const reach = shape.reach;
  const hot = shape.overdrive;

  // The cone is built out of nested wedges, each a little wider and a little fainter than the
  // one inside it. Additive, so the accumulation gives a smooth falloff across the cone: hot
  // along the axis, dissolving at the edges. One wedge with hard edges reads as a searchlight;
  // this reads as light in wet air.
  const layers = 16;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < layers; i += 1) {
    const t = (i + 1) / layers;
    const spread = 0.34 + 0.66 * t;
    const h = half * spread;
    const alpha = (0.24 * Math.pow(1 - t, 1.35) + 0.012) * (hot ? 1.3 : 1);
    const grad = ctx.createRadialGradient(LAMP.x, LAMP.y, 8, LAMP.x, LAMP.y, reach * (0.92 + spread * 0.1));
    grad.addColorStop(0, hot ? 'rgba(255, 255, 246, 0.98)' : 'rgba(255, 240, 208, 0.95)');
    grad.addColorStop(0.1, hot ? 'rgba(255, 238, 206, 0.72)' : 'rgba(255, 212, 158, 0.62)');
    grad.addColorStop(0.42, 'rgba(255, 168, 92, 0.34)');
    grad.addColorStop(0.78, 'rgba(255, 122, 46, 0.12)');
    grad.addColorStop(1, 'rgba(255, 100, 30, 0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(LAMP.x, LAMP.y);
    ctx.arc(LAMP.x, LAMP.y, reach * (0.92 + spread * 0.1), shape.angle - h, shape.angle + h);
    ctx.closePath();
    ctx.fill();
  }

  // the edges, barely there
  ctx.globalAlpha = hot ? 0.34 : 0.2;
  ctx.strokeStyle = hot ? 'rgba(255, 246, 226, 0.5)' : 'rgba(255, 205, 145, 0.35)';
  ctx.lineWidth = 1;
  for (const edge of [shape.angle - half, shape.angle + half]) {
    ctx.beginPath();
    ctx.moveTo(LAMP.x, LAMP.y);
    ctx.lineTo(LAMP.x + Math.cos(edge) * reach, LAMP.y + Math.sin(edge) * reach);
    ctx.stroke();
  }

  // the core, brightest at the glass and gone by half way
  const coreGrad = ctx.createLinearGradient(LAMP.x, LAMP.y, LAMP.x + Math.cos(shape.angle) * reach, LAMP.y + Math.sin(shape.angle) * reach);
  coreGrad.addColorStop(0, hot ? 'rgba(255, 255, 252, 0.85)' : 'rgba(255, 240, 206, 0.7)');
  coreGrad.addColorStop(0.3, hot ? 'rgba(255, 236, 200, 0.3)' : 'rgba(255, 200, 140, 0.22)');
  coreGrad.addColorStop(1, 'rgba(255, 170, 90, 0)');
  ctx.globalAlpha = 1;
  ctx.strokeStyle = coreGrad;
  ctx.lineWidth = 2.2 + Math.sin(time * 5) * 0.4;
  ctx.beginPath();
  ctx.moveTo(LAMP.x, LAMP.y);
  ctx.lineTo(LAMP.x + Math.cos(shape.angle) * reach, LAMP.y + Math.sin(shape.angle) * reach);
  ctx.stroke();
  ctx.restore();
}

function drawLamp(ctx, game, time) {
  const hot = game.odTimer > 0;
  const dead = game.state === 'results' && game.result === 'defeat';
  const pulse = 1 + Math.sin(time * 3.1) * 0.04;
  const radius = (hot ? 88 : 62) * pulse;
  const life = dead ? 0.22 : 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(LAMP.x, LAMP.y - 12, 2, LAMP.x, LAMP.y - 12, radius);
  glow.addColorStop(0, hot ? 'rgba(255, 255, 245, 0.95)' : 'rgba(255, 240, 200, 0.9)');
  glow.addColorStop(0.18, hot ? 'rgba(255, 220, 160, 0.55)' : 'rgba(255, 190, 110, 0.45)');
  glow.addColorStop(0.55, 'rgba(255, 120, 40, 0.12)');
  glow.addColorStop(1, 'rgba(255, 90, 20, 0)');
  ctx.globalAlpha = life;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(LAMP.x, LAMP.y - 12, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = dead ? 'rgba(160, 130, 105, 0.5)' : hot ? '#fffdf6' : '#fff2d4';
  ctx.beginPath();
  ctx.arc(LAMP.x, LAMP.y - 12, hot ? 8 : 6, 0, Math.PI * 2);
  ctx.fill();

  // motes of dust catching the light at the glass
  for (let i = 0; i < 7 && !dead; i += 1) {
    const a = time * 0.7 + i * 1.7;
    const r = 10 + (i % 3) * 7;
    ctx.globalAlpha = 0.3 + Math.sin(time * 2 + i) * 0.15;
    ctx.fillStyle = PALETTE.fireHot;
    ctx.beginPath();
    ctx.arc(LAMP.x + Math.cos(a) * r, LAMP.y - 12 + Math.sin(a * 1.3) * r * 0.7, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMotes(ctx, scene, game, time) {
  const shape = beamShape(game);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const mote of scene.motes) {
    const x = mote.x + Math.sin(time * mote.rate + mote.phase) * mote.drift;
    const y = mote.y + Math.cos(time * mote.rate * 0.8 + mote.phase) * mote.drift * 0.6;
    const dx = x - LAMP.x;
    const dy = y - LAMP.y;
    const dist = Math.hypot(dx, dy);
    let lit = 0;
    if (dist < shape.reach) {
      const delta = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - shape.angle), Math.cos(Math.atan2(dy, dx) - shape.angle)));
      if (delta < shape.half) lit = 1 - dist / shape.reach;
    }
    ctx.globalAlpha = 0.16 + lit * 0.65;
    ctx.fillStyle = lit > 0.05 ? PALETTE.fireHot : '#8fb0c8';
    ctx.beginPath();
    ctx.arc(x, y, mote.size * (1 + lit), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAir(ctx, game, time) {
  // hurt: a red pulse at the edges of the world
  if (game.hurtPulse > 0.01) {
    const hurt = ctx.createRadialGradient(VIEW.width / 2, 420, 200, VIEW.width / 2, 420, 820);
    hurt.addColorStop(0, 'rgba(180, 30, 20, 0)');
    hurt.addColorStop(1, `rgba(180, 30, 20, ${0.45 * game.hurtPulse})`);
    ctx.fillStyle = hurt;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  // overdrive: one white breath across the whole scene
  if (game.flashScreen > 0.01) {
    ctx.fillStyle = `rgba(255, 226, 186, ${Math.min(0.5, game.flashScreen * 0.5)})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  // ordinary vignette: the edges of the cliff are dark
  const vignette = ctx.createRadialGradient(VIEW.width / 2, 420, 260, VIEW.width / 2, 430, 900);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.62, 'rgba(0, 0, 0, 0.22)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}
