// 值班界面：一份摊在桌上的现场卷宗，不是发光面板。骨白与琥珀的细线、等宽字、红色分类章、
// 一个照片位，只放能用的信息。没有四角括号、没有扫描线、没有刻度尺。

import { VIEW } from './config.js';
import { L, fonts } from './text.js';
import { objectives, readout } from './rules.js';

const INK = 'rgba(233, 227, 214, 0.92)';
const INK_SOFT = 'rgba(206, 200, 186, 0.62)';
const INK_FAINT = 'rgba(186, 180, 168, 0.4)';
const AMBER = 'rgba(201, 162, 90, 0.75)';
const AMBER_FAINT = 'rgba(201, 162, 90, 0.22)';
const RED = 'rgba(158, 62, 54, 0.85)';
const RED_SOFT = 'rgba(158, 62, 54, 0.5)';

export function label(ctx, text, x, y, size, colour, spacing = 0, align = 'left', font = fonts.mono) {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function rule(ctx, x1, y1, x2, y2, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function timecode(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `T+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// A photograph slot, not a portrait: the frame, the unit number under it, and the light that
// would have fallen across the print. The face is redacted — it is a file, not a mugshot.
function photo(ctx, agent, x, y, w, h) {
  ctx.fillStyle = 'rgba(9, 11, 15, 0.9)';
  ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, 'rgba(236, 230, 216, 0.06)');
  g.addColorStop(0.5, 'rgba(236, 230, 216, 0.015)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(206, 200, 186, 0.24)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const down = agent.down || agent.taken;
  ctx.fillStyle = down ? 'rgba(120, 48, 44, 0.5)' : 'rgba(206, 200, 186, 0.14)';
  ctx.fillRect(x + 4, y + 7, w - 8, h - 14);
  label(ctx, agent.id.replace('a', '0'), x + w / 2, y + h - 3.5, 7, INK_SOFT, 0.5, 'center');
}

function condition(ctx, agent, x, y, w, gaze) {
  const ratio = Math.max(0, Math.min(1, agent.hp / agent.maxHp));
  const down = agent.down || agent.taken;
  // a segmented readout: six cells, a hairline track, no glow
  const cells = 6;
  const gap = 2;
  const cw = (w - gap * (cells - 1)) / cells;
  for (let i = 0; i < cells; i += 1) {
    const filled = i < Math.round(ratio * cells);
    ctx.fillStyle = filled
      ? down ? RED_SOFT : ratio <= 0.34 ? 'rgba(206, 108, 96, 0.9)' : 'rgba(226, 220, 206, 0.8)'
      : 'rgba(150, 146, 136, 0.16)';
    ctx.fillRect(x + i * (cw + gap), y, cw, 2.4);
  }
  // 第四案：注视条是另一根，长在血量下面
  if (gaze !== null && gaze !== undefined) {
    const pct = Math.max(0, Math.min(1, gaze));
    ctx.fillStyle = 'rgba(150, 146, 136, 0.16)';
    ctx.fillRect(x, y + 4.6, w, 1.4);
    ctx.fillStyle = pct > 0.66 ? 'rgba(206, 108, 96, 0.95)' : 'rgba(190, 168, 108, 0.85)';
    ctx.fillRect(x, y + 4.6, w * pct, 1.4);
  }
}

function fileRow(ctx, agent, x, y, w, gaze) {
  const meta = L.agent[agent.role];
  const down = agent.down || agent.taken;
  photo(ctx, agent, x, y, 30, 38);
  label(ctx, agent.id.replace('a', '0'), x + 40, y + 11, 8, INK_FAINT, 1);
  label(ctx, meta.name, x + 66, y + 12, 13, down ? INK_SOFT : INK, 1.5, 'left', fonts.display);
  label(ctx, meta.line, x + 40, y + 24, 8.5, INK_SOFT, 0);
  condition(ctx, agent, x + 40, y + 30, 92, gaze);
  label(ctx, `${Math.max(0, Math.ceil(agent.hp))}`, x + 138, y + 33, 8, INK_SOFT, 0.5);
  const stateText = agent.taken ? L.state.charmed : down ? L.state.down : L.state[agent.state] || '';
  label(ctx, stateText, x + w, y + 12, 8, down ? RED_SOFT : INK_SOFT, 1.5, 'right');
  rule(ctx, x, y + 44, x + w, y + 44, 'rgba(186, 180, 168, 0.1)');
}

// The classified stamp: ink, not a panel. One red mark, slightly off square.
function stamp(ctx, x, y, text, live) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.045);
  const w = Math.max(70, text.length * 8.4 + 18);
  ctx.strokeStyle = live ? RED_SOFT : RED;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w, 19);
  label(ctx, text, 9.5, 13.5, 8.5, live ? RED_SOFT : RED, 3.4, 'left');
  ctx.restore();
}

function clampText(ctx, text, max, font) {
  ctx.save();
  ctx.font = font;
  ctx.letterSpacing = '0.2px';
  if (ctx.measureText(text).width <= max) {
    ctx.restore();
    return text;
  }
  let out = text;
  while (out.length > 4 && ctx.measureText(`${out}…`).width > max) out = out.slice(0, -1);
  ctx.restore();
  return `${out}…`;
}

export function drawHud(ctx, game, time) {
  const left = 34;
  const right = VIEW.width - left;
  const meta = L.cases[game.case.id];

  // ---- the file header -------------------------------------------------
  label(ctx, L.title.eyebrow, left, 72, 8, INK_FAINT, 3.2);
  label(ctx, meta.no, left, 92, 15, INK, 1.6, 'left', fonts.display);
  label(ctx, meta.name, left + 104, 92, 9, INK_SOFT, 1.6);
  label(ctx, `${timecode(game.clock)}   ·   ${L.hud.team} ${game.agents.filter((a) => !a.taken && !a.extracted).length}/3`, left, 108, 8, INK_FAINT, 1.8);
  rule(ctx, left, 116, left + 320, 116, AMBER_FAINT);

  // the objective: typed lines, number, task, readout
  label(ctx, L.hud.objective, left, 134, 7.5, AMBER, 3.4);
  const steps = objectives(game);
  const gazeCase = game.case.rule.kind === 'gaze';
  steps.forEach((step, i) => {
    const y = 152 + i * 17;
    label(ctx, `0${i + 1}`, left, y, 8, step.done ? AMBER : INK_FAINT, 1);
    label(ctx, step.text, left + 22, y, 9, step.done ? INK_SOFT : INK, 1.2);
    label(ctx, step.value, left + 320, y, 8.5, step.done ? AMBER : INK_SOFT, 1, 'right');
    if (step.done) rule(ctx, left + 22, y - 3, left + 22 + ctx.measureText(step.text).width, y - 3, 'rgba(186, 180, 168, 0.3)');
  });

  // ---- the stamp, and the rule's own readout, on the right -------------
  const ro = readout(game);
  stamp(ctx, right - 168, 72, ro.stamp, ro.live);
  label(ctx, meta.legend, right, 108, 8, INK_FAINT, 2.4, 'right');
  label(ctx, ro.line, right, 124, 8.5, ro.live ? 'rgba(214, 198, 172, 0.8)' : 'rgba(168, 196, 182, 0.6)', 1.4, 'right');
  if (ro.loops) label(ctx, `LOOP ${ro.loops}`, right, 140, 7.5, RED_SOFT, 2.4, 'right');

  // ---- the watch log: what just happened, in the duty officer's hand ----
  const logX = left;
  const logY = 246;
  label(ctx, L.hud.log, logX, logY, 7.5, AMBER, 3.4);
  rule(ctx, logX, logY + 7, logX + 320, logY + 7, 'rgba(186, 180, 168, 0.08)');
  const entries = game.logs.slice(-6);
  if (!entries.length) label(ctx, '—', logX, logY + 26, 8, INK_FAINT, 1);
  entries.forEach((entry, i) => {
    const y = logY + 26 + i * 16;
    label(ctx, timecode(entry.t), logX, y, 7, INK_FAINT, 0.4);
    label(ctx, clampText(ctx, game.logText(entry), 250, `7.5px ${fonts.ui}`), logX + 48, y, 7.5, 'rgba(200, 194, 180, 0.6)', 0.2, 'left', fonts.ui);
  });

  // ---- the unit file, bottom left -------------------------------------
  const fileX = left;
  const fileW = 268;
  const top = VIEW.height - 238;
  label(ctx, L.hud.file, fileX, top - 8, 7.5, AMBER, 3.4);
  rule(ctx, fileX, top, fileX + fileW, top, AMBER_FAINT);
  const limit = game.case.rule.limit || 1;
  game.agents.forEach((a, i) => {
    fileRow(ctx, a, fileX, top + 8 + i * 50, fileW, gazeCase ? a.gaze / limit : null);
  });

  // ---- footer ----------------------------------------------------------
  label(ctx, meta.hint || L.hud.hint, left, VIEW.height - 52, 8, INK_FAINT, 1.2);
  label(ctx, timecode(game.clock), right, VIEW.height - 52, 8.5, INK_SOFT, 1.4, 'right');
  if (game.auto) label(ctx, 'AUTO', right, VIEW.height - 66, 7.5, RED_SOFT, 3, 'right');
  else label(ctx, 'MANUAL', right, VIEW.height - 66, 7.5, AMBER, 3, 'right');

  if (game.paused) {
    ctx.fillStyle = 'rgba(4, 6, 10, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.strokeStyle = 'rgba(206, 200, 186, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(VIEW.width / 2 - 74.5, VIEW.height / 2 - 15.5, 149, 31);
    label(ctx, L.hud.paused, VIEW.width / 2, VIEW.height / 2 + 4, 10, INK, 4, 'center');
  }
}
