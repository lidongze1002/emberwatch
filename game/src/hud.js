// The interface drawn into the scene: hearts, the wave, the score, the combo, the overdrive
// bar, the leviathan's shell, and the banner that carries a wave in or out. It reads game
// state and writes nothing.

import { PALETTE, TUNING, VIEW } from './config.js';
import { FONTS } from './config.js';

const M = 44;

export function label(ctx, text, x, y, size, colour, spacing = 0, align = 'left', font = FONTS.ui) {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.42);
  ctx.bezierCurveTo(x - s * 0.7, y - s * 0.05, x - s * 0.34, y - s * 0.62, x, y - s * 0.22);
  ctx.bezierCurveTo(x + s * 0.34, y - s * 0.62, x + s * 0.7, y - s * 0.05, x, y + s * 0.42);
  ctx.closePath();
}

function drawHearts(ctx, game, time) {
  for (let i = 0; i < game.stats.maxHearts; i += 1) {
    const x = M + 12 + i * 32;
    const y = 52;
    const full = i < game.hearts;
    ctx.save();
    if (full) {
      const pulse = game.hurtPulse > 0 && i === game.hearts ? 1 + game.hurtPulse * 0.35 : 1;
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);
      ctx.translate(-x, -y);
      ctx.shadowColor = 'rgba(255, 120, 50, 0.7)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = PALETTE.fire;
      heartPath(ctx, x, y, 20);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 240, 205, 0.55)';
      heartPath(ctx, x - 1, y - 2, 10);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(120, 140, 165, 0.4)';
      ctx.lineWidth = 1.3;
      heartPath(ctx, x, y, 20);
      ctx.stroke();
    }
    ctx.restore();
  }
  label(ctx, 'THE LAMP', M, 84, 10, PALETTE.textDim, 3);
}

function drawWave(ctx, game) {
  const centre = VIEW.width / 2;
  const total = game.waveTotal || 1;
  const done = Math.min(total, game.waveGone ?? 0);
  label(ctx, `WAVE ${Math.max(1, game.wave)} OF ${game.waveCount}`, centre, 42, 13, PALETTE.textWarm, 7, 'center');
  const title = game.waveTitle || '';
  if (title) label(ctx, title, centre, 66, 19, 'rgba(223, 230, 240, 0.62)', 2, 'center', FONTS.display);
  const pips = Math.min(24, total);
  if (pips > 0) {
    const shown = Math.round((done / total) * pips);
    for (let i = 0; i < pips; i += 1) {
      ctx.fillStyle = i < shown ? 'rgba(255, 160, 90, 0.75)' : 'rgba(120, 150, 180, 0.22)';
      ctx.fillRect(centre - (pips * 7) / 2 + i * 7, 80, 3, 3);
    }
  }
}

function drawScore(ctx, game) {
  const x = VIEW.width - M;
  label(ctx, 'SCORE', x, 34, 10, PALETTE.textDim, 3, 'right');
  ctx.save();
  ctx.font = `600 34px ${FONTS.mono}`;
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = 'right';
  ctx.letterSpacing = '1px';
  ctx.fillText(game.score.toLocaleString('en-US'), x, 66);
  ctx.restore();
  label(ctx, `BEST ${Math.max(game.best, game.score).toLocaleString('en-US')}`, x, 88, 11, PALETTE.textDim, 2, 'right');
}

function drawCombo(ctx, game) {
  if (game.comboMult <= 1) return;
  const centre = VIEW.width / 2;
  const heat = Math.min(1, game.comboTimer / TUNING.comboWindow);
  ctx.save();
  ctx.globalAlpha = 0.55 + heat * 0.45;
  label(ctx, `×${game.comboMult}`, centre, 122, 26 + heat * 4, PALETTE.fire, 2, 'center', FONTS.mono);
  label(ctx, 'COMBO', centre, 138, 9, 'rgba(255, 179, 71, 0.6)', 4, 'center');
  ctx.restore();
}

function drawBoss(ctx, game) {
  const boss = game.shadows.find((e) => e.type === 'boss' && !e.dead);
  if (!boss) return;
  const w = 420;
  const x = (VIEW.width - w) / 2;
  const y = 114;
  label(ctx, 'LEVIATHAN', x, y - 8, 11, 'rgba(255, 160, 90, 0.85)', 4);
  label(ctx, boss.litTime >= TUNING.armour.leviathan ? 'SHELL OPEN' : 'SHELL CLOSED', x + w, y - 8, 9, PALETTE.textDim, 3, 'right');
  ctx.fillStyle = 'rgba(9, 14, 22, 0.85)';
  ctx.fillRect(x, y, w, 7);
  const pct = Math.max(0, boss.hp / boss.maxHp);
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, PALETTE.fireDeep);
  grad.addColorStop(1, PALETTE.fire);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w * pct, 7);
  ctx.strokeStyle = 'rgba(255, 190, 120, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 6);
}

function drawOverdrive(ctx, game, time) {
  const x = M;
  const y = VIEW.height - 58;
  const w = 240;
  const h = 9;
  const pct = Math.min(1, game.overdrive / TUNING.overdriveMax);
  const ready = pct >= 1;
  label(ctx, 'OVERDRIVE', x, y - 10, 10, ready ? PALETTE.fire : PALETTE.textDim, 3);
  ctx.fillStyle = 'rgba(10, 15, 24, 0.9)';
  ctx.fillRect(x, y, w, h);
  if (pct > 0) {
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, 'rgba(255, 106, 30, 0.85)');
    grad.addColorStop(1, 'rgba(255, 214, 150, 0.95)');
    ctx.save();
    ctx.shadowColor = 'rgba(255, 140, 60, 0.8)';
    ctx.shadowBlur = ready ? 16 : 8;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, Math.max(2, w * pct), h);
    ctx.restore();
  }
  ctx.strokeStyle = ready ? 'rgba(255, 210, 150, 0.8)' : 'rgba(130, 155, 185, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // charge ticks at 25, 50, 75
  ctx.fillStyle = 'rgba(4, 8, 14, 0.8)';
  for (let i = 1; i < 4; i += 1) ctx.fillRect(x + (w * i) / 4, y, 1, h);

  if (ready) {
    const pulse = 0.55 + Math.sin(time * 6) * 0.25;
    ctx.save();
    ctx.globalAlpha = pulse;
    label(ctx, 'SPACE', x + w + 12, y + 9, 11, PALETTE.fireHot, 3);
    ctx.restore();
  } else if (game.odTimer > 0) {
    label(ctx, 'BURNING', x + w + 12, y + 9, 10, 'rgba(255, 190, 120, 0.8)', 3);
  }
}

export function drawBanner(ctx, game) {
  const b = game.banner;
  if (!b) return;
  const t = b.age / b.life;
  const fade = t < 0.15 ? t / 0.15 : t > 0.72 ? Math.max(0, (1 - t) / 0.28) : 1;
  const rise = t < 0.15 ? (1 - t / 0.15) * 12 : 0;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(0, rise);
  const centre = VIEW.width / 2;
  label(ctx, b.text, centre, 246, 40, PALETTE.textWarm, 6, 'center', FONTS.display);
  if (b.sub) label(ctx, b.sub, centre, 276, 13, 'rgba(223, 230, 240, 0.7)', 4, 'center');
  ctx.restore();
}

export function drawHud(ctx, game, time) {
  drawHearts(ctx, game, time);
  drawWave(ctx, game);
  drawScore(ctx, game);
  drawCombo(ctx, game);
  drawBoss(ctx, game);
  drawOverdrive(ctx, game, time);
  label(ctx, 'M  MUTE', VIEW.width - M, VIEW.height - 30, 10, 'rgba(127, 142, 163, 0.7)', 3, 'right');
  drawBanner(ctx, game);
}
