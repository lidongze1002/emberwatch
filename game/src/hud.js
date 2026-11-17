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
  ctx.fillStyle = 'rgba(8, 11, 17, 0.82)';
  ctx.strokeStyle = down ? 'rgba(120, 60, 60, 0.5)' : 'rgba(160, 185, 210, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = down ? 'rgba(120, 60, 60, 0.8)' : agent.colour;
  ctx.beginPath();
  ctx.arc(x + 18, y + h / 2, 6, 0, Math.PI * 2);
  ctx.fill();

  label(ctx, meta.name, x + 34, y + 20, 12, down ? 'rgba(160, 140, 140, 0.7)' : PALETTE.pale, 2);
  label(ctx, meta.line, x + 34, y + 36, 9, 'rgba(140, 156, 176, 0.75)', 0);

  const hpW = 74;
  const hp = Math.max(0, agent.hp) / agent.maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x + w - hpW - 14, y + 14, hpW, 5);
  ctx.fillStyle = hp > 0.5 ? 'rgba(190, 220, 190, 0.9)' : hp > 0.25 ? 'rgba(240, 200, 120, 0.9)' : 'rgba(220, 100, 90, 0.95)';
  ctx.fillRect(x + w - hpW - 14, y + 14, hpW * hp, 5);
  label(ctx, `${Math.max(0, Math.ceil(agent.hp))}`, x + w - 14, y + 34, 10, 'rgba(160, 176, 196, 0.8)', 0, 'right', fonts.mono);
  const stateText = agent.taken ? L.state.charmed : down ? L.state.down : L.state[agent.state] || '';
  label(ctx, stateText, x + w - 14, y + h - 10, 9, 'rgba(240, 201, 141, 0.7)', 2, 'right');
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
  ctx.roundRect(cx - 250, 18, 500, 40, 6);
  ctx.fill();
  steps.forEach((step, i) => {
    label(ctx, step.text, x + 24, 44, 12, step.done ? 'rgba(160, 220, 180, 0.95)' : 'rgba(200, 212, 228, 0.8)', 2, 'left', fonts.mono);
    if (i < steps.length - 1) {
      ctx.strokeStyle = 'rgba(120, 140, 165, 0.35)';
      ctx.beginPath();
      ctx.moveTo(x + 142, 28);
      ctx.lineTo(x + 142, 48);
      ctx.stroke();
    }
    x += 166;
  });
  ctx.restore();

  // the legend, and whether the house is singing
  const lx = VIEW.width - 44;
  label(ctx, L.hud.legend, lx, 46, 14, 'rgba(220, 120, 120, 0.9)', 4, 'right');
  const on = game.power;
  label(ctx, on ? L.hud.music : L.hud.quiet, lx, 68, 10, on ? 'rgba(240, 190, 130, 0.85)' : 'rgba(150, 180, 170, 0.8)', 3, 'right');
  ctx.save();
  ctx.fillStyle = on ? 'rgba(220, 90, 80, 0.9)' : 'rgba(120, 200, 170, 0.8)';
  ctx.beginPath();
  ctx.arc(lx - 152, 62, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // agent cards, bottom left
  const cardW = 232;
  const cardH = 54;
  game.agents.forEach((a, i) => {
    agentCard(ctx, a, 30, VIEW.height - 40 - (i + 1) * (cardH + 8), cardW, cardH);
  });

  // the case line and the hint
  label(ctx, `${L.title.foot}`, 34, VIEW.height - 22, 10, 'rgba(120, 136, 156, 0.75)', 3);
  label(ctx, L.hud.hint, VIEW.width / 2, VIEW.height - 22, 9, 'rgba(120, 136, 156, 0.7)', 2, 'center');
  label(ctx, `${Math.floor(game.clock)}s`, VIEW.width - 34, VIEW.height - 22, 10, 'rgba(120, 136, 156, 0.7)', 1, 'right', fonts.mono);

  if (game.paused) {
    ctx.fillStyle = 'rgba(4, 6, 10, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    label(ctx, L.hud.paused, cx, VIEW.height / 2, 44, 'rgba(240, 201, 141, 0.9)', 10, 'center', fonts.display);
  }
}
