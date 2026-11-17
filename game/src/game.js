// 值班室：案子的状态机、你下的每一条目标、规则钩子和结案。人怎么走、打谁、什么时候退，
// 都不在这里。楼层与规则分别住在 cases.js 与 rules.js。

import { POSSESS_SECONDS, TUNING } from './config.js';
import { CASES } from './cases.js';
import { buildLevel, setWorld, solid } from './level.js';
import { createAgents, createThralls, updateUnits } from './units.js';
import { drawFrame, drawBars, screenToWorld } from './render.js';
import { drawHud } from './hud.js';
import { drawBrief, drawResult, drawSelect, drawTitle, tCaseAt, tTitleLinkAt } from './overlays.js';
import { actionA, afterRules, directRules, initRules, updateRules, verdict } from './rules.js';
import { L } from './text.js';

export class Game {
  constructor(sound, input) {
    this.sound = sound;
    this.input = input;
    this.onNavigate = null;
    this.caseIndex = 0;
    this.case = CASES[0];
    setWorld(this.case);
    this.level = buildLevel();
    this.state = 'title';
    this.paused = false;
    this.reset();
  }

  selectCase(index) {
    this.caseIndex = Math.max(0, Math.min(CASES.length - 1, index));
    this.case = CASES[this.caseIndex];
    setWorld(this.case);
    this.level = buildLevel();
    this.reset();
  }

  reset() {
    this.agents = createAgents(this);
    this.thralls = createThralls(this);
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
    this.startedAt = 0;
    initRules(this);
  }

  // 队长的固定命令：读这一案的规则状态，然后给目标。规则怎么变，命令就怎么变。
  direct() {
    if (this.state !== 'play') return;
    directRules(this);
  }

  startRun() {
    this.reset();
    this.state = 'play';
    this.sound.begin();
    this.say(L.cases[this.case.id].hint || L.hud.music);
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

  ruleState() {
    return this.rule;
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
    // 第一案的礼堂在唱；其余案子只有环境声
    if (this.case.rule.kind === 'power') {
      this.ariaClock = (this.ariaClock || 0) + dt;
      if (this.ariaClock > 0.2) {
        this.ariaClock = 0;
        let near = 9999;
        const mark = this.case.spawns.stageMark;
        for (const a of this.agents) {
          if (a.taken || a.extracted) continue;
          near = Math.min(near, Math.hypot(a.x - mark.x, a.y - mark.y));
        }
        this.sound.aria(this.power ? Math.max(0, 1 - near / 900) : 0);
      }
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

    updateRules(this, dt);
    updateUnits(this, dt);
    afterRules(this, dt);

    // 门在身后合上时，人可能被夹在门框里。夹住超过半秒就往最近的空处挪一步。
    for (const a of this.agents) {
      if (a.down || a.taken || a.extracted) continue;
      if (solid(a.x, a.y, TUNING.agentRadius)) {
        a.stuckT = (a.stuckT || 0) + dt;
        if (a.stuckT > 0.4) {
          outer: for (const rad of [18, 28, 40, 56, 76]) {
            for (let k = 0; k < 12; k += 1) {
              const ang = (k / 12) * Math.PI * 2;
              const px = a.x + Math.cos(ang) * rad;
              const py = a.y + Math.sin(ang) * rad;
              if (!solid(px, py, TUNING.agentRadius)) {
                a.x = px;
                a.y = py;
                a.stuckT = 0;
                a.path = null;
                break outer;
              }
            }
          }
        }
      } else {
        a.stuckT = 0;
      }
    }

    // 第一案的出口：目标完成之后，走到门口就是出去了
    if (this.case.rule.kind === 'power') {
      const cleared = this.kills >= this.thralls.length;
      const ready = !this.power && cleared;
      const exit = this.case.spawns.exit;
      for (const a of this.agents) {
        if (a.extracted || a.down || a.taken) continue;
        if (ready && Math.hypot(a.x - exit.x, a.y - exit.y) < 44) {
          a.extracted = true;
          this.extracted += 1;
          this.log(`${a.role} is out.`);
        }
      }
      if (this.extracted >= this.agents.length) this.finish(true);
    }

    const v = verdict(this);
    if (v) this.finish(v === 'win');
  }

  finish(won) {
    if (this.state === 'result') return;
    this.state = 'result';
    this.won = won;
    this.extracted = this.agents.filter((a) => a.extracted).length;
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
      if (t.invulnerable) continue;
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

  orderAll(x, y) {
    const list = this.free();
    list.forEach((a, i) => {
      if (a.order.kind === 'revive') return;
      const off = [[0, 0], [-24, 16], [24, 16]][i % 3];
      a.order = { kind: 'goto', x: x + off[0], y: y + off[1] };
      a.path = null;
      a.goal = null;
    });
  }

  recall() {
    for (const a of this.free()) {
      a.order = { kind: 'hold' };
      a.path = null;
    }
    this.say(L.hud.recall);
  }

  activeAction() {
    if (this.case.rule.kind === 'power') {
      this.recall();
      return false;
    }
    return actionA(this);
  }

  handleInput(clicks, typed) {
    for (const code of typed) {
      if (this.state === 'title' && (code === 'Enter' || code === 'Space')) {
        this.state = 'select';
        continue;
      }
      if (this.state === 'select') {
        if (code === 'Enter' || code === 'Space') {
          this.selectCase(this.caseIndex);
          this.state = 'brief';
        }
        if (code === 'Escape') this.state = 'title';
        continue;
      }
      if (this.state === 'brief' && (code === 'Enter' || code === 'Space')) {
        this.startRun();
        continue;
      }
      if (this.state === 'result' && (code === 'Enter' || code === 'Space')) {
        this.nextCase();
        continue;
      }
      if (this.state !== 'play') continue;
      if (code === 'KeyP') this.paused = !this.paused;
      if (code === 'KeyT') {
        this.auto = !this.auto;
        this.say(this.auto ? L.hud.autoOn : L.hud.autoOff);
      }
      if (code === 'Space' || code === 'KeyE') this.activeAction();
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
        this.state = 'select';
        continue;
      }
      if (this.state === 'select') {
        const hit = tCaseAt(click.x, click.y, CASES.length);
        if (hit >= 0) {
          this.selectCase(hit);
          this.state = 'brief';
        }
        continue;
      }
      if (this.state === 'brief') {
        this.startRun();
        continue;
      }
      if (this.state === 'result') {
        this.nextCase();
        continue;
      }
      if (this.state !== 'play' || this.paused) continue;
      if (this.possessed) continue;

      const w = screenToWorld(click.x, click.y);
      this.clickWorld(w.x, w.y);
    }
  }

  nextCase() {
    if (this.won && this.caseIndex + 1 < CASES.length) {
      this.selectCase(this.caseIndex + 1);
      this.state = 'brief';
    } else if (this.won) {
      this.selectCase(this.caseIndex);
      this.state = 'select';
    } else {
      this.selectCase(this.caseIndex);
      this.state = 'brief';
    }
  }

  clickWorld(x, y) {
    const c = this.case;
    // 你一下手，队长就闭嘴：这一下是你下的命令
    this.auto = false;
    // 第五案：点门＝让整队走进那扇门（门牌自己看）
    if (c.rule.kind === 'floors') {
      for (const d of c.doors) {
        if (Math.hypot(d.x - x, d.y - y) < 30) {
          this.orderAll(d.x + d.nx * 26, d.y + d.ny * 26);
          this.say(L.hud.doorNo(this.rule.plates[c.doors.indexOf(d)]));
          return;
        }
      }
    }
    // 第二案：点门＝派人去应门（这就是禁忌本身）
    if (c.rule.kind === 'knock') {
      for (const d of c.doors) {
        if (Math.hypot(d.x - x, d.y - y) < 30) {
          this.orderNearest(d.x, d.y + (d.face === 's' ? -30 : 30));
          this.say(L.hud.answering);
          return;
        }
      }
    }
    const thrall = this.thralls.find((t) => !t.dead && !t.invulnerable && Math.hypot(t.x - x, t.y - y) < 26);
    if (thrall) {
      for (const a of this.free()) {
        a.order = { kind: 'focus', target: thrall };
        a.path = null;
      }
      this.say(L.state.fighting);
      return;
    }
    const sw = c.spawns.switchboard;
    if (sw && Math.hypot(sw.x - x, sw.y - y) < 40) {
      this.orderNearest(sw.x, sw.y + 34, 'goto');
      this.say(L.hud.toSwitch);
      return;
    }
    const exit = c.spawns.exit;
    if (exit && Math.hypot(exit.x - x, exit.y - y) < 40) {
      this.orderAll(exit.x, exit.y);
      return;
    }
    this.orderNearest(x, y);
  }

  draw(ctx, time) {
    drawFrame(ctx, this, time);
    if (this.state === 'title') drawTitle(ctx, this, time);
    else if (this.state === 'select') drawSelect(ctx, this, time);
    else if (this.state === 'brief') drawBrief(ctx, this, time);
    else if (this.state === 'play') drawHud(ctx, this, time);
    else if (this.state === 'result') drawResult(ctx, this, time);
    drawBars(ctx);
  }
}
