// The run: eight waves, three hearts, one score. This file owns the state machine, the wave
// book, kills and their rewards, the moment a shadow reaches the cliff, and the two ways a
// run can end. It reads input, updates the world, and asks the other modules to draw it.

import { KEYS, LAMP, PALETTE, TUNING, VIEW, WAVES } from './config.js';
import { Rng } from './rng.js';
import { Particles } from './particles.js';
import { aimAt, createBeam, spendOverdrive, updateBeam } from './beam.js';
import { createShadow, shadowDistance, updateShadow } from './enemies.js';
import { applyUpgrade, offerUpgrades } from './upgrades.js';
import { createScene, drawScene } from './render.js';
import { drawHud } from './hud.js';
import { cardAt, drawResults, drawTitle, drawUpgrades, tTitleLinkAt } from './overlays.js';
import { drawCodex, codexTabAt } from './codex.js';
import { L } from './text.js';
import { drawIntro, updateIntro } from './intro.js';

const BEST_KEY = 'emberwatch.best.v1';

function loadBest() {
  try {
    return Math.max(0, Number(window.localStorage.getItem(BEST_KEY)) || 0);
  } catch {
    return 0;
  }
}

function defaultStats() {
  return {
    halfAngle: TUNING.beam.halfAngle,
    reach: TUNING.beam.reach,
    dps: TUNING.beam.dps,
    maxHearts: TUNING.hearts,
    odGain: 1,
    odSeconds: TUNING.overdriveSeconds,
    slowAura: false,
    wildfire: 0,
    focus: false,
    bounty: 1,
  };
}

export class Game {
  constructor(sound, input) {
    this.sound = sound;
    this.input = input;
    this.scene = createScene();
    this.best = loadBest();
    this.autopilot = null;
    this.fixedSeed = false;
    this.introEnabled = true;
    this.onNavigate = null;
    this.codexOpen = false;
    this.codexPage = 0;
    this.reset(1);
  }

  reset(seed = 1) {
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed);
    this.particles = new Particles();
    this.beam = createBeam();
    this.stats = defaultStats();
    this.shadows = [];
    this.pending = [];
    this.state = 'title';
    this.result = null;
    this.clock = 0;
    this.score = 0;
    this.kills = 0;
    this.hearts = TUNING.hearts;
    this.wave = 0;
    this.waveCount = WAVES.length;
    this.waveTitle = '';
    this.wavesCleared = 0;
    this.waveTotal = 0;
    this.waveSpawned = 0;
    this.waveGone = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = TUNING.spawnEvery;
    this.combo = 0;
    this.comboMult = 1;
    this.comboTimer = 0;
    this.overdrive = 0;
    this.odTimer = 0;
    this.lightClock = 0;
    this.humClock = 0;
    this.taken = [];
    this.cards = [];
    this.hoverCard = -1;
    this.banner = null;
    this.shake = 0;
    this.hurtPulse = 0;
    this.flashScreen = 0;
    this.invulnerable = 0;
    this.sparkClock = 0;
    this.sparkSeed = 0;
    this.newBest = false;
    this.attractAngle = Math.PI / 2;
    this.codexOpen = false;
    this.codexPage = 0;
    this.introTime = 0;
    this.weather = 'clear';
    this.lampOut = 0;
    this.lampClock = 0;
    this.lampPower = 1;
    this.camera = null;
    this.flares = TUNING.flare.charges;
    this.flareSpots = [];
    this.seedAttract();
  }

  // A few shadows already out on the water, so the title screen is the game's own world
  // rather than a logo on a gradient. They never reach the tower: the sea takes them back.
  seedAttract() {
    for (let i = 0; i < 5; i += 1) {
      const type = ['crawler', 'crawler', 'moth', 'skitter', 'bulwark'][i];
      const shadow = createShadow(type, 0, this.rng);
      shadow.speed *= 0.5;
      this.shadows.push(shadow);
    }
  }

  startRun() {
    this.state = 'playing';
    this.clock = 0;
    this.shadows = [];
    this.pending = [];
    this.banner = null;
    this.flareSpots = [];
    this.flares = TUNING.flare.charges;
    // a fresh run is a fresh sea: only the staged screenshot scenes hold the seed still
    if (!this.fixedSeed) {
      this.seed = (Math.random() * 0x7fffffff) >>> 0;
      this.rng = new Rng(this.seed);
    }
    this.sound.begin();
    if (this.introEnabled) {
      // a short cold open: the lamp comes up, the beam finds the water, then the first tide
      this.state = 'intro';
      this.introTime = 0;
      this.lampPower = 0;
      this.camera = null;
      this.beam.angle = -Math.PI / 2 - 0.55;
      this.beam.target = this.beam.angle;
      return;
    }
    this.beginWave(0);
  }

  endIntro() {
    if (this.state !== 'intro') return;
    this.state = 'playing';
    this.introTime = 0;
    this.camera = null;
    this.lampPower = 1;
    this.beginWave(0);
  }

  // A flare falls where the mouse is, then burns there: the one action besides aiming the beam.
  dropFlare() {
    if (this.state !== 'playing' || this.flares <= 0) return false;
    const x = Math.max(70, Math.min(VIEW.width - 70, this.input.x));
    const y = Math.max(190, Math.min(VIEW.height - 46, this.input.y));
    this.flareSpots.push({ x, y, life: TUNING.flare.seconds, fall: TUNING.flare.fall });
    this.flares -= 1;
    this.sound.flare();
    return true;
  }

  updateFlares(dt) {
    for (let i = this.flareSpots.length - 1; i >= 0; i -= 1) {
      const spot = this.flareSpots[i];
      spot.life -= dt;
      if (spot.fall > 0) {
        spot.fall -= dt;
      } else {
        for (const shadow of this.shadows) {
          if (shadow.dead) continue;
          if (Math.hypot(shadow.x - spot.x, shadow.y - spot.y) < TUNING.flare.radius + shadow.radius) {
            shadow.lit = true;
            shadow.litTime += dt;
            shadow.hp -= TUNING.flare.dps * dt;
            if (shadow.flash < 0.3) shadow.flash = 0.3;
          }
        }
        if (this.rng.chance(dt * 18)) {
          const a = this.rng.float(0, Math.PI * 2);
          const r = this.rng.float(0, TUNING.flare.radius);
          this.particles.sparks(spot.x + Math.cos(a) * r, spot.y + Math.sin(a) * r, 1, -Math.PI / 2, 2.4, 60, PALETTE.fire, 1.5);
        }
      }
      if (spot.life <= 0) this.flareSpots.splice(i, 1);
    }
  }

  beginWave(index) {
    const wave = WAVES[index];
    const written = L.waves[index];
    this.wave = index + 1;
    this.waveTitle = written.name;
    this.weather = wave.weather || 'clear';
    this.lampOut = 0;
    this.lampClock = 0;
    this.waveTotal = 0;
    this.waveSpawned = 0;
    this.waveGone = 0;
    this.spawnTimer = 0.7;
    const rain = this.weather === 'rain' ? TUNING.weather.rainSpawn : 1;
    this.spawnInterval = Math.max(TUNING.spawnFloor, TUNING.spawnEvery - TUNING.spawnTighten * index) * rain;

    const pools = Object.entries(wave.spawn).map(([type, count]) => ({ type, left: count }));
    const queue = [];
    if (wave.boss) {
      const boss = pools.find((p) => p.type === 'boss');
      if (boss) {
        queue.push('boss');
        boss.left = 0;
      }
    }
    let remaining = pools.reduce((sum, p) => sum + p.left, 0);
    while (remaining > 0) {
      const open = pools.filter((p) => p.left > 0);
      // biased draw: the type with the most left is a little more likely, so packs stay packs
      const totalLeft = open.reduce((sum, p) => sum + p.left, 0);
      let roll = this.rng.float(0, totalLeft);
      let chosen = open[open.length - 1];
      for (const pool of open) {
        roll -= pool.left;
        if (roll <= 0) {
          chosen = pool;
          break;
        }
      }
      queue.push(chosen.type);
      chosen.left -= 1;
      remaining -= 1;
    }
    this.spawnQueue = queue;
    this.waveTotal = queue.length;

    const name = wave.boss ? L.banner.leviathan : L.banner.wave(this.wave);
    const weatherLine = L.weather[this.weather] || '';
    this.banner = {
      text: name,
      sub: wave.boss ? L.banner.leviathanSub : (weatherLine || written.note),
      age: 0,
      life: wave.boss ? 3.4 : 2.5,
    };
    this.sound.wave();
  }

  spawnNext() {
    const type = this.spawnQueue.shift();
    if (!type) return;
    const waveIndex = this.wave - 1;
    const angle = type === 'boss' ? -Math.PI / 2 : null;
    const ring = this.weather === 'surge'
      ? { inner: TUNING.spawnRing.inner - TUNING.weather.surgeRing, outer: TUNING.spawnRing.outer - TUNING.weather.surgeRing }
      : TUNING.spawnRing;
    const shadow = createShadow(type, waveIndex, this.rng, angle, ring);
    this.shadows.push(shadow);
    this.waveSpawned += 1;
    if (type === 'boss') {
      this.shake = 6;
      this.particles.ring(shadow.x, shadow.y, 40, PALETTE.fireDeep, 2.5);
    }
  }

  update(dt) {
    if (this.codexOpen) return;
    if (this.state === 'intro') {
      updateIntro(this, dt);
      return;
    }
    this.clock += dt;
    if (this.state === 'title') {
      this.updateAttract(dt);
      return;
    }

    // weather: fog and rain are handled where they bite; an unstable lamp drops out on a cycle
    if (this.weather === 'dim') {
      this.lampClock += dt;
      const phase = this.lampClock % TUNING.weather.dimEvery;
      this.lampOut = phase > TUNING.weather.dimEvery - TUNING.weather.dimOff ? 1 : 0;
    } else {
      this.lampOut = 0;
      this.lampClock = 0;
    }

    if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.hurtPulse > 0) this.hurtPulse = Math.max(0, this.hurtPulse - dt * 2.2);
    if (this.flashScreen > 0) this.flashScreen = Math.max(0, this.flashScreen - dt * 2.6);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - TUNING.shakeDecay * dt * (1 + this.shake * 0.1));
    if (this.banner) {
      this.banner.age += dt;
      if (this.banner.age > this.banner.life) this.banner = null;
    }

    if (this.state === 'upgrades') {
      this.hoverCard = cardAt(this.input.x, this.input.y);
      this.particles.update(dt, LAMP);
      return;
    }
    if (this.state === 'results') {
      this.particles.update(dt, LAMP);
      return;
    }

    // playing
    if (this.autopilot) this.autopilot(this);
    else aimAt(this.beam, this.input.x, this.input.y);

    const { lit } = updateBeam(this, dt);
    this.updateFlares(dt);
    if (this.odTimer > 0) this.sound.setLit(lit, true);
    else {
      this.humClock += dt;
      if (this.humClock > 0.1) {
        this.humClock = 0;
        this.sound.setLit(lit, false);
      }
    }

    // sustained light charges the lamp a little by itself
    if (lit > 0) {
      this.lightClock += dt;
      if (this.lightClock >= TUNING.overdriveLightTick) {
        this.lightClock -= TUNING.overdriveLightTick;
        this.overdrive = Math.min(TUNING.overdriveMax, this.overdrive + this.stats.odGain);
      }
    } else {
      this.lightClock = 0;
    }

    // combo goes cold
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) {
        this.combo = 0;
        this.comboMult = 1;
      }
    }

    // burn from wildfire
    for (const shadow of this.shadows) {
      if (shadow.burn > 0 && !shadow.dead) {
        shadow.burn -= dt;
        shadow.hp -= 3.2 * dt;
        shadow.lit = shadow.lit || shadow.burn > 0;
        if (this.rng.chance(0.25)) this.particles.sparks(shadow.x, shadow.y, 1, -Math.PI / 2, 2.4, 50, PALETTE.fire, 1.5);
      }
    }

    const dying = this.shadows.filter((s) => !s.dead && s.hp <= 0);
    for (const shadow of dying) this.burnOut(shadow);

    for (const shadow of this.shadows) {
      if (shadow.dead) continue;
      updateShadow(shadow, dt, this);
      if (shadowDistance(shadow) < TUNING.towerRadius - shadow.radius * 0.5) {
        this.towerHit(shadow);
      }
    }

    if (this.pending.length) {
      this.shadows.push(...this.pending);
      this.pending.length = 0;
    }
    this.shadows = this.shadows.filter((s) => !s.dead);
    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnNext();
        this.spawnTimer = Math.max(0.22, this.spawnInterval * this.rng.float(0.82, 1.18));
      }
    }

    this.particles.update(dt, LAMP);

    if (this.state === 'playing' && this.spawnQueue.length === 0 && this.shadows.length === 0) {
      this.clearWave();
    }
  }

  updateAttract(dt) {
    this.attractAngle += dt * 0.32;
    this.beam.target = -Math.PI / 2 + Math.sin(this.attractAngle) * 0.85;
    this.beam.angle = this.beam.target;
    for (const shadow of this.shadows) {
      shadow.lit = false;
      updateShadow(shadow, dt * 0.7, this);
      if (shadowDistance(shadow) < 190) {
        const fresh = createShadow(this.rng.pick(['crawler', 'moth']), 0, this.rng);
        fresh.speed *= 0.5;
        Object.assign(shadow, fresh);
      }
    }
    // the attract beam still lights what it crosses
    for (const shadow of this.shadows) {
      const dx = shadow.x - LAMP.x;
      const dy = shadow.y - LAMP.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.beam.reach) continue;
      let delta = Math.atan2(dy, dx) - this.beam.angle;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      if (Math.abs(delta) < this.beam.halfAngle * 1.3) {
        shadow.lit = true;
        shadow.glow = Math.min(1, shadow.glow + dt * 6);
      }
    }
    this.particles.update(dt, LAMP);
    if (this.rng.chance(dt * 1.2)) {
      const a = Math.PI / 2 + this.rng.float(-1, 1);
      const r = this.rng.float(300, 560);
      this.particles.sparks(LAMP.x + Math.cos(a) * r, LAMP.y + Math.sin(a) * r, 1, -Math.PI / 2, 2, 20, PALETTE.ember, 1.2);
    }
  }

  burnOut(shadow) {
    shadow.dead = true;
    this.waveGone += 1;
    this.kills += 1;
    this.comboTimer = TUNING.comboWindow;
    this.combo += 1;
    this.comboMult = Math.min(TUNING.comboMax, 1 + Math.floor(this.combo / 2));
    this.score += Math.round(shadow.score * this.comboMult * this.stats.bounty);
    this.overdrive = Math.min(TUNING.overdriveMax, this.overdrive + TUNING.overdrivePerKill * this.stats.odGain);

    const big = shadow.type === 'boss';
    this.particles.traumaBurst(shadow.x, shadow.y, big ? 70 : 16 + Math.round(shadow.radius));
    this.particles.embers(shadow.x, shadow.y, big ? 44 : 5 + Math.round(shadow.radius * 0.4));
    this.shake = Math.max(this.shake, big ? 14 : 2.4);
    this.sound.kill(shadow.radius);

    if (shadow.type === 'splitter') {
      for (let i = 0; i < 2; i += 1) {
        const angle = Math.atan2(shadow.y - LAMP.y, shadow.x - LAMP.x) + (i === 0 ? -0.5 : 0.5);
        const child = createShadow('spawnling', this.wave - 1, this.rng, angle);
        child.x = shadow.x;
        child.y = shadow.y;
        this.pending.push(child);
      }
    }

    if (this.stats.wildfire > 0 && this.rng.chance(this.stats.wildfire)) {
      for (const other of this.shadows) {
        if (other === shadow || other.dead) continue;
        if (Math.hypot(other.x - shadow.x, other.y - shadow.y) < 140) {
          other.burn = Math.max(other.burn || 0, 3);
          other.lit = true;
          this.particles.sparks(other.x, other.y, 4, -Math.PI / 2, 2.5, 90, PALETTE.fire, 2);
        }
      }
    }

    if (big) {
      this.banner = { text: L.banner.falls, sub: L.banner.fallsSub, age: 0, life: 3.2 };
      this.flashScreen = 0.9;
      this.overdrive = TUNING.overdriveMax;
      for (const other of this.shadows) {
        if (other !== shadow && other.type !== 'boss') this.burnOutQuiet(other);
      }
    }
  }

  // The leviathan's death takes the rest of the tide with it, without scoring a second time.
  burnOutQuiet(shadow) {
    if (shadow.dead) return;
    shadow.dead = true;
    this.particles.traumaBurst(shadow.x, shadow.y, 10);
    this.particles.embers(shadow.x, shadow.y, 4);
  }

  towerHit(shadow) {
    shadow.dead = true;
    this.waveGone += 1;
    this.particles.splash(shadow.x, shadow.y, 26);
    this.particles.ring(shadow.x, shadow.y, 12, 'rgba(200, 80, 60, 0.9)', 1.6);
    this.combo = 0;
    this.comboMult = 1;
    this.comboTimer = 0;

    if (this.invulnerable > 0) return;
    this.hearts -= 1;
    this.invulnerable = TUNING.invulnerable;
    this.hurtPulse = 1;
    this.shake = 9;
    this.flashScreen = 0.18;
    this.sound.hurt();

    if (this.hearts <= 0) {
      this.hearts = 0;
      this.finish('defeat');
    }
  }

  clearWave() {
    if (this.wave >= this.waveCount) {
      this.finish('victory');
      return;
    }
    this.wavesCleared = this.wave;
    this.state = 'upgrades';
    this.cards = offerUpgrades(this, 3);
    this.hoverCard = -1;
    this.banner = null;
    // one more flare for the next tide, up to the cap
    this.flares = Math.min(TUNING.flare.max, this.flares + 1);
    this.sound.upgrade();
  }

  choose(index) {
    if (this.state !== 'upgrades') return false;
    const card = this.cards[index];
    if (!card) return false;
    applyUpgrade(this, card);
    this.sound.select();
    this.state = 'playing';
    this.cards = [];
    this.hoverCard = -1;
    this.beginWave(this.wave);
    return true;
  }

  finish(result) {
    if (this.state === 'results') return;
    this.state = 'results';
    this.result = result;
    this.wavesCleared = result === 'victory' ? this.waveCount : Math.max(0, this.wave - 1);
    this.newBest = this.score > this.best;
    if (this.newBest) {
      this.best = this.score;
      try {
        window.localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        /* nothing to save to */
      }
    }
    this.banner = null;
    if (result === 'victory') {
      this.sound.victory();
      this.flashScreen = 1;
      this.particles.traumaBurst(LAMP.x, LAMP.y, 60);
    } else {
      this.sound.defeat();
      this.shake = 10;
    }
  }

  restart() {
    this.reset((this.seed * 7 + 13 + Math.floor(Math.random() * 1000)) >>> 0);
    this.startRun();
  }

  // -- input ----------------------------------------------------------------

  handleInput(clicks, typed) {
    for (const code of typed) {
      if (code === KEYS.mute) {
        this.sound.toggleMute();
        continue;
      }
      if (this.state === 'intro') {
        this.endIntro();
        continue;
      }
      if (this.codexOpen) {
        if (code === 'KeyC' || code === 'Escape') {
          this.codexOpen = false;
        } else if (code === 'ArrowLeft') {
          this.codexPage = (this.codexPage + 2) % 3;
          this.sound.select();
        } else if (code === 'ArrowRight') {
          this.codexPage = (this.codexPage + 1) % 3;
          this.sound.select();
        } else {
          const page = /^(Digit|Numpad)([1-3])$/.exec(code);
          if (page) {
            this.codexPage = Number(page[2]) - 1;
            this.sound.select();
          }
        }
        continue;
      }
      if (code === 'KeyC' && (this.state === 'title' || this.state === 'results')) {
        this.codexOpen = true;
        this.codexPage = 0;
        this.sound.select();
        continue;
      }
      if (this.state === 'title' && (code === 'Enter' || code === 'Space')) {
        this.startRun();
        continue;
      }
      if (this.state === 'upgrades') {
        const match = /^(Digit|Numpad)([1-3])$/.exec(code);
        if (match) this.choose(Number(match[2]) - 1);
        continue;
      }
      if (this.state === 'results' && KEYS.restart.includes(code)) {
        this.restart();
        continue;
      }
      if (this.state === 'playing' && code === 'KeyF') {
        this.dropFlare();
        continue;
      }
      if (this.state === 'playing' && KEYS.overdrive.includes(code)) {
        if (spendOverdrive(this)) {
          this.sound.overdrive();
          this.sound.setLit(0, false);
        }
      }
    }

    for (const click of clicks) {
      if (this.state === 'intro') {
        this.endIntro();
        continue;
      }
      if (this.codexOpen) {
        const tab = codexTabAt(click.x, click.y);
        if (tab >= 0) {
          this.codexPage = tab;
          this.sound.select();
        } else {
          this.codexOpen = false;
        }
        continue;
      }
      if (this.state === 'title') {
        if (tTitleLinkAt(click.x, click.y)) {
          this.onNavigate?.(L.otherHref);
          continue;
        }
        this.startRun();
        continue;
      }
      if (this.state === 'results') {
        this.restart();
        continue;
      }
      if (this.state === 'upgrades') {
        const index = cardAt(click.x, click.y);
        if (index >= 0) this.choose(index);
        continue;
      }
      if (click.button === 2) {
        if (spendOverdrive(this)) this.sound.overdrive();
      } else if (this.state === 'playing') {
        // a left click is a nudge for players who expect something to happen; it spends
        // overdrive only when the lamp is full
        if (spendOverdrive(this)) this.sound.overdrive();
      }
    }
  }

  // -- drawing --------------------------------------------------------------

  draw(ctx, time) {
    drawScene(ctx, this, time);
    if (this.state === 'intro') {
      drawIntro(ctx, this, time);
      return;
    }
    if (this.codexOpen) {
      drawCodex(ctx, this, time);
      return;
    }
    if (this.state === 'title') {
      drawTitle(ctx, this, time);
    } else if (this.state === 'playing') {
      drawHud(ctx, this, time);
    } else if (this.state === 'upgrades') {
      drawHud(ctx, this, time);
      drawUpgrades(ctx, this, time);
    } else if (this.state === 'results') {
      drawResults(ctx, this, time);
    }
  }
}
