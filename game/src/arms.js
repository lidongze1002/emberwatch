// 武器升级：三把枪 × 三个槽（枪管 / 瞄具 / 弹匣）× 两级。
// 数值只在这里算一次；units.js 建人时读它，射击、换弹、瞄具都用同一份结果。
import { WEAPONS } from './config.js';

export const SLOTS = ['barrel', 'sight', 'mag'];

export const SLOT_NAMES = {
  barrel: { zh: '枪管', en: 'BARREL' },
  sight: { zh: '瞄具', en: 'SIGHT' },
  mag: { zh: '弹匣', en: 'MAG' },
};

export const SLOT_LINE = {
  barrel: { zh: ['射程 +8%', '伤害 +10%'], en: ['RANGE +8%', 'DAMAGE +10%'] },
  sight: { zh: ['散布 −20%', '瞄准 −30%'], en: ['SPREAD −20%', 'AIM −30%'] },
  mag: { zh: ['弹匣 +2', '换弹 −25%'], en: ['MAG +2', 'RELOAD −25%'] },
};

export const COST = {
  barrel: [{ cash: 400, parts: 2 }, { cash: 700, parts: 3 }],
  sight: [{ cash: 350, parts: 2 }, { cash: 650, parts: 3 }],
  mag: [{ cash: 300, parts: 1 }, { cash: 600, parts: 2 }],
};

export function emptyArms() {
  const out = {};
  for (const w of Object.keys(WEAPONS)) out[w] = { barrel: 0, sight: 0, mag: 0 };
  return out;
}

export function armsOf(roster) {
  if (!roster.arms || typeof roster.arms !== 'object') roster.arms = emptyArms();
  for (const w of Object.keys(WEAPONS)) {
    if (!roster.arms[w]) roster.arms[w] = { barrel: 0, sight: 0, mag: 0 };
    for (const s of SLOTS) roster.arms[w][s] = Math.max(0, Math.min(2, roster.arms[w][s] || 0));
  }
  return roster.arms;
}

export function levelOf(roster, weapon, slot) {
  return armsOf(roster)[weapon]?.[slot] || 0;
}

// 一整套枪的数值：基础表 + 槽位等级。
export function statsFor(weapon, roster) {
  const base = WEAPONS[weapon] || WEAPONS.rifle;
  const arms = roster ? armsOf(roster)[weapon] : { barrel: 0, sight: 0, mag: 0 };
  const range = base.range * (arms.barrel >= 1 ? 1.08 : 1);
  const damage = base.damage * (arms.barrel >= 2 ? 1.1 : 1);
  const spread = base.spread * (arms.sight >= 1 ? 0.8 : 1);
  const acquire = (arms.sight >= 2 ? 0.7 : 1);
  const mag = base.mag + (arms.mag >= 1 ? 2 : 0);
  const reload = base.reload * (arms.mag >= 2 ? 0.75 : 1);
  return { ...base, range, damage, spread, acquire, mag, reload };
}

export function buyUpgrade(roster, weapon, slot) {
  const level = levelOf(roster, weapon, slot);
  if (level >= 2) return { ok: false, why: 'max' };
  const price = COST[slot][level];
  if (roster.cash < price.cash) return { ok: false, why: 'cash' };
  if ((roster.parts || 0) < price.parts) return { ok: false, why: 'parts' };
  roster.cash -= price.cash;
  roster.parts = (roster.parts || 0) - price.parts;
  armsOf(roster)[weapon][slot] = level + 1;
  return { ok: true, level: level + 1, price };
}
