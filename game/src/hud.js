// 值班界面：一份摊在桌上的现场卷宗，不是发光面板。白/琥珀的细线、打字机字、红色分类章、
// 每名队员一张证件照位置。只放能用的信息，不放装饰。

import { PALETTE, VIEW } from './config.js';
import { L, fonts } from './text.js';

export function label(ctx, text, x, y, size, colour, spacing = 0, align = 'left', font = fonts.ui) {
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

// a portrait plate: a dark frame, a silhouette, and the unit number in the corner
function portrait(ctx, agent, x, y, w, h) {
  ctx.fillStyle = 'rgba(12, 15, 20, 0.85)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(200, 206, 216, 0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // head and shoulders, in the flat grey of a bad ID photo
  const cx = x + w / 2;
  ctx.fillStyle = 'rgba(120, 128, 140, 0.5)';
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.42, w * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 1.02, w * 0.42, h * 0.5, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // a faint scan of the print
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  for (let i = 3; i < h; i += 4) ctx.fillRect(x + 2, y + i, w - 4, 1);
  label(ctx, agent.id.replace('a', 'A-0'), x + 4, y + h - 4, 7, 'rgba(220, 224, 232, 0.5)', 0, 'left', fonts.mono);
}

function fileRow(ctx, agent, x, y, w) {
  const meta = L.agent[agent.role];
  const down = agent.down || agent.taken;
  portrait(ctx, agent, x, y, 34, 42);
  label(ctx, meta.name, x + 44, y + 13, 13, down ? 'rgba(150, 130, 130, 0.8)' : 'rgba(232, 236, 242, 0.95)', 2, 'left', fonts.display);
  label(ctx, meta.line, x + 44, y + 28, 9, 'rgba(168, 178, 192, 0.7)', 0);
  // condition: a hairline track with one red-orange segment
  const trackW = 86;
  const ratio = Math.max(0, agent.hp) / agent.maxHp;
  ctx.fillStyle = 'rgba(160, 170, 186, 0.18)';
  ctx.fillRect(x + 44, y + 35, trackW, 2);
  ctx.fillStyle = down ? 'rgba(120, 60, 60, 0.8)' : ratio > 0.5 ? 'rgba(214, 208, 190, 0.9)' : 'rgba(206, 108, 96, 0.95)';
  ctx.fillRect(x + 44, y + 35, trackW * ratio, 2);
  label(ctx, `${Math.max(0, Math.ceil(agent.hp))}`, x + 44 + trackW + 6, y + 38, 8, 'rgba(168, 178, 192, 0.7)', 0, 'left', fonts.mono);
  const stateText = agent.taken ? L.state.charmed : down ? L.state.down : L.state[agent.state] || '';
  label(ctx, stateText, x + w, y + 38, 9, 'rgba(226, 214, 196, 0.75)', 2, 'right', fonts.mono);
  rule(ctx, x, y + 46, x + w, y + 46, 'rgba(200, 206, 216, 0.1)');
}

export function drawHud(ctx, game, time) {
  // ---- the file header -------------------------------------------------
  const left = 34;
  label(ctx, 'CASE 01', left, 80, 9, 'rgba(226, 214, 196, 0.75)', 4);
  label(ctx, 'THE OPERA HOUSE  ·  02:10', left, 96, 10, 'rgba(200, 206, 216, 0.55)', 2, 'left', fonts.mono);
  rule(ctx, left, 104, 466, 104, 'rgba(200, 206, 216, 0.22)');

  // the objective, as three typed lines with square bullets
  const steps = [
    { text: L.hud.power(game.power), done: !game.power },
    { text: `HOUSE ${game.kills} / ${game.thralls.length}`, done: game.kills >= game.thralls.length },
    { text: L.result.survivors(game.extracted, game.agents.length), done: game.won },
  ];
  steps.forEach((step, i) => {
    const y = 126 + i * 18;
    ctx.fillStyle = step.done ? 'rgba(168, 214, 182, 0.9)' : 'rgba(206, 108, 96, 0.85)';
    ctx.fillRect(left, y - 7, 4, 4);
    label(ctx, step.text, left + 12, y, 9, step.done ? 'rgba(190, 210, 196, 0.8)' : 'rgba(206, 206, 210, 0.7)', 2, 'left', fonts.mono);
  });

  // the stamp, and the legend line, on the right of the header
  const stamp = game.power ? 'IN PROGRESS' : 'POWER CUT';
  ctx.save();
  ctx.translate(VIEW.width - 240, 88);
  ctx.rotate(-0.04);
  ctx.strokeStyle = game.power ? 'rgba(178, 74, 66, 0.8)' : 'rgba(120, 160, 140, 0.7)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(0, 0, 138, 22);
  label(ctx, stamp, 69, 15, 9, game.power ? 'rgba(190, 92, 82, 0.9)' : 'rgba(140, 180, 160, 0.85)', 3, 'center', fonts.mono);
  ctx.restore();
  label(ctx, L.hud.legend, VIEW.width - left, 126, 9, 'rgba(200, 206, 216, 0.55)', 3, 'right', fonts.mono);
  label(ctx, game.power ? L.hud.music : L.hud.quiet, VIEW.width - left, 140, 9, game.power ? 'rgba(226, 200, 170, 0.8)' : 'rgba(150, 180, 170, 0.75)', 2, 'right', fonts.mono);

  // ---- the unit file, bottom left -------------------------------------
  const fileX = left;
  const fileW = 250;
  game.agents.forEach((a, i) => {
    fileRow(ctx, a, fileX, VIEW.height - 196 + i * 52, fileW);
  });

  // ---- footer ----------------------------------------------------------
  label(ctx, L.hud.hint, left, VIEW.height - 58, 8, 'rgba(168, 178, 192, 0.55)', 2, 'left', fonts.mono);
  label(ctx, `${String(Math.floor(game.clock)).padStart(3, '0')}s`, VIEW.width - left, VIEW.height - 58, 9, 'rgba(200, 206, 216, 0.55)', 1, 'right', fonts.mono);
  if (game.auto) label(ctx, 'AUTO', VIEW.width - left, VIEW.height - 44, 8, 'rgba(206, 108, 96, 0.55)', 3, 'right', fonts.mono);

  if (game.paused) {
    ctx.fillStyle = 'rgba(4, 6, 10, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    label(ctx, L.hud.paused, VIEW.width / 2, VIEW.height / 2, 44, 'rgba(226, 214, 196, 0.9)', 10, 'center', fonts.display);
  }
}
