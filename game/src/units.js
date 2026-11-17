// The people on the floor: three agents who decide for themselves, the things in the seats, and
// the rounds in the air. The player gives objectives; every step, target and retreat here is the
// agent's own call.

import { AGENTS, SPAWNS, THRALL, TUNING, ZONES } from './config.js';
import { findPath, lineClear, solid, walkClear } from './level.js';

const inZone = (zone, x, y) => x > zone.x && x < zone.x + zone.w && y > zone.y && y < zone.y + zone.h;

export function createAgents() {
  return SPAWNS.agents.map((spot, i) => {
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
    };
  });
}

export function createThralls() {
  return SPAWNS.thralls.map((spot, i) => ({
    id: `t${i}`,
    kind: 'thrall',
    x: spot.x,
    y: spot.y,
    hp: THRALL.hp,
    maxHp: THRALL.hp,
    speed: THRALL.speed,
    cooldown: 0,
    hitFlash: 0,
    dead: false,
    aim: Math.PI / 2,
    wander: Math.random() * Math.PI * 2,
    wanderClock: 0,
    stun: 0,
    step: Math.random() * 10,
  }));
}

// ---- agents ---------------------------------------------------------------

function nearestThrall(game, a, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const t of game.thralls) {
    if (t.dead) continue;
    const d = Math.hypot(t.x - a.x, t.y - a.y);
    if (d < bestDist && lineClear(a.x, a.y, t.x, t.y, 4)) {
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

function walkTo(game, a, x, y, dt) {
  const now = game.clock;
  const r = TUNING.agentRadius;
  if (!a.path || now - a.pathAt > 0.6) {
    a.path = findPath(game.level, a.x, a.y, x, y);
    a.pathAt = now;
  }
  const step = a.path && a.path[0];
  if (!step) {
    a.state = 'idle';
    return true;
  }
  // a waypoint the body cannot walk to is a waypoint to throw away and re-path from
  if (!walkClear(a.x, a.y, step.x, step.y, r)) {
    a.path = findPath(game.level, a.x, a.y, a.order.kind === 'goto' ? a.order.x : step.x, a.order.kind === 'goto' ? a.order.y : step.y);
    a.pathAt = now;
    return false;
  }
  const dx = step.x - a.x;
  const dy = step.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) {
    a.path.shift();
    return !a.path.length;
  }
  const nx = a.x + (dx / dist) * a.speed * dt;
  const ny = a.y + (dy / dist) * a.speed * dt;
  if (!solid(nx, ny, r)) {
    a.x = nx;
    a.y = ny;
  } else if (!solid(a.x, ny, r)) {
    a.y = ny;
  } else if (!solid(nx, a.y, r)) {
    a.x = nx;
  } else {
    a.path = null;
    return false;
  }
  a.step += dt * 6;
  return false;
}

function fire(game, a, target) {
  if (a.cooldown > 0) return;
  const dist = Math.hypot(target.x - a.x, target.y - a.y);
  if (dist > a.range || !lineClear(a.x, a.y, target.x, target.y, 4)) return;
  a.cooldown = a.fireRate;
  a.aim = Math.atan2(target.y - a.y, target.x - a.x);
  const spread = (Math.random() - 0.5) * a.spread * 2;
  const angle = a.aim + spread;
  game.bullets.push({
    x: a.x + Math.cos(angle) * 16,
    y: a.y + Math.sin(angle) * 16,
    vx: Math.cos(angle) * TUNING.bulletSpeed,
    vy: Math.sin(angle) * TUNING.bulletSpeed,
    life: 0.9,
    damage: a.damage,
    team: 'agent',
  });
  game.muzzle.push({ x: a.x + Math.cos(angle) * 18, y: a.y + Math.sin(angle) * 18, life: 0.06 });
  game.sound.shot(a.role);
}

function updateAgent(game, a, dt) {
  if (a.down || a.extracted || a.taken) return;
  a.cooldown = Math.max(0, a.cooldown - dt);
  a.flash = Math.max(0, a.flash - dt * 4);

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

  // the legend: three seconds of aria and the agent belongs to the house
  if (inZone(ZONES.house, a.x, a.y) && game.power) {
    a.charm += dt;
    if (a.charm >= TUNING.charmSeconds) a.charmed = true;
  } else if (!a.charmed) {
    a.charm = Math.max(0, a.charm - dt * 2);
  }
  if (!game.power) {
    a.charmed = false;
    a.charm = 0;
  }

  if (a.charmed) {
    a.state = 'charmed';
    const reached = walkTo(game, a, SPAWNS.stageMark.x, SPAWNS.stageMark.y, dt);
    if (reached || Math.hypot(a.x - SPAWNS.stageMark.x, a.y - SPAWNS.stageMark.y) < 30) {
      a.taken = true;
      game.log(`${L_NAME(a)} walked onto the stage.`);
    }
    return;
  }

  // objectives first: the switchboard, the exit, a point you clicked
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
          game.log(`${L_NAME(mate)} is back on their feet.`);
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
    walkTo(game, a, SPAWNS.exit.x, SPAWNS.exit.y, dt);
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

  a.state = a.order.kind === 'focus' ? 'idle' : 'idle';
  a.path = null;
}

function L_NAME(a) {
  return a.role;
}

// ---- thralls --------------------------------------------------------------

function updateThrall(game, t, dt) {
  if (t.dead) return;
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
    if (bestDist > THRALL.reach) {
      const dx = (target.x - t.x) / bestDist;
      const dy = (target.y - t.y) / bestDist;
      const nx = t.x + dx * t.speed * dt;
      const ny = t.y + dy * t.speed * dt;
      if (!solid(nx, ny, 10)) {
        t.x = nx;
        t.y = ny;
      }
    } else if (t.cooldown <= 0) {
      t.cooldown = THRALL.cooldown;
      target.hp -= THRALL.damage;
      target.flash = 1;
      game.shake = 6;
      game.sound.hurt();
      if (target.hp <= 0) {
        target.hp = 0;
        target.down = true;
        target.revive = 0;
        target.charmed = false;
        game.log(`${L_NAME(target)} is down.`);
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
        if (Math.hypot(t.x - nx, t.y - ny) < TUNING.bulletRadius + 13) {
          t.hp -= b.damage;
          t.hitFlash = 1;
          hit = true;
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
            game.shake = Math.max(game.shake, 3);
            game.sound.kill();
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

  // bodies have volume: nothing stands inside anything else
  const bodies = [
    ...game.agents.filter((a) => !a.down && !a.taken && !a.extracted),
    ...game.thralls.filter((t) => !t.dead),
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
