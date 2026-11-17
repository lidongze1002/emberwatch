// 值班室：案件的状态机、你下的每一条目标、电闸、撤离和结案。人怎么走、打谁、什么时候退，都不在这里。

import { POSSESS_SECONDS, SPAWNS, TUNING, VIEW } from './config.js';
import { buildLevel } from './level.js';
import { createAgents, createThralls, spawnSpider, updateUnits } from './units.js';
import { drawFrame, drawBars } from './render.js';
import { drawHud } from './hud.js';
import { drawBrief, drawResult, drawTitle, tTitleLinkAt } from './overlays.js';
import { L } from './text.js';

export class Game {
  constructor(sound, input) {
    this.sound = sound;
    this.input = input;
    this.level = buildLevel();
    this.onNavigate = null;
    this.state = 'title';
    this.paused = false;
    this.reset();
  }

  reset() {
    this.agents = createAgents();
    this.thralls = createThralls();
    this.bullets = [];
    this.muzzle = [];
    this.spatter = [];
    this.debris = [];
    this.logs = [];
    this.clock = 0;
    this.power = true;
    this.pull = 0;
    this.pulling = false;
    this.kills = 0;
    this.extracted = 0;
    this.shake = 0;
    this.flashWhite = 0;
    this.toast = 0;
    this.toastText = '';
    this.lampCooldown = 0;
    this.paused = false;
    this.speed = 1;
    this.won = false;
    this.possessed = null;
    this.possessTimer = 0;
    this.auto = true;
    this.directorClock = 0;
  }

  // The duty officer's standing order: cut the power, then take the house, then get out.
  direct() {
    if (this.state !== 'play') return;
    const sw = SPAWNS.switchboard;
    const nearSwitch = this.agents.some((a) => !a.down && !a.taken && Math.hypot(a.x - sw.x, a.y - sw.y) < 46);
    const heading = this.agents.some((a) => a.order.kind === 'goto' && Math.hypot(a.order.x - sw.x, a.order.y - (sw.y + 34)) < 60);
    if (this.power && !nearSwitch && !heading) {
      this.orderNearest(sw.x, sw.y + 34);
      return;
    }
    const alive = this.thralls.filter((t) => !t.dead);
    if (alive.length) {
      const focusing = this.agents.some((a) => a.order.kind === 'focus' && a.order.target && !a.order.target.dead);
      if (!focusing) {
        let best = null;
        let bestDist = Infinity;
        for (const t of alive) {
          for (const a of this.free()) {
            const d = Math.hypot(t.x - a.x, t.y - a.y);
            if (d < bestDist) {
              bestDist = d;
              best = t;
            }
          }
        }
        for (const a of this.free()) {
          if (a.order.kind === 'revive') continue;
          a.order = { kind: 'focus', target: best };
          a.path = null;
        }
      }
      return;
    }
    if (!this.power && this.kills >= this.thralls.length) {
      const leaving = this.agents.some((a) => a.order.kind === 'goto' && Math.hypot(a.order.x - SPAWNS.exit.x, a.order.y - SPAWNS.exit.y) < 40);
      if (!leaving) {
        for (const a of this.free()) {
          if (a.order.kind === 'revive') continue;
          a.order = { kind: 'goto', x: SPAWNS.exit.x, y: SPAWNS.exit.y };
          a.path = null;
        }
      }
    }
  }

  startRun() {
    this.reset();
    this.state = 'play';
    this.sound.begin();
    this.say(L.hud.music);
  }

  say(text) {
    this.toastText = text;
    this.toast = 2.6;
  }

  log(text) {
    this.logs.push({ t: this.clock, text });
    if (this.logs.length > 40) this.logs.shift();
  }

  standing() {
    return this.agents.filter((a) => !a.down && !a.taken && !a.extracted);
  }

  free() {
    return this.standing().filter((a) => !a.charmed);
  }

  update(dt) {
    if (this.paused || this.state !== 'play') return;
    this.clock += dt;
    this.toast = Math.max(0, this.toast - dt);
    this.shake = Math.max(0, this.shake - dt * 14);
    this.flashWhite = Math.max(0, this.flashWhite - dt * 2.4);
    this.lampCooldown = Math.max(0, this.lampCooldown - dt);
    this.directorClock += dt;
    if (this.directorClock > 0.8) {
      this.directorClock = 0;
      if (this.auto) this.direct();
    }
    this.ariaClock = (this.ariaClock || 0) + dt;
    if (this.ariaClock > 0.2) {
      this.ariaClock = 0;
      let near = 9999;
      for (const a of this.agents) {
        if (a.taken || a.extracted) continue;
        near = Math.min(near, Math.hypot(a.x - 840, a.y - 180));
      }
      this.sound.aria(this.power ? Math.max(0, 1 - near / 900) : 0);
    }

    if (this.possessed) {
      const a = this.possessed;
      this.possessTimer -= dt;
      if (this.possessTimer <= 0 || a.down || a.taken || a.extracted) {
        this.possessed = null;
        this.possessTimer = 0;
        a.order = { kind: 'hold' };
        a.path = null;
      }
    }

    for (const t of this.thralls) {
      if (t.stun > 0) t.stun = Math.max(0, t.stun - dt);
      else if (t.stun === 0) t.stun = 0;
    }
    updateUnits(this, dt);

    // the switchboard: one agent, 1.2 seconds, and the house goes quiet
    const sw = SPAWNS.switchboard;
    const atSwitch = this.standing().some((a) => Math.hypot(a.x - sw.x, a.y - sw.y) < 40);
    this.pulling = atSwitch && this.power;
    if (this.pulling) {
      this.pull += dt;
      if (this.pull >= 1.2) {
        this.power = false;
        this.pull = 0;
        this.flashWhite = 0.6;
        this.say(L.hud.quiet);
        this.sound.power();
        spawnSpider(this);
      }
    } else {
      this.pull = Math.max(0, this.pull - dt * 2);
    }

    // the door: anyone who reaches it is out
    for (const a of this.agents) {
      if (a.extracted || a.down || a.taken) continue;
      if (Math.hypot(a.x - SPAWNS.exit.x, a.y - SPAWNS.exit.y) < 30) {
        a.extracted = true;
        this.extracted += 1;
        this.log(`${a.role} is out.`);
      }
    }

    const remaining = this.agents.filter((a) => !a.taken && !a.extracted);
    const anyUp = remaining.some((a) => !a.down);
    const cleared = this.kills >= this.thralls.length;
    const objectiveDone = !this.power && cleared;
    if (remaining.length === 0) {
      this.finish(objectiveDone);
    } else if (!anyUp) {
      this.finish(false);
    } else if (objectiveDone && !remaining.some((a) => !a.down)) {
      this.finish(true);
    }
  }

  finish(won) {
    if (this.state === 'result') return;
    this.state = 'result';
    this.won = won;
    if (won) this.sound.win();
    else this.sound.lose();
    this.paused = false;
  }

  useLamp() {
    if (this.state !== 'play' || this.lampCooldown > 0) return;
    const lamp = this.agents.find((a) => a.role === 'lamp' && !a.down && !a.taken && !a.extracted);
    if (!lamp) return;
    this.lampCooldown = 14;
    this.flashWhite = 1;
    this.shake = 5;
    for (const t of this.thralls) {
      if (t.dead) continue;
      if (Math.hypot(t.x - lamp.x, t.y - lamp.y) < 210) t.stun = 2.4;
    }
    this.sound.flash();
    this.say(L.agent.lamp.name);
  }

  takeOver(index) {
    const a = this.agents[index];
    if (!a || a.down || a.taken || a.extracted) return;
    if (this.possessed === a) {
      this.possessed = null;
      this.possessTimer = 0;
      a.order = { kind: 'hold' };
      a.path = null;
      return;
    }
    this.possessed = a;
    this.possessTimer = POSSESS_SECONDS;
    a.path = null;
    this.say(L.hud.controlling(L.agent[a.role].name));
  }

  orderNearest(x, y, kind = 'goto') {
    const list = this.free();
    if (!list.length) return null;
    let best = list[0];
    let bestDist = Infinity;
    for (const a of list) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bestDist) {
        best = a;
        bestDist = d;
      }
    }
    best.order = { kind, x, y };
    best.path = null;
    best.state = 'moving';
    return best;
  }

  recall() {
    for (const a of this.free()) {
      a.order = { kind: 'goto', x: 230, y: 600 };
      a.path = null;
    }
    this.say(L.hud.quiet === '' ? '' : 'RECALL');
  }

  handleInput(clicks, typed) {
    for (const code of typed) {
      if (this.state === 'title' && (code === 'Enter' || code === 'Space')) {
        this.state = 'brief';
        continue;
      }
      if (this.state === 'brief' && (code === 'Enter' || code === 'Space')) {
        this.startRun();
        continue;
      }
      if (this.state === 'result' && (code === 'Enter' || code === 'Space')) {
        this.reset();
        this.state = 'brief';
        continue;
      }
      if (this.state !== 'play') continue;
      if (code === 'KeyP') this.paused = !this.paused;
      if (code === 'Space') this.recall();
      if (code === 'KeyQ') this.useLamp();
      if (code === 'Escape') {
        this.possessed = null;
        this.possessTimer = 0;
      }
      if (code === 'Digit1') this.speed = 1;
      if (code === 'Digit2') this.speed = 2;
    }

    for (const click of clicks) {
      if (this.state === 'title') {
        if (tTitleLinkAt(click.x, click.y)) {
          this.onNavigate?.(L.otherHref);
          continue;
        }
        this.state = 'brief';
        continue;
      }
      if (this.state === 'brief') {
        this.startRun();
        continue;
      }
      if (this.state === 'result') {
        this.reset();
        this.state = 'brief';
        continue;
      }
      if (this.state !== 'play' || this.paused) continue;
      if (this.possessed) continue;

      const thrall = this.thralls.find((t) => !t.dead && Math.hypot(t.x - click.x, t.y - click.y) < 26);
      if (thrall) {
        for (const a of this.free()) {
          a.order = { kind: 'focus', target: thrall };
          a.path = null;
        }
        this.say(L.state.fighting);
        continue;
      }
      const sw = SPAWNS.switchboard;
      if (Math.hypot(sw.x - click.x, sw.y - click.y) < 40) {
        const a = this.orderNearest(sw.x, sw.y + 34, 'goto');
        if (a) this.say(`${a.role} → ${L.brief.legend}`);
        continue;
      }
      if (Math.hypot(SPAWNS.exit.x - click.x, SPAWNS.exit.y - click.y) < 40) {
        for (const a of this.free()) {
          a.order = { kind: 'goto', x: SPAWNS.exit.x, y: SPAWNS.exit.y };
          a.path = null;
        }
        continue;
      }
      this.orderNearest(click.x, click.y);
    }
  }

  draw(ctx, time) {
    drawFrame(ctx, this, time);
    if (this.state === 'title') drawTitle(ctx, this, time);
    else if (this.state === 'brief') drawBrief(ctx, this, time);
    else if (this.state === 'play') drawHud(ctx, this, time);
    else if (this.state === 'result') drawResult(ctx, this, time);
    drawBars(ctx);
  }
}
