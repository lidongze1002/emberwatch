// 局外那一层：钱、人、下一案。这里只有数据与结算，不画任何东西。
// 原则（docs/META.md）：不做数值膨胀，只做「换人、换装备、承担后果」。

import { CASES } from './cases.js';
import { L } from './text.js';
import { DEFAULT_WEAPON } from './config.js';
import { emptyArms } from './arms.js';

export const POSTS = ['veteran', 'rookie', 'lamp'];

// 每个特质只改一条规则。没有特质的临时工就是「green」。
export const TRAITS = {
  steady: { price: 300 },
  deaf: { price: 200 },
  quick: { price: 250 },
  nighteyes: { price: 400 },
  green: { price: 0 },
};

export const MEDICAL = 300;
export const PENSION = 800;
export const BENCH_FEE = 200;

let seq = 0;
function member(post, nameIdx, trait, look) {
  seq += 1;
  return {
    id: `m${seq}`,
    post,
    nameIdx,
    trait,
    look: look || post,
    weapon: DEFAULT_WEAPON[post] || 'rifle',
    wounds: 0,
    cases: 0,
    dead: false,
    substitute: false,
  };
}

export function createRoster() {
  seq = 0;
  return {
    cash: 0,
    parts: 0,
    scrap: 0,
    intel: {},
    arms: emptyArms(),
    closed: {},
    members: [
      member('veteran', 0, 'steady', 'veteran'),
      member('rookie', 1, 'quick', 'rookie'),
      member('lamp', 2, 'deaf', 'lamp'),
    ],
    // 谁值这一班：三个岗位各一个 id。空着的岗位由临时工顶。
    active: {},
    candidates: [],
    hired: 0,
    ledger: [],
    memorial: [],
    upgrades: { lamp: false },
    settledCase: null,
  };
}

export function living(roster) {
  return roster.members.filter((m) => !m.dead);
}

// 三个岗位各出一个：先看值班表，没有就抓这个岗位里第一个活人。
export function squadOf(roster) {
  const list = living(roster);
  const out = [];
  for (const post of POSTS) {
    const chosen = list.find((x) => x.id === roster.active[post] && x.post === post);
    const m = chosen || list.find((x) => x.post === post);
    out.push(m || null);
  }
  return out;
}

// 换班：把同岗位的人顶上去。已经在班上的人换下来。
export function setDuty(roster, id) {
  const m = roster.members.find((x) => x.id === id && !x.dead);
  if (!m) return false;
  roster.active[m.post] = m.id;
  return true;
}

// 上岗：没有人的岗位就是一张空椅子，值班室随便抓一个临时工顶上（没有特质）。
export function squadForRun(roster) {
  return squadOf(roster).map((m, i) => {
    if (m) return m;
    seq += 1;
    return {
      id: `temp${seq}`,
      post: POSTS[i],
      nameIdx: -1,
      trait: 'green',
      look: POSTS[i],
      weapon: DEFAULT_WEAPON[POSTS[i]] || 'rifle',
      wounds: 0,
      cases: 0,
      dead: false,
      substitute: true,
    };
  });
}

function payLine(roster, text, amount) {
  roster.ledger.unshift({ text, amount });
  if (roster.ledger.length > 6) roster.ledger.pop();
}

function displayName(m) {
  if (!m || m.nameIdx < 0) return L.roster.substitute;
  return L.names[m.nameIdx % L.names.length];
}

// 结案：报酬、医药费、抚恤，然后刷新候选人。一局只调用一次。
export function settle(roster, game) {
  const meta = CASES[game.caseIndex];
  const fee = meta.fee || 0;
  const broke = roster.cash < 0;
  let pay = 0;
  if (game.won) pay = Math.round(fee * (broke ? 0.5 : 1));
  roster.cash += pay;
  if (pay) payLine(roster, L.ledger.fee(meta.no), pay);
  if (broke && game.won) payLine(roster, L.ledger.half, 0);

  // 待命的人也要吃饭：超过三个人的部分，每案一人 200
  const bench = Math.max(0, living(roster).length - 3);
  if (bench) {
    roster.cash -= BENCH_FEE * bench;
    payLine(roster, L.ledger.bench(bench), -BENCH_FEE * bench);
  }

  let dead = 0;
  let hurt = 0;
  game.agents.forEach((a, i) => {
    const m = game.squad && game.squad[i];
    if (!m) return;
    const own = roster.members.find((x) => x.id === m.id);
    if (a.taken || (a.down && !a.extracted)) {
      dead += 1;
      roster.cash -= PENSION;
      if (own) {
        own.dead = true;
        roster.memorial.push({ nameIdx: own.nameIdx, post: own.post, cases: own.cases, at: meta.no });
      }
      payLine(roster, L.ledger.pension(displayName(m)), -PENSION);
      return;
    }
    if (!a.extracted) {
      hurt += 1;
      roster.cash -= MEDICAL;
      if (own) own.wounds += 1;
      payLine(roster, L.ledger.dressing(displayName(m)), -MEDICAL);
      return;
    }
    if (own) own.cases += 1;
  });

  const id = meta.id;
  roster.closed[id] = game.won ? 'won' : 'lost';
  // 案内捡到的零件与废料带回营地（跨刷新保存）
  roster.parts = (roster.parts || 0) + (game.parts || 0);
  roster.scrap = (roster.scrap || 0) + (game.scrap || 0);
  // 阵亡的人从名册上撤下来，只在案卷末尾留一行黑框
  roster.members = roster.members.filter((m) => !m.dead);
  roster.settledCase = { id, won: game.won, pay, dead, hurt, fee };
  refreshCandidates(roster);
  return roster.settledCase;
}

// 每次结案刷新 2–3 个候选人：岗位、特质、要价。招一个，其余的就散了。
// 候选人还有一张「脸」：老警 / 学生 / 修女 / 码头工，轮着来，这样招聘页不是三张同一张照片。
const LOOKS = ['constable', 'student', 'sister', 'docker'];

export function refreshCandidates(roster) {
  const traits = ['steady', 'deaf', 'quick', 'nighteyes'].filter(
    (t) => !roster.members.some((m) => !m.dead && m.trait === t),
  );
  const count = 2 + (Math.random() < 0.55 ? 1 : 0);
  roster.candidates = [];
  for (let i = 0; i < count; i += 1) {
    const post = POSTS[(Math.floor(Math.random() * 3) + i) % 3];
    const trait = traits.length ? traits.splice(Math.floor(Math.random() * traits.length), 1)[0] : 'green';
    const base = 600 + Math.round(Math.random() * 6) * 100;
    const look = LOOKS[(roster.hired + i + Math.floor(Math.random() * LOOKS.length)) % LOOKS.length];
    seq += 1;
    roster.candidates.push({
      id: `c${seq}`,
      post,
      trait,
      look,
      nameIdx: 3 + Math.floor(Math.random() * 9),
      price: Math.min(1400, base + (TRAITS[trait] ? TRAITS[trait].price : 0)),
    });
  }
  return roster.candidates;
}

export function hire(roster, candidateId) {
  const c = roster.candidates.find((x) => x.id === candidateId);
  if (!c) return false;
  if (roster.cash < c.price) return false;
  if (roster.members.filter((m) => !m.dead).length >= 6) return false;
  roster.cash -= c.price;
  const m = member(c.post, c.nameIdx, c.trait, c.look);
  roster.members.push(m);
  roster.hired += 1;
  payLine(roster, L.ledger.hired(L.trait[c.trait] || c.trait), -c.price);
  roster.candidates = [];
  return true;
}

export function dismissCandidates(roster) {
  roster.candidates = [];
}

// 装备：一盏好灯（光锥 +8%，灯油 −10%）。不涨数值，只换一件东西。
export const LAMP_PRICE = 900;

export function buyLamp(roster) {
  if (roster.upgrades && roster.upgrades.lamp) return false;
  if (roster.cash < LAMP_PRICE) return false;
  roster.cash -= LAMP_PRICE;
  roster.upgrades = { ...(roster.upgrades || {}), lamp: true };
  payLine(roster, L.ledger.lamp, -LAMP_PRICE);
  return true;
}

// 值班室换枪：¥300，下一案立刻生效。
export const WEAPON_PRICE = 300;

export function setWeapon(roster, id, weapon) {
  const m = roster.members.find((x) => x.id === id && !x.dead);
  if (!m || m.weapon === weapon) return false;
  if (roster.cash < WEAPON_PRICE) return false;
  roster.cash -= WEAPON_PRICE;
  m.weapon = weapon;
  payLine(roster, L.ledger.weapon(L.hud.weapon[weapon] || weapon), -WEAPON_PRICE);
  return true;
}

// 行军床：让一个伤员跳过一夜（清掉一次伤势）。
export function restOne(roster) {
  const hurt = roster.members.find((m) => !m.dead && m.wounds > 0);
  if (!hurt) return null;
  hurt.wounds -= 1;
  payLine(roster, L.ledger.rest(personNameOf(hurt)), 0);
  return hurt;
}

function personNameOf(m) {
  if (!m || m.nameIdx < 0) return L.roster.substitute;
  return L.names[m.nameIdx % L.names.length];
}

// 电台：花钱刷新招聘池，或者买下一案的 Boss 情报。
export const RADIO = { refresh: 300, intel: 200 };

export function buyIntel(roster, caseId) {
  if (roster.intel && roster.intel[caseId]) return true;
  if (roster.cash < RADIO.intel) return false;
  roster.cash -= RADIO.intel;
  roster.intel = { ...(roster.intel || {}), [caseId]: true };
  payLine(roster, L.ledger.intel, -RADIO.intel);
  return true;
}

export function payForRefresh(roster) {
  if (roster.cash < RADIO.refresh) return false;
  roster.cash -= RADIO.refresh;
  payLine(roster, L.ledger.refresh, -RADIO.refresh);
  refreshCandidates(roster);
  return true;
}

// 存一下：值班室不该因为刷新就忘掉这一夜。读回来的东西形状不对就当没有。
const SAVE_KEY = 'nw.roster.v1';

export function saveRoster(roster) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(roster));
  } catch {
    /* private mode, no storage: the watch simply does not persist */
  }
}

export function loadRoster() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (!r || typeof r.cash !== 'number' || !Array.isArray(r.members) || !Array.isArray(r.ledger)) return null;
    if (!r.active || typeof r.active !== 'object') r.active = {};
    if (!Array.isArray(r.memorial)) r.memorial = [];
    if (!Array.isArray(r.candidates)) r.candidates = [];
    if (!r.closed || typeof r.closed !== 'object') r.closed = {};
    if (!r.upgrades || typeof r.upgrades !== 'object') r.upgrades = { lamp: false };
    if (typeof r.parts !== 'number') r.parts = 0;
    if (typeof r.scrap !== 'number') r.scrap = 0;
    if (!r.intel || typeof r.intel !== 'object') r.intel = {};
    if (!r.arms || typeof r.arms !== 'object') r.arms = emptyArms();
    for (const m of r.members) {
      if (!m.weapon) m.weapon = DEFAULT_WEAPON[m.post] || 'rifle';
    }
    const maxId = r.members.reduce((mx, m) => Math.max(mx, Number(String(m.id).replace(/\D/g, '')) || 0), 0);
    seq = Math.max(seq, maxId + 1);
    return r;
  } catch {
    return null;
  }
}

export function clearRoster() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nothing to clear */
  }
}

// 负现金不解雇，只是下一案只报半价；这里把这一条读出来给界面用。
export function budgetNote(roster) {
  return roster.cash < 0 ? 'half' : null;
}
