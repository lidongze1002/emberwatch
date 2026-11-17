// 三张纸：接警单、卷宗目录、简报、结案。同一套卷宗语言——骨白细线、等宽字、一枚红色印章，没有发光。

import { VIEW } from './config.js';
import { L, fonts } from './text.js';
import { label } from './hud.js';

export const TITLE_LINK = { x: 104, y: 676, w: 160, h: 40 };
export const SELECT_ROW = { x: 176, top: 176, w: VIEW.width - 352, h: 82, gap: 12 };

const INK = 'rgba(233, 227, 214, 0.92)';
const INK_SOFT = 'rgba(206, 200, 186, 0.62)';
const INK_FAINT = 'rgba(186, 180, 168, 0.4)';
const AMBER = 'rgba(201, 162, 90, 0.78)';
const RED = 'rgba(158, 62, 54, 0.82)';

export function tTitleLinkAt(x, y) {
  return x >= TITLE_LINK.x && x <= TITLE_LINK.x + TITLE_LINK.w && y >= TITLE_LINK.y && y <= TITLE_LINK.y + TITLE_LINK.h;
}

export function tCaseAt(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const top = SELECT_ROW.top + i * (SELECT_ROW.h + SELECT_ROW.gap);
    if (x >= SELECT_ROW.x && x <= SELECT_ROW.x + SELECT_ROW.w && y >= top && y <= top + SELECT_ROW.h) return i;
  }
  return -1;
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

function page(ctx) {
  ctx.fillStyle = 'rgba(3, 5, 9, 0.86)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.strokeStyle = 'rgba(201, 162, 90, 0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(96.5, 72.5, VIEW.width - 193, VIEW.height - 145);
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
  label(ctx, `${L.cases.opera.no} · ${L.cases.opera.place}`, 118, 96, 7.5, INK_FAINT, 2.6);

  stamp(ctx, VIEW.width - 306, 150, L.cjk ? '内部' : 'RESTRICTED', 13);

  label(ctx, L.title.eyebrow, cx, 186, 10, AMBER, 6, 'center');
  ctx.save();
  ctx.font = `normal ${L.cjk ? 116 : 84}px ${fonts.display}`;
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

export function drawSelect(ctx, game, time) {
  page(ctx);
  const cx = VIEW.width / 2;
  label(ctx, 'FORM N-7 / CASE INDEX', VIEW.width - 118, 96, 7.5, INK_FAINT, 2.6, 'right');
  label(ctx, L.select.title, SELECT_ROW.x, 140, 24, '#efe3ca', 4, 'left', fonts.display);
  label(ctx, L.select.sub, SELECT_ROW.x + 260, 138, 9, INK_SOFT, 1.2);

  const hover = game.input && game.input.inside ? game.input.y : -1;
  for (let i = 0; i < 5; i += 1) {
    const meta = i < 5 ? Object.values(L.cases)[i] : null;
    const row = meta;
    if (!row) continue;
    const top = SELECT_ROW.top + i * (SELECT_ROW.h + SELECT_ROW.gap);
    const isHover = hover >= top && hover <= top + SELECT_ROW.h;
    ctx.fillStyle = isHover ? 'rgba(201, 162, 90, 0.05)' : 'rgba(9, 11, 15, 0.5)';
    ctx.fillRect(SELECT_ROW.x, top, SELECT_ROW.w, SELECT_ROW.h);
    ctx.strokeStyle = isHover ? 'rgba(201, 162, 90, 0.34)' : 'rgba(206, 200, 186, 0.13)';
    ctx.lineWidth = 1;
    ctx.strokeRect(SELECT_ROW.x + 0.5, top + 0.5, SELECT_ROW.w - 1, SELECT_ROW.h - 1);
    ctx.fillStyle = AMBER;
    ctx.fillRect(SELECT_ROW.x, top, 2, SELECT_ROW.h);

    label(ctx, row.no, SELECT_ROW.x + 22, top + 26, 8, AMBER, 3);
    label(ctx, row.name, SELECT_ROW.x + 126, top + 34, 22, isHover ? '#f4e8cf' : INK, 2.4, 'left', fonts.display);
    label(ctx, row.place, SELECT_ROW.x + 22, top + 50, 8, INK_FAINT, 1.6);
    label(ctx, row.legend, SELECT_ROW.x + 22, top + 68, 7.5, INK_SOFT, 2.4);

    ctx.font = `9.5px ${fonts.ui}`;
    ctx.fillStyle = 'rgba(216, 212, 200, 0.6)';
    const lines = wrap(ctx, row.rule, 560);
    lines.slice(0, 3).forEach((line, k) => ctx.fillText(line, SELECT_ROW.x + 320, top + 27 + k * 15));
    label(ctx, L.select.rules, SELECT_ROW.x + 320, top + 14, 6.5, AMBER, 3);
  }

  label(ctx, L.select.hint, cx, VIEW.height - 96, 9, INK_FAINT, 2.4, 'center');
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

  const meta = L.cases[game.case.id];
  const left = x + 44;
  label(ctx, meta.no, left, y + 40, 9, AMBER, 4.4);
  label(ctx, meta.place, left, y + 58, 8.5, INK_SOFT, 2.4);
  label(ctx, `T+00:00 · ${L.hud.team} 3`, left, y + 76, 8, INK_FAINT, 1.8);
  rule(ctx, left, x + w - 44, y + 88, 'rgba(201, 162, 90, 0.2)');

  stamp(ctx, x + w - 214, y + 30, L.cjk ? '内部' : 'RESTRICTED', 15);

  label(ctx, meta.legend, left, y + 140, L.cjk ? 34 : 30, 'rgba(206, 96, 86, 0.95)', L.cjk ? 5 : 3, 'left', fonts.display);
  ctx.save();
  ctx.font = `13px ${fonts.ui}`;
  ctx.fillStyle = 'rgba(216, 212, 200, 0.72)';
  const lines = wrap(ctx, meta.rule, w - 88);
  lines.slice(0, 5).forEach((line, i) => ctx.fillText(line, left, y + 176 + i * 22));
  ctx.restore();

  rule(ctx, left, x + w - 44, y + 296, 'rgba(186, 180, 168, 0.14)');
  label(ctx, L.brief.squad, left, y + 322, 7.5, AMBER, 3.4);

  game.agents.forEach((a, i) => {
    const row = y + 352 + i * 48;
    const who = L.agent[a.role];
    label(ctx, `0${i + 1}`, left, row, 8, INK_FAINT, 1);
    label(ctx, who.name, left + 28, row + 2, 14, INK, 1.6, 'left', fonts.display);
    label(ctx, who.line, left + 150, row, 9, INK_SOFT, 0.6);
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
  const meta = L.cases[game.case.id];
  stamp(ctx, cx - 96, 168, won ? (L.cjk ? '结案' : 'CASE CLOSED') : (L.cjk ? '失联' : 'SIGNAL LOST'), 15);

  ctx.save();
  ctx.font = `normal ${L.cjk ? 68 : 52}px ${fonts.display}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillStyle = won ? '#efe3ca' : '#ddc7c0';
  ctx.fillText(won ? L.result.winTitle : L.result.loseTitle, cx, 300);
  ctx.restore();
  ctx.save();
  ctx.font = `16px ${fonts.display}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(216, 212, 200, 0.6)';
  ctx.fillText(won ? meta.winSub : meta.loseSub, cx, 342);
  ctx.restore();
  rule(ctx, cx - 190, cx + 190, 372, 'rgba(201, 162, 90, 0.2)');

  // the two numbers a case file ends with
  label(ctx, L.hud.team, cx - 150, 424, 7.5, INK_FAINT, 3, 'center');
  label(ctx, L.result.survivors(game.extracted, game.agents.length), cx - 150, 452, 13, 'rgba(240, 222, 190, 0.9)', 1.4, 'center');
  label(ctx, 'ELAPSED', cx + 150, 424, 7.5, INK_FAINT, 3, 'center');
  label(ctx, L.result.time(Math.floor(game.clock)), cx + 150, 452, 13, 'rgba(216, 212, 200, 0.8)', 1.4, 'center');

  if (won && game.caseIndex + 1 < 5) {
    const next = Object.values(L.cases)[game.caseIndex + 1];
    label(ctx, `${L.result.next} · ${next.no} · ${next.name}`, cx, 512, 10, AMBER, 2.4, 'center');
  }

  ctx.font = `10px ${fonts.mono}`;
  ctx.letterSpacing = '3px';
  const goW = ctx.measureText(L.result.again).width;
  label(ctx, L.result.again, cx - goW / 2, 578, 10, INK, 3);
  caret(ctx, cx + goW / 2, 578, time, 10);
}
