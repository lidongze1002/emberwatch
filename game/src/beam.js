// The beam: one cone from the lamp, a little smoothing so the aim feels alive, and the one
// damage rule in the game. Light is applied per second, falls off at the far edge, slows
// everything it holds, and is doubled and widened for the length of an Overdrive.

import { LAMP, PALETTE, TUNING } from './config.js';

export function createBeam() {
  return {
    angle: Math.PI / 2,
    target: Math.PI / 2,
    halfAngle: TUNING.beam.halfAngle,
    reach: TUNING.beam.reach,
    power: 1,
  };
}

export function wrapAngle(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export function aimAt(beam, x, y) {
  const dx = x - LAMP.x;
  const dy = y - LAMP.y;
  if (Math.hypot(dx, dy) > 6) beam.target = Math.atan2(dy, dx);
}

// The cone as the renderer needs it: same numbers the damage used, so what is lit is what is
// drawn as lit.
export function beamShape(game) {
  const overdrive = game.odTimer > 0;
  const fog = game.weather === 'fog' ? TUNING.weather.fogReach : 1;
  return {
    angle: game.beam.angle,
    half: game.stats.halfAngle * (overdrive ? TUNING.overdriveCone : 1),
    reach: game.stats.reach * fog,
    overdrive,
    out: game.lampOut > 0,
    power: game.lampPower ?? 1,
  };
}

export function updateBeam(game, dt) {
  const beam = game.beam;
  const overdrive = game.odTimer > 0;
  beam.halfAngle = game.stats.halfAngle * (overdrive ? TUNING.overdriveCone : 1);
  const fog = game.weather === 'fog' ? TUNING.weather.fogReach : 1;
  beam.reach = game.stats.reach * fog;
  beam.power = overdrive ? 1.7 : 1;

  // aim: fast enough to feel direct, smoothed just enough to take the jitter out of a mouse
  const diff = wrapAngle(beam.target - beam.angle);
  beam.angle = wrapAngle(beam.angle + diff * Math.min(1, dt * 26));

  // when the lamp drops out there is no light to do any of this with
  if (game.lampOut > 0) {
    for (const e of game.shadows) if (e.lit) e.lit = false;
    return { lit: 0, hits: 0, nearest: null };
  }

  const dps = game.stats.dps * (overdrive ? TUNING.overdriveDamage : 1);
  const reach = beam.reach;
  let lit = 0;
  let hits = 0;
  let nearest = null;

  for (const e of game.shadows) {
    e.lit = false;
    const dx = e.x - LAMP.x;
    const dy = e.y - LAMP.y;
    const dist = Math.hypot(dx, dy);
    if (dist > reach + e.radius) continue;
    const delta = Math.abs(wrapAngle(Math.atan2(dy, dx) - beam.angle));
    // A body's own width widens its slice of the cone, so a bulwark at the edge is lit by its
    // edge rather than by its centre point.
    const pad = Math.atan2(e.radius * 0.7, Math.max(50, dist));
    if (delta > beam.halfAngle + pad) continue;

    e.lit = true;
    e.litTime += dt;
    lit += 1;
    if (!nearest || dist < nearest.dist) nearest = { e, dist };

    const armour = TUNING.armour[e.type] ?? 0;
    if (armour > 0 && e.litTime < armour) continue;

    const t = dist / reach;
    const fall = t <= TUNING.beam.falloffAt
      ? 1
      : 1 - ((t - TUNING.beam.falloffAt) / (1 - TUNING.beam.falloffAt)) * (1 - TUNING.beam.falloffFloor);
    let damage = dps * fall * dt;
    if (game.stats.focus && t > 0.6) damage *= 1.5;
    e.hp -= damage;
    hits += 1;
    if (e.flash < 0.42) e.flash = 0.42;
  }

  // A few sparks where the light is actually landing, not one per shadow per frame.
  game.sparkClock += dt;
  if (hits > 0 && game.sparkClock > 0.045) {
    game.sparkClock = 0;
    for (let i = 0; i < Math.min(3, hits); i += 1) {
      const e = game.shadows[(game.sparkSeed = (game.sparkSeed + 7) % Math.max(1, game.shadows.length))];
      if (!e || !e.lit) continue;
      const a = Math.atan2(e.y - LAMP.y, e.x - LAMP.x) + Math.PI;
      game.particles.sparks(e.x, e.y, 1, a, 1.8, 90, PALETTE.fire, 1.8);
    }
  }

  if (game.odTimer > 0) {
    game.odTimer = Math.max(0, game.odTimer - dt);
    if (game.odTimer === 0) game.flashScreen = Math.max(game.flashScreen, 0.06);
  }

  return { lit, hits, nearest };
}

export function canOverdrive(game) {
  return game.overdrive >= TUNING.overdriveMax && game.odTimer <= 0;
}

export function spendOverdrive(game) {
  if (!canOverdrive(game)) return false;
  game.overdrive = 0;
  game.odTimer = game.stats.odSeconds;
  game.flashScreen = 0.55;
  game.shake = Math.max(game.shake, 5);
  game.particles.sparks(LAMP.x, LAMP.y - 10, 14, -Math.PI / 2, Math.PI * 1.6, 180, PALETTE.fireHot, 2.2);
  return true;
}
