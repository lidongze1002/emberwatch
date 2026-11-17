// 三张纸：接警单、简报、结案。同一套卷宗语言——骨白细线、等宽字、一枚红色印章，没有发光。

import { VIEW } from './config.js';
import { L, fonts } from './text.js';
import { label } from './hud.js';

export const TITLE_LINK = { x: 104, y: 676, w: 160, h: 40 };

const INK = 'rgba(233, 227, 214, 0.92)';
const INK_SOFT = 'rgba(206, 200, 186, 0.62)';
const INK_FAINT = 'rgba(186, 180, 168, 0.4)';
const AMBER = 'rgba(201, 162, 90, 0.78)';
const RED = 'rgba(158, 62, 54, 0.82)';

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

// A red stamp, off square, the way a rubber stamp lands.
function stamp(ctx, x, y, text, size = 17, colour = RED) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.06);
  const w = text.length * (size * 0.82) + 20;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w, size + 8);
  label(ctx, text, 10, size + 1.5, size * 0.62, colour, 3.4);
  ctx.restore();
}

// the typing cursor: a 1 px block that blinks, no glow
function caret(ctx, x, y, time, h = 12) {
  if (time % 1.15 < 0.66) {
    ctx.fillStyle = 'rgba(226, 220, 206, 0.75)';
    ctx.fillRect(x + 4, y - h + 2, 5, h);
  }
}

export function drawTitle(ctx, game, time) {
  const cx = VIEW.width / 2;
  const veil = ctx.createRadialGradient(cx, 360, 140, cx, 400, 780);
  veil.addColorStop(0, 'rgba(4, 6, 11, 0.6)');
  veil.addColorStop(0.7, 'rgba(3, 5, 9, 0.82)');
  veil.addColorStop(1, 'rgba(2, 3, 6, 0.95)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // the edge of the page
  ctx.strokeStyle = 'rgba(201, 162, 90, 0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(96.5, 72.5, VIEW.width - 193, VIEW.height - 145);
  label(ctx, 'FORM N-7 / WATCH LOG', VIEW.width - 118, 96, 7.5, INK_FAINT, 2.6, 'right');
  label(ctx, `${L.brief.caseNo} · ${L.brief.place}`, 118, 96, 7.5, INK_FAINT, 2.6);

  stamp(ctx, VIEW.width - 306, 150, L.cjk ? '内部' : 'RESTRICTED', 13);

  label(ctx, L.title.eyebrow, cx, 186, 10, AMBER, 6, 'center');
  ctx.save();
  ctx.font = `${L.cjk ? 'normal' : 'normal'} ${L.cjk ? 116 : 84}px ${fonts.display}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = L.cjk ? '18px' : '7px';
  ctx.fillStyle = '#efe3ca';
  ctx.fillText(L.title.name, cx, 310);
  ctx.restore();
  rule(ctx, cx - 168, cx + 168, 336, 'rgba(201, 162, 90, 0.24)');

  label(ctx, L.title.line, cx, 372, 18, 'rgba(223, 230, 240, 0.66)', 0.5, 'center', fonts.display);

  // the call to action, typed
  ctx.font = `11px ${fonts.mono}`;
  ctx.letterSpacing = '3px';
  const ctaW = ctx.measureText(L.title.cta).width;
  label(ctx, L.title.cta, cx - ctaW / 2, 560, 11, INK, 3);
  caret(ctx, cx + ctaW / 2, 560, time, 11);
  rule(ctx, cx - 168, cx + 168, 576, 'rgba(201, 162, 90, 0.18)');

  label(ctx, L.title.foot, cx, 640, 9, INK_FAINT, 3.4, 'center');

  label(ctx, `${L.otherLabel} →`, TITLE_LINK.x, TITLE_LINK.y + 20, 9, INK_SOFT, 2.4);
  rule(ctx, TITLE_LINK.x, TITLE_LINK.x + 78, TITLE_LINK.y + 27, 'rgba(186, 180, 168, 0.22)');
}

export function drawBrief(ctx, game, time) {
  const cx = VIEW.width / 2;
  ctx.fillStyle = 'rgba(3, 5, 9, 0.84)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  const x = 200;
  const y = 92;
  const w = VIEW.width - 400;
  const h = 616;
  ctx.fillStyle = 'rgba(9, 11, 15, 0.94)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(206, 200, 186, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // the tab of the file, and the case number on it
  ctx.fillStyle = AMBER;
  ctx.fillRect(x, y, 2, 96);

  const left = x + 44;
  label(ctx, L.brief.caseNo, left, y + 40, 9, AMBER, 4.4);
  label(ctx, L.brief.place, left, y + 58, 8.5, INK_SOFT, 2.4);
  label(ctx, `T+00:00 · ${L.hud.team} 3`, left, y + 76, 8, INK_FAINT, 1.8);
  rule(ctx, left, x + w - 44, y + 88, 'rgba(201, 162, 90, 0.2)');

  stamp(ctx, x + w - 214, y + 30, L.cjk ? '内部' : 'RESTRICTED', 15);

  label(ctx, L.brief.legend, left, y + 140, L.cjk ? 34 : 30, 'rgba(206, 96, 86, 0.95)', L.cjk ? 5 : 3, 'left', fonts.display);
  ctx.save();
  ctx.font = `13px ${fonts.ui}`;
  ctx.fillStyle = 'rgba(216, 212, 200, 0.72)';
  const lines = wrap(ctx, L.brief.rule, w - 88);
  lines.slice(0, 4).forEach((line, i) => ctx.fillText(line, left, y + 176 + i * 22));
  ctx.restore();

  rule(ctx, left, x + w - 44, y + 282, 'rgba(186, 180, 168, 0.14)');
  label(ctx, L.brief.squad, left, y + 310, 7.5, AMBER, 3.4);

  game.agents.forEach((a, i) => {
    const row = y + 342 + i * 50;
    const meta = L.agent[a.role];
    label(ctx, `0${i + 1}`, left, row, 8, INK_FAINT, 1);
    label(ctx, meta.name, left + 28, row + 2, 14, INK, 1.6, 'left', fonts.display);
    label(ctx, meta.line, left + 150, row, 9, INK_SOFT, 0.6);
    rule(ctx, left, x + w - 44, row + 12, 'rgba(186, 180, 168, 0.08)');
  });

  ctx.font = `10px ${fonts.mono}`;
  ctx.letterSpacing = '3px';
  const goW = ctx.measureText(L.brief.go).width;
  label(ctx, L.brief.go, cx - goW / 2, y + h - 24, 10, INK, 3);
  caret(ctx, cx + goW / 2, y + h - 24, time, 10);
}

export function drawResult(ctx, game, time) {
  const cx = VIEW.width / 2;
  const veil = ctx.createRadialGradient(cx, 360, 80, cx, 400, 820);
  veil.addColorStop(0, 'rgba(4, 6, 11, 0.72)');
  veil.addColorStop(1, 'rgba(2, 3, 6, 0.96)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  const won = game.won;
  stamp(ctx, cx - 96, 168, won ? 'CASE CLOSED' : 'SIGNAL LOST', 15);

  ctx.save();
  ctx.font = `normal ${L.cjk ? 68 : 52}px ${fonts.display}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillStyle = won ? '#efe3ca' : '#ddc7c0';
  ctx.fillText(won ? L.result.winTitle : L.result.loseTitle, cx, 300);
  ctx.restore();
  label(ctx, won ? L.result.winSub : L.result.loseSub, cx, 342, 16, 'rgba(216, 212, 200, 0.6)', 0.5, 'center', fonts.display);
  rule(ctx, cx - 190, cx + 190, 372, 'rgba(201, 162, 90, 0.2)');

  // the two numbers a case file ends with
  label(ctx, L.hud.team, cx - 150, 424, 7.5, INK_FAINT, 3, 'center');
  label(ctx, L.result.survivors(game.extracted, game.agents.length), cx - 150, 452, 13, 'rgba(240, 222, 190, 0.9)', 1.4, 'center');
  label(ctx, 'ELAPSED', cx + 150, 424, 7.5, INK_FAINT, 3, 'center');
  label(ctx, L.result.time(Math.floor(game.clock)), cx + 150, 452, 13, 'rgba(216, 212, 200, 0.8)', 1.4, 'center');

  ctx.font = `10px ${fonts.mono}`;
  ctx.letterSpacing = '3px';
  const goW = ctx.measureText(L.result.again).width;
  label(ctx, L.result.again, cx - goW / 2, 578, 10, INK, 3);
  caret(ctx, cx + goW / 2, 578, time, 10);
}
