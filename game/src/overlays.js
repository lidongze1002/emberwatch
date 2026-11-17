// 三张画：接警、简报、结案。全部 canvas。

import { PALETTE, VIEW } from './config.js';
import { L, fonts } from './text.js';
import { label } from './hud.js';

export const TITLE_LINK = { x: 104, y: 676, w: 160, h: 40 };

export function tTitleLinkAt(x, y) {
  return x >= TITLE_LINK.x && x <= TITLE_LINK.x + TITLE_LINK.w && y >= TITLE_LINK.y && y <= TITLE_LINK.y + TITLE_LINK.h;
}

export function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    const next = line + ch;
    if (line && ctx.measureText(next).width > maxWidth) {
      const space = line.lastIndexOf(' ');
      if (space > 0 && !L.cjk) {
        lines.push(line.slice(0, space));
        line = `${line.slice(space + 1)}${ch}`;
      } else {
        lines.push(line);
        line = ch === ' ' ? '' : ch;
      }
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function rule(ctx, x1, x2, y, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

export function drawTitle(ctx, game, time) {
  const cx = VIEW.width / 2;
  const veil = ctx.createRadialGradient(cx, 360, 140, cx, 400, 780);
  veil.addColorStop(0, 'rgba(4, 6, 11, 0.6)');
  veil.addColorStop(0.7, 'rgba(3, 5, 9, 0.8)');
  veil.addColorStop(1, 'rgba(2, 3, 6, 0.95)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  rule(ctx, 120, VIEW.width - 120, 84, 'rgba(200, 170, 130, 0.16)');
  rule(ctx, 120, VIEW.width - 120, VIEW.height - 84, 'rgba(200, 170, 130, 0.16)');

  label(ctx, L.title.eyebrow, cx, 150, 14, 'rgba(201, 162, 90, 0.8)', 8, 'center');
  ctx.save();
  ctx.font = `${L.cjk ? 'normal' : 'bold'} ${L.cjk ? 132 : 96}px ${fonts.display}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = L.cjk ? '16px' : '8px';
  ctx.shadowColor = 'rgba(255, 130, 40, 0.35)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#f2e3c8';
  ctx.fillText(L.title.name, cx, 310);
  ctx.restore();

  label(ctx, L.title.line, cx, 362, 20, 'rgba(223, 230, 240, 0.72)', 1, 'center', fonts.display);

  const pulse = 0.6 + Math.sin(time * 2.4) * 0.28;
  ctx.save();
  ctx.globalAlpha = pulse;
  label(ctx, L.title.cta, cx, 560, 18, '#ffd9a0', 6, 'center');
  ctx.restore();
  rule(ctx, cx - 190, cx + 190, 574, 'rgba(201, 162, 90, 0.3)');

  label(ctx, L.title.foot, cx, 640, 11, 'rgba(160, 176, 196, 0.6)', 4, 'center');

  ctx.save();
  ctx.globalAlpha = 0.55;
  label(ctx, L.otherLabel, TITLE_LINK.x, TITLE_LINK.y + 20, 10, 'rgba(160, 176, 196, 0.8)', 3);
  rule(ctx, TITLE_LINK.x, TITLE_LINK.x + 78, TITLE_LINK.y + 28, 'rgba(160, 176, 196, 0.25)');
  ctx.restore();
}

export function drawBrief(ctx, game, time) {
  const cx = VIEW.width / 2;
  ctx.fillStyle = 'rgba(3, 5, 9, 0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  const x = 200;
  const y = 96;
  const w = VIEW.width - 400;
  const h = 610;
  ctx.fillStyle = 'rgba(10, 13, 19, 0.94)';
  ctx.strokeStyle = 'rgba(160, 185, 210, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  const left = x + 44;
  label(ctx, L.brief.caseNo, left, y + 44, 12, 'rgba(201, 162, 90, 0.85)', 6);
  label(ctx, L.brief.place, left, y + 66, 11, 'rgba(160, 176, 196, 0.7)', 3);

  label(ctx, L.brief.legend, left, y + 132, L.cjk ? 40 : 34, 'rgba(226, 120, 112, 0.95)', L.cjk ? 6 : 4, 'left', fonts.display);
  ctx.save();
  ctx.font = `16px ${fonts.ui}`;
  ctx.fillStyle = 'rgba(223, 230, 240, 0.72)';
  const lines = wrap(ctx, L.brief.rule, w - 88);
  lines.slice(0, 4).forEach((line, i) => ctx.fillText(line, left, y + 168 + i * 24));
  ctx.restore();

  rule(ctx, left, x + w - 44, y + 280, 'rgba(160, 185, 210, 0.14)');
  label(ctx, L.brief.squad, left, y + 312, 11, 'rgba(201, 162, 90, 0.8)', 4);

  game.agents.forEach((a, i) => {
    const row = y + 344 + i * 54;
    const meta = L.agent[a.role];
    ctx.fillStyle = a.colour;
    ctx.beginPath();
    ctx.arc(left + 8, row - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, meta.name, left + 26, row, 15, PALETTE.pale, 2);
    label(ctx, meta.line, left + 150, row, 12, 'rgba(160, 176, 196, 0.75)', 1);
  });

  const pulse = 0.55 + Math.sin(time * 2.6) * 0.3;
  ctx.save();
  ctx.globalAlpha = pulse;
  label(ctx, L.brief.go, cx, y + h - 30, 16, '#ffd9a0', 6, 'center');
  ctx.restore();
}

export function drawResult(ctx, game, time) {
  const cx = VIEW.width / 2;
  const veil = ctx.createRadialGradient(cx, 360, 80, cx, 400, 820);
  veil.addColorStop(0, 'rgba(4, 6, 11, 0.7)');
  veil.addColorStop(1, 'rgba(2, 3, 6, 0.95)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  const won = game.won;
  label(ctx, won ? 'CASE CLOSED' : 'SIGNAL LOST', cx, 210, 12, 'rgba(201, 162, 90, 0.8)', 8, 'center');
  ctx.save();
  ctx.font = `${L.cjk ? 'normal' : 'bold'} ${L.cjk ? 76 : 56}px ${fonts.display}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillStyle = won ? '#f2e3c8' : '#e0c8c0';
  ctx.shadowColor = won ? 'rgba(255, 190, 110, 0.4)' : 'rgba(220, 90, 80, 0.35)';
  ctx.shadowBlur = 30;
  ctx.fillText(won ? L.result.winTitle : L.result.loseTitle, cx, 290);
  ctx.restore();
  label(ctx, won ? L.result.winSub : L.result.loseSub, cx, 330, 18, 'rgba(223, 230, 240, 0.65)', 1, 'center', fonts.display);

  label(ctx, L.result.survivors(game.extracted, game.agents.length), cx - 150, 440, 22, 'rgba(240, 201, 141, 0.9)', 1, 'center', fonts.mono);
  label(ctx, L.result.time(Math.floor(game.clock)), cx + 150, 440, 22, 'rgba(200, 212, 228, 0.75)', 1, 'center', fonts.mono);

  const pulse = 0.6 + Math.sin(time * 2.4) * 0.3;
  ctx.save();
  ctx.globalAlpha = pulse;
  label(ctx, L.result.again, cx, 580, 16, '#ffd9a0', 5, 'center');
  ctx.restore();
}
