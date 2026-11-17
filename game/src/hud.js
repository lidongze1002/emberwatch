// 值班界面：三个人的状态卡、目标、当前怪谈，以及「礼堂在唱」这件事本身。

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

function agentCard(ctx, agent, x, y, w, h) {
  const meta = L.agent[agent.role];
  const down = agent.down || agent.taken;
  ctx.save();
  // a dossier strip, not a card: a rank tab, a rule, a readout
  ctx.fillStyle = 'rgba(6, 9, 14, 0.62)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = down ? 'rgba(120, 60, 60, 0.8)' : agent.colour;
  ctx.fillRect(x, y, 3, h);
  ctx.strokeStyle = 'rgba(180, 196, 216, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + w, y);
  ctx.moveTo(x, y + h - 0.5);
  ctx.lineTo(x + w, y + h - 0.5);
  ctx.stroke();

  label(ctx, meta.name, x + 14, y + 17, 11, down ? 'rgba(160, 140, 140, 0.7)' : PALETTE.pale, 3);
  label(ctx, meta.line, x + 14, y + 33, 9, 'rgba(140, 156, 176, 0.7)', 0.2);

  // hit points as ten ticks, the way an instrument reports them
  const ticks = 10;
  const filled = Math.ceil((Math.max(0, agent.hp) / agent.maxHp) * ticks);
  for (let i = 0; i < ticks; i += 1) {
    ctx.fillStyle = i < filled
      ? (filled > 6 ? 'rgba(180, 214, 186, 0.85)' : filled > 3 ? 'rgba(230, 196, 120, 0.85)' : 'rgba(214, 96, 88, 0.9)')
      : 'rgba(120, 140, 165, 0.18)';
    ctx.fillRect(x + w - 88 + i * 8, y + 12, 5, 3);
  }
  const stateText = agent.taken ? L.state.charmed : down ? L.state.down : L.state[agent.state] || '';
  label(ctx, stateText, x + w - 14, y + h - 9, 9, 'rgba(240, 201, 141, 0.75)', 2, 'right', fonts.mono);
  ctx.restore();
}

export function drawHud(ctx, game, time) {
  // objective, three chips
  const cx = VIEW.width / 2;
  const steps = [
    { text: L.hud.power(game.power) + '', done: !game.power },
    { text: `${game.kills} / ${game.thralls.length}`, done: game.kills >= game.thralls.length },
    { text: L.result.survivors(game.extracted, game.agents.length), done: game.won },
  ];
  let x = cx - 230;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 11, 17, 0.72)';
  ctx.beginPath();
  ctx.roundRect(cx - 250, 54, 500, 40, 6);
  ctx.fill();
  steps.forEach((step, i) => {
    label(ctx, step.text, x + 24, 80, 12, step.done ? 'rgba(160, 220, 180, 0.95)' : 'rgba(200, 212, 228, 0.8)', 2, 'left', fonts.mono);
    if (i < steps.length - 1) {
      ctx.strokeStyle = 'rgba(120, 140, 165, 0.35)';
      ctx.beginPath();
      ctx.moveTo(x + 142, 64);
      ctx.lineTo(x + 142, 84);
      ctx.stroke();
    }
    x += 166;
  });
  ctx.restore();

  // the legend, and whether the house is singing
  const lx = VIEW.width - 44;
  label(ctx, L.hud.legend, lx, 76, 14, 'rgba(220, 120, 120, 0.9)', 4, 'right');
  const on = game.power;
  label(ctx, on ? L.hud.music : L.hud.quiet, lx, 98, 10, on ? 'rgba(240, 190, 130, 0.85)' : 'rgba(150, 180, 170, 0.8)', 3, 'right');
  ctx.save();
  ctx.fillStyle = on ? 'rgba(220, 90, 80, 0.9)' : 'rgba(120, 200, 170, 0.8)';
  ctx.beginPath();
  ctx.arc(lx - 152, 92, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // agent cards, bottom left
  const cardW = 232;
  const cardH = 54;
  game.agents.forEach((a, i) => {
    const y = VIEW.height - 78 - (i + 1) * (cardH + 6);
    agentCard(ctx, a, 30, y, cardW, cardH);
    if (game.possessed === a) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 226, 180, 0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(30, y, cardW, cardH, 5);
      ctx.stroke();
      ctx.restore();
    }
    label(ctx, `${i + 1}`, 30 + cardW - 8, y + 12, 9, 'rgba(160, 176, 196, 0.55)', 0, 'right', fonts.mono);
  });

  // possession: who you have, and how long is left
  if (game.possessed) {
    const p = game.possessed;
    const w = 300;
    const x = cx - w / 2;
    const y = 66;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 13, 19, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, 40, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 214, 160, 0.5)';
    ctx.stroke();
    label(ctx, L.hud.controlling(L.agent[p.role].name), x + 14, y + 18, 12, 'rgba(255, 226, 180, 0.95)', 2);
    label(ctx, L.hud.possessHint, x + 14, y + 32, 9, 'rgba(160, 176, 196, 0.8)', 1);
    const ratio = Math.max(0, game.possessTimer / 8);
    ctx.fillStyle = 'rgba(255, 214, 160, 0.85)';
    ctx.fillRect(x + w - 96, y + 28, 82 * ratio, 3);
    ctx.restore();
  }

  // the case line and the hint
  label(ctx, `${L.title.foot}`, 34, VIEW.height - 54, 10, 'rgba(120, 136, 156, 0.75)', 3);
  label(ctx, L.hud.hint, VIEW.width / 2, VIEW.height - 54, 9, 'rgba(120, 136, 156, 0.7)', 2, 'center');
  label(ctx, `${Math.floor(game.clock)}s`, VIEW.width - 34, VIEW.height - 54, 10, 'rgba(120, 136, 156, 0.7)', 1, 'right', fonts.mono);

  if (game.paused) {
    ctx.fillStyle = 'rgba(4, 6, 10, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    label(ctx, L.hud.paused, cx, VIEW.height / 2, 44, 'rgba(240, 201, 141, 0.9)', 10, 'center', fonts.display);
  }
}
