// The ten gifts the lamp offers between waves. Each card is data: an id, a sigil, and one
// apply() that changes the run's stats. Names and wording live in the page's word-book, so the
// same card reads in either edition; nothing here draws a card or knows what a wave is.

import { TUNING } from './config.js';

export const UPGRADES = [
  {
    id: 'lens',
    sigil: 'lens',
    apply(game) {
      game.stats.halfAngle += (4 * Math.PI) / 180;
    },
  },
  {
    id: 'throw',
    sigil: 'throw',
    apply(game) {
      game.stats.reach += 90;
    },
  },
  {
    id: 'wick',
    sigil: 'wick',
    apply(game) {
      game.stats.dps *= 1.25;
    },
  },
  {
    id: 'coil',
    sigil: 'coil',
    apply(game) {
      game.stats.odGain *= 1.4;
    },
  },
  {
    id: 'heart',
    sigil: 'heart',
    apply(game) {
      game.stats.maxHearts = Math.min(TUNING.maxHearts, game.stats.maxHearts + 1);
      game.hearts = Math.min(game.stats.maxHearts, game.hearts + 1);
    },
  },
  {
    id: 'slow',
    sigil: 'slow',
    apply(game) {
      game.stats.slowAura = true;
    },
  },
  {
    id: 'wildfire',
    sigil: 'wildfire',
    apply(game) {
      game.stats.wildfire = 0.15;
    },
  },
  {
    id: 'focus',
    sigil: 'focus',
    apply(game) {
      game.stats.focus = true;
    },
  },
  {
    id: 'bounty',
    sigil: 'bounty',
    apply(game) {
      game.stats.bounty *= 1.2;
    },
  },
  {
    id: 'kindling',
    sigil: 'kindling',
    apply(game) {
      game.stats.odSeconds += 0.6;
    },
  },
];

export function freshUpgrades(taken) {
  return UPGRADES.filter((card) => !taken.includes(card.id));
}

export function offerUpgrades(game, count = 3) {
  const pool = freshUpgrades(game.taken);
  return game.rng.shuffle(pool).slice(0, count);
}

export function applyUpgrade(game, card) {
  if (!card) return;
  card.apply(game);
  game.taken.push(card.id);
}

// Small line-drawn sigils, one per gift, so the three cards are told apart at a glance.
export function drawSigil(ctx, kind, x, y, size, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(1.4, size * 0.055);
  ctx.lineCap = 'round';
  const s = size;
  ctx.beginPath();
  switch (kind) {
    case 'lens':
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, 0);
      ctx.lineTo(s * 0.62, 0);
      ctx.moveTo(0, -s * 0.62);
      ctx.lineTo(0, s * 0.62);
      ctx.stroke();
      break;
    case 'throw':
      ctx.moveTo(-s * 0.55, s * 0.3);
      ctx.lineTo(s * 0.55, -s * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.55, -s * 0.3);
      ctx.lineTo(s * 0.12, -s * 0.36);
      ctx.moveTo(s * 0.55, -s * 0.3);
      ctx.lineTo(s * 0.4, s * 0.14);
      ctx.stroke();
      break;
    case 'wick':
      ctx.moveTo(0, s * 0.5);
      ctx.bezierCurveTo(-s * 0.55, s * 0.1, -s * 0.1, -s * 0.05, 0, -s * 0.55);
      ctx.bezierCurveTo(s * 0.12, -s * 0.1, s * 0.55, s * 0.12, 0, s * 0.5);
      ctx.stroke();
      break;
    case 'coil':
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, s * (0.18 + i * 0.16), -Math.PI * 0.9 + i, Math.PI * 1.1 + i);
        ctx.stroke();
      }
      break;
    case 'heart':
      ctx.moveTo(0, s * 0.42);
      ctx.bezierCurveTo(-s * 0.7, -s * 0.05, -s * 0.34, -s * 0.55, 0, -s * 0.2);
      ctx.bezierCurveTo(s * 0.34, -s * 0.55, s * 0.7, -s * 0.05, 0, s * 0.42);
      ctx.stroke();
      break;
    case 'slow':
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, s * (0.2 + i * 0.18), 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
      break;
    case 'wildfire':
      ctx.moveTo(0, s * 0.48);
      ctx.bezierCurveTo(-s * 0.5, s * 0.1, -s * 0.06, 0, -s * 0.16, -s * 0.5);
      ctx.moveTo(0, s * 0.48);
      ctx.bezierCurveTo(s * 0.5, s * 0.1, s * 0.06, 0, s * 0.3, -s * 0.38);
      ctx.stroke();
      break;
    case 'focus':
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bounty':
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const b = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * s * 0.26, Math.sin(a) * s * 0.26);
        ctx.lineTo(Math.cos(b) * s * 0.12, Math.sin(b) * s * 0.12);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    default:
      // kindling: three rising sparks
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(-s * 0.28 + i * s * 0.28, s * 0.2 - i * s * 0.2, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }
  ctx.restore();
}
