// The painted screens: the title, the choice between waves, and the ending. All of it is canvas
// — no DOM, no images — so a staged frame is the same surface the game draws on. Every word
// comes from the page's word-book, and card geometry lives here because the mouse is tested
// against what is actually drawn.

import { PALETTE, VIEW } from './config.js';
import { L, fonts } from './text.js';
import { drawSigil } from './upgrades.js';
import { label } from './hud.js';

const CARD = { width: 286, height: 330, gap: 34, y: 318 };

// the little language link in the title's bottom-left corner
export const TITLE_LINK = { x: 104, y: 676, w: 150, h: 38 };

export function tTitleLinkAt(x, y) {
  return x >= TITLE_LINK.x && x <= TITLE_LINK.x + TITLE_LINK.w && y >= TITLE_LINK.y && y <= TITLE_LINK.y + TITLE_LINK.h;
}

export function cardRects() {
  const total = CARD.width * 3 + CARD.gap * 2;
  const x0 = (VIEW.width - total) / 2;
  return [0, 1, 2].map((i) => ({
    x: x0 + i * (CARD.width + CARD.gap),
    y: CARD.y,
    w: CARD.width,
    h: CARD.height,
  }));
}

export function cardAt(x, y) {
  const rects = cardRects();
  return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y - 10 && y <= r.y + r.h + 10);
}

// Words wrap on spaces; a run with no space in it (Chinese) wraps on characters instead, so the
// same function serves both word-books.
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

export function rule(ctx, x1, x2, y, colour) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

export function diamond(ctx, x, y, size, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function keyCap(ctx, x, y, text, width, colour) {
  ctx.save();
  ctx.font = `12px ${fonts.mono}`;
  ctx.letterSpacing = '1px';
  const w = width ?? Math.max(48, ctx.measureText(text).width + 22);
  const h = 26;
  ctx.fillStyle = 'rgba(10, 16, 26, 0.7)';
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  const r = 4;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + r, y - h / 2);
  ctx.lineTo(x + w / 2 - r, y - h / 2);
  ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + r);
  ctx.lineTo(x + w / 2, y + h / 2 - r);
  ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - r, y + h / 2);
  ctx.lineTo(x - w / 2 + r, y + h / 2);
  ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - r);
  ctx.lineTo(x - w / 2, y - h / 2 + r);
  ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + r, y - h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

export function drawTitle(ctx, game, time) {
  const cx = VIEW.width / 2;
  const layout = L.titleLayout;
  const veil = ctx.createRadialGradient(cx, 350, 120, cx, 400, 780);
  veil.addColorStop(0, 'rgba(4, 7, 13, 0.46)');
  veil.addColorStop(0.62, 'rgba(4, 7, 13, 0.66)');
  veil.addColorStop(1, 'rgba(2, 4, 9, 0.93)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // a hairline frame, top and bottom
  rule(ctx, 120, VIEW.width - 120, 84, 'rgba(200, 170, 130, 0.18)');
  rule(ctx, 120, VIEW.width - 120, VIEW.height - 84, 'rgba(200, 170, 130, 0.18)');
  diamond(ctx, cx, 84, 3.5, 'rgba(255, 190, 120, 0.55)');

  label(ctx, L.title.eyebrow, cx, 130, 15, 'rgba(240, 201, 141, 0.84)', 8, 'center');

  const titleY = layout.titleY;
  const grad = ctx.createLinearGradient(cx - 380, titleY - 90, cx + 380, titleY + 20);
  grad.addColorStop(0, '#ffd79a');
  grad.addColorStop(0.45, '#fff0cd');
  grad.addColorStop(1, '#f19a45');
  ctx.save();
  ctx.font = `${fonts.titleWeight} ${fonts.titleSize}px ${fonts.display}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = `${fonts.titleSpacing}px`;
  ctx.shadowColor = 'rgba(255, 130, 40, 0.55)';
  ctx.shadowBlur = 48;
  ctx.fillStyle = grad;
  ctx.fillText(L.title.name, cx, titleY);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 240, 205, 0.16)';
  ctx.fillText(L.title.name, cx, titleY - 1);
  ctx.restore();

  const ruleY = titleY + layout.ruleGap;
  rule(ctx, cx - 250, cx - 26, ruleY, 'rgba(255, 190, 120, 0.35)');
  rule(ctx, cx + 26, cx + 250, ruleY, 'rgba(255, 190, 120, 0.35)');
  diamond(ctx, cx, ruleY, 4, 'rgba(255, 190, 120, 0.8)');

  const line1 = ruleY + layout.lineGap;
  label(ctx, L.title.lines[0], cx, line1, 21, 'rgba(223, 230, 240, 0.84)', 1, 'center', fonts.display);
  label(ctx, L.title.lines[1], cx, line1 + 28, 19, 'rgba(223, 230, 240, 0.56)', 1, 'center', fonts.display);

  const controlY = line1 + layout.controlsGap;
  const xs = [cx - 268, cx, cx + 268];
  L.title.controls.forEach((col, i) => {
    keyCap(ctx, xs[i], controlY, col.key, col.key.length > 6 ? 92 : 76, 'rgba(240, 201, 141, 0.85)');
    label(ctx, col.text, xs[i], controlY + 38, 14, 'rgba(223, 230, 240, 0.62)', 1, 'center');
  });

  const pulse = 0.62 + Math.sin(time * 2.6) * 0.3;
  const ctaY = controlY + layout.ctaGap;
  ctx.save();
  ctx.globalAlpha = pulse;
  label(ctx, L.title.cta, cx, ctaY, 19, PALETTE.fireHot, 7, 'center');
  ctx.restore();
  rule(ctx, cx - 176, cx + 176, ctaY + 14, `rgba(255, 190, 120, ${0.14 + pulse * 0.16})`);

  label(ctx, `${L.title.best}  ${game.best.toLocaleString('en-US')}`, VIEW.width - 120, 132, 11, 'rgba(255, 179, 71, 0.7)', 3, 'right', fonts.mono);

  // the two corner notes: the other edition, and the record
  ctx.save();
  ctx.globalAlpha = 0.55;
  label(ctx, L.otherLabel, TITLE_LINK.x, TITLE_LINK.y + 20, 10, PALETTE.textDim, 3);
  rule(ctx, TITLE_LINK.x, TITLE_LINK.x + 74, TITLE_LINK.y + 28, 'rgba(127, 142, 163, 0.35)');
  ctx.restore();
  label(ctx, L.title.record, VIEW.width - 120, VIEW.height - 104, 10, 'rgba(127, 142, 163, 0.7)', 3, 'right');
  label(ctx, L.title.footer, cx, VIEW.height - 104, 10, 'rgba(127, 142, 163, 0.75)', 4, 'center');
}

export function drawUpgrades(ctx, game, time) {
  const cx = VIEW.width / 2;
  ctx.fillStyle = 'rgba(3, 6, 12, 0.74)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const glow = ctx.createRadialGradient(cx, 380, 20, cx, 400, 700);
  glow.addColorStop(0, 'rgba(255, 140, 60, 0.08)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  label(ctx, L.cards.cleared(game.wave), cx, 172, 12, 'rgba(240, 201, 141, 0.75)', 7, 'center');
  label(ctx, L.cards.title, cx, 232, 42, PALETTE.text, 1, 'center', fonts.display);
  label(ctx, L.cards.sub, cx, 264, 15, 'rgba(223, 230, 240, 0.5)', 1, 'center', fonts.display);

  const rects = cardRects();
  game.cards.forEach((card, i) => {
    const r = rects[i];
    if (!r) return;
    const entry = L.upgrades[card.id];
    const hover = game.hoverCard === i;
    const lift = hover ? -8 : 0;
    const x = r.x;
    const y = r.y + lift;
    const w = r.w;
    const h = r.h;
    ctx.save();
    const fill = ctx.createLinearGradient(x, y, x, y + h);
    fill.addColorStop(0, hover ? 'rgba(26, 22, 22, 0.97)' : 'rgba(13, 19, 30, 0.94)');
    fill.addColorStop(1, hover ? 'rgba(14, 16, 22, 0.98)' : 'rgba(7, 11, 18, 0.96)');
    ctx.fillStyle = fill;
    ctx.shadowColor = hover ? 'rgba(255, 150, 70, 0.35)' : 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = hover ? 34 : 18;
    ctx.shadowOffsetY = 8;
    rounded(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = hover ? 'rgba(255, 190, 120, 0.85)' : 'rgba(160, 185, 210, 0.22)';
    ctx.lineWidth = hover ? 1.6 : 1;
    rounded(ctx, x, y, w, h, 6);
    ctx.stroke();

    // warm blemish at the top of the card, where the sigil sits in the glass
    const halo = ctx.createRadialGradient(cx, y + 78, 2, cx, y + 78, 120);
    halo.addColorStop(0, `rgba(255, 150, 70, ${hover ? 0.16 : 0.09})`);
    halo.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x, y, w, 170);

    const colour = hover ? PALETTE.fireHot : 'rgba(240, 201, 141, 0.9)';
    drawSigil(ctx, card.sigil, x + w / 2, y + 78, 76, colour);

    ctx.textAlign = 'center';
    label(ctx, entry.name, x + w / 2, y + 168, fonts.cardName, hover ? PALETTE.fireHot : PALETTE.text, 1, 'center', fonts.display);
    ctx.font = `15px ${fonts.ui}`;
    ctx.fillStyle = 'rgba(223, 230, 240, 0.58)';
    ctx.textAlign = 'center';
    const lines = wrap(ctx, entry.blurb, w - 52);
    lines.slice(0, 4).forEach((line, n) => ctx.fillText(line, x + w / 2, y + 204 + n * 22));

    rule(ctx, x + 40, x + w - 40, y + h - 62, 'rgba(160, 185, 210, 0.16)');
    keyCap(ctx, x + w / 2, y + h - 32, String(i + 1), 40, hover ? PALETTE.fire : 'rgba(160, 185, 210, 0.6)');
    ctx.restore();
  });

  const pulse = 0.5 + Math.sin(time * 3) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  label(ctx, L.cards.footer, cx, 720, 11, 'rgba(240, 201, 141, 0.9)', 5, 'center');
  ctx.restore();
}

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawResults(ctx, game, time) {
  const cx = VIEW.width / 2;
  const won = game.result === 'victory';
  const veil = ctx.createRadialGradient(cx, 360, 60, cx, 400, 820);
  veil.addColorStop(0, 'rgba(4, 7, 13, 0.6)');
  veil.addColorStop(0.7, 'rgba(3, 5, 10, 0.82)');
  veil.addColorStop(1, 'rgba(2, 3, 8, 0.95)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  rule(ctx, 150, VIEW.width - 150, 150, 'rgba(200, 170, 130, 0.18)');
  const layout = L.resultsLayout;
  label(ctx, won ? L.results.victoryEyebrow : L.results.defeatEyebrow, cx, layout.eyebrowY, 12, 'rgba(240, 201, 141, 0.8)', 8, 'center');

  const headline = won ? L.results.victoryTitle : L.results.defeatTitle;
  ctx.save();
  ctx.font = `${fonts.headlineWeight} ${fonts.headlineSize}px ${fonts.display}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.shadowColor = won ? 'rgba(255, 190, 110, 0.5)' : 'rgba(255, 80, 50, 0.35)';
  ctx.shadowBlur = 36;
  ctx.fillStyle = won ? '#ffe4b5' : '#e8d2c0';
  ctx.fillText(headline, cx, layout.headlineY);
  ctx.restore();

  label(ctx, won ? L.results.victorySub : L.results.defeatSub, cx, layout.subY, 18, 'rgba(223, 230, 240, 0.62)', 1, 'center', fonts.display);

  // four figures, with the score given the space it earned
  const stats = [
    { key: L.results.score, value: game.score.toLocaleString('en-US'), big: true },
    { key: L.results.best, value: Math.max(game.best, game.score).toLocaleString('en-US') },
    { key: L.results.wave, value: `${Math.min(game.wave, game.waveCount)} / ${game.waveCount}` },
    { key: L.results.burned, value: String(game.kills) },
  ];
  const xs = [cx - 330, cx - 110, cx + 110, cx + 330];
  stats.forEach((stat, i) => {
    label(ctx, stat.key, xs[i], 404, 10, 'rgba(127, 142, 163, 0.9)', 4, 'center');
    label(ctx, stat.value, xs[i], stat.big ? 462 : 450, stat.big ? 46 : 34, stat.big ? PALETTE.fireHot : PALETTE.text, 1, 'center', fonts.mono);
  });
  rule(ctx, cx - 400, cx + 400, 494, 'rgba(200, 170, 130, 0.14)');

  if (game.newBest && game.score > 0) {
    const pulse = 0.7 + Math.sin(time * 4) * 0.2;
    ctx.save();
    ctx.globalAlpha = pulse;
    label(ctx, L.results.newBest, cx, 528, 11, PALETTE.fire, 5, 'center');
    ctx.restore();
  }

  const pulse = 0.62 + Math.sin(time * 2.4) * 0.3;
  ctx.save();
  ctx.globalAlpha = pulse;
  label(ctx, L.results.again, cx, 620, 18, PALETTE.fireHot, 6, 'center');
  ctx.restore();
  label(ctx, L.results.orPress, cx, 646, 10, 'rgba(127, 142, 163, 0.7)', 4, 'center');

  label(ctx, L.results.held(game.wavesCleared, game.waveCount), cx, 706, 10, 'rgba(127, 142, 163, 0.6)', 4, 'center');
  label(ctx, L.title.record, VIEW.width - 150, 706, 10, 'rgba(127, 142, 163, 0.6)', 3, 'right');
}
