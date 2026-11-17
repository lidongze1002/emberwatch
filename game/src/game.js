// 值班室：案件的状态机、你下的每一条目标、电闸、撤离和结案。人怎么走、打谁、什么时候退，都不在这里。

import { SPAWNS, TUNING, VIEW } from './config.js';
import { buildLevel } from './level.js';
import { createAgents, createThralls, updateUnits } from './units.js';
import { drawWorld } from './render.js';
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
    drawWorld(ctx, this, time);
    if (this.state === 'title') drawTitle(ctx, this, time);
    else if (this.state === 'brief') drawBrief(ctx, this, time);
    else if (this.state === 'play') drawHud(ctx, this, time);
    else if (this.state === 'result') drawResult(ctx, this, time);
  }
}
