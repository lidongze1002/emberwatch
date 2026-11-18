// 三张纸：接警单、卷宗目录、简报、结案。同一套卷宗语言——骨白细线、等宽字、一枚红色印章，没有发光。

import { VIEW } from './config.js';
import { L, fonts, personName, postName, traitLine, traitName } from './text.js';
import { label } from './hud.js';
import { squadOf } from './roster.js';
import { CASES } from './cases.js';

export const TITLE_LINK = { x: 104, y: 676, w: 160, h: 40 };
export const SETTINGS_BTN = { x: 1004, y: 690, w: 158, h: 34 };
export const SETTINGS_PANEL = { x: 356, y: 118, w: 568, h: 548 };
export const SETTINGS_TRACK = { x: 646, y: 0, w: 190, h: 14 };
export const SETTINGS_ROWS = [
  { key: 'brightness', y: 252 },
  { key: 'volume', y: 316 },
  { key: 'grain', y: 380 },
];
export const SETTINGS_LANG = { y: 438, zh: { x: 646, y: 426, w: 82, h: 26 }, en: { x: 736, y: 426, w: 96, h: 26 } };
export const SETTINGS_FULL = { x: 646, y: 484, w: 86, h: 28 };
export const SETTINGS_RESET = { x: 584, y: 560, w: 134, h: 34 };
export const SETTINGS_CLOSE = { x: 736, y: 560, w: 134, h: 34 };
export const SELECT_ROW = { x: 176, top: 176, w: VIEW.width - 352, h: 82, gap: 12 };
export const ROSTER_BTN = { hire: { x: 852, y: 700, w: 140, h: 34 }, cases: { x: 1006, y: 700, w: 140, h: 34 }, fresh: { x: 148, y: 700, w: 140, h: 34 }, lamp: { x: 400, y: 700, w: 168, h: 34 } };
export const SELECT_ROSTER_BTN = { x: 1006, y: 690, w: 140, h: 34 };
export const HIRE_CARD = { x: 184, w: 288, gap: 24, top: 216, h: 372 };
export const HIRE_NONE = { x: VIEW.width / 2 - 70, y: 640, w: 140, h: 36 };

export const ROSTER_CARD = { x: 148, y: 202, w: 318, h: 168, gapX: 26, gapY: 18, cols: 3 };

export function tRosterCardAt(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const cx = ROSTER_CARD.x + (i % ROSTER_CARD.cols) * (ROSTER_CARD.w + ROSTER_CARD.gapX);
    const cy = ROSTER_CARD.y + Math.floor(i / ROSTER_CARD.cols) * (ROSTER_CARD.h + ROSTER_CARD.gapY);
    if (x >= cx && x <= cx + ROSTER_CARD.w && y >= cy && y <= cy + ROSTER_CARD.h) return i;
  }
  return -1;
}

const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function tSelectRosterAt(x, y) {
  return inRect(SELECT_ROSTER_BTN, x, y);
}

export function tRosterHireAt(x, y) {
  return inRect(ROSTER_BTN.hire, x, y);
}

export function tRosterCasesAt(x, y) {
  return inRect(ROSTER_BTN.cases, x, y);
}

export function tRosterFreshAt(x, y) {
  return inRect(ROSTER_BTN.fresh, x, y);
}

export function tRosterLampAt(x, y) {
  return inRect(ROSTER_BTN.lamp, x, y);
}

export function tHireAt(x, y, count) {
  const n = Math.max(1, count);
  const span = n * HIRE_CARD.w + (n - 1) * HIRE_CARD.gap;
  const startX = (VIEW.width - span) / 2;
  for (let i = 0; i < count; i += 1) {
    const left = startX + i * (HIRE_CARD.w + HIRE_CARD.gap);
    if (x >= left && x <= left + HIRE_CARD.w && y >= HIRE_CARD.top && y <= HIRE_CARD.top + HIRE_CARD.h) return i;
  }
  return -1;
}

export function tHireNoneAt(x, y) {
  return inRect(HIRE_NONE, x, y);
}

const INK = 'rgba(233, 227, 214, 0.92)';
const INK_SOFT = 'rgba(206, 200, 186, 0.62)';
const INK_FAINT = 'rgba(186, 180, 168, 0.4)';
const AMBER = 'rgba(201, 162, 90, 0.78)';
const RED = 'rgba(158, 62, 54, 0.82)';

export function tTitleLinkAt(x, y) {
  return x >= TITLE_LINK.x && x <= TITLE_LINK.x + TITLE_LINK.w && y >= TITLE_LINK.y && y <= TITLE_LINK.y + TITLE_LINK.h;
}

export function tSettingsButtonAt(x, y) {
  return inRect(SETTINGS_BTN, x, y);
}

export function tSettingsAt(x, y) {
  return inRect(SETTINGS_PANEL, x, y);
}

export function tSettingsRowAt(x, y) {
  for (let i = 0; i < SETTINGS_ROWS.length; i += 1) {
    const row = SETTINGS_ROWS[i];
    if (x >= SETTINGS_TRACK.x - 16 && x <= SETTINGS_TRACK.x + SETTINGS_TRACK.w + 16
      && y >= row.y - 18 && y <= row.y + 18) return i;
  }
  return -1;
}

export function tSettingsLangAt(x, y) {
  if (inRect(SETTINGS_LANG.zh, x, y)) return 'zh';
  if (inRect(SETTINGS_LANG.en, x, y)) return 'en';
  return null;
}

export function tSettingsFullAt(x, y) {
  return inRect(SETTINGS_FULL, x, y);
}

export function tSettingsResetAt(x, y) {
  return inRect(SETTINGS_RESET, x, y);
}

export function tSettingsCloseAt(x, y) {
  return inRect(SETTINGS_CLOSE, x, y);
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

// 每案一张「情报照片」：没有美术，就用代码画一张黑白、颗粒、构图歪一点的现场照。
// 不出现人脸；形状只够读出「这里发生过什么」。种子固定，所以每一帧都一样。
function scenePlate(ctx, x, y, w, h, id) {
  let seed = 0;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // the print: a cold grey ground, one warm patch where the lamp is
  const ground = ctx.createLinearGradient(x, y, x, y + h);
  ground.addColorStop(0, '#22221f');
  ground.addColorStop(0.55, '#151513');
  ground.addColorStop(1, '#0b0b0a');
  ctx.fillStyle = ground;
  ctx.fillRect(x, y, w, h);
  const warm = { x: x + w * 0.7, y: y + h * 0.42 };
  const glow = ctx.createRadialGradient(warm.x, warm.y, 2, warm.x, warm.y, w * 0.55);
  glow.addColorStop(0, 'rgba(232, 208, 168, 0.3)');
  glow.addColorStop(1, 'rgba(232, 208, 168, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(214, 206, 190, 0.16)';
  ctx.lineWidth = 1;
  if (id === 'opera') {
    // the proscenium: two curtains and the gap between them, one footlight left on
    ctx.fillStyle = 'rgba(150, 140, 120, 0.09)';
    ctx.fillRect(x + w * 0.06, y + h * 0.06, w * 0.88, h * 0.6);
    for (let i = 0; i < 9; i += 1) {
      ctx.strokeStyle = 'rgba(20, 18, 16, 0.5)';
      ctx.beginPath();
      const cx2 = x + w * 0.12 + i * w * 0.08;
      ctx.moveTo(cx2, y + h * 0.06);
      ctx.quadraticCurveTo(cx2 + 4, y + h * 0.3, cx2 - 2, y + h * 0.66);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(246, 226, 186, 0.5)';
    ctx.fillRect(x + w * 0.5 - 2, y + h * 0.62, 4, 3);
    ctx.fillStyle = 'rgba(246, 226, 186, 0.12)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.64, w * 0.18, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = 'rgba(90, 84, 74, 0.22)';
      ctx.fillRect(x + w * 0.1, y + h * (0.72 + i * 0.05), w * 0.8, 2);
    }
  } else if (id === 'apartment') {
    // the corridor in one point perspective: a lit ceiling, doors on both walls, one open gap
    ctx.fillStyle = 'rgba(120, 112, 96, 0.1)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.62, y + h * 0.42);
    ctx.lineTo(x + w * 0.38, y + h * 0.42);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 4; i += 1) {
      const t = i / 4;
      ctx.fillStyle = `rgba(14, 13, 12, ${0.5 - t * 0.28})`;
      const left = x + w * (0.04 + t * 0.34);
      const right = x + w * (0.96 - t * 0.34);
      ctx.fillRect(left, y + h * (0.34 + t * 0.04), w * 0.05, h * (0.4 - t * 0.08));
      ctx.fillRect(right - w * 0.05, y + h * (0.34 + t * 0.04), w * 0.05, h * (0.4 - t * 0.08));
    }
    ctx.fillStyle = 'rgba(4, 4, 4, 0.9)';
    ctx.fillRect(x + w * 0.38, y + h * 0.34, w * 0.24, h * 0.1);
    ctx.fillStyle = 'rgba(226, 206, 170, 0.18)';
    ctx.fillRect(x + w * 0.36, y + h * 0.44, w * 0.28, 2);
  } else if (id === 'station') {
    // the platform edge, a sign board, and one timetable cell still lit
    ctx.fillStyle = 'rgba(150, 156, 150, 0.08)';
    ctx.fillRect(x, y + h * 0.5, w, h * 0.5);
    ctx.strokeStyle = 'rgba(226, 210, 170, 0.28)';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.5);
    ctx.lineTo(x + w, y + h * 0.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(10, 10, 9, 0.7)';
    ctx.fillRect(x + w * 0.08, y + h * 0.2, w * 0.26, h * 0.16);
    ctx.fillStyle = 'rgba(232, 216, 176, 0.3)';
    ctx.fillRect(x + w * 0.1, y + h * 0.23, w * 0.2, 2);
    ctx.fillRect(x + w * 0.1, y + h * 0.27, w * 0.14, 2);
    ctx.fillStyle = 'rgba(240, 226, 186, 0.55)';
    ctx.fillRect(x + w * 0.66, y + h * 0.16, w * 0.1, h * 0.05);
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = 'rgba(60, 58, 50, 0.5)';
      ctx.fillRect(x + w * 0.3 + i * w * 0.06, y + h * 0.6, w * 0.02, h * 0.3);
    }
  } else if (id === 'ricefield') {
    // paddy water, two dikes, and a pale thing standing very far away
    ctx.fillStyle = 'rgba(120, 132, 120, 0.07)';
    ctx.fillRect(x, y + h * 0.12, w, h * 0.5);
    ctx.fillStyle = 'rgba(140, 132, 104, 0.22)';
    ctx.fillRect(x + w * 0.34, y + h * 0.1, w * 0.06, h * 0.8);
    ctx.fillRect(x, y + h * 0.44, w, h * 0.05);
    ctx.fillStyle = 'rgba(238, 232, 220, 0.5)';
    ctx.fillRect(x + w * 0.7, y + h * 0.24, 2, h * 0.14);
    ctx.fillStyle = 'rgba(238, 232, 220, 0.14)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.7, y + h * 0.4, w * 0.06, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 200, 140, 0.4)';
    ctx.fillRect(x + w * 0.47, y + h * 0.3, 3, 3);
  } else {
    // the thirteenth floor: identical doors, and a circle chalked on the carpet
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = 'rgba(16, 15, 11, 0.62)';
      ctx.fillRect(x + w * (0.06 + i * 0.2), y + h * 0.16, w * 0.11, h * 0.24);
      ctx.fillStyle = 'rgba(232, 220, 170, 0.16)';
      ctx.fillRect(x + w * (0.075 + i * 0.2), y + h * 0.2, w * 0.08, 2);
    }
    ctx.strokeStyle = 'rgba(226, 222, 210, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.7, w * 0.16, h * 0.1, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // grain: fixed dots, so the photograph does not crawl
  for (let i = 0; i < 260; i += 1) {
    const gx = x + rnd() * w;
    const gy = y + rnd() * h;
    const a = rnd() * 0.1;
    ctx.fillStyle = rnd() > 0.5 ? `rgba(255, 248, 232, ${a})` : `rgba(0, 0, 0, ${a + 0.05})`;
    ctx.fillRect(gx, gy, 1, 1);
  }
  // vignette + a slight tilt of the print
  const vign = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.72);
  vign.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vign.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = vign;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// A photograph on a file: bone paper, a dark window, and — until the art exists — a pencil line
// instead of a face. Never a fake portrait.
function photoFrame(ctx, x, y, w, h, caption, number) {
  ctx.fillStyle = 'rgba(206, 198, 182, 0.9)';
  ctx.fillRect(x, y, w, h);
  const ix = x + 3;
  const iy = y + 3;
  const iw = w - 6;
  const ih = h - 11;
  ctx.fillStyle = 'rgba(14, 16, 21, 0.95)';
  ctx.fillRect(ix, iy, iw, ih);
  const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
  g.addColorStop(0, 'rgba(150, 136, 116, 0.14)');
  g.addColorStop(0.55, 'rgba(60, 56, 50, 0.05)');
  g.addColorStop(1, 'rgba(6, 7, 10, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(ix, iy, iw, ih);
  if (caption) {
    const size = Math.min(6.4, Math.max(4.4, iw / Math.max(6, caption.length) * 1.55));
    label(ctx, caption, x + w / 2, iy + ih / 2 + size * 0.35, size, 'rgba(206, 198, 184, 0.5)', 0.5, 'center');
  }
  if (number) {
    ctx.fillStyle = 'rgba(206, 198, 184, 0.6)';
    ctx.font = `6px ${fonts.mono}`;
    ctx.textAlign = 'left';
    ctx.fillText(number, x + 4, y + h - 3);
  }
  ctx.strokeStyle = 'rgba(120, 112, 98, 0.32)';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function button(ctx, rect, text, hot) {
  ctx.fillStyle = hot ? 'rgba(201, 162, 90, 0.09)' : 'rgba(9, 11, 15, 0.5)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = hot ? 'rgba(201, 162, 90, 0.4)' : 'rgba(206, 200, 186, 0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  label(ctx, text, rect.x + rect.w / 2, rect.y + rect.h / 2 + 3.4, 8, hot ? '#efe3ca' : INK_SOFT, 3, 'center');
}

function money(n) {
  const s = Math.abs(Math.round(n)).toLocaleString('en-US');
  return n < 0 ? `-¥ ${s}` : `¥ ${s}`;
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
  label(ctx, L.title.form, VIEW.width - 118, 96, 7.5, INK_FAINT, 2.6, 'right');
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

  // 上一次没有值完的班：桌上还留着账
  if (game.roster) {
    const closed = Object.keys(game.roster.closed).length;
    if (closed > 0) {
      label(ctx, L.title.resume(closed, money(game.roster.cash)), cx, 606, 8, 'rgba(206, 190, 160, 0.55)', 1.6, 'center');
    }
  }

  label(ctx, `${L.otherLabel} →`, TITLE_LINK.x, TITLE_LINK.y + 20, 9, INK_SOFT, 2.4);
  rule(ctx, TITLE_LINK.x, TITLE_LINK.x + 78, TITLE_LINK.y + 27, 'rgba(186, 180, 168, 0.22)');

  // 右下角：设置。一条细线，不进卷宗正文。
  const hot = inRect(SETTINGS_BTN, game.input ? game.input.x : -1, game.input ? game.input.y : -1);
  ctx.fillStyle = hot ? 'rgba(201, 162, 90, 0.07)' : 'rgba(9, 11, 15, 0.3)';
  ctx.fillRect(SETTINGS_BTN.x, SETTINGS_BTN.y, SETTINGS_BTN.w, SETTINGS_BTN.h);
  ctx.strokeStyle = hot ? 'rgba(201, 162, 90, 0.48)' : 'rgba(206, 200, 186, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(SETTINGS_BTN.x + 0.5, SETTINGS_BTN.y + 0.5, SETTINGS_BTN.w - 1, SETTINGS_BTN.h - 1);
  label(ctx, L.settings.button, SETTINGS_BTN.x + 16, SETTINGS_BTN.y + 21, 8, hot ? '#efe3ca' : INK_SOFT, 3.4);
}

export function drawRoster(ctx, game, time) {
  page(ctx);
  const r = game.roster;
  const right = VIEW.width - 148;
  label(ctx, L.roster.form, right, 96, 7.5, INK_FAINT, 2.6, 'right');
  label(ctx, L.roster.title, 148, 140, 26, '#efe3ca', 4, 'left', fonts.display);
  label(ctx, L.roster.cash, right, 122, 7.5, INK_FAINT, 3, 'right');
  label(ctx, money(r.cash), right, 152, 21, r.cash < 0 ? 'rgba(206, 96, 86, 0.95)' : 'rgba(238, 226, 200, 0.9)', 2, 'right', fonts.display);
  if (r.cash < 0) label(ctx, L.roster.broke, right, 170, 7, RED, 0.8, 'right');
  rule(ctx, 148, right, 186, 'rgba(201, 162, 90, 0.2)');

  // six places on the desk: two ranks of three, like a duty board
  const cols = 3;
  const cw = 318;
  const ch = 168;
  const squad = squadOf(r);
  const hoverCard = game.input && game.input.inside ? game.input : { x: -1, y: -1 };
  for (let i = 0; i < 6; i += 1) {
    const m = r.members[i];
    const x = 148 + (i % cols) * (cw + 26);
    const y = 202 + Math.floor(i / cols) * (ch + 18);
    const hot = m && inRect({ x, y, w: cw, h: ch }, hoverCard.x, hoverCard.y);
    ctx.fillStyle = hot ? 'rgba(201, 162, 90, 0.05)' : 'rgba(9, 11, 15, 0.5)';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = hot ? 'rgba(201, 162, 90, 0.34)' : 'rgba(206, 200, 186, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
    if (!m) {
      const vacant = { x: x + 22, y: y + 24, w: 274, h: 120 };
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(186, 180, 168, 0.16)';
      ctx.strokeRect(vacant.x + 0.5, vacant.y + 0.5, vacant.w, vacant.h);
      ctx.setLineDash([]);
      label(ctx, L.roster.empty, x + cw / 2, y + 90, 7, INK_FAINT, 2, 'center');
      continue;
    }
    photoFrame(ctx, x + 18, y + 22, 74, 92, m.dead ? null : L.roster.noPhoto, `#${String(i + 1).padStart(3, '0')}`);
    if (m.dead) {
      ctx.strokeStyle = 'rgba(158, 62, 54, 0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + 20, y + 24);
      ctx.lineTo(x + 90, y + 112);
      ctx.moveTo(x + 90, y + 24);
      ctx.lineTo(x + 20, y + 112);
      ctx.stroke();
    }
    label(ctx, personName(m), x + 106, y + 38, 17, m.dead ? INK_FAINT : INK, L.cjk ? 1.4 : 1.1, 'left', fonts.display);
    label(ctx, `${postName(m.post)} · ${m.nameIdx < 0 ? L.roster.substitute : traitName(m.trait)}`, x + 106, y + 56, 7.4, AMBER, 1.4);
    label(ctx, traitLine(m.trait), x + 106, y + 72, 8, INK_SOFT, 0.6);
    label(ctx, `${L.roster.wounds} ${m.wounds} · ${L.roster.casesDone} ${m.cases}`, x + 106, y + 92, 7.5, INK_FAINT, 1.4);
    // service ticks: one mark per closed case, cuts for every time they were carried out
    for (let k = 0; k < 6; k += 1) {
      ctx.fillStyle = k < m.cases ? AMBER : 'rgba(186, 180, 168, 0.16)';
      ctx.fillRect(x + 106 + k * 10, y + 108, 6, 2);
    }
    for (let k = 0; k < m.wounds; k += 1) {
      ctx.strokeStyle = 'rgba(158, 62, 54, 0.7)';
      ctx.lineWidth = 1;
      const wx = x + 188 + k * 8;
      ctx.beginPath();
      ctx.moveTo(wx, y + 105);
      ctx.lineTo(wx + 4, y + 111);
      ctx.moveTo(wx + 4, y + 105);
      ctx.lineTo(wx, y + 111);
      ctx.stroke();
    }
    const onDuty = squad.includes(m);
    label(ctx, m.dead ? L.roster.dead : onDuty ? L.roster.onDuty : L.roster.bench, x + cw - 16, y + 30, 7, m.dead ? RED : onDuty ? AMBER : INK_FAINT, 2.6, 'right');
    rule(ctx, x + 18, x + cw - 18, y + 128, 'rgba(186, 180, 168, 0.08)');
    if (onDuty) {
      ctx.fillStyle = AMBER;
      ctx.fillRect(x, y, 2, ch);
    }
  }

  // the pay book: the last few lines, amounts on the right
  const ly = 596;
  label(ctx, L.roster.ledger, 148, ly, 7.5, AMBER, 3.2);
  if (!r.ledger.length) label(ctx, '—', 148, ly + 20, 8, INK_FAINT, 1);
  r.ledger.slice(0, 4).forEach((line, i) => {
    const y = ly + 20 + i * 15;
    label(ctx, line.text, 148, y, 8, INK_SOFT, 0.7);
    label(ctx, line.amount === 0 ? '—' : money(line.amount), 620, y, 8, line.amount < 0 ? 'rgba(206, 110, 96, 0.8)' : 'rgba(226, 216, 194, 0.7)', 1, 'right');
  });
  const benchCount = Math.max(0, r.members.filter((m) => !m.dead).length - 3);
  if (benchCount) label(ctx, L.roster.benchNote(benchCount), 148, ly + 88, 7.5, INK_FAINT, 1);

  // 阵亡的人不在名册上了，只在页脚留一行黑框
  if (r.memorial.length) {
    const mx = 660;
    label(ctx, L.roster.memorial, mx, ly, 7.5, AMBER, 3.2);
    r.memorial.slice(0, 5).forEach((m, i) => {
      const y = ly + 22 + i * 16;
      ctx.fillStyle = 'rgba(4, 5, 7, 0.85)';
      ctx.fillRect(mx, y - 9.5, 2.5, 13);
      ctx.strokeStyle = 'rgba(206, 200, 186, 0.16)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(mx + 6.5, y - 9.5, 296, 13);
      label(ctx, personName(m), mx + 12, y, 8, INK_SOFT, 0.6);
      label(ctx, postName(m.post), mx + 170, y, 7, INK_FAINT, 1.2);
      label(ctx, L.roster.kia(m.at), mx + 296, y, 7, RED, 1.2, 'right');
    });
  }

  const hover = game.input && game.input.inside ? game.input : { x: -1, y: -1 };
  button(ctx, ROSTER_BTN.fresh, L.roster.fresh, inRect(ROSTER_BTN.fresh, hover.x, hover.y));
  const hasLamp = r.upgrades && r.upgrades.lamp;
  button(
    ctx,
    ROSTER_BTN.lamp,
    hasLamp ? L.roster.lampOwned : L.roster.buyLamp,
    !hasLamp && inRect(ROSTER_BTN.lamp, hover.x, hover.y),
  );
  if (!hasLamp && r.cash < 900) label(ctx, L.roster.lampBroken, ROSTER_BTN.lamp.x + 4, ROSTER_BTN.lamp.y - 6, 7, INK_FAINT, 0.8);  button(ctx, ROSTER_BTN.hire, L.roster.hire, inRect(ROSTER_BTN.hire, hover.x, hover.y));
  button(ctx, ROSTER_BTN.cases, L.roster.cases, inRect(ROSTER_BTN.cases, hover.x, hover.y));
  label(ctx, L.roster.hint, 148, 744, 8, INK_FAINT, 1.8);

  // 五案全结：这一夜是有头的
  const cleared = Object.values(r.closed).filter((v) => v === 'won').length;
  if (cleared >= 5) {
    stamp(ctx, 660, 688, L.roster.allClosed, 15);
    label(ctx, L.roster.allClosedLine, 660, 726, 8, 'rgba(214, 198, 172, 0.7)', 1.2);
  }
}

export function drawHire(ctx, game, time) {
  page(ctx);
  const r = game.roster;
  const right = VIEW.width - 148;
  label(ctx, L.roster.form, right, 96, 7.5, INK_FAINT, 2.6, 'right');
  label(ctx, L.hire.title, HIRE_CARD.x, 150, 26, '#efe3ca', 4, 'left', fonts.display);
  label(ctx, L.hire.sub, HIRE_CARD.x + 150, 148, 9, INK_SOFT, 0.8);
  label(ctx, L.roster.cash, right, 150, 7.5, INK_FAINT, 3, 'right');
  label(ctx, money(r.cash), right, 176, 16, r.cash < 0 ? 'rgba(206, 96, 86, 0.95)' : 'rgba(238, 226, 200, 0.9)', 1.6, 'right', fonts.display);
  if (r.members.filter((m) => !m.dead).length >= 3) {
    label(ctx, L.hire.benchWarn, right, 192, 7.5, 'rgba(206, 190, 160, 0.55)', 1, 'right');
  }
  rule(ctx, HIRE_CARD.x, right, 196, 'rgba(201, 162, 90, 0.2)');

  const hover = game.input && game.input.inside ? game.input : { x: -1, y: -1 };
  if (!r.candidates.length) {
    label(ctx, L.roster.none, VIEW.width / 2, 360, 10, INK_SOFT, 2, 'center');
  } else if (r.members.filter((m) => !m.dead).length >= 6) {
    label(ctx, L.hire.full, VIEW.width / 2, 604, 8.5, RED, 1.6, 'center');
  } else if (!r.candidates.some((c) => c.price <= r.cash)) {
    label(ctx, L.hire.noCash, VIEW.width / 2, 604, 8.5, RED, 1.6, 'center');
  }
  r.candidates.forEach((c, i) => {
    const n = Math.max(1, r.candidates.length);
    const span = n * HIRE_CARD.w + (n - 1) * HIRE_CARD.gap;
    const x = (VIEW.width - span) / 2 + i * (HIRE_CARD.w + HIRE_CARD.gap);
    const y = HIRE_CARD.top;
    const hot = inRect({ x, y, w: HIRE_CARD.w, h: HIRE_CARD.h }, hover.x, hover.y);
    const afford = r.cash >= c.price;
    ctx.fillStyle = hot ? 'rgba(201, 162, 90, 0.05)' : 'rgba(9, 11, 15, 0.5)';
    ctx.fillRect(x, y, HIRE_CARD.w, HIRE_CARD.h);
    ctx.strokeStyle = hot ? 'rgba(201, 162, 90, 0.4)' : 'rgba(206, 200, 186, 0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, HIRE_CARD.w - 1, HIRE_CARD.h - 1);
    photoFrame(ctx, x + 32, y + 26, 92, 116, L.hire.noPhoto, `#${String(i + 1).padStart(2, '0')}`);
    label(ctx, personName(c), x + HIRE_CARD.w - 22, y + 44, 15, INK, L.cjk ? 1.2 : 0.9, 'right', fonts.display);
    label(ctx, postName(c.post), x + HIRE_CARD.w - 22, y + 62, 7.5, AMBER, 2.4, 'right');
    rule(ctx, x + 22, x + HIRE_CARD.w - 22, y + 168, 'rgba(186, 180, 168, 0.1)');
    label(ctx, traitName(c.trait), x + 22, y + 194, 11, INK, 1.2);
    label(ctx, traitLine(c.trait), x + 22, y + 212, 8, INK_SOFT, 0.5);
    label(ctx, L.hire.ask, x + 22, y + 252, 7, INK_FAINT, 2.6);
    label(ctx, money(c.price), x + 22, y + 276, 18, afford ? 'rgba(238, 226, 200, 0.92)' : 'rgba(206, 96, 86, 0.9)', 1.2, 'left', fonts.display);
    label(ctx, L.hire.take, x + HIRE_CARD.w - 22, y + 276, 7.5, afford ? AMBER : INK_FAINT, 2, 'right');
  });
  button(ctx, HIRE_NONE, L.hire.none, inRect(HIRE_NONE, hover.x, hover.y));
  label(ctx, L.hire.hint, VIEW.width / 2, 712, 8, INK_FAINT, 1.6, 'center');
}

export function drawSelect(ctx, game, time) {
  page(ctx);
  const cx = VIEW.width / 2;
  label(ctx, L.select.form, VIEW.width - 118, 96, 7.5, INK_FAINT, 2.6, 'right');
  label(ctx, L.select.title, SELECT_ROW.x, 140, 24, '#efe3ca', 4, 'left', fonts.display);
  label(ctx, L.select.sub, SELECT_ROW.x + 260, 138, 9, INK_SOFT, 1.2);

  const hover = game.input && game.input.inside ? game.input.y : -1;
  for (let i = 0; i < 5; i += 1) {
    const entry = Object.entries(L.cases)[i];
    if (!entry) continue;
    const [rowId, row] = entry;
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
    ctx.save();
    let nameSize = L.cjk ? 24 : 21;
    ctx.font = `${nameSize}px ${fonts.display}`;
    const nameW = ctx.measureText(row.name).width;
    if (nameW > 198) nameSize = Math.max(12, Math.floor(nameSize * (198 / nameW)));
    ctx.font = `${nameSize}px ${fonts.display}`;
    ctx.fillStyle = isHover ? '#f4e8cf' : INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(row.name, SELECT_ROW.x + 120, top + 36);
    ctx.restore();
    label(ctx, row.place, SELECT_ROW.x + 22, top + 50, 8, INK_FAINT, 1.6);
    label(ctx, row.legend, SELECT_ROW.x + 22, top + 68, 7.5, INK_SOFT, 2.4);

    // what the desk already knows about this file, and what it pays
    const state = game.roster && game.roster.closed[rowId];
    const statusText = state === 'won' ? L.select.status.won : state === 'lost' ? L.select.status.lost : L.select.status.open;
    label(ctx, statusText, SELECT_ROW.x + 348, top + 26, 7.5, state === 'won' ? AMBER : state === 'lost' ? RED : INK_FAINT, 2.6);
    label(ctx, `${L.select.fee} ${money(CASES[i] ? CASES[i].fee : 0)}`, SELECT_ROW.x + 348, top + 44, 7.5, INK_FAINT, 1.4);

    ctx.font = `10px ${fonts.ui}`;
    ctx.fillStyle = 'rgba(216, 212, 200, 0.6)';
    const lines = wrap(ctx, row.blurb || row.rule, 330);
    lines.slice(0, 3).forEach((line, k) => ctx.fillText(line, SELECT_ROW.x + 440, top + 27 + k * 16));
    label(ctx, L.select.rules, SELECT_ROW.x + 440, top + 14, 6.5, AMBER, 3);

    // the file's photograph, small: the same plate the briefing shows
    const px = SELECT_ROW.x + SELECT_ROW.w - 142;
    const py = top + 7;
    ctx.fillStyle = 'rgba(206, 198, 182, 0.75)';
    ctx.fillRect(px - 3, py - 3, 136, 72);
    scenePlate(ctx, px, py, 130, 66, rowId);
    ctx.strokeStyle = 'rgba(120, 112, 98, 0.35)';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(px - 2.5, py - 2.5, 135, 71);
  }

  // the three on duty, as photographs with a pencil name under them
  const squad = game.roster ? squadOf(game.roster) : [];
  const bx = SELECT_ROW.x;
  const by = 660;
  label(ctx, L.select.onDuty, bx, by, 7.5, AMBER, 3.2);
  squad.forEach((m, i) => {
    const x = bx + i * 190;
    const y = by + 14;
    photoFrame(ctx, x, y, 40, 50, L.roster.noPhoto, null);
    if (m) {
      label(ctx, personName(m), x + 48, y + 12, 10, INK, 0.8);
      label(ctx, `${postName(m.post)} · ${traitName(m.trait)}`, x + 48, y + 28, 7, INK_SOFT, 1.2);
      label(ctx, `${L.roster.wounds} ${m.wounds}`, x + 48, y + 42, 7, INK_FAINT, 1);
    } else {
      label(ctx, L.roster.empty, x + 48, y + 18, 8, INK_FAINT, 1.4);
      label(ctx, L.roster.temp, x + 48, y + 34, 7, RED, 1.6);
    }
  });
  const cursor = game.input && game.input.inside ? game.input : { x: -1, y: -1 };
  if (game.roster) {
    label(ctx, `${money(game.roster.cash)}`, SELECT_ROSTER_BTN.x - 18, by + 34, 12, game.roster.cash < 0 ? 'rgba(206, 96, 86, 0.9)' : INK, 0.8, 'right', fonts.display);
    button(ctx, SELECT_ROSTER_BTN, L.select.roster, inRect(SELECT_ROSTER_BTN, cursor.x, cursor.y));
  }

  label(ctx, L.select.hint, cx, VIEW.height - 44, 9, INK_FAINT, 2.4, 'center');
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
  const colRight = x + w - 262;   // the text column stops here; the photographs sit to its right
  label(ctx, meta.no, left, y + 40, 9, AMBER, 4.4);
  label(ctx, meta.place, left, y + 58, 8.5, INK_SOFT, 2.4);
  label(ctx, `T+00:00 · ${L.hud.team} 3`, left, y + 76, 8, INK_FAINT, 1.8);
  label(ctx, `${L.brief.fee} ${money(CASES[game.caseIndex] ? CASES[game.caseIndex].fee : 0)}`, colRight, y + 76, 8, 'rgba(206, 190, 160, 0.6)', 1.2, 'right');
  rule(ctx, left, x + w - 44, y + 88, 'rgba(201, 162, 90, 0.2)');

  stamp(ctx, x + w - 214, y + 30, L.cjk ? '内部' : 'RESTRICTED', 15);

  label(ctx, meta.legend, left, y + 140, L.cjk ? 34 : 30, 'rgba(206, 96, 86, 0.95)', L.cjk ? 5 : 3, 'left', fonts.display);
  ctx.save();
  ctx.font = `13px ${fonts.ui}`;
  ctx.fillStyle = 'rgba(216, 212, 200, 0.72)';
  const lines = wrap(ctx, meta.rule, colRight - left);
  lines.slice(0, 6).forEach((line, i) => ctx.fillText(line, left, y + 176 + i * 22));
  ctx.restore();

  // the case photograph: a black-and-white still from the scene, no faces. It is drawn in code —
  // a grey print with grain and a cold lamp — rather than a fake photograph from somewhere else.
  const px = x + w - 236;
  const py = y + 112;
  ctx.fillStyle = 'rgba(206, 198, 182, 0.9)';
  ctx.fillRect(px - 5, py - 5, 202, 138);
  scenePlate(ctx, px, py, 192, 128, game.case.id);
  ctx.strokeStyle = 'rgba(120, 112, 98, 0.4)';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(px - 4.5, py - 4.5, 201, 137);
  label(ctx, meta.place, px + 96, py + 148, 7, INK_FAINT, 0.8, 'center');
  label(ctx, L.brief.photo, px, py + 168, 6.5, AMBER, 2.6);

  rule(ctx, left, x + w - 44, y + 296, 'rgba(186, 180, 168, 0.14)');
  label(ctx, L.brief.squad, left, y + 322, 7.5, AMBER, 3.4);

  game.agents.forEach((a, i) => {
    const row = y + 356 + i * 56;
    const m = game.squad && game.squad[i];
    const who = L.agent[a.role];
    label(ctx, `0${i + 1}`, left, row, 8, INK_FAINT, 1);
    label(ctx, m ? personName(m) : who.name, left + 28, row + 2, 14, INK, 1.6, 'left', fonts.display);
    label(ctx, `${postName(a.role)} · ${traitName(a.trait)}`, left + 150, row, 8.5, INK_SOFT, 1.2);
    label(ctx, who.line, left + 150, row + 15, 8, INK_FAINT, 0.6);
    rule(ctx, left, x + w - 44, row + 34, 'rgba(186, 180, 168, 0.08)');
  });

  // the three portraits, side by side under the scene photograph
  const squad = game.squad || [];
  squad.forEach((m, i) => {
    const fx = px + i * 64;
    const fy = y + 396;
    photoFrame(ctx, fx, fy, 56, 70, L.brief.noPhoto, null);
    label(ctx, m && m.nameIdx >= 0 ? L.names[m.nameIdx % L.names.length] : L.roster.substitute, fx + 28, fy + 84, 7, INK_SOFT, 0.4, 'center');
    label(ctx, postName(m ? m.post : ['veteran', 'rookie', 'lamp'][i]), fx + 28, fy + 96, 6.5, INK_FAINT, 1.6, 'center');
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
  label(ctx, L.result.elapsed, cx + 150, 424, 7.5, INK_FAINT, 3, 'center');
  label(ctx, L.result.time(Math.floor(game.clock)), cx + 150, 452, 13, 'rgba(216, 212, 200, 0.8)', 1.4, 'center');

  const s = game.settlement;
  if (s) {
    label(ctx, L.result.pay, cx - 150, 502, 7.5, INK_FAINT, 3, 'center');
    label(ctx, money(s.pay), cx - 150, 530, 13, s.pay ? 'rgba(240, 222, 190, 0.9)' : INK_FAINT, 1.4, 'center', fonts.display);
    label(ctx, L.result.cash, cx + 150, 502, 7.5, INK_FAINT, 3, 'center');
    label(ctx, money(game.roster.cash), cx + 150, 530, 13, game.roster.cash < 0 ? 'rgba(206, 96, 86, 0.9)' : 'rgba(216, 212, 200, 0.85)', 1.4, 'center', fonts.display);
    const notes = [];
    if (s.dead) notes.push(L.result.funerals(s.dead));
    if (s.hurt) notes.push(L.result.medical(s.hurt));
    if (notes.length) label(ctx, notes.join(' · '), cx, 556, 8, INK_FAINT, 1.6, 'center');
  }

  // the roll call: who came out, who did not. Three columns, no portraits — a list, not a card.
  const colW = 236;
  const x0 = cx - colW * 1.5 + 18;
  game.agents.forEach((a, i) => {
    const x = x0 + i * colW;
    const m = game.squad && game.squad[i];
    const name = m && m.nameIdx >= 0 ? L.names[m.nameIdx % L.names.length] : L.roster.substitute;
    const alive = a.extracted;
    label(ctx, `0${i + 1}`, x, 632, 7.5, INK_FAINT, 1.2);
    label(ctx, name, x + 20, 634, 13, alive ? INK : INK_SOFT, L.cjk ? 1.2 : 0.8, 'left', fonts.display);
    label(ctx, alive ? L.result.cameOut : L.result.stayed, x + 20, 650, 7.5, alive ? AMBER : RED, 1.4);
    if (m) label(ctx, traitName(m.trait), x + 20, 664, 7, INK_FAINT, 0.8);
  });

  if (won && game.caseIndex === 4) {
    label(ctx, L.result.watchOver, cx, 702, 9, AMBER, 2.2, 'center');
  }

  ctx.font = `10px ${fonts.mono}`;
  ctx.letterSpacing = '3px';
  const goW = ctx.measureText(L.result.again).width;
  label(ctx, L.result.again, cx - goW / 2, 578, 10, INK, 3);
  caret(ctx, cx + goW / 2, 578, time, 10);
}

// ---- 设置：一页纸，五个开关 --------------------------------------------------
const SETTINGS_RANGE = { brightness: [0.6, 1.4], volume: [0, 100], grain: [0, 100] };
const SETTINGS_DEFAULT = { brightness: 1, volume: 85, grain: 50 };

export function drawSettings(ctx, game, time) {
  const s = game.settings || SETTINGS_DEFAULT;
  const hover = game.input && game.input.inside ? game.input : { x: -1, y: -1 };
  const p = SETTINGS_PANEL;

  ctx.fillStyle = 'rgba(2, 4, 8, 0.74)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = 'rgba(8, 10, 14, 0.97)';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = 'rgba(206, 200, 186, 0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
  ctx.fillStyle = AMBER;
  ctx.fillRect(p.x, p.y, 2, 72);

  label(ctx, L.settings.form, p.x + p.w - 32, p.y + 26, 7.5, INK_FAINT, 2.4, 'right');
  label(ctx, L.settings.title, p.x + 32, p.y + 58, 26, '#efe3ca', 4, 'left', fonts.display);
  rule(ctx, p.x + 32, p.x + p.w - 32, p.y + 74, 'rgba(201, 162, 90, 0.2)');

  const names = [L.settings.brightness, L.settings.volume, L.settings.grain];
  const values = [
    Number(s.brightness).toFixed(2),
    `${Math.round(s.volume)}`,
    `${Math.round(s.grain)}`,
  ];
  SETTINGS_ROWS.forEach((row, i) => {
    const active = game.settingsRow === i;
    const key = row.key;
    const [lo, hi] = SETTINGS_RANGE[key];
    const t = Math.max(0, Math.min(1, (s[key] - lo) / (hi - lo)));
    const defT = Math.max(0, Math.min(1, (SETTINGS_DEFAULT[key] - lo) / (hi - lo)));
    // the row's own band lights up on hover, so the slider is a target, not a line
    if (inRect({ x: p.x + 32, y: row.y - 20, w: p.w - 64, h: 40 }, hover.x, hover.y)) {
      ctx.fillStyle = 'rgba(201, 162, 90, 0.04)';
      ctx.fillRect(p.x + 32, row.y - 20, p.w - 64, 40);
    }
    label(ctx, names[i], p.x + 44, row.y + 4, 10, active ? '#efe3ca' : INK_SOFT, 2.4);
    label(ctx, values[i], SETTINGS_TRACK.x + SETTINGS_TRACK.w + 78, row.y + 4, 11, active ? 'rgba(240, 226, 198, 0.95)' : INK_SOFT, 1, 'right', fonts.mono);
    ctx.fillStyle = 'rgba(186, 180, 168, 0.16)';
    ctx.fillRect(SETTINGS_TRACK.x, row.y, SETTINGS_TRACK.w, 2);
    ctx.fillStyle = active ? AMBER : 'rgba(201, 162, 90, 0.5)';
    ctx.fillRect(SETTINGS_TRACK.x, row.y, SETTINGS_TRACK.w * t, 2);
    // the default is a small tick on the track; reset means something visible
    ctx.fillStyle = 'rgba(206, 200, 186, 0.28)';
    ctx.fillRect(SETTINGS_TRACK.x + SETTINGS_TRACK.w * defT, row.y - 3, 1, 8);
    ctx.fillStyle = active ? '#efe3ca' : 'rgba(226, 220, 206, 0.66)';
    ctx.beginPath();
    ctx.arc(SETTINGS_TRACK.x + SETTINGS_TRACK.w * t, row.y + 1, active ? 4 : 3.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // language: two segments, the current one inked in
  const langY = SETTINGS_LANG.y;
  label(ctx, L.settings.language, p.x + 44, langY + 4, 10, game.settingsRow === 3 ? '#efe3ca' : INK_SOFT, 2.4);
  const now = L.cjk ? 'zh' : 'en';
  for (const [lang, text] of [['zh', L.settings.langZh], ['en', L.settings.langEn]]) {
    const r = SETTINGS_LANG[lang];
    const on = lang === now;
    const hot = inRect(r, hover.x, hover.y);
    ctx.fillStyle = on ? 'rgba(201, 162, 90, 0.12)' : hot ? 'rgba(201, 162, 90, 0.06)' : 'rgba(9, 11, 15, 0.5)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = on ? 'rgba(201, 162, 90, 0.55)' : 'rgba(206, 200, 186, 0.18)';
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    label(ctx, text, r.x + r.w / 2, r.y + 18, 8.5, on ? '#efe3ca' : INK_SOFT, 1.2, 'center', L.cjk ? fonts.ui : fonts.mono);
  }

  // fullscreen
  const fullOn = !!(typeof document !== 'undefined' && document.fullscreenElement);
  const fullHot = inRect(SETTINGS_FULL, hover.x, hover.y);
  label(ctx, L.settings.fullscreen, p.x + 44, SETTINGS_FULL.y + 19, 10, game.settingsRow === 4 ? '#efe3ca' : INK_SOFT, 2.4);
  ctx.fillStyle = fullHot ? 'rgba(201, 162, 90, 0.07)' : 'rgba(9, 11, 15, 0.5)';
  ctx.fillRect(SETTINGS_FULL.x, SETTINGS_FULL.y, SETTINGS_FULL.w, SETTINGS_FULL.h);
  ctx.strokeStyle = fullOn ? 'rgba(201, 162, 90, 0.5)' : 'rgba(206, 200, 186, 0.18)';
  ctx.strokeRect(SETTINGS_FULL.x + 0.5, SETTINGS_FULL.y + 0.5, SETTINGS_FULL.w - 1, SETTINGS_FULL.h - 1);
  ctx.fillStyle = fullOn ? AMBER : 'rgba(186, 180, 168, 0.3)';
  ctx.beginPath();
  ctx.arc(fullOn ? SETTINGS_FULL.x + SETTINGS_FULL.w - 18 : SETTINGS_FULL.x + 18, SETTINGS_FULL.y + SETTINGS_FULL.h / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, fullOn ? L.settings.on : L.settings.off, SETTINGS_FULL.x + SETTINGS_FULL.w / 2 + (fullOn ? -9 : 9), SETTINGS_FULL.y + 19, 8, INK_SOFT, 1.4, 'center');

  button(ctx, SETTINGS_RESET, L.settings.reset, inRect(SETTINGS_RESET, hover.x, hover.y));
  button(ctx, SETTINGS_CLOSE, L.settings.close, inRect(SETTINGS_CLOSE, hover.x, hover.y));
  label(ctx, L.settings.hint, p.x + p.w / 2, p.y + p.h - 54, 7.5, INK_FAINT, 1.2, 'center');
  label(ctx, L.settings.note, p.x + p.w / 2, p.y + p.h - 36, 7.5, 'rgba(206, 190, 160, 0.5)', 1.2, 'center');
}
