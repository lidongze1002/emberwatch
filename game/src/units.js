// 场上的人：三个自己拿主意的队员，和这一案里的东西。玩家只下目标；每一步、每个目标、
// 每次后退，都是队员自己判断的。案子不同，这里的「东西」不同，但骨架是同一套。

import { AGENTS, HACHI, KUNE, MIRROR, SPIDER, SPIDERLING, THRALL, TUNING } from './config.js';
import { findPath, lineClear, solid, walkClear } from './level.js';

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
    });
    game.thralls.push(t);
    game.shake = 6;
    return t;
  }
  if (boss.kind === 'kunekune') {
    const t = kune(boss.x, boss.y, boss.size || 1.9, 'big');
    game.thralls.push(t);
    return t;
  }
  return null;
}

// 她死的时候从裙下散出三只蜘蛛子：不清理干净就不算清场
function spawnSpiderlings(game, x, y) {
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    game.thralls.push(baseBody(x + Math.cos(a) * 26, y + Math.sin(a) * 26, {
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
    game.thralls.push(baseBody(s.x, s.y, {
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
      flash: 0,
      cooldown: 0.6 + Math.random(),
    }));
  }
}

export function createAgents(game) {
  return game.case.spawns.agents.map((spot, i) => {
    const spec = AGENTS[spot.role];
    return {
      id: `a${i}`,
      role: spot.role,
      x: spot.x,
      y: spot.y,
      hp: spec.hp,
      maxHp: spec.hp,
      speed: spec.speed,
      range: spec.range,
      damage: spec.damage,
      fireRate: spec.fireRate,
      spread: spec.spread,
      colour: spec.colour,
      aim: -Math.PI / 2,
      facing: -Math.PI / 2,
      vx: 0,
      vy: 0,
      recoil: 0,
      pose: 'carry',
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
  let best = null;
  let bestDist = 300;
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

function walkTo(game, a, x, y, dt) {
  const now = game.clock;
  const r = TUNING.agentRadius;
  const goalMoved = !a.goal || Math.hypot(a.goal.x - x, a.goal.y - y) > 22;
  if (!a.path || goalMoved || now - a.pathAt > 1.4) {
    a.path = findPath(game.level, a.x, a.y, x, y);
    a.pathAt = now;
    a.goal = { x, y };
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
  const speed = a.speed * braking;
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

function fire(game, a, target) {
  if (a.cooldown > 0 || a.aversion > 0) return;
  const dist = Math.hypot(target.x - a.x, target.y - a.y);
  if (dist > a.range || !lineClear(a.x, a.y, target.x, target.y, 4)) return;
  a.cooldown = a.fireRate;
  a.recoil = 1;
  a.aim = Math.atan2(target.y - a.y, target.x - a.x);
  const spread = (Math.random() - 0.5) * a.spread * 2;
  const angle = a.aim + spread;
  game.bullets.push({
    x: a.x + Math.cos(angle) * 26,
    y: a.y + Math.sin(angle) * 26,
    vx: Math.cos(angle) * TUNING.bulletSpeed,
    vy: Math.sin(angle) * TUNING.bulletSpeed,
    life: 0.9,
    damage: a.damage,
    team: 'agent',
  });
  game.muzzle.push({ x: a.x + Math.cos(angle) * 28, y: a.y + Math.sin(angle) * 28, life: 0.06 });
  game.sound.shot(a.role, a.x, a.y);
}

function updateAgentInner(game, a, dt) {
  if (a.down || a.extracted || a.taken) return;
  a.cooldown = Math.max(0, a.cooldown - dt);
  a.flash = Math.max(0, a.flash - dt * 4);
  a.recoil = Math.max(0, a.recoil - dt * 6);
  // the body always faces where it is going; the weapon faces what it is on
  if (Math.hypot(a.vx, a.vy) < 12) {
    a.facing = turnToward(a.facing, a.aim, dt * 3.4);
  }
  a.pose = a.state === 'fighting' || a.order.kind === 'focus' ? 'ready' : 'carry';
  // with nothing to shoot, the weapon — and the torch on it — follows the walk, not the last target
  const engaged = a.state === 'fighting' || a.order.kind === 'focus';
  if (!engaged && a.aversion <= 0) a.aim = turnToward(a.aim, a.facing, dt * 7);

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
    if (game.input.down) fire(game, a, { x: game.input.x, y: game.input.y });
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
      game.log(`${a.role} walked onto the stage.`);
    }
    return;
  }

  // objectives first: a door, the switchboard, the exit, a point you clicked
  if (a.order.kind === 'goto') {
    a.state = 'moving';
    const target = nearestThrall(game, a, 190);
    if (target) fire(game, a, target);
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
        mate.revive += dt * (a.role === 'rookie' ? 1.6 : 1);
        if (mate.revive >= TUNING.reviveSeconds) {
          mate.down = false;
          mate.revive = 0;
          mate.hp = Math.max(2, Math.round(mate.maxHp * 0.35));
          game.log(`${mate.role} is back on their feet.`);
          a.order = { kind: 'hold' };
        }
      }
      return;
    }
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
    a.aim = Math.atan2(target.y - a.y, target.x - a.x);
    const dist = Math.hypot(target.x - a.x, target.y - a.y);
    const want = Math.min(a.range * 0.72, 200);
    const visible = lineClear(a.x, a.y, target.x, target.y, 4);
    if (!visible) {
      // no line: close the distance and let the path find the door
      walkTo(game, a, target.x, target.y, dt);
    } else if (dist < 120) {
      // too close: back off while firing, the way a person with a rifle would
      const away = Math.atan2(a.y - target.y, a.x - target.x);
      const bx = a.x + Math.cos(away) * 90;
      const by = a.y + Math.sin(away) * 90;
      if (!solid(bx, by, TUNING.agentRadius)) walkTo(game, a, bx, by, dt);
    } else if (dist > want) {
      walkTo(game, a, target.x, target.y, dt);
    } else {
      a.path = null;
    }
    fire(game, a, target);
    return;
  }

  const mate = nearestDowned(game, a);
  if (mate) {
    a.order = { kind: 'revive', mate };
    a.state = 'moving';
    return;
  }

  a.state = 'idle';
  a.path = null;
}

// 移开目光：不是「不吃伤害」，是不再让枪口对着那个方向
function updateAgent(game, a, dt) {
  if (a.down || a.extracted || a.taken) return;
  a.aversion = Math.max(0, a.aversion - dt);
  updateAgentInner(game, a, dt);
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
    game.log(`${target.role} is down.`);
    if (t) t.feed = HACHI.feed;
  }
}

function updateHachi(game, t, dt) {
  if (t.dormant) return;
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
  if (!target) return;
  t.aim = Math.atan2(target.y - t.y, target.x - t.x);
  if (best > 150) {
    stepPath(game, t, target.x, target.y, dt, t.speed);
  } else if (best < 90) {
    const away = Math.atan2(t.y - target.y, t.x - target.x);
    const bx = t.x + Math.cos(away) * 70;
    const by = t.y + Math.sin(away) * 70;
    if (!solid(bx, by, 10)) {
      t.x += (bx - t.x) * dt * 2;
      t.y += (by - t.y) * dt * 2;
    }
  }
  if (t.cooldown <= 0 && best < t.range && lineClear(t.x, t.y, target.x, target.y, 4)) {
    t.cooldown = t.fireRate;
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
    });
    game.muzzle.push({ x: t.x + Math.cos(angle) * 28, y: t.y + Math.sin(angle) * 28, life: 0.06, cold: true });
    game.sound.shot('rookie', t.x, t.y);
  }
}

function updateThrall(game, t, dt) {
  if (t.dead) return;
  if (t.kind === 'hachi') {
    updateHachi(game, t, dt);
    return;
  }
  if (t.kind === 'kune') {
    t.step += dt * 0.6;
    t.sway = (t.sway || 0) + dt * (0.6 + (t.agitation || 0) * 3);
    t.agitation = Math.max(0, (t.agitation || 0) - dt);
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
            if (t.kind === 'spider') spawnSpiderlings(game, t.x, t.y);
            if (t.kind === 'thrall') game.debris.push({ x: t.x, y: t.y, rot: Math.random() * 6.28 });
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

export function updateUnits(game, dt) {
  for (const a of game.agents) updateAgent(game, a, dt);
  for (const t of game.thralls) updateThrall(game, t, dt);
  updateBullets(game, dt);

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
