// 场上的人：三个自己拿主意的队员，和这一案里的东西。玩家只下目标；每一步、每个目标、
// 每次后退，都是队员自己判断的。案子不同，这里的「东西」不同，但骨架是同一套。

import { AGENTS, DEFAULT_WEAPON, DROPS, HACHI, KUNE, MIRROR, SPIDER, SPIDERLING, THRALL, TUNING, WEAPONS } from './config.js';
import { findPath, hardSolid, lineClear, solid, walkClear } from './level.js';
import { muzzleOf } from './pose.js';
import { statsFor } from './arms.js';

const inZone = (zone, x, y) => !!zone && x > zone.x && x < zone.x + zone.w && y > zone.y && y < zone.y + zone.h;

function baseBody(x, y, extra) {
  return {
    x,
    y,
    hp: 1,
    maxHp: 1,
    speed: 20,
    cooldown: 0,
    hitFlash: 0,
    dead: false,
    aim: Math.PI / 2,
    wander: 0,
    wanderClock: 0,
    stun: 0,
    step: Math.random() * 6,
    cloth: { x: 0, y: 0, sway: 0 },
    ...extra,
  };
}

// ---- spawns ---------------------------------------------------------------

export function spawnBoss(game) {
  const boss = game.case.boss;
  if (!boss) return null;
  if (boss.kind === 'spider') {
    if (game.thralls.some((t) => t.kind === 'spider' && !t.dead)) return null;
    const t = baseBody(boss.x, boss.y, {
      id: 'spider',
      kind: 'spider',
      hp: SPIDER.hp,
      maxHp: SPIDER.hp,
      speed: SPIDER.speed,
      reach: SPIDER.reach,
      damage: SPIDER.damage,
      cooldownMax: SPIDER.cooldown,
      radius: SPIDER.radius,
      rise: 0,
    });
    game.thralls.push(t);
    game.shake = 8;
    return t;
  }
  if (boss.kind === 'hachi') {
    if (game.thralls.some((t) => t.kind === 'hachi' && !t.dead)) return null;
    const t = baseBody(boss.x, boss.y, {
      id: 'hachi',
      kind: 'hachi',
      hp: 1,
      maxHp: 1,
      speed: HACHI.speed,
      reach: HACHI.reach,
      damage: HACHI.damage,
      cooldownMax: HACHI.cooldown,
      radius: HACHI.radius,
      armor: true,
      feed: 0,
      path: null,
      pathAt: 0,
      appear: 0,
      withdraw: 0,
      remember: null,
    });
    game.thralls.push(t);
    game.shake = 6;
    return t;
  }
  if (boss.kind === 'kunekune') {
    const t = kune(boss.x, boss.y, boss.size || 1.9, 'big');
    if (boss.hunt) t.hunt = { ...boss.hunt, heat: 0 };
    game.thralls.push(t);
    return t;
  }
  return null;
}

// 一处能站人的地方：从给定点向外找第一个不压墙/家具的落点。刷在墙里的小蜘蛛子
// 打不到也走不出来，整场就卡在那里，所以刷怪一律先过这一道。
export function freeSpot(x, y, radius = 11, from = 10, to = 80) {
  if (!solid(x, y, radius)) return { x, y };
  for (let r = from; r <= to; r += 6) {
    for (let k = 0; k < 16; k += 1) {
      const a = (k / 16) * Math.PI * 2 + r * 0.1;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (!solid(px, py, radius)) return { x: px, y: py };
    }
  }
  return { x, y };
}

// 一处「站得开」的地方：比身体半径多留一圈余量。卡在座椅缝里的人，位置上不算撞墙，
// 但四周都不够宽，路径永远拉不出去，必须退到真正空的地方。
function roomySpot(x, y, radius) {
  if (!solid(x, y, radius + 7)) return { x, y };
  for (let r = 14; r <= 90; r += 7) {
    for (let k = 0; k < 16; k += 1) {
      const a = (k / 16) * Math.PI * 2 + r * 0.07;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (!solid(px, py, radius + 7)) return { x: px, y: py };
    }
  }
  return freeSpot(x, y, radius);
}

// 她死的时候从裙下散出三只蜘蛛子：不清理干净就不算清场
function spawnSpiderlings(game, x, y) {
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const s = freeSpot(x + Math.cos(a) * 26, y + Math.sin(a) * 26, 9);
    game.thralls.push(baseBody(s.x, s.y, {
      id: `sp${game.thralls.length}`,
      kind: 'spiderling',
      hp: SPIDERLING.hp,
      maxHp: SPIDERLING.hp,
      speed: SPIDERLING.speed,
      reach: SPIDERLING.reach,
      damage: SPIDERLING.damage,
      cooldownMax: SPIDERLING.cooldown,
      radius: SPIDERLING.radius,
      aim: a,
      wander: a,
    }));
  }
}

function kune(x, y, size, id) {  return baseBody(x, y, {
    id: `kune-${id}`,
    kind: 'kune',
    hp: 1,
    maxHp: 1,
    radius: 20 * size,
    size,
    rate: size > 1.4 ? KUNE.bossRate : KUNE.rate,
    noTarget: true,
    invulnerable: true,
    sway: Math.random() * 6.28,
    aim: Math.PI / 2,
  });
}

export function spawnGazers(game) {
  for (const g of game.case.gazers || []) {
    game.thralls.push(kune(g.x, g.y, g.size || 1, game.thralls.length));
  }
}

export function spawnMirrors(game, given) {
  const boss = game.case.boss;
  if (!boss || boss.kind !== 'mirror') return;
  const spots = given && given.length ? given : [
    { x: 420, y: 660 }, { x: 244, y: 430 }, { x: 1040, y: 300 },
  ];
  const roles = ['veteran', 'rookie', 'lamp'];
  for (let i = 0; i < (boss.count || 3); i += 1) {
    const s = spots[i % spots.length];
    const spec = AGENTS[roles[i % 3]];
    const at = freeSpot(s.x, s.y, 10);
    game.thralls.push(baseBody(at.x, at.y, {
      id: `mirror-${i}`,
      kind: 'mirror',
      role: roles[i % 3],
      hp: MIRROR.hp,
      maxHp: MIRROR.hp,
      speed: MIRROR.speed,
      damage: MIRROR.damage,
      range: MIRROR.range,
      fireRate: MIRROR.fireRate,
      spread: MIRROR.spread,
      radius: MIRROR.radius,
      colour: spec.colour,
      path: null,
      pathAt: 0,
      mirror: true,
      facing: Math.PI / 2,
      vx: 0,
      vy: 0,
      recoil: 0,
      pose: 'ready',
      poseT: 1,
      poseDip: 0,
      flash: 0,
      cooldown: 3.2 + Math.random() * 0.8,
      post: { x: at.x, y: at.y },
      leash: MIRROR.leash,
      lag: 1.8 + i * 0.7,
      gate: i === 0,
    }));
  }
}

// 走错门之后，上一层的那一个跟下来：没有岗位，只跟着队长的脚印走。
export function spawnEcho(game) {
  const boss = game.case.boss;
  if (!boss || boss.kind !== 'mirror') return null;
  // 从楼梯口下来，但别贴在人身上：它要跟着走，不是贴脸开枪。
  const at = freeSpot(250, 580, 10);
  const t = baseBody(at.x, at.y, {
    id: `echo-${game.thralls.length}`,
    kind: 'mirror',
    role: 'veteran',
    hp: MIRROR.hp,
    maxHp: MIRROR.hp,
    speed: MIRROR.speed,
    damage: MIRROR.damage,
    range: MIRROR.range,
    fireRate: MIRROR.fireRate,
    spread: MIRROR.spread,
    radius: MIRROR.radius,
    colour: '#e0b276',
    path: null,
    pathAt: 0,
    mirror: true,
    echo: true,
    facing: Math.PI / 2,
    vx: 0,
    vy: 0,
    recoil: 0,
    pose: 'ready',
    poseT: 1,
    poseDip: 0,
    flash: 0,
    cooldown: 2.6,
    post: null,
    leash: Infinity,
    lag: 2.4,
  });
  game.thralls.push(t);
  return t;
}

export function createAgents(game) {
  return game.case.spawns.agents.map((spot, i) => {
    const spec = AGENTS[spot.role];
    const sq = game.squad && game.squad[i];
    const weapon = (sq && sq.weapon) || DEFAULT_WEAPON[spot.role] || 'rifle';
    const gun = statsFor(weapon, game.roster);
    const sightBase = spot.role === 'lamp' ? 380 : spot.role === 'veteran' ? 330 : 270;
    return {
      id: `a${i}`,
      role: spot.role,
      trait: sq ? sq.trait : 'green',
      deaf: !!(sq && sq.trait === 'deaf'),
      lampUp: !!(game.roster && game.roster.upgrades && game.roster.upgrades.lamp && spot.role === 'lamp'),
      weapon,
      ammo: gun.mag,
      mag: gun.mag,
      reserve: gun.mag * 3,
      reloadT: 0,
      reloadDur: gun.reload,
      acquireTime: ACQUIRE_TIME * (gun.acquire || 1),
      ember: 0,
      oil: 1,
      sight: sightBase,
      picked: 0,
      x: spot.x,
      y: spot.y,
      hp: spec.hp,
      maxHp: spec.hp,
      speed: spec.speed,
      range: gun.range,
      damage: gun.damage,
      fireRate: gun.fireRate,
      spread: gun.spread,
      colour: spec.colour,
      aim: -Math.PI / 2,
      facing: -Math.PI / 2,
      vx: 0,
      vy: 0,
      recoil: 0,
      firePulse: 0,
      acquire: 0,
      settle: 0,
      aimSweep: 0,
      pose: 'carry',
      poseT: 0,
      poseDip: 0,
      cooldown: 0,
      order: { kind: 'hold' },
      path: null,
      pathAt: 0,
      state: 'idle',
      target: null,
      charm: 0,
      charmed: false,
      down: false,
      revive: 0,
      extracted: false,
      taken: false,
      flash: 0,
      step: Math.random() * 10,
      gaze: 0,
      aversion: 0,
      avertAngle: -Math.PI / 2,
      answered: null,
    };
  });
}

export function createThralls(game) {
  return (game.case.spawns.thralls || []).map((spot, i) => baseBody(spot.x, spot.y, {
    id: `t${i}`,
    kind: 'thrall',
    hp: THRALL.hp,
    maxHp: THRALL.hp,
    speed: THRALL.speed,
    reach: THRALL.reach,
    damage: THRALL.damage,
    cooldownMax: THRALL.cooldown,
    radius: 12,
  }));
}

// ---- agents ---------------------------------------------------------------

function nearestThrall(game, a, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const t of game.thralls) {
    if (t.dead || t.noTarget || t.invulnerable) continue;
    const d = Math.hypot(t.x - a.x, t.y - a.y);
    if (d < bestDist && lineClear(a.x, a.y, t.x, t.y, 4)) {
      best = t;
      bestDist = d;
    }
  }
  return best;
}

function nearestKune(game, a) {
  let best = null;
  let bestDist = Infinity;
  for (const t of game.thralls) {
    if (t.dead || t.kind !== 'kune') continue;
    const d = Math.hypot(t.x - a.x, t.y - a.y);
    if (d < bestDist) {
      best = t;
      bestDist = d;
    }
  }
  return best;
}

function nearestDowned(game, a) {
  // 救人只有一个去，另一个留在原地警戒；距离不设死，否则倒下的人躺在走廊另一头就没人回头。
  if (game.agents.some((x) => x !== a && x.order && x.order.kind === 'revive')) return null;
  let best = null;
  let bestDist = 1200;
  for (const other of game.agents) {
    if (other === a || !other.down || other.taken) continue;
    const d = Math.hypot(other.x - a.x, other.y - a.y);
    if (d < bestDist) {
      best = other;
      bestDist = d;
    }
  }
  return best;
}

function turnToward(from, to, maxStep) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + Math.max(-maxStep, Math.min(maxStep, delta));
}

// 瞄准是一套状态机，不是「把 aim 赋成目标角度」：
// 发现 → 停步 → 受限角速度转枪 → 对准（≤8°）才开火 → 目标消失后还瞄 0.25 秒。
// 侧后方目标超过 ±1.2 rad 时，转的是身体，不是腰。
const AIM_TURN = 7;             // rad/s，上身/枪口的上限
const BODY_TURN = 5;            // rad/s，转身
const AIM_WINDOW = 0.14;        // ±8°
const ACQUIRE_TIME = 0.22;      // 先停、再瞄
const AIM_HOLD = 0.25;          // 收枪前还瞄一会儿
const TWIST_MAX = 1.2;          // 腰能拧多少

function shortAngle(v) {
  let d = v;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// 把枪口转向目标，速度受限；腰拧到头就交给身体。
// 返回这一帧还剩多少角度误差（小于 AIM_WINDOW 才算对准）。
function slewAim(a, want, dt, turnBody) {
  const before = a.aim;
  a.aim = turnToward(a.aim, want, dt * AIM_TURN);
  a.aimSweep = Math.abs(shortAngle(a.aim - before));
  const twist = shortAngle(a.aim - a.facing);
  if (Math.abs(twist) > TWIST_MAX) {
    a.aim = a.facing + Math.sign(twist) * TWIST_MAX;
    if (turnBody) a.facing = turnToward(a.facing, want, dt * BODY_TURN);
  }
  return Math.abs(shortAngle(want - a.aim));
}

function brake(a, dt) {
  const k = Math.max(0, 1 - dt * 16);
  a.vx *= k;
  a.vy *= k;
  a.path = null;
}

// 目标在这一帧被看见：定时器往前推，枪口按受限角速度跟过去。
function trackTarget(a, target, dt, turnBody) {
  a.settle = AIM_HOLD;
  a.acquire = (a.acquire || 0) + dt;
  return slewAim(a, Math.atan2(target.y - a.y, target.x - a.x), dt, turnBody);
}

function walkTo(game, a, x, y, dt) {
  const now = game.clock;
  const r = TUNING.agentRadius;
  // 目标点落在实体里（石灯中心、门框中心、点在家具上）：先把它挪到旁边能站的地方，
  // 否则每一次拉出来的路径都以一个走不到的终点收尾，人就在原地打转。
  if (solid(x, y, r + 2)) {
    const near = freeSpot(x, y, r, 14, 90);
    x = near.x;
    y = near.y;
  }
  const goalMoved = !a.goal || Math.hypot(a.goal.x - x, a.goal.y - y) > 22;
  if (!a.path || goalMoved || now - a.pathAt > 1.4) {
    a.path = findPath(game.level, a.x, a.y, x, y);
    a.pathAt = now;
    a.goal = { x, y };
  }
  // 不走路的「走路」：三十帧没挪出八步、离目标还远，说明脚卡在座椅/门框的缝里，
  // 路径怎么拉都会穿过实体。把人放回最近的空地，再重新找路。
  if (!a.stallAt) a.stallAt = { x: a.x, y: a.y, t: 0 };
  a.stallAt.t += dt;
  const travelled = Math.hypot(a.x - a.stallAt.x, a.y - a.stallAt.y);
  if (travelled > 8) {
    a.stallAt = { x: a.x, y: a.y, t: 0 };
  } else if (a.stallAt.t > 0.6) {
    a.stallAt = { x: a.x, y: a.y, t: 0 };
    if (Math.hypot(x - a.x, y - a.y) > 40) {
      const seat = roomySpot(a.x, a.y, r);
      if (Math.hypot(seat.x - a.x, seat.y - a.y) > 1) {
        a.x = seat.x;
        a.y = seat.y;
        a.path = null;
        a.pathAt = 0;
        a.vx = 0;
        a.vy = 0;
      } else {
        // The body is rubbing the outside of a corner: the seat is where it already stands, and
        // the same path keeps coming back. Step off the corner sideways, then re-plan from there.
        const side = -(a.sideSign || 1);
        a.sideSign = side;
        const away = Math.atan2(y - a.y, x - a.x) + side * Math.PI / 2;
        for (const d of [9, 14, 20, 28]) {
          const px = a.x + Math.cos(away) * d;
          const py = a.y + Math.sin(away) * d;
          if (!solid(px, py, r)) {
            a.x = px;
            a.y = py;
            break;
          }
        }
        a.path = null;
        a.pathAt = 0;
        a.vx = 0;
        a.vy = 0;
      }
    }
  }
  const step = a.path && a.path[0];
  if (!step) {
    a.state = 'idle';
    return true;
  }
  // a waypoint the body cannot walk to is a waypoint to throw away and re-path from
  if (!walkClear(a.x, a.y, step.x, step.y, r)) {
    a.path.shift();
    a.pathAt = now + 0.1;
    a.vx *= 0.25;
    a.vy *= 0.25;
    if (!a.path.length) a.path = findPath(game.level, a.x, a.y, x, y);
    return false;
  }
  const dx = step.x - a.x;
  const dy = step.y - a.y;
  const dist = Math.hypot(dx, dy);
  // 三个人会抢同一个路点。挤在同一个点前 0.6 秒还没进去，就说明那里站了人：放弃这个点。
  if (dist < 34) {
    a.wayT = (a.wayT || 0) + dt;
    if (a.wayT > 0.6) {
      a.wayT = 0;
      a.path.shift();
      a.pathAt = now + 0.05;
      return false;
    }
  } else {
    a.wayT = 0;
  }
  const arrival = a.path.length <= 1 ? 12 : 8;
  if (dist < arrival) {
    a.path.shift();
    if (!a.path.length) {
      a.vx *= 0.55;
      a.vy *= 0.55;
      return true;
    }
  }
  const want = Math.atan2(dy, dx);
  // the last leg is the only one that brakes: a body that arrives at full speed skates
  const braking = a.path.length <= 1 ? Math.max(0.2, Math.min(1, dist / 30)) : 1;
  // 灯一亮，全队的步子就压下来：火不能灭。这不是负重，是规矩。
  const carrying = game.case.rule.kind === 'gaze' && (game.rule.lit || (game.rule.lights > 0));
  const speed = a.speed * braking * (carrying ? 0.36 : 1);
  const k = Math.min(1, dt * 8);
  a.vx += (Math.cos(want) * speed - a.vx) * k;
  a.vy += (Math.sin(want) * speed - a.vy) * k;

  const nx = a.x + a.vx * dt;
  const ny = a.y + a.vy * dt;
  if (!solid(nx, ny, r)) {
    a.x = nx;
    a.y = ny;
  } else if (!solid(nx, a.y, r)) {
    a.x = nx;
    a.vy = 0;
  } else if (!solid(a.x, ny, r)) {
    a.y = ny;
    a.vx = 0;
  } else {
    a.vx = 0;
    a.vy = 0;
    a.path = null;
    return false;
  }
  const v = Math.hypot(a.vx, a.vy);
  if (v > 14) a.facing = turnToward(a.facing, Math.atan2(a.vy, a.vx), dt * (v > 50 ? 4.8 : 3.2));
  a.step += v * dt * 0.12;
  return false;
}

function startReload(game, a) {
  const gun = WEAPONS[a.weapon] || WEAPONS.rifle;
  if (a.reloadT > 0 || a.reserve <= 0 || a.ammo >= (a.mag || gun.mag)) return;
  a.reloadT = a.reloadDur || gun.reload;
  a.recoil = 0;
}

function fire(game, a, target) {
  if (a.cooldown > 0 || a.aversion > 0 || a.reloadT > 0) return;
  // 没停稳、没对准，就不开火：甩头打一枪再甩回来不是射击，是抽搐
  if ((a.acquire || 0) < (a.acquireTime || ACQUIRE_TIME)) return;
  const want = Math.atan2(target.y - a.y, target.x - a.x);
  if (Math.abs(shortAngle(want - a.aim)) > AIM_WINDOW) return;
  const dist = Math.hypot(target.x - a.x, target.y - a.y);
  if (dist > a.range || !lineClear(a.x, a.y, target.x, target.y, 4)) return;
  const gun = WEAPONS[a.weapon] || WEAPONS.rifle;
  if (a.ammo <= 0) {
    startReload(game, a);
    return;
  }
  a.ammo -= 1;
  a.cooldown = a.fireRate;
  a.recoil = 1;
  a.firePulse = 1;
  const stay = a.trait === 'steady' ? 0.72 : 1;
  const base = (Math.random() - 0.5) * a.spread * 2 * stay;
  // 子弹从画出来的枪口出膛，方向就是枪管的方向（斜持也跟着枪走）
  const m = muzzleOf(a);
  const pellets = gun.pellets || 1;
  for (let p = 0; p < pellets; p += 1) {
    const fan = pellets > 1 ? (p - (pellets - 1) / 2) * a.spread * 0.62 : 0;
    const angle = m.angle + base + fan;
    const bx = m.x + Math.cos(angle) * 2;
    const by = m.y + Math.sin(angle) * 2;
    game.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(angle) * TUNING.bulletSpeed,
      vy: Math.sin(angle) * TUNING.bulletSpeed,
      life: 0.9,
      damage: a.damage * (a.ember > 0 ? 1.35 : 1),
      burn: gun.burn || 0,
      team: 'agent',
    });
  }
  game.muzzle.push({
    x: m.x + Math.cos(m.angle) * 2,
    y: m.y + Math.sin(m.angle) * 2,
    angle: m.angle,
    sweep: a.aimSweep || 0,
    life: 0.06,
  });
  game.sound.shot(a.role, a.x, a.y);
  if (a.ammo <= 0) startReload(game, a);
}

function updateAgentInner(game, a, dt) {
  if (a.down || a.extracted || a.taken) return;
  a.cooldown = Math.max(0, a.cooldown - dt);
  a.flash = Math.max(0, a.flash - dt * 4);
  a.recoil = Math.max(0, a.recoil - dt * 6);
  a.firePulse = Math.max(0, (a.firePulse || 0) - dt * 7);
  a.ember = Math.max(0, (a.ember || 0) - dt);
  // 换弹：0.9 秒里不能开枪，枪口收下去；换完从备弹里补满
  if (a.reloadT > 0) {
    a.reloadT = Math.max(0, a.reloadT - dt);
    if (a.reloadT === 0) {
      const gun = WEAPONS[a.weapon] || WEAPONS.rifle;
      const cap = a.mag || gun.mag;
      const take = Math.min(cap - a.ammo, a.reserve);
      a.ammo += take;
      a.reserve -= take;
    }
  }
  // 灯油：提灯人的光会慢慢变短，捡到灯油才补回来
  if (a.role === 'lamp') a.oil = Math.max(0.2, (a.oil === undefined ? 1 : a.oil) - dt * 0.004);
  a.sight = (a.role === 'lamp' ? 380 : a.role === 'veteran' ? 330 : 270) * (a.role === 'lamp' ? 0.55 + 0.45 * a.oil : 1);
  // 脚步：走得越快越密；停下就没有
  const sp = Math.hypot(a.vx, a.vy);
  if (sp > 40) {
    a.stepT = (a.stepT || 0) + dt;
    if (a.stepT > (sp > 110 ? 0.24 : 0.34)) {
      a.stepT = 0;
      game.sound.step?.(a.role);
    }
  } else {
    a.stepT = 0;
  }
  // 目标离开视野后还瞄 0.25 秒；超过就把「发现」这件事忘掉，下一次重新停步
  a.settle = Math.max(0, (a.settle || 0) - dt);
  if (a.settle <= 0) a.acquire = 0;
  // the body always faces where it is going; the weapon faces what it is on
  if (Math.hypot(a.vx, a.vy) < 12) {
    a.facing = turnToward(a.facing, a.aim, dt * 3.4);
  }
  // 抬枪 / 收枪不是瞬切：0.15 秒走过去，换姿势时枪口还会往下沉一点。
  const engagedNow = (a.state === 'fighting' || a.order.kind === 'focus')
    && (a.aversion || 0) <= 0 && a.reloadT <= 0;
  const wantPose = engagedNow ? 1 : 0;
  const before = a.poseT === undefined ? wantPose : a.poseT;
  const step = dt / 0.15;
  a.poseT = before + Math.max(-step, Math.min(step, wantPose - before));
  const vel = Math.abs(a.poseT - before) / Math.max(dt, 1e-4);
  a.poseDip = Math.max((a.poseDip || 0) - dt * 9, Math.min(1, vel / 6.6));
  a.pose = a.poseT > 0.5 ? 'ready' : 'carry';
  // with nothing to shoot, the weapon — and the torch on it — follows the walk, not the last target
  const engaged = a.state === 'fighting' || a.order.kind === 'focus';
  if (!engaged && a.aversion <= 0 && a.settle <= 0) a.aim = turnToward(a.aim, a.facing, dt * 7);

  // you are in this one: hands on, no orders
  if (game.possessed === a) {
    a.state = 'possessed';
    a.step += dt * 6;
    const held = game.input.held;
    const ax = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
    const ay = (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) - (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0);
    if (ax || ay) {
      const len = Math.hypot(ax, ay);
      const nx = a.x + (ax / len) * a.speed * 1.12 * dt;
      const ny = a.y + (ay / len) * a.speed * 1.12 * dt;
      if (!solid(nx, ny, TUNING.agentRadius)) {
        a.x = nx;
        a.y = ny;
      } else if (!solid(nx, a.y, TUNING.agentRadius)) {
        a.x = nx;
      } else if (!solid(a.x, ny, TUNING.agentRadius)) {
        a.y = ny;
      }
      a.path = null;
    }
    a.aim = Math.atan2(game.input.y - a.y, game.input.x - a.x);
    // 亲手带的人不受「发现→停步」的自动流程限制，但枪口仍然要对着光标
    a.acquire = a.acquireTime || ACQUIRE_TIME;
    a.settle = AIM_HOLD;
    if (game.input.down && !(game.suppressFire > 0)) fire(game, a, { x: game.input.x, y: game.input.y });
    return;
  }

  // 第一案的规则：电闸没拉，礼堂在唱，三秒后这个人就不听你的了
  const charmZone = game.case.zones.house;
  if (game.case.rule.kind === 'power' && inZone(charmZone, a.x, a.y) && game.power) {
    a.charm += dt;
    if (a.charm >= TUNING.charmSeconds) a.charmed = true;
  } else if (!a.charmed) {
    a.charm = Math.max(0, a.charm - dt * 2);
  }
  if (game.case.rule.kind === 'power' && !game.power) {
    a.charmed = false;
    a.charm = 0;
  }

  if (a.charmed) {
    a.state = 'charmed';
    const mark = game.case.spawns.stageMark || game.case.spawns.exit;
    const reached = walkTo(game, a, mark.x, mark.y, dt);
    if (reached || Math.hypot(a.x - mark.x, a.y - mark.y) < 30) {
      a.taken = true;
      game.log('stageWalk', a.role);
    }
    return;
  }

  // objectives first: a door, the switchboard, the exit, a point you clicked
  if (a.order.kind === 'goto') {
    a.state = 'moving';
    const target = nearestThrall(game, a, 190);
    if (target) {
      trackTarget(a, target, dt, false);
      const twist = Math.abs(shortAngle(a.aim - a.facing));
      if (twist >= TWIST_MAX - 0.01 && (a.acquire || 0) >= (a.acquireTime || ACQUIRE_TIME)) {
        // 侧后方有人：不边走边拧腰，站住把身体转过去
        a.state = 'fighting';
        a.facing = turnToward(a.facing, a.aim, dt * BODY_TURN);
        brake(a, dt);
        fire(game, a, target);
        return;
      }
      fire(game, a, target);
    }
    const reached = walkTo(game, a, a.order.x, a.order.y, dt);
    if (reached) a.order = { kind: 'hold' };
    return;
  }

  if (a.order.kind === 'revive') {
    const mate = a.order.mate;
    if (!mate || !mate.down) {
      a.order = { kind: 'hold' };
    } else {
      const d = Math.hypot(mate.x - a.x, mate.y - a.y);
      if (d > 26) {
        a.state = 'moving';
        walkTo(game, a, mate.x, mate.y, dt);
      } else {
        a.state = 'reviving';
        mate.revive += dt * (a.role === 'rookie' ? 1.6 : 1) * (a.trait === 'quick' ? 1.5 : 1);
        if (mate.revive >= TUNING.reviveSeconds) {
          mate.down = false;
          mate.revive = 0;
          mate.hp = Math.max(2, Math.round(mate.maxHp * 0.35));
          game.log('revived', mate.role);
          a.order = { kind: 'hold' };
        }
      }
      return;
    }
  }

  // idle / hold: pick up a downed mate before anything else
  const mate = nearestDowned(game, a);
  if (mate && a.order.kind === 'hold') {
    a.order = { kind: 'revive', mate };
    a.state = 'moving';
    return;
  }

  // idle / hold: defend, look for someone to pick up, or fall back when hurt
  let target = null;
  if (a.order.kind === 'focus' && a.order.target && !a.order.target.dead) {
    target = a.order.target;
  } else {
    target = nearestThrall(game, a, TUNING.vision);
  }

  if (a.hp < a.maxHp * 0.3 && !target) {
    a.state = 'retreat';
    const exit = game.case.spawns.exit;
    walkTo(game, a, exit.x, exit.y, dt);
    return;
  }

  if (target) {
    a.state = 'fighting';
    trackTarget(a, target, dt, true);
    // 先停、再瞄：刚发现人时不走位，枪口按角速度转过去
    if ((a.acquire || 0) < (a.acquireTime || ACQUIRE_TIME)) {
      brake(a, dt);
      return;
    }
    // 腰拧到头：脚停下，人转身，枪才继续往目标上压
    if (Math.abs(shortAngle(a.aim - a.facing)) >= TWIST_MAX - 0.01) {
      brake(a, dt);
      return;
    }
    const dist = Math.hypot(target.x - a.x, target.y - a.y);
    const gun = WEAPONS[a.weapon] || WEAPONS.rifle;
    const want = Math.min(a.range, gun.want || 200);
    const visible = lineClear(a.x, a.y, target.x, target.y, 4);
    if (!visible) {
      // no line: close the distance and let the path find the door
      walkTo(game, a, target.x, target.y, dt);
    } else if (dist < 120) {
      // too close: back off while firing, the way a person with a rifle would. If the straight
      // line back is a wall (the stage lip, a bench), try around it before standing still.
      const away = Math.atan2(a.y - target.y, a.x - target.x);
      let backed = false;
      for (const turn of [0, 0.5, -0.5, 0.9, -0.9, 1.4, -1.4]) {
        const ang = away + turn;
        const bx = a.x + Math.cos(ang) * 90;
        const by = a.y + Math.sin(ang) * 90;
        if (!solid(bx, by, TUNING.agentRadius)) {
          walkTo(game, a, bx, by, dt);
          backed = true;
          break;
        }
      }
      if (!backed) {
        // no room to give: hold the line and keep shooting
        a.path = null;
        a.vx = 0;
        a.vy = 0;
      }
    } else if (dist > want) {
      walkTo(game, a, target.x, target.y, dt);
    } else {
      a.path = null;
    }
    fire(game, a, target);
    return;
  }

  a.state = 'idle';
  a.path = null;
  // 驻守不是「三个人朝同一个方向发呆」：按角色各看一个扇区（正面 / 右侧 / 左侧）。
  if (a.order.kind === 'hold' && a.guard !== undefined && a.aversion <= 0) {
    a.aim = turnToward(a.aim, a.guard, dt * 3);
    if (Math.hypot(a.vx, a.vy) < 12) a.facing = turnToward(a.facing, a.guard, dt * 3.4);
  }
}
// 移开目光：不是「不吃伤害」，是不再让枪口对着那个方向
function updateAgent(game, a, dt) {
  if (a.down || a.extracted || a.taken) return;
  a.aversion = Math.max(0, a.aversion - dt);
  updateAgentInner(game, a, dt);
  // 最后一锤：不管这一帧里身体怎么走，腰拧出去的角度都不超过 1.2。
  // 亲手带的人例外——光标指哪打哪；被要求「移开目光」时也例外，那是真的把头转开。
  if (game.possessed !== a && a.aversion <= 0) {
    const tw = shortAngle(a.aim - a.facing);
    if (Math.abs(tw) > TWIST_MAX) a.aim = a.facing + Math.sign(tw) * TWIST_MAX;
  }
  if (a.aversion > 0 && !a.down) {
    a.aim = turnToward(a.aim, a.avertAngle, dt * 10);
    if (!a.order || a.order.kind !== 'focus') a.pose = 'carry';
  }
}

// ---- the things in the dark ----------------------------------------------

function stepPath(game, t, x, y, dt, speed) {
  if (!t.path || game.clock - t.pathAt > 0.9) {
    t.path = findPath(game.level, t.x, t.y, x, y);
    t.pathAt = game.clock;
  }
  const wp = t.path && t.path[0];
  if (!wp) return;
  const dx = wp.x - t.x;
  const dy = wp.y - t.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) {
    t.path.shift();
    return;
  }
  const nx = t.x + (dx / dist) * speed * dt;
  const ny = t.y + (dy / dist) * speed * dt;
  if (!solid(nx, ny, 10)) {
    t.x = nx;
    t.y = ny;
  } else if (!solid(nx, t.y, 10)) {
    t.x = nx;
  } else if (!solid(t.x, ny, 10)) {
    t.y = ny;
  } else {
    t.path = null;
  }
  t.aim = Math.atan2(dy, dx);
  t.step += speed * dt * 0.06;
}

function hurtAgent(game, target, damage, t) {
  target.hp -= damage;
  target.flash = 1;
  game.shake = 6;
  game.sound.hurt();
  if (target.hp <= 0) {
    target.hp = 0;
    target.down = true;
    target.revive = 0;
    target.charmed = false;
    game.log('down', target.role);
    if (t) {
      t.feed = HACHI.feed;
      if (t.kind === 'hachi') t.withdraw = 10;
    }
  }
}

function updateHachi(game, t, dt) {
  t.appear = Math.max(0, (t.appear || 0) - dt);
  if (t.dormant) return;
  // 抓到一个就退开：她不是要打一场，是要让队伍知道她来过。退开也给了救人的时间。
  if (t.withdraw > 0) {
    t.withdraw = Math.max(0, t.withdraw - dt);
    t.hitFlash = Math.max(0, t.hitFlash - dt * 3);
    let cx = 0;
    let cy = 0;
    let n = 0;
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) continue;
      cx += a.x;
      cy += a.y;
      n += 1;
    }
    if (n) {
      cx /= n;
      cy /= n;
      const ang = Math.atan2(t.y - cy, t.x - cx);
      stepPath(game, t, t.x + Math.cos(ang) * 260, t.y + Math.sin(ang) * 260, dt, Math.max(38, t.speed * 0.7));
      t.aim = ang;
    }
    return;
  }
  if (t.stun > 0) {
    t.stun = Math.max(0, t.stun - dt);
    return;
  }
  if (t.feed > 0) {
    t.feed = Math.max(0, t.feed - dt);
    t.step += dt * 0.5;
    return;
  }
  t.cooldown = Math.max(0, t.cooldown - dt);
  t.hitFlash = Math.max(0, t.hitFlash - dt * 3);
  let target = null;
  let best = Infinity;
  for (const a of game.agents) {
    if (a.down || a.taken || a.extracted) continue;
    const d = Math.hypot(a.x - t.x, a.y - t.y);
    if (d < best && lineClear(t.x, t.y, a.x, a.y, 4)) {
      best = d;
      target = a;
    }
  }
  if (!target) {
    // nobody in sight: she keeps walking the corridor, toward the last place she heard someone
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) continue;
      const d = Math.hypot(a.x - t.x, a.y - t.y);
      if (d < best) {
        best = d;
        target = a;
      }
    }
  }
  if (!target) return;
  if (best > t.reach) {
    stepPath(game, t, target.x, target.y, dt, t.speed);
  } else if (t.cooldown <= 0) {
    t.cooldown = t.cooldownMax;
    hurtAgent(game, target, t.damage, t);
  }
}

function updateMirror(game, t, dt) {
  t.cooldown = Math.max(0, t.cooldown - dt);
  t.hitFlash = Math.max(0, t.hitFlash - dt * 3);
  t.recoil = Math.max(0, t.recoil - dt * 6);
  let target = null;
  let best = Infinity;
  for (const a of game.agents) {
    if (a.down || a.taken || a.extracted) continue;
    const d = Math.hypot(a.x - t.x, a.y - t.y);
    if (d < best && lineClear(t.x, t.y, a.x, a.y, 4)) {
      best = d;
      target = a;
    }
  }
  const post = t.post;
  const fromPost = post ? Math.hypot(t.x - post.x, t.y - post.y) : 0;
  // 守门的不打远处的人：只在自家门口这一段开枪，走廊另一头走过去是可以的。楼梯间也不打。
  const canShoot = (!post || (best < (t.leash || MIRROR.leash) + 60 && fromPost < (t.leash || MIRROR.leash) + 40))
    && !(target && inZone(game.case.zones.stair, target.x, target.y));
  if (t.racing) {
    // 抢门：它也知道这扇门是对的。你不先把它按下去，它就先进去了。
    const door = game.case.doors[t.raceDoor];
    const stand = { x: door.x + door.nx * 26, y: door.y + door.ny * 26 };
    stepPath(game, t, stand.x, stand.y, dt, t.speed * 1.15);
    moveMirrorBody(game, t, dt);
    if (Math.hypot(t.x - stand.x, t.y - stand.y) < 24) {
      game.copyThrough?.();
    }
    if (canShoot && t.cooldown <= 0 && best < t.range && lineClear(t.x, t.y, target.x, target.y, 4)) {
      shootMirror(game, t, target);
    }
    return;
  }
  if (target) {    t.aim = Math.atan2(target.y - t.y, target.x - t.x);
    // 守门：出了自己那一段就不追了；回岗位比追人重要。
    const chase = !post || fromPost < (t.leash || MIRROR.leash);
    if (chase && best > 150) stepPath(game, t, target.x, target.y, dt, t.speed);
    else if (chase && best < 90) {
      const away = Math.atan2(t.y - target.y, t.x - target.x);
      const bx = t.x + Math.cos(away) * 70;
      const by = t.y + Math.sin(away) * 70;
      if (!solid(bx, by, 10)) {
        t.x += (bx - t.x) * dt * 2;
        t.y += (by - t.y) * dt * 2;
      }
    } else if (!chase && post) {
      stepPath(game, t, post.x, post.y, dt, t.speed);
    }
    moveMirrorBody(game, t, dt);
    if (canShoot && t.cooldown <= 0 && best < t.range && lineClear(t.x, t.y, target.x, target.y, 4)) {
      shootMirror(game, t, target);
    }
    return;
  }
  // 没人可打的时候，它照着你刚才的走法走：队长的脚印是它的路线。
  if (post && t.leash !== Infinity && fromPost > t.leash) {
    stepPath(game, t, post.x, post.y, dt, t.speed * 0.8);
    moveMirrorBody(game, t, dt);
    return;
  }
  const trail = game.trail || [];
  const lag = t.lag || 2;
  for (let i = trail.length - 1; i >= 0; i -= 1) {
    const p = trail[i];
    if (game.clock - p.t >= lag) {
      const d = Math.hypot(p.x - t.x, p.y - t.y);
      if (post && Math.hypot(p.x - post.x, p.y - post.y) > (t.leash || MIRROR.leash)) {
        stepPath(game, t, post.x, post.y, dt, t.speed * 0.8);
      } else if (d > 14) {
        stepPath(game, t, p.x, p.y, dt, Math.min(t.speed, d * 2.2));
      }
      moveMirrorBody(game, t, dt);
      return;
    }
  }
  if (post) stepPath(game, t, post.x, post.y, dt, t.speed * 0.8);
  moveMirrorBody(game, t, dt);
}

// 复制品也要有朝向和步态，否则永远是同一个姿势滑过去。
function moveMirrorBody(game, t, dt) {
  const px = t._mx ?? t.x;
  const py = t._my ?? t.y;
  t.vx = (t.x - px) / Math.max(dt, 1e-4);
  t.vy = (t.y - py) / Math.max(dt, 1e-4);
  t._mx = t.x;
  t._my = t.y;
  if (Math.hypot(t.vx, t.vy) > 14) t.facing = turnToward(t.facing, Math.atan2(t.vy, t.vx), dt * 4.8);
}

function shootMirror(game, t, target) {
  t.cooldown = t.fireRate;
  t.recoil = 1;
  const spread = (Math.random() - 0.5) * t.spread * 2;
  const angle = t.aim + spread;
  game.bullets.push({
    x: t.x + Math.cos(angle) * 26,
    y: t.y + Math.sin(angle) * 26,
    vx: Math.cos(angle) * TUNING.bulletSpeed * 0.7,
    vy: Math.sin(angle) * TUNING.bulletSpeed * 0.7,
    life: 0.9,
    damage: t.damage,
    team: 'enemy',
    from: t.id,
  });
  game.muzzle.push({ x: t.x + Math.cos(angle) * 28, y: t.y + Math.sin(angle) * 28, life: 0.06, cold: true });
  game.sound.shot('rookie', t.x, t.y);
}

function updateThrall(game, t, dt) {
  if (t.dead) {
    // 倒下的那半秒还在演：跪落 / 栽倒，演完才散小蜘蛛、才留残渣。
    if (t.death && t.death.t > 0) {
      t.death.t = Math.max(0, t.death.t - dt);
      if (t.death.t <= 0) {
        if (t.death.kind === 'kneel') spawnSpiderlings(game, t.x, t.y);
        else if (t.death.kind === 'fall') game.debris.push({ x: t.x, y: t.y, rot: t.aim + Math.PI / 2 });
        t.death.done = true;
      }
    }
    return;
  }
  if (t.kind === 'spider' && (t.rise || 0) < 1) {
    // 从台口地板下立起来：起身这一段不动也不打。
    t.rise = Math.min(1, (t.rise || 0) + dt / 0.9);
    t.step += dt * 0.8;
    return;
  }
  // 信号枪点着了：烧三秒，火自己会把人烧死
  if (t.burn > 0) {
    t.burn = Math.max(0, t.burn - dt);
    t.hp -= dt * 1.8;
    t.hitFlash = Math.max(t.hitFlash || 0, 0.12);
    if (t.hp <= 0) {
      t.hp = 0;
      t.dead = true;
      game.kills += 1;
      game.shake = Math.max(game.shake, 3);
      game.sound.kill();
      if (t.kind === 'spider') t.death = { kind: 'kneel', t: 0.45, dur: 0.45 };
      else if (t.kind === 'thrall') t.death = { kind: 'fall', t: 0.55, dur: 0.55 };
      maybeDrop(game, t);
      return;
    }
  }
  if (t.kind === 'hachi') {
    updateHachi(game, t, dt);
    return;
  }
  if (t.kind === 'kune') {
    t.step += dt * 0.6;
    t.sway = (t.sway || 0) + dt * (0.6 + (t.agitation || 0) * 3);
    t.agitation = Math.max(0, (t.agitation || 0) - dt);
    // 大的那只会一直往人身上挪：走得慢，但不停；被看得越久，越快。
    if (t.hunt) {
      const heat = Math.max(0, Math.min(1, t.hunt.heat || 0));
      const speed = t.hunt.speed + (t.hunt.gazeSpeed - t.hunt.speed) * heat;
      let cx = 0;
      let cy = 0;
      let n = 0;
      let gx = 0;
      let gy = 0;
      let gn = 0;
      for (const a of game.agents) {
        if (a.down || a.taken || a.extracted) continue;
        cx += a.x;
        cy += a.y;
        n += 1;
        // 她不是跟着人走，是往「人要去的那个地方」走：拦在下一步前面。
        if (a.order && a.order.kind === 'goto') {
          gx += a.order.x;
          gy += a.order.y;
          gn += 1;
        }
      }
      if (n) {
        cx /= n;
        cy /= n;
        const tx = gn ? gx / gn : cx;
        const ty = gn ? gy / gn : cy;
        const dx = tx - t.x;
        const dy = ty - t.y;
        const d = Math.hypot(dx, dy) || 1;
        let nearest = Infinity;
        for (const a of game.agents) {
          if (a.down || a.taken || a.extracted) continue;
          nearest = Math.min(nearest, Math.hypot(a.x - t.x, a.y - t.y));
        }
        t.aim = Math.atan2(dy, dx);
        if (nearest > t.hunt.standoff && d > 12) {
          const nx = t.x + (dx / d) * speed * dt;
          const ny = t.y + (dy / d) * speed * dt;
          if (!hardSolid(nx, ny, 26)) {
            t.x = nx;
            t.y = ny;
          } else if (!hardSolid(nx, t.y, 26)) {
            t.x = nx;
          } else if (!hardSolid(t.x, ny, 26)) {
            t.y = ny;
          }
          t.step += speed * dt * 0.08;
        }
      }
    }
    return;
  }
  if (t.kind === 'mirror') {
    updateMirror(game, t, dt);
    return;
  }
  if (t.stun > 0) {
    t.stun = Math.max(0, t.stun - dt);
    return;
  }
  t.cooldown = Math.max(0, t.cooldown - dt);
  t.hitFlash = Math.max(0, t.hitFlash - dt * 3);
  t.step += dt * 3;

  let target = null;
  let bestDist = 460;
  for (const a of game.agents) {
    if (a.down || a.taken || a.extracted) continue;
    const d = Math.hypot(a.x - t.x, a.y - t.y);
    if (d < bestDist && lineClear(t.x, t.y, a.x, a.y, 4)) {
      target = a;
      bestDist = d;
    }
  }

  if (target) {
    t.aim = Math.atan2(target.y - t.y, target.x - t.x);
    if (t.kind === 'thrall') {
      if (t.rushCd > 0) t.rushCd -= dt;
      if (t.charge > 0) {
        // winding up: a red light, and it does not move
        t.charge -= dt;
        if (t.charge <= 0) {
          t.charge = 0;
          t.rush = 0.5;
        }
        return;
      }
      if (t.rush > 0) {
        t.rush -= dt;
      } else if (bestDist < 250 && bestDist > 70 && (t.rushCd || 0) <= 0) {
        t.charge = 0.8;
        t.rushCd = 3.8;
        return;
      }
    }
    const rush = t.rush > 0 ? 3.4 : 1;
    if (bestDist > (t.reach || THRALL.reach)) {
      const dx = (target.x - t.x) / bestDist;
      const dy = (target.y - t.y) / bestDist;
      const nx = t.x + dx * t.speed * rush * dt;
      const ny = t.y + dy * t.speed * rush * dt;
      if (!solid(nx, ny, 10)) {
        t.x = nx;
        t.y = ny;
      }
    } else if (t.cooldown <= 0) {
      t.cooldown = t.cooldownMax || THRALL.cooldown;
      hurtAgent(game, target, t.damage || THRALL.damage, null);
      // the broadcast: static arcs off the set onto everyone standing close
      if (t.kind !== 'spiderling') {
        for (const other of game.agents) {
          if (other === target || other.down || other.taken || other.extracted) continue;
          if (Math.hypot(other.x - t.x, other.y - t.y) < THRALL.special.range) {
            other.hp -= 2;
            other.flash = Math.max(other.flash, 0.8);
          }
        }
      }
    }
    return;
  }

  // wander: no one to reach, so drift and turn
  t.wanderClock -= dt;
  if (t.wanderClock <= 0) {
    t.wanderClock = 1.4 + Math.random() * 2;
    t.wander = Math.random() * Math.PI * 2;
  }
  // the set faces where the body is drifting, not where it last saw someone
  t.aim += Math.atan2(Math.sin(t.wander - t.aim), Math.cos(t.wander - t.aim)) * Math.min(1, dt * 4);
  const nx = t.x + Math.cos(t.wander) * t.speed * 0.4 * dt;
  const ny = t.y + Math.sin(t.wander) * t.speed * 0.4 * dt;
  if (!solid(nx, ny, 10)) {
    t.x = nx;
    t.y = ny;
  } else {
    t.wander += Math.PI * 0.6;
  }
}

// ---- rounds and the tick --------------------------------------------------

export function updateBullets(game, dt) {
  for (let i = game.bullets.length - 1; i >= 0; i -= 1) {
    const b = game.bullets[i];
    b.life -= dt;
    const nx = b.x + b.vx * dt;
    const ny = b.y + b.vy * dt;
    let hit = false;
    if (solid(nx, ny, 0)) hit = true;
    if (!hit && b.team === 'agent') {
      for (const t of game.thralls) {
        if (t.dead) continue;
        if (Math.hypot(t.x - nx, t.y - ny) < TUNING.bulletRadius + (t.radius || 13)) {
          hit = true;
          if (t.kind === 'kune') {
            // 子弹穿过去，只让它挥得更快
            t.agitation = 1.2;
            break;
          }
          if (t.armor) {
            t.stun = Math.max(t.stun, HACHI.stunOnHit);
            t.hitFlash = 1;
            game.sound.kill();
            break;
          }
          t.hp -= b.damage;
          t.hitFlash = 1;
          if (b.burn) t.burn = Math.max(t.burn || 0, b.burn);
          for (let k = 0; k < 4; k += 1) {
            game.spatter.push({
              x: nx,
              y: ny,
              vx: (Math.random() - 0.5) * 90 + b.vx * 0.04,
              vy: (Math.random() - 0.5) * 90 + b.vy * 0.04,
              life: 0.4 + Math.random() * 0.3,
            });
          }
          if (t.hp <= 0) {
            t.dead = true;
            game.kills += 1;
            game.shake = Math.max(game.shake, t.kind === 'spider' ? 10 : 3);
            game.sound.kill();
            // 死不是一瞬间的事：土蜘蛛先跪落，电视头先向前栽倒，然后才散/留残渣。
            if (t.kind === 'spider') t.death = { kind: 'kneel', t: 0.45, dur: 0.45 };
            else if (t.kind === 'thrall') t.death = { kind: 'fall', t: 0.55, dur: 0.55 };
            maybeDrop(game, t);
            for (let k = 0; k < 10; k += 1) {
              game.spatter.push({
                x: t.x,
                y: t.y,
                vx: (Math.random() - 0.5) * 160,
                vy: (Math.random() - 0.5) * 160,
                life: 0.5 + Math.random() * 0.6,
              });
            }
          }
          break;
        }
      }
    }
    if (!hit && b.team === 'enemy') {
      for (const a of game.agents) {
        if (a.down || a.taken || a.extracted) continue;
        if (Math.hypot(a.x - nx, a.y - ny) < TUNING.bulletRadius + 12) {
          hit = true;
          hurtAgent(game, a, b.damage, null);
          break;
        }
      }
    }
    b.x = nx;
    b.y = ny;
    if (hit || b.life <= 0) game.bullets.splice(i, 1);
  }
  for (let i = game.muzzle.length - 1; i >= 0; i -= 1) {
    game.muzzle[i].life -= dt;
    if (game.muzzle[i].life <= 0) game.muzzle.splice(i, 1);
  }
}

// ---- 掉落 -----------------------------------------------------------------
// 敌人死的时候，地上留下一点东西：灯油、弹药、余烬，或者案子自己的道具。
function maybeDrop(game, t) {
  if (t.kind === 'mirror' || t.kind === 'hachi' || t.kind === 'kune' || t.kind === 'spiderling') return;
  if (!game.drops) game.drops = [];
  const r = Math.random();
  let kind = null;
  if (r < DROPS.oil) kind = 'oil';
  else if (r < DROPS.oil + DROPS.ammo) kind = 'ammo';
  else if (r < DROPS.oil + DROPS.ammo + DROPS.ember) kind = 'ember';
  else if (r < DROPS.oil + DROPS.ammo + DROPS.ember + DROPS.part) kind = 'part';
  else if (r < DROPS.oil + DROPS.ammo + DROPS.ember + DROPS.part + DROPS.scrap) kind = 'scrap';
  else if (r < DROPS.oil + DROPS.ammo + DROPS.ember + DROPS.part + DROPS.scrap + DROPS.item) {
    const rule = game.case.rule.kind;
    if (rule === 'timetable') kind = 'ticket';
    else if (rule === 'gaze') kind = 'match';
  }
  if (!kind) return;
  game.drops.push({
    x: t.x + (Math.random() - 0.5) * 10,
    y: t.y + (Math.random() - 0.5) * 10,
    kind,
    life: 28,
    at: game.clock,
  });
}

function applyDrop(game, a, d) {
  const gun = WEAPONS[a.weapon] || WEAPONS.rifle;
  game.picked = game.picked || { oil: 0, ammo: 0, ember: 0, item: 0 };
  if (d.kind === 'oil') {
    a.oil = Math.min(1, (a.oil === undefined ? 1 : a.oil) + 0.3);
    game.picked.oil += 1;
  } else if (d.kind === 'ammo') {
    a.reserve += gun.mag;
    game.picked.ammo += 1;
  } else if (d.kind === 'ember') {
    a.ember = 8;
    game.picked.ember += 1;
  } else if (d.kind === 'part') {
    game.parts = (game.parts || 0) + DROPS.partAmount;
    game.picked.part = (game.picked.part || 0) + 1;
  } else if (d.kind === 'scrap') {
    game.scrap = (game.scrap || 0) + DROPS.scrapAmount;
    game.picked.scrap = (game.picked.scrap || 0) + 1;
  } else if (d.kind === 'ticket') {
    a.ticket = true;
    game.picked.item += 1;
  } else if (d.kind === 'match') {
    game.matches = (game.matches || 0) + 1;
    game.picked.item += 1;
  }
  game.log('pickup', a.role, d.kind);
}

// 路过就捡：不按键，不读条。
function updateDrops(game, dt) {
  if (!game.drops || !game.drops.length) return;
  for (let i = game.drops.length - 1; i >= 0; i -= 1) {
    const d = game.drops[i];
    d.life -= dt;
    if (d.life <= 0) {
      game.drops.splice(i, 1);
      continue;
    }
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) continue;
      if (Math.hypot(a.x - d.x, a.y - d.y) > 16) continue;
      applyDrop(game, a, d);
      game.drops.splice(i, 1);
      break;
    }
  }
}

export function updateUnits(game, dt) {
  for (const a of game.agents) updateAgent(game, a, dt);
  for (const t of game.thralls) updateThrall(game, t, dt);
  updateBullets(game, dt);
  updateDrops(game, dt);

  // 队长走过的路留一串脚印：复制品照这个走，晚两三秒。
  game.trailClock = (game.trailClock || 0) + dt;
  if (game.trailClock > 0.18) {
    game.trailClock = 0;
    if (!game.trail) game.trail = [];
    const v = game.agents[0];
    if (v && !v.down && !v.taken && !v.extracted) {
      game.trail.push({ x: v.x, y: v.y, t: game.clock });
      if (game.trail.length > 90) game.trail.shift();
    }
  }

  // 被推挤/刷新进墙里的东西不会再自己走回来，也没人打得到它。半秒还没脱身就放回空地。
  for (const t of game.thralls) {
    if (t.dead || t.kind === 'kune') continue;
    if (solid(t.x, t.y, 9)) {
      t.stuckT = (t.stuckT || 0) + dt;
      if (t.stuckT > 0.5) {
        const s = freeSpot(t.x, t.y, 9);
        t.x = s.x;
        t.y = s.y;
        t.path = null;
        t.stuckT = 0;
      }
    } else {
      t.stuckT = 0;
    }
  }

  // cloth: a hem lags behind whatever the body just did
  for (const body of [...game.agents, ...game.thralls]) {
    if (body.dead) continue;
    const px = body._px ?? body.x;
    const py = body._py ?? body.y;
    const vx = body.x - px;
    const vy = body.y - py;
    if (!body.cloth) body.cloth = { x: 0, y: 0, sway: 0 };
    const targetX = Math.max(-6, Math.min(6, -vx * 5));
    const targetY = Math.max(-6, Math.min(6, -vy * 5));
    const k = Math.min(1, dt * 7);
    body.cloth.x += (targetX - body.cloth.x) * k;
    body.cloth.y += (targetY - body.cloth.y) * k;
    body.cloth.sway = Math.sin(body.step) * 1.2;
    body._px = body.x;
    body._py = body.y;
  }

  // bodies have volume: nothing stands inside anything else
  const bodies = [
    ...game.agents.filter((a) => !a.down && !a.taken && !a.extracted),
    ...game.thralls.filter((t) => !t.dead && t.kind !== 'kune'),
  ];
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = 26;
      if (d > 0.001 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        if (!solid(a.x - ux * push, a.y - uy * push, TUNING.agentRadius)) {
          a.x -= ux * push;
          a.y -= uy * push;
        }
        if (!solid(b.x + ux * push, b.y + uy * push, TUNING.agentRadius)) {
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }
  }

  for (let i = game.spatter.length - 1; i >= 0; i -= 1) {
    const s = game.spatter[i];
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 0.92;
    s.vy *= 0.92;
    if (s.life <= 0) game.spatter.splice(i, 1);
  }
}
