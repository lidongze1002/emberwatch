// The four screenshots, staged honestly: each scene starts from a seed, runs the real rules
// forward with a fixed autopilot, and stops. Nothing here draws a frame or changes a number
// the rules would not have changed; the staging — where the beam looks, when it gives up —
// is the only thing this file owns, and the game's own rules never know it exists.

import { LAMP } from './config.js';
import { aimAt } from './beam.js';

const STEP = 1 / 60;
const MAX_STEPS = 120000;
const SKY = Math.PI / 2;

function run(decide, until, cap = MAX_STEPS) {
  let steps = 0;
  while (steps < cap) {
    decide();
    steps += 1;
    if (until()) break;
  }
  return steps;
}

function litCount(game) {
  return game.shadows.reduce((sum, shadow) => sum + (shadow.lit && !shadow.dead ? 1 : 0), 0);
}

function nearest(game) {
  let best = Infinity;
  for (const shadow of game.shadows) {
    if (shadow.dead) continue;
    best = Math.min(best, Math.hypot(shadow.x - LAMP.x, shadow.y - LAMP.y));
  }
  return best;
}

// Aim at the densest knot of shadows and at the middle of that knot, so one cone holds several.
// Anything close to the cliff outranks everything else: that is what a person does with a mouse.
function steer(game) {
  let urgent = null;
  for (const shadow of game.shadows) {
    if (shadow.dead) continue;
    const dist = Math.hypot(shadow.x - LAMP.x, shadow.y - LAMP.y);
    if (dist < 200 && (!urgent || dist < urgent.dist)) urgent = { shadow, dist };
  }
  if (urgent) {
    aimAt(game.beam, urgent.shadow.x + urgent.shadow.vx * 0.12, urgent.shadow.y + urgent.shadow.vy * 0.12);
    return;
  }
  let best = null;
  let bestScore = -Infinity;
  for (const shadow of game.shadows) {
    if (shadow.dead) continue;
    let cluster = 0;
    for (const other of game.shadows) {
      if (other.dead) continue;
      if (Math.hypot(other.x - shadow.x, other.y - shadow.y) < 170) cluster += 1;
    }
    const dist = Math.hypot(shadow.x - LAMP.x, shadow.y - LAMP.y);
    const score = cluster * 90 - dist * 0.4 + (shadow.type === 'boss' ? 2000 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = shadow;
    }
  }
  if (!best) {
    game.beam.target = Math.PI / 2 + Math.sin(game.clock * 0.7) * 0.35;
    return;
  }
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const other of game.shadows) {
    if (other.dead) continue;
    if (Math.hypot(other.x - best.x, other.y - best.y) < 170) {
      sx += other.x;
      sy += other.y;
      n += 1;
    }
  }
  aimAt(game.beam, sx / Math.max(1, n) + best.vx * 0.3, sy / Math.max(1, n) + best.vy * 0.3);
}

function info(game, scene, steps, note = '') {
  window.__shotInfo = {
    scene,
    steps,
    note,
    state: game.state,
    wave: game.wave,
    hearts: game.hearts,
    score: game.score,
    lit: litCount(game),
    shadows: game.shadows.length,
    combo: game.combo,
    result: game.result,
    clock: Math.round(game.clock * 10) / 10,
    ready: true,
  };
}

function tick(game) {
  game.update(STEP);
}

function startScene(game) {
  const steps = run(() => tick(game), () => game.clock > 0.8);
  info(game, 'start', steps);
}

// One shadow is allowed through on purpose: the frame should show a tower that has already
// been hurt, because that is what the third wave of a real run looks like.
function huntSetup(game, attempt) {
  game.reset(17 + attempt * 977);
  game.startRun();
  game.autopilot = (g) => {
    if (g.hearts > 2) {
      g.beam.target = SKY;
      return;
    }
    steer(g);
    // a hand, not a turret: the beam sways a little, so shadows survive long enough to be seen
    g.beam.target += Math.sin(g.clock * 1.9) * 0.22;
  };
}

function huntPick(game) {
  if (game.state === 'upgrades') game.choose(0);
}

// How good a frame the live state would make: lit bodies, bodies still on the water, a combo
// that is actually running, and the tower already carrying a scar.
function frameQuality(game) {
  const lit = litCount(game);
  const alive = game.shadows.length;
  const near = nearest(game);
  let q = Math.min(lit, 4) * 12 + Math.min(alive, 8) * 7;
  if (lit >= 3) q += 14;
  if (alive >= 5) q += 10;
  if (game.combo > 0) q += 8;
  if (game.hearts === 2) q += 10;
  if (near > 140 && near < 340) q += 8;
  return q;
}

// Play waves three to five with the autopilot, remembering the step that would photograph best.
function huntScan(game, attempt) {
  huntSetup(game, attempt);
  let best = null;
  let steps = 0;
  while (steps < 60000) {
    if (game.state === 'results' || game.wave > 5) break;
    if (game.state === 'playing' && game.wave >= 3) {
      const q = frameQuality(game);
      if (!best || q > best.q) best = { q, steps, wave: game.wave };
    }
    huntPick(game);
    tick(game);
    steps += 1;
  }
  return best;
}

function huntReplay(game, attempt, steps) {
  huntSetup(game, attempt);
  for (let i = 0; i < steps; i += 1) {
    huntPick(game);
    tick(game);
  }
}

function huntScene(game) {
  let best = null;
  let used = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const found = huntScan(game, attempt);
    if (found && (!best || found.q > best.q)) {
      best = found;
      used = attempt;
    }
  }
  if (!best) {
    info(game, 'hunt', -1, 'the run never reached wave three');
    return;
  }
  huntReplay(game, used, best.steps);
  info(game, 'hunt', best.steps, `attempt ${used + 1}, wave ${best.wave}`);
}

function upgradesScene(game) {
  game.startRun();
  game.autopilot = steer;
  const steps = run(() => tick(game), () => game.state === 'upgrades');
  // rest the pointer on the middle card, then let the cards settle
  game.input.x = 640;
  game.input.y = 470;
  for (let i = 0; i < 16; i += 1) tick(game);
  info(game, 'upgrades', steps);
}

// The run is played properly for five waves, then the watch is abandoned and the sea takes it.
function fallenScene(game) {
  game.reset(41);
  game.startRun();
  game.autopilot = steer;
  const played = run(
    () => {
      if (game.state === 'upgrades') game.choose(1);
      tick(game);
    },
    () => game.state === 'results' || (game.state === 'playing' && game.wave >= 5),
    60000,
  );
  let died = 0;
  if (game.state !== 'results') {
    game.autopilot = (g) => {
      g.beam.target = SKY;
    };
    died = run(() => tick(game), () => game.state === 'results', 60000);
  }
  for (let i = 0; i < 40; i += 1) tick(game);
  info(game, 'fallen', played + died + 40, `played ${played} + died ${died}`);
}

const SCENES = {
  start: startScene,
  hunt: huntScene,
  upgrades: upgradesScene,
  fallen: fallenScene,
};

export function prepareShot(game, name, seed = 1) {
  const scene = SCENES[name];
  if (!scene) return false;
  game.fixedSeed = true;
  game.reset(seed);
  game.autopilot = null;
  scene(game);
  return true;
}

export function listScenes() {
  return Object.keys(SCENES);
}
