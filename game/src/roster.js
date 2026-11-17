// 局外那一层：钱、人、下一案。这里只有数据与结算，不画任何东西。
// 原则（docs/META.md）：不做数值膨胀，只做「换人、换装备、承担后果」。

import { CASES } from './cases.js';

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
function member(post, nameIdx, trait) {
  seq += 1;
  return {
    id: `m${seq}`,
    post,
    nameIdx,
    trait,
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
    closed: {},
    members: [
      member('veteran', 0, 'steady'),
      member('rookie', 1, 'quick'),
      member('lamp', 2, 'deaf'),
    ],
    candidates: [],
    hired: 0,
    ledger: [],
    settledCase: null,
  };
}

export function living(roster) {
  return roster.members.filter((m) => !m.dead);
}

// 三个岗位各出一个：先挑不重复的岗位，再补人。
export function squadOf(roster) {
  const list = living(roster);
  const out = [];
  for (const post of POSTS) {
    const m = list.find((x) => x.post === post && !out.includes(x));
    out.push(m || null);
  }
  return out;
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

function nameOf(m) {
  return m.nameIdx < 0 ? 'substitute' : `#${m.nameIdx + 1}`;
}

// 结案：报酬、医药费、抚恤，然后刷新候选人。一局只调用一次。
export function settle(roster, game) {
  const meta = CASES[game.caseIndex];
  const fee = meta.fee || 0;
  const broke = roster.cash < 0;
  let pay = 0;
  if (game.won) pay = Math.round(fee * (broke ? 0.5 : 1));
  roster.cash += pay;
  if (pay) payLine(roster, `case ${meta.no} · fee`, pay);
  if (broke && game.won) payLine(roster, 'budget cut · half fee', 0);

  let dead = 0;
  let hurt = 0;
  game.agents.forEach((a, i) => {
    const m = game.squad && game.squad[i];
    if (!m) return;
    const own = roster.members.find((x) => x.id === m.id);
    if (a.taken || (a.down && !a.extracted)) {
      dead += 1;
      roster.cash -= PENSION;
      if (own) own.dead = true;
      payLine(roster, `pension · ${nameOf(m)}`, -PENSION);
      return;
    }
    if (!a.extracted) {
      hurt += 1;
      roster.cash -= MEDICAL;
      if (own) own.wounds += 1;
      payLine(roster, `dressing · ${nameOf(m)}`, -MEDICAL);
      return;
    }
    if (own) own.cases += 1;
  });

  const id = meta.id;
  roster.closed[id] = game.won ? 'won' : 'lost';
  roster.settledCase = { id, won: game.won, pay, dead, hurt, fee };
  refreshCandidates(roster);
  return roster.settledCase;
}

// 每次结案刷新 2–3 个候选人：岗位、特质、要价。招一个，其余的就散了。
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
    seq += 1;
    roster.candidates.push({
      id: `c${seq}`,
      post,
      trait,
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
  const m = member(c.post, c.nameIdx, c.trait);
  roster.members.push(m);
  roster.hired += 1;
  payLine(roster, `hired · ${c.trait}`, -c.price);
  roster.candidates = [];
  return true;
}

export function dismissCandidates(roster) {
  roster.candidates = [];
}

// 负现金不解雇，只是下一案只报半价；这里把这一条读出来给界面用。
export function budgetNote(roster) {
  return roster.cash < 0 ? 'half' : null;
}
