// 值班室：案子的状态机、你下的每一条目标、规则钩子和结案。人怎么走、打谁、什么时候退，
// 都不在这里。楼层与规则分别住在 cases.js 与 rules.js。

import { POSSESS_SECONDS, TUNING } from './config.js';
import { CASES } from './cases.js';
import { buildLevel, setWorld, solid } from './level.js';
import { createAgents, createThralls, updateUnits } from './units.js';
import { overwatchTick } from './tactics.js';
import { drawFrame, drawBars, drawBrightness, screenToWorld } from './render.js';
import { drawHud } from './hud.js';
import { drawBrief, drawCamp, drawBench, drawLocker, drawRadio, drawLedger, drawHire, drawResult, drawRoster, drawSelect, drawSettings, drawTitle, tCaseAt, tHireAt, tHireNoneAt, tRosterCardAt, tRosterCasesAt, tRosterFreshAt, tRosterHireAt, tRosterLampAt, tSelectRosterAt, tSettingsAt, tSettingsCloseAt, tSettingsFullAt, tSettingsLangAt, tSettingsResetAt, tSettingsRowAt, tSettingsButtonAt, tTitleLinkAt, tCampAt, tCampBackAt, tBenchAt, tLockerAt, tRadioAt, SETTINGS_TRACK } from './overlays.js';
import { actionA, afterRules, directRules, initRules, updateRules, verdict } from './rules.js';
import { createRoster, buyLamp, buyIntel, clearRoster, dismissCandidates, hire, loadRoster, payForRefresh, restOne, saveRoster, setDuty, setWeapon, squadForRun, settle } from './roster.js';
import { buyUpgrade } from './arms.js';
import { L } from './text.js';
import { LIMITS, loadSettings, nudge, resetSettings, saveSettings, setLanguage } from './settings.js';

export class Game {
  constructor(sound, input) {
    this.sound = sound;
    this.input = input;
    this.onNavigate = null;
    this.caseIndex = 0;
    this.case = CASES[0];
    this.roster = loadRoster() || createRoster();
    this.squad = squadForRun(this.roster);
    setWorld(this.case);
    this.level = buildLevel();
    this.state = 'title';
    this.paused = false;
    this.settings = loadSettings();
    this.settingsOpen = false;
    this.settingsRow = 0;
    this.settingsDrag = null;
    this.reset();
  }

  selectCase(index) {
    this.caseIndex = Math.max(0, Math.min(CASES.length - 1, index));
    this.case = CASES[this.caseIndex];
    this.squad = squadForRun(this.roster);
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
    this.shot = null;
    this.trail = [];
    this.trailClock = 0;
    this.settled = false;
    this.settlement = null;
    this.drops = [];
    this.picked = { oil: 0, ammo: 0, ember: 0, item: 0, part: 0, scrap: 0 };
    this.matches = 0;
    this.tactics = { heading: -Math.PI / 2, holder: null, lastLog: -99, door: null };
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

  log(key, ...args) {
    this.logs.push({ t: this.clock, key, args });
    if (this.logs.length > 40) this.logs.shift();
  }

  // 记录用 key 存，显示时按当前语言拼——卷宗是中文的，值班记录也必须是中文的。
  logText(entry) {
    const line = L.log && L.log[entry.key];
    if (typeof line === 'function') return line(...(entry.args || []));
    return line || entry.key;
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
    // 纸带上的那句话在所有页面上都会淡掉，不只是对局里
    this.toast = Math.max(0, this.toast - dt);
    if (this.paused || this.state !== 'play') return;
    this.clock += dt;
    this.shake = Math.max(0, this.shake - dt * 14);
    this.flashWhite = Math.max(0, this.flashWhite - dt * 2.4);
    this.lampCooldown = Math.max(0, this.lampCooldown - dt);
    this.directorClock += dt;
    this.suppressFire = Math.max(0, (this.suppressFire || 0) - dt);
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
    overwatchTick(this);
    updateUnits(this, dt);
    this.breathe(dt);
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
      const pending = this.thralls.some((t) => t.death && !t.death.done);
      const cleared = this.kills >= this.thralls.length && !pending;
      const ready = !this.power && cleared;
      const exit = this.case.spawns.exit;
      for (const a of this.agents) {
        if (a.extracted || a.down || a.taken) continue;
        if (ready && Math.hypot(a.x - exit.x, a.y - exit.y) < 44) {
          a.extracted = true;
          this.extracted += 1;
          this.log('out', a.role);
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
    if (!this.settled) {
      this.settled = true;
      this.settlement = settle(this.roster, this);
      saveRoster(this.roster);
    }
    if (won) this.sound.win();
    else this.sound.lose();
    this.paused = false;
  }

  goRoster() {
    this.state = 'roster';
  }

  goHire() {
    this.state = 'hire';
  }

  goSelect() {
    this.state = 'select';
  }

  // 值班室里点一个候选人＝录用；钱不够或名册满了，纸面上要说一句。
  pickCandidate(id) {
    const c = this.roster.candidates.find((x) => x.id === id);
    if (!c) return false;
    if (this.roster.members.filter((m) => !m.dead).length >= 6) {
      this.say(L.hire.full);
      return false;
    }
    if (this.roster.cash < c.price) {
      this.say(L.hire.noCash);
      return false;
    }
    if (hire(this.roster, id)) {
      saveRoster(this.roster);
      this.say(L.hire.taken);
      return true;
    }
    return false;
  }

  freshWatch() {
    clearRoster();
    this.roster = createRoster();
    this.squad = squadForRun(this.roster);
    this.caseIndex = 0;
    this.state = 'roster';
    this.say(L.roster.freshLine);
  }

  useLamp() {
    if (this.state !== 'play' || this.lampCooldown > 0) return;
    const lamp = this.agents.find((a) => a.role === 'lamp' && !a.down && !a.taken && !a.extracted);
    if (!lamp) return;
    this.lampCooldown = this.roster.upgrades && this.roster.upgrades.lamp ? 12.6 : 14;
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
    this.suppressFire = 0.25;
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
    if (this.settingsOpen) {
      this.handleSettings(clicks, typed);
      return;
    }
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
        if (code === 'Escape') this.state = 'roster';
        continue;
      }
      if (this.state === 'roster') {
        if (code === 'Enter' || code === 'Space') this.state = 'select';
        if (code === 'Escape') this.state = 'camp';
        continue;
      }
      if (this.state === 'camp') {
        if (code === 'Escape') this.state = 'select';
        continue;
      }
      if (this.state === 'bench' || this.state === 'locker' || this.state === 'radio' || this.state === 'ledger') {
        if (code === 'Escape') this.state = 'camp';
        continue;
      }
      if (this.state === 'hire') {
        if (code === 'Enter' || code === 'Space' || code === 'Escape') {
          dismissCandidates(this.roster);
          this.state = 'roster';
        }
        continue;
      }
      if (this.state === 'brief' && (code === 'Enter' || code === 'Space')) {
        this.startRun();
        continue;
      }
      if (this.state === 'result' && (code === 'Enter' || code === 'Space')) {
        this.state = 'camp';
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
        if (tSettingsButtonAt(click.x, click.y)) {
          this.openSettings();
          continue;
        }
        if (tTitleLinkAt(click.x, click.y)) {
          this.onNavigate?.(L.otherHref);
          continue;
        }
        this.state = 'select';
        continue;
      }
      if (this.state === 'camp') {
        const hit = tCampAt(click.x, click.y);
        if (hit === 'board') this.state = 'select';
        else if (hit === 'roster' || hit === 'desk') this.state = 'roster';
        else if (hit === 'bench') this.state = 'bench';
        else if (hit === 'locker') this.state = 'locker';
        else if (hit === 'radio') this.state = 'radio';
        else if (hit === 'ledger') this.state = 'ledger';
        else if (hit === 'cot') this.campRest();
        continue;
      }
      if (this.state === 'bench') {
        if (tCampBackAt(click.x, click.y)) this.state = 'camp';
        else {
          const u = tBenchAt(click.x, click.y);
          if (u) this.campUpgrade(u.weapon, u.slot);
        }
        continue;
      }
      if (this.state === 'locker') {
        if (tCampBackAt(click.x, click.y)) this.state = 'camp';
        else {
          const u = tLockerAt(click.x, click.y);
          if (u) this.campSwap(u.row, u.weapon);
        }
        continue;
      }
      if (this.state === 'radio') {
        if (tCampBackAt(click.x, click.y)) this.state = 'camp';
        else {
          const u = tRadioAt(click.x, click.y);
          if (u === 'refresh') this.campRadio('refresh');
          if (u === 'intel') this.campRadio('intel');
        }
        continue;
      }
      if (this.state === 'ledger') {
        this.state = 'camp';
        continue;
      }
      if (this.state === 'select') {
        if (tSelectRosterAt(click.x, click.y)) {
          this.state = 'roster';
          continue;
        }
        const hit = tCaseAt(click.x, click.y, CASES.length);
        if (hit >= 0) {
          this.selectCase(hit);
          this.state = 'brief';
        }
        continue;
      }
      if (this.state === 'roster') {
        if (tRosterHireAt(click.x, click.y)) {
          this.state = 'hire';
          continue;
        }
        if (tRosterCasesAt(click.x, click.y)) {
          this.state = 'select';
          continue;
        }
        const card = tRosterCardAt(click.x, click.y, this.roster.members.length);
        if (card >= 0) {
          const m = this.roster.members[card];
          if (m && setDuty(this.roster, m.id)) {
            saveRoster(this.roster);
            this.say(L.roster.onDutyNow);
          }
          continue;
        }
        if (tRosterFreshAt(click.x, click.y)) {
          this.freshWatch();
          continue;
        }
        if (tRosterLampAt(click.x, click.y)) {
          if (buyLamp(this.roster)) {
            saveRoster(this.roster);
            this.say(L.roster.lampBought);
          } else {
            this.say(this.roster.upgrades.lamp ? L.roster.lampOwned : L.roster.lampBroken);
          }
        }
        continue;
      }
      if (this.state === 'hire') {
        if (tHireNoneAt(click.x, click.y)) {
          dismissCandidates(this.roster);
          this.state = 'roster';
          continue;
        }
        const c = this.roster.candidates[tHireAt(click.x, click.y, this.roster.candidates.length)];
        if (c) this.pickCandidate(c.id);
        continue;
      }
      if (this.state === 'brief') {
        this.startRun();
        continue;
      }
      if (this.state === 'result') {
        this.state = 'camp';
        continue;
      }
      if (this.state !== 'play' || this.paused) continue;
      if (this.possessed) continue;

      const w = screenToWorld(click.x, click.y);
      this.clickWorld(w.x, w.y);
    }
  }

  // 呼吸随「最近的敌人 / 血量 / 注视 / 脚步」变重；声像跟着提灯人。
  breathe(dt) {
    this.breathClock = (this.breathClock || 0) + dt;
    if (this.breathClock < 0.18) return;
    this.breathClock = 0;
    const live = this.agents.filter((a) => !a.down && !a.taken && !a.extracted);
    if (!live.length) return;
    let nearest = 9999;
    for (const t of this.thralls) {
      if (t.dead || t.noTarget) continue;
      for (const a of live) nearest = Math.min(nearest, Math.hypot(a.x - t.x, a.y - t.y));
    }
    const hp = Math.min(...live.map((a) => a.hp / a.maxHp));
    let gaze = 0;
    if (this.case.rule.kind === 'gaze') {
      for (const a of live) gaze = Math.max(gaze, (a.gaze || 0) / this.case.rule.limit);
    }
    const speed = Math.max(...live.map((a) => Math.hypot(a.vx, a.vy)));
    let level = (1 - Math.min(1, nearest / 460)) * 0.55
      + (1 - hp) * 0.4
      + gaze * 0.35
      + Math.min(1, speed / 140) * 0.15;
    level = Math.max(0, Math.min(1, level));
    const lamp = live.find((a) => a.role === 'lamp') || live[0];
    this.sound.breath?.(level, (lamp.x - 640) / 640);
    if (hp < 0.45 && this.clock - (this.lastHeart || 0) > 0.8 + hp) {
      this.lastHeart = this.clock;
      this.sound.heart?.();
    }
  }

  // ---- 营地 -----------------------------------------------------------------
  campUpgrade(weapon, slot) {
    const r = buyUpgrade(this.roster, weapon, slot);
    if (r.ok) {
      saveRoster(this.roster);
      this.say(L.camp.bought);
    } else {
      this.say(r.why === 'parts' ? L.camp.noParts : r.why === 'max' ? L.camp.maxed : L.hire.noCash);
    }
  }

  campSwap(row, weapon) {
    const m = squadOf(this.roster)[row];
    if (!m) return;
    if (setWeapon(this.roster, m.id, weapon)) {
      saveRoster(this.roster);
      this.say(L.camp.swapped);
    } else {
      this.say(this.roster.cash < 300 ? L.hire.noCash : L.camp.swapped);
    }
  }

  campRest() {
    const m = restOne(this.roster);
    if (m) {
      saveRoster(this.roster);
      this.say(L.camp.rested);
    }
  }

  campRadio(kind) {
    if (kind === 'refresh') {
      if (payForRefresh(this.roster)) {
        saveRoster(this.roster);
        this.say(L.camp.radioDone);
      } else {
        this.say(L.hire.noCash);
      }
    } else if (kind === 'intel') {
      if (buyIntel(this.roster, this.case.id)) {
        saveRoster(this.roster);
        this.say(L.camp.radioDone);
      } else {
        this.say(L.hire.noCash);
      }
    }
  }

  // ---- 设置面板 ------------------------------------------------------------  // 只改「看见的样子」与「听见的音量」；不改案子，也不改名册。

  openSettings() {
    this.settingsOpen = true;
    this.settingsRow = 0;
    this.settingsDrag = null;
  }

  closeSettings() {
    this.settingsOpen = false;
    this.settingsDrag = null;
  }

  settingRows() {
    return ['brightness', 'volume', 'grain'];
  }

  setSetting(key, value) {
    const [lo, hi] = LIMITS[key];
    this.settings[key] = Math.max(lo, Math.min(hi, Math.round(value * 100) / 100));
    if (key === 'volume') this.sound.setVolume(this.settings.volume);
    saveSettings(this.settings);
  }

  setSettingFromX(row, x) {
    const key = this.settingRows()[row];
    if (!key) return;
    const track = SETTINGS_TRACK;
    const [lo, hi] = LIMITS[key];
    const t = Math.max(0, Math.min(1, (x - track.x) / track.w));
    this.setSetting(key, lo + (hi - lo) * t);
  }

  toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        const out = document.exitFullscreen?.();
        if (out && out.catch) out.catch(() => {});
      } else {
        const into = document.documentElement.requestFullscreen?.();
        if (into && into.catch) into.catch(() => {});
      }
    } catch {
      /* 失败就什么也不做 */
    }
  }

  chooseLanguage(lang) {
    const now = L.cjk ? 'zh' : 'en';
    if (lang === now) return;
    setLanguage(lang);
    this.onNavigate?.(lang === 'zh' ? new URL('zh.html', window.location.href).href : new URL('index.html', window.location.href).href);
  }

  handleSettings(clicks, typed) {
    const rows = this.settingRows();
    for (const code of typed) {
      if (code === 'Escape') {
        this.closeSettings();
        continue;
      }
      if (code === 'Tab' || code === 'ArrowDown') {
        this.settingsRow = (this.settingsRow + 1) % 5;
        continue;
      }
      if (code === 'ArrowUp') {
        this.settingsRow = (this.settingsRow + 4) % 5;
        continue;
      }
      const row = rows[this.settingsRow];
      if (row && (code === 'ArrowLeft' || code === 'ArrowRight')) {
        this.setSetting(row, nudge(row, this.settings[row], code === 'ArrowRight' ? 1 : -1));
        continue;
      }
      if (this.settingsRow === 3 && (code === 'Enter' || code === 'ArrowLeft' || code === 'ArrowRight')) {
        this.chooseLanguage(L.cjk ? 'en' : 'zh');
        continue;
      }
      if (this.settingsRow === 4 && (code === 'Enter' || code === 'Space')) {
        this.toggleFullscreen();
      }
    }

    for (const click of clicks) {
      if (tSettingsCloseAt(click.x, click.y)) {
        this.closeSettings();
        continue;
      }
      if (tSettingsResetAt(click.x, click.y)) {
        this.settings = resetSettings();
        this.sound.setVolume(this.settings.volume);
        saveSettings(this.settings);
        continue;
      }
      const lang = tSettingsLangAt(click.x, click.y);
      if (lang) {
        this.chooseLanguage(lang);
        continue;
      }
      if (tSettingsFullAt(click.x, click.y)) {
        this.toggleFullscreen();
        continue;
      }
      const row = tSettingsRowAt(click.x, click.y);
      if (row >= 0) {
        this.settingsRow = row;
        this.settingsDrag = rows[row];
        this.setSettingFromX(row, click.x);
        continue;
      }
    }

    // 按住不放，数值跟着指针走；松手就停
    if (this.settingsDrag) {
      if (!this.input.down) {
        this.settingsDrag = null;
      } else {
        const row = rows.indexOf(this.settingsDrag);
        if (row >= 0) this.setSettingFromX(row, this.input.x);
      }
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
    // 点在队员身上＝接过他这一步（WASD 走、左键开火、ESC 松手）
    for (let i = 0; i < this.agents.length; i += 1) {
      const a = this.agents[i];
      if (a.down || a.taken || a.extracted) continue;
      if (Math.hypot(a.x - x, a.y - y) < 17) {
        this.takeOver(i);
        return;
      }
    }
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
    else if (this.state === 'camp') drawCamp(ctx, this, time);
    else if (this.state === 'bench') drawBench(ctx, this, time);
    else if (this.state === 'locker') drawLocker(ctx, this, time);
    else if (this.state === 'radio') drawRadio(ctx, this, time);
    else if (this.state === 'ledger') drawLedger(ctx, this, time);
    else if (this.state === 'roster') drawRoster(ctx, this, time);
    else if (this.state === 'hire') drawHire(ctx, this, time);
    else if (this.state === 'select') drawSelect(ctx, this, time);
    else if (this.state === 'brief') drawBrief(ctx, this, time);
    else if (this.state === 'play') drawHud(ctx, this, time);
    else if (this.state === 'result') drawResult(ctx, this, time);
    // 亮度在后期之后、遮幅之前；设置面板画在亮度上面，暗下来也读得清
    drawBrightness(ctx, this);
    if (this.settingsOpen) drawSettings(ctx, this, time);
    drawBars(ctx);
  }
}
