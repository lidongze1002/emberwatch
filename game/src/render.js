// 俯拍的歌剧院：地板、墙、座椅、台口、三个人、电视脑袋的观众。光只从台口、提灯和手电里来。

import { PALETTE, SEATS, SPAWNS, TUNING, VIEW, WALLS, ZONES } from './config.js';
import { L } from './text.js';

export function drawWorld(ctx, game, time) {
  const shake = game.shake;
  const sx = Math.sin(time * 71) * shake;
  const sy = Math.cos(time * 53) * shake;
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  ctx.save();
  ctx.translate(sx, sy);

  drawFloor(ctx, game, time);
  drawStage(ctx, game, time);
  drawSeats(ctx);
  drawProps(ctx, game, time);
  drawWalls(ctx);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawFlashlights(ctx, game);
  ctx.restore();

  drawBullets(ctx, game);
  drawThralls(ctx, game, time);
  drawAgents(ctx, game, time);
  drawLights(ctx, game, time);
  ctx.restore();

  drawAir(ctx, game, time);
}

function drawFloor(ctx, game, time) {
  const base = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  base.addColorStop(0, '#0a0d14');
  base.addColorStop(0.55, '#0c1018');
  base.addColorStop(1, '#080b11');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // the boards
  ctx.strokeStyle = 'rgba(120, 146, 180, 0.05)';
  ctx.lineWidth = 1;
  for (let y = 70; y < VIEW.height; y += 34) {
    ctx.beginPath();
    ctx.moveTo(56, y);
    ctx.lineTo(VIEW.width - 56, y);
    ctx.stroke();
  }

  // a carpet runner: foyer door, down the aisle, to the stage
  ctx.save();
  const runner = (x, y, w, h) => {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(92, 30, 34, 0.22)');
    g.addColorStop(1, 'rgba(58, 20, 24, 0.14)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };
  runner(448, 578, 60, 60);
  runner(706, 306, 34, 330);
  runner(706, 176, 150, 34);
  ctx.restore();

  // wet sheen under the stage light
  const sheen = ctx.createRadialGradient(840, 180, 10, 840, 220, 520);
  sheen.addColorStop(0, 'rgba(255, 190, 120, 0.09)');
  sheen.addColorStop(0.5, 'rgba(255, 150, 80, 0.03)');
  sheen.addColorStop(1, 'rgba(255, 140, 60, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // dust in the air of the house
  for (let i = 0; i < 26; i += 1) {
    const x = 500 + ((i * 137) % 700) + Math.sin(time * 0.4 + i) * 8;
    const y = 320 + ((i * 83) % 380) + Math.cos(time * 0.33 + i) * 6;
    ctx.fillStyle = `rgba(255, 214, 160, ${0.05 + (i % 3) * 0.02})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
}

function drawStage(ctx, game, time) {
  // stage floor
  const stage = ZONES.stage;
  const grad = ctx.createLinearGradient(0, stage.y, 0, stage.y + stage.h);
  grad.addColorStop(0, '#241a17');
  grad.addColorStop(1, '#15100f');
  ctx.fillStyle = grad;
  ctx.fillRect(stage.x - 18, stage.y - 18, stage.w + 36, stage.h + 36);

  // the curtain, closed except for the middle
  ctx.fillStyle = '#5e1a20';
  ctx.fillRect(stage.x - 18, stage.y - 18, 210, stage.h + 36);
  ctx.fillRect(stage.x + stage.w - 192, stage.y - 18, 210, stage.h + 36);
  ctx.strokeStyle = 'rgba(255, 190, 160, 0.12)';
  for (let x = stage.x - 10; x < stage.x + 200; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, stage.y - 18);
    ctx.lineTo(x + 6, stage.y + stage.h + 18);
    ctx.stroke();
  }
  for (let x = stage.x + stage.w - 182; x < stage.x + stage.w + 18; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, stage.y - 18);
    ctx.lineTo(x + 6, stage.y + stage.h + 18);
    ctx.stroke();
  }

  // gold lip of the stage and the footlights
  ctx.fillStyle = 'rgba(201, 162, 90, 0.55)';
  ctx.fillRect(stage.x - 18, stage.y + stage.h + 14, stage.w + 36, 3);
  for (let x = stage.x + 40; x < stage.x + stage.w - 40; x += 54) {
    const flicker = 0.55 + Math.sin(time * 3 + x) * 0.12;
    const glow = ctx.createRadialGradient(x, stage.y + stage.h + 12, 2, x, stage.y + stage.h + 12, 26);
    glow.addColorStop(0, `rgba(255, 210, 150, ${0.5 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 170, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, stage.y + stage.h + 12, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // the aria: a slow ring of warm light over the stage while the power is on
  if (game.power) {
    const pulse = 0.5 + Math.sin(time * 1.3) * 0.15;
    const aria = ctx.createRadialGradient(840, 180, 10, 840, 180, 240);
    aria.addColorStop(0, `rgba(255, 196, 130, ${0.12 * pulse})`);
    aria.addColorStop(1, 'rgba(255, 170, 100, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = aria;
    ctx.fillRect(500, 60, 700, 300);
    ctx.restore();
  }
}

function drawSeats(ctx) {
  for (const s of SEATS) {
    ctx.fillStyle = '#241419';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = 'rgba(150, 58, 62, 0.35)';
    ctx.fillRect(s.x, s.y, s.w, 4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(s.x, s.y + s.h - 3, s.w, 3);
  }
}

function drawProps(ctx, game, time) {
  // exit: the door back to the street, warm and open
  const exit = SPAWNS.exit;
  const eGlow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 70);
  eGlow.addColorStop(0, 'rgba(255, 196, 130, 0.34)');
  eGlow.addColorStop(1, 'rgba(255, 160, 90, 0)');
  ctx.fillStyle = eGlow;
  ctx.beginPath();
  ctx.arc(exit.x, exit.y, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(201, 162, 90, 0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x - 18, exit.y - 28, 36, 56);
  ctx.fillStyle = 'rgba(255, 210, 150, 0.25)';
  ctx.fillRect(exit.x - 15, exit.y - 25, 30, 50);

  // ticket booth in the foyer, with a lit window
  ctx.fillStyle = '#171b22';
  ctx.strokeStyle = 'rgba(160, 185, 210, 0.16)';
  ctx.lineWidth = 1;
  ctx.fillRect(280, 356, 108, 56);
  ctx.strokeRect(280.5, 356.5, 107, 55);
  ctx.fillStyle = 'rgba(255, 200, 140, 0.22)';
  ctx.fillRect(292, 368, 46, 24);
  ctx.fillStyle = 'rgba(255, 220, 170, 0.7)';
  ctx.fillRect(320, 380, 14, 2);

  // a bench along the foyer wall
  ctx.fillStyle = '#20242c';
  ctx.fillRect(86, 556, 76, 16);
  ctx.fillStyle = 'rgba(120, 146, 180, 0.18)';
  ctx.fillRect(86, 556, 76, 2);

  // switchboard, backstage: a box with a live light
  const sw = SPAWNS.switchboard;
  ctx.fillStyle = '#151a22';
  ctx.strokeStyle = '#2f3a48';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(sw.x - 26, sw.y - 18, 52, 36);
  ctx.fillStyle = game.power ? 'rgba(120, 230, 180, 0.85)' : 'rgba(120, 60, 60, 0.6)';
  ctx.beginPath();
  ctx.arc(sw.x + 14, sw.y - 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200, 214, 236, 0.4)';
  for (let i = 0; i < 3; i += 1) ctx.fillRect(sw.x - 18, sw.y - 8 + i * 8, 22, 2);

  // the chandelier above the house: a warm pool on the carpet, no drawn ring
  ctx.save();
  const chand = ctx.createRadialGradient(850, 470, 8, 850, 470, 150);
  chand.addColorStop(0, 'rgba(255, 214, 160, 0.07)');
  chand.addColorStop(1, 'rgba(255, 180, 100, 0)');
  ctx.fillStyle = chand;
  ctx.beginPath();
  ctx.arc(850, 470, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWalls(ctx) {
  for (const [x, y, w, h] of WALLS) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x, y + h - 3, w, 3);
  }
}

function drawFlashlights(ctx, game) {
  for (const a of game.agents) {
    if (a.down || a.taken || a.extracted || a.charmed) continue;
    const reach = 300;
    const half = 0.34;
    for (let i = 0; i < 7; i += 1) {
      const t = (i + 1) / 7;
      const h = half * (0.5 + t * 0.5);
      const grad = ctx.createRadialGradient(a.x, a.y, 8, a.x, a.y, reach * (0.7 + t * 0.3));
      grad.addColorStop(0, `rgba(255, 226, 180, ${0.16 * (1 - t) + 0.03})`);
      grad.addColorStop(1, 'rgba(255, 200, 140, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.arc(a.x, a.y, reach * (0.7 + t * 0.3), a.aim - h, a.aim + h);
      ctx.closePath();
      ctx.fill();
    }
  }
  // the lamp carrier paints a wider, warmer pool
  for (const a of game.agents) {
    if (a.role !== 'lamp' || a.down || a.taken || a.extracted) continue;
    const grad = ctx.createRadialGradient(a.x, a.y, 6, a.x, a.y, 140);
    grad.addColorStop(0, 'rgba(255, 214, 160, 0.24)');
    grad.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 140, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawThralls(ctx, game, time) {
  for (const t of game.thralls) {
    if (t.dead) continue;
    const bob = Math.sin(t.step) * 2;
    ctx.save();
    ctx.translate(t.x, t.y + bob);

    // grounded, not floating
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // suit body
    ctx.fillStyle = '#b9b2a2';
    ctx.beginPath();
    ctx.roundRect(-14, -6, 28, 26, 5);
    ctx.fill();
    ctx.fillStyle = '#8f8778';
    ctx.fillRect(-4, 0, 8, 20);

    // TV head
    ctx.fillStyle = '#0a0c10';
    ctx.strokeStyle = '#3a4030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-15, -32, 30, 26, 4);
    ctx.fill();
    ctx.stroke();

    // static
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-10, -27, 20, 16, 2);
    ctx.clip();
    const flick = 0.5 + Math.sin(time * 20 + t.step * 3) * 0.3;
    ctx.fillStyle = `rgba(127, 227, 208, ${0.4 * flick})`;
    ctx.fillRect(-10, -27, 20, 16);
    for (let i = 0; i < 6; i += 1) {
      const y = -27 + ((i * 4 + Math.floor(time * 40 + t.step * 9)) % 16);
      ctx.fillStyle = `rgba(210, 255, 245, ${0.3 * flick})`;
      ctx.fillRect(-10, y, 20, 1.2);
    }
    ctx.restore();

    if (t.hitFlash > 0.02) {
      ctx.globalAlpha = Math.min(0.8, t.hitFlash);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -8, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (t.hp < t.maxHp) {
      const w = 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(t.x - w / 2, t.y - 44, w, 3);
      ctx.fillStyle = 'rgba(200, 90, 80, 0.9)';
      ctx.fillRect(t.x - w / 2, t.y - 44, (w * t.hp) / t.maxHp, 3);
    }
  }
}

function drawAgents(ctx, game, time) {
  for (const a of game.agents) {
    if (a.taken || a.extracted) continue;
    const down = a.down;
    ctx.save();
    ctx.translate(a.x, a.y);
    if (down) ctx.globalAlpha = 0.55;

    // grounded
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // body: a coat and shoulders, facing aim
    ctx.rotate(a.aim + Math.PI / 2);
    ctx.fillStyle = a.role === 'veteran' ? '#3d4757' : a.role === 'rookie' ? '#31505c' : '#4a4030';
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = a.colour;
    ctx.beginPath();
    ctx.ellipse(0, -9, 7, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // the weapon
    ctx.strokeStyle = 'rgba(230, 236, 245, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, -27);
    ctx.stroke();
    ctx.restore();

    // charm: a red ring and a note, so the player can see who is being taken
    if (a.charmed) {
      const pulse = 0.5 + Math.sin(time * 5) * 0.3;
      ctx.strokeStyle = `rgba(220, 90, 90, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    // down: a ring that fills as someone revives them
    if (down) {
      ctx.strokeStyle = 'rgba(220, 226, 236, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      if (a.revive > 0) {
        ctx.strokeStyle = 'rgba(255, 214, 150, 0.9)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, a.revive / TUNING.reviveSeconds));
        ctx.stroke();
      }
    }

    // name and health
    if (!down) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(a.x - 19, a.y + 22, 38, 4);
      ctx.fillStyle = a.colour;
      ctx.fillRect(a.x - 19, a.y + 22, (38 * Math.max(0, a.hp)) / a.maxHp, 4);
    }

    if (a.flash > 0) {
      ctx.fillStyle = `rgba(255, 80, 70, ${a.flash * 0.5})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBullets(ctx, game) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of game.bullets) {
    ctx.strokeStyle = 'rgba(255, 226, 170, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
    ctx.stroke();
  }
  for (const m of game.muzzle) {
    const g = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, 14);
    g.addColorStop(0, 'rgba(255, 245, 220, 0.8)');
    g.addColorStop(1, 'rgba(255, 190, 120, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLights(ctx, game, time) {
  // a quiet dark when the power is cut, warmer when it is on
  if (!game.power) {
    ctx.fillStyle = 'rgba(4, 7, 12, 0.35)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

function drawAir(ctx, game, time) {
  const vig = ctx.createRadialGradient(640, 400, 240, 640, 420, 860);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.65, 'rgba(0,0,0,0.28)');
  vig.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  if (game.flashWhite > 0.01) {
    ctx.fillStyle = `rgba(255, 220, 180, ${Math.min(0.35, game.flashWhite * 0.35)})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  if (game.toastText && game.toast > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.toast * 2);
    ctx.font = `600 15px ${L.fonts.ui}`;
    ctx.textAlign = 'center';
    const w = ctx.measureText(game.toastText).width + 34;
    ctx.fillStyle = 'rgba(6, 9, 14, 0.8)';
    ctx.beginPath();
    ctx.roundRect(VIEW.width / 2 - w / 2, 96, w, 30, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201, 162, 90, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 214, 160, 0.95)';
    ctx.fillText(game.toastText, VIEW.width / 2, 116);
    ctx.restore();
  }
}
