// The cold open. Four and a half seconds: the dark lifts, the lamp comes up, the beam finds the
// water, and the first line of the log is stamped on the frame. Nothing in the rules runs until
// it ends — no shadow can reach you while you are watching — and any key or click skips it.

import { PALETTE, VIEW } from './config.js';
import { L, fonts } from './text.js';
import { label } from './hud.js';

export const INTRO_SECONDS = 4.4;

const ease = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function windowAlpha(t, inAt, outAt, dur = 0.6) {
  const rise = clamp01((t - inAt) / dur);
  const fall = clamp01((outAt - t) / dur);
  return Math.min(rise, fall);
}

export function updateIntro(game, dt) {
  game.introTime += dt;
  const t = Math.min(1, game.introTime / INTRO_SECONDS);
  const e = ease(t);
  game.camera = { scale: 1.07 - 0.07 * e, y: 54 * (1 - e) };
  game.lampPower = clamp01((game.introTime - 0.25) / 1.1);
  const sweep = clamp01((game.introTime - 0.9) / 2.6);
  game.beam.angle = -Math.PI / 2 - 0.6 + 1.2 * ease(sweep);
  game.beam.target = game.beam.angle;
  if (game.introTime >= INTRO_SECONDS) game.endIntro();
}

export function drawIntro(ctx, game, time) {
  const t = game.introTime;
  const cx = VIEW.width / 2;

  // the room comes up from black, then hands over to the wave banner
  const open = clamp01(t / 0.75);
  const closing = 1 - clamp01((INTRO_SECONDS - t) / 0.45);
  const veil = Math.max(1 - open, closing) * 0.92;
  if (veil > 0.01) {
    ctx.fillStyle = `rgba(2, 4, 8, ${veil})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  // a warm wash rising from the lamp, so the text is read by the lamp itself
  const wash = clamp01((t - 0.8) / 1.2) * (1 - clamp01((t - 3.4) / 0.8));
  if (wash > 0.01) {
    const glow = ctx.createRadialGradient(cx, 560, 20, cx, 520, 520);
    glow.addColorStop(0, `rgba(255, 150, 70, ${0.1 * wash})`);
    glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 120, VIEW.width, 680);
  }

  const a1 = windowAlpha(t, 1.2, 3.6, 0.7);
  const a2 = windowAlpha(t, 1.9, 3.6, 0.7);
  const chapterSize = L.cjk ? 56 : 40;

  if (a1 > 0.01) {
    ctx.save();
    ctx.globalAlpha = a1;
    ctx.strokeStyle = 'rgba(255, 190, 120, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 180, 246);
    ctx.lineTo(cx + 180, 246);
    ctx.stroke();
    label(ctx, L.intro.chapter, cx, 306, chapterSize, PALETTE.textWarm, L.cjk ? 12 : 10, 'center', fonts.display);
    ctx.beginPath();
    ctx.moveTo(cx - 180, 330);
    ctx.lineTo(cx + 180, 330);
    ctx.stroke();
    ctx.restore();
  }

  if (a2 > 0.01) {
    ctx.save();
    ctx.globalAlpha = a2;
    label(ctx, L.intro.sub, cx, 364, 15, 'rgba(223, 230, 240, 0.7)', 1, 'center', fonts.display);
    ctx.restore();
  }

  const hint = 0.35 + Math.sin(time * 2.4) * 0.12;
  ctx.save();
  ctx.globalAlpha = clamp01((t - 1.6) / 0.6) * hint;
  label(ctx, L.intro.skip, VIEW.width - 44, 56, 10, PALETTE.textDim, 4, 'right');
  ctx.restore();
}
