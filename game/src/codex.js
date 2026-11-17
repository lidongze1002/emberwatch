// The record: the keeper's notes, opened with C from the title or the ending. Three pages —
// what comes out of the sea, what the lamp gives back, and how the eight tides were written
// down. It draws over a frozen scene and owns no rules; page and tab geometry live here too,
// because the mouse is tested against what is actually drawn.

import { PALETTE, VIEW } from './config.js';
import { L, fonts, number } from './text.js';
import { UPGRADES, drawSigil } from './upgrades.js';
import { SHADOW_ORDER, drawShadowPortrait } from './enemies.js';
import { label } from './hud.js';
import { diamond, rule, wrap } from './overlays.js';

const PANEL = { x: 150, y: 164, w: VIEW.width - 300, h: 556 };
const TAB = { y: 186, w: 168, gap: 18, h: 40 };
const LEFT = PANEL.x + 26;
const RIGHT = PANEL.x + PANEL.w - 26;
const TOP = 258;

export function codexTabs() {
  const total = 3 * TAB.w + 2 * TAB.gap;
  const x0 = (VIEW.width - total) / 2;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (TAB.w + TAB.gap), y: TAB.y - 26, w: TAB.w, h: TAB.h }));
}

export function codexTabAt(x, y) {
  return codexTabs().findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

function drawTabs(ctx, page) {
  const rects = codexTabs();
  L.codex.tabs.forEach((name, i) => {
    const r = rects[i];
    const active = page === i;
    label(ctx, name, r.x + r.w / 2, TAB.y + 6, active ? 17 : 15, active ? PALETTE.fireHot : 'rgba(160, 178, 198, 0.55)', 4, 'center');
    if (active) {
      rule(ctx, r.x + 18, r.x + r.w - 18, TAB.y + 16, 'rgba(255, 190, 120, 0.55)');
      diamond(ctx, r.x + r.w / 2, TAB.y + 16, 2.6, 'rgba(255, 190, 120, 0.9)');
    }
  });
}

function drawPanel(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(7, 11, 18, 0.88)';
  ctx.strokeStyle = 'rgba(160, 185, 210, 0.14)';
  ctx.lineWidth = 1;
  const r = 8;
  const { x, y, w, h } = PANEL;
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
  ctx.fill();
  ctx.stroke();
  // a warm seam of light along the top edge, as if the note were held under the lamp
  const seam = ctx.createLinearGradient(x, 0, x + w, 0);
  seam.addColorStop(0, 'rgba(255, 170, 90, 0)');
  seam.addColorStop(0.5, 'rgba(255, 170, 90, 0.28)');
  seam.addColorStop(1, 'rgba(255, 170, 90, 0)');
  ctx.fillStyle = seam;
  ctx.fillRect(x + 20, y, w - 40, 1);
  ctx.restore();
}

function drawBestiary(ctx, time) {
  let y = TOP + 6;
  for (const type of SHADOW_ORDER) {
    const entry = L.bestiary[type];
    // a moonlit plate behind the silhouette, so the book reads as drawings rather than faces
    const plate = ctx.createRadialGradient(LEFT + 34, y + 2, 2, LEFT + 34, y + 2, 32);
    plate.addColorStop(0, 'rgba(128, 160, 196, 0.18)');
    plate.addColorStop(0.75, 'rgba(120, 152, 188, 0.06)');
    plate.addColorStop(1, 'rgba(120, 150, 190, 0)');
    ctx.fillStyle = plate;
    ctx.beginPath();
    ctx.arc(LEFT + 34, y + 2, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.92;
    drawShadowPortrait(ctx, type, LEFT + 34, y + 2, 18, time);
    ctx.restore();
    label(ctx, entry.name, LEFT + 78, y + 10, 22, PALETTE.text, 1);
    label(ctx, entry.hint, RIGHT, y + 8, 11, 'rgba(240, 201, 141, 0.62)', 2, 'right');
    ctx.save();
    ctx.font = `14px ${fonts.ui}`;
    ctx.fillStyle = 'rgba(223, 230, 240, 0.62)';
    const lines = wrap(ctx, entry.line, RIGHT - LEFT - 84);
    lines.slice(0, 1).forEach((line) => ctx.fillText(line, LEFT + 78, y + 32));
    ctx.restore();
    rule(ctx, LEFT + 78, RIGHT, y + 52, 'rgba(160, 185, 210, 0.09)');
    y += 62;
  }
}

function drawGifts(ctx) {
  const columns = [LEFT + 4, LEFT + 470];
  UPGRADES.forEach((card, i) => {
    const entry = L.upgrades[card.id];
    const col = columns[i % 2];
    const y = TOP + Math.floor(i / 2) * 88;
    drawSigil(ctx, card.sigil, col + 22, y - 4, 32, 'rgba(240, 201, 141, 0.75)');
    label(ctx, entry.name, col + 52, y + 2, 19, PALETTE.text, 1);
    ctx.save();
    ctx.font = `13px ${fonts.ui}`;
    ctx.fillStyle = 'rgba(223, 230, 240, 0.55)';
    const lines = wrap(ctx, entry.blurb, 350);
    lines.slice(0, 2).forEach((line, n) => ctx.fillText(line, col + 52, y + 22 + n * 18));
    ctx.restore();
  });
}

function drawTides(ctx) {
  let y = TOP;
  L.waves.forEach((wave, i) => {
    label(ctx, String(i + 1).padStart(2, '0'), LEFT + 2, y + 8, 21, 'rgba(240, 201, 141, 0.45)', 1, 'left', fonts.mono);
    label(ctx, wave.name, LEFT + 56, y + 8, 20, PALETTE.text, 1);
    ctx.save();
    ctx.font = `13px ${fonts.ui}`;
    ctx.fillStyle = 'rgba(223, 230, 240, 0.55)';
    ctx.fillText(wave.lore, LEFT + 270, y + 7);
    ctx.restore();
    rule(ctx, LEFT + 56, RIGHT, y + 28, 'rgba(160, 185, 210, 0.08)');
    y += 54;
  });
}

export function drawCodex(ctx, game, time) {
  const cx = VIEW.width / 2;
  const veil = ctx.createRadialGradient(cx, 380, 120, cx, 420, 860);
  veil.addColorStop(0, 'rgba(3, 6, 12, 0.9)');
  veil.addColorStop(0.7, 'rgba(2, 4, 9, 0.95)');
  veil.addColorStop(1, 'rgba(1, 2, 6, 0.98)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  drawPanel(ctx);
  label(ctx, L.codex.title, cx, 104, 38, PALETTE.textWarm, 8, 'center', fonts.display);
  label(ctx, L.codex.sub, cx, 132, 13, 'rgba(223, 230, 240, 0.45)', 1, 'center', fonts.display);
  drawTabs(ctx, game.codexPage);

  const intro = [L.codex.bestiaryIntro, L.codex.giftsIntro, L.codex.tidesIntro][game.codexPage];
  label(ctx, intro, LEFT, 232, 12, 'rgba(240, 201, 141, 0.55)', 3);

  if (game.codexPage === 0) drawBestiary(ctx, time);
  else if (game.codexPage === 1) drawGifts(ctx);
  else drawTides(ctx);

  label(ctx, L.codex.foot, LEFT, VIEW.height - 44, 11, 'rgba(160, 178, 198, 0.7)', 3);
  label(ctx, L.codex.page(game.codexPage + 1, 3), RIGHT, VIEW.height - 44, 11, 'rgba(160, 178, 198, 0.55)', 3, 'right', fonts.mono);
  label(ctx, `${L.title.best}  ${number(game.best)}`, RIGHT, 132, 11, 'rgba(255, 179, 71, 0.55)', 3, 'right', fonts.mono);
}
