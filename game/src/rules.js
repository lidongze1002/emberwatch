// 规则：每一案只有一条，但必须是机制。这里同时放三样东西——规则怎么跑、目标怎么读、
// 队长（game.direct）怎么把这一案自动打完。渲染不认识这里，只读 game.rule 的状态。

import { HACHI } from './config.js';
import { L } from './text.js';
import { spawnBoss, spawnGazers, spawnMirrors } from './units.js';
import { lineClear, setExtras, solid } from './level.js';

const inZone = (zone, x, y) => !!zone && x > zone.x && x < zone.x + zone.w && y > zone.y && y < zone.y + zone.h;

function doorStand(d) {
  if (d.face === 'n') return { x: d.x, y: d.y + 30 };
  if (d.face === 's') return { x: d.x, y: d.y - 30 };
  if (d.face === 'e') return { x: d.x - 30, y: d.y };
  return { x: d.x + 30, y: d.y };
}

export function initRules(game) {
  const c = game.case;
  game.rule = { ...c.rule };
  game.power = true;
  game.pull = 0;
  game.pulling = false;
  const r = game.rule;
  if (c.rule.kind === 'knock') {
    r.dawn = c.rule.dawn;
    r.nextKnock = 6;
    r.knock = null;
    r.dismissCd = 0;
    r.dismissed = 0;
    r.wp = 0;
    r.wpAt = 0;
    spawnBoss(game);
  }
  if (c.rule.kind === 'timetable') {
    r.phase = 0;
    r.phaseT = 0;
    r.open = c.rule.order[0];
    r.admitted = 0;
    r.ejected = 0;
    setExtras(game.level, shuttersOf(game));
  }
  if (c.rule.kind === 'gaze') {
    r.avertCd = 0;
    r.taken = 0;
    r.lit = false;
    r.lightT = 0;
    spawnGazers(game);
    spawnBoss(game);
  }
  if (c.rule.kind === 'floors') {
    r.floor = 1;
    r.loops = 0;
    r.gateOpen = false;
    r.transition = 0;
    r.lastDoor = -1;
    r.plates = c.rule.plates[0].slice();
  }
}

function shuttersOf(game) {
  const out = [];
  for (const [name, rect] of Object.entries(game.case.rule.shutters)) {
    if (name !== game.rule.open) out.push(rect);
  }
  // 这一班已经放过一个人：门在他身后合上
  if (game.rule.admitted >= 1) out.push(game.case.rule.shutters[game.rule.open]);
  return out;
}

export function updateRules(game, dt) {
  const r = game.rule;
  const c = game.case;
  if (c.rule.kind === 'power') {
    // 电闸：一个人在后台站 1.2 秒，礼堂就安静
    const sw = c.spawns.switchboard;
    const atSwitch = game.standing().some((a) => Math.hypot(a.x - sw.x, a.y - sw.y) < 56);
    game.pulling = atSwitch && game.power;
    if (game.pulling) {
      game.pull += dt;
      if (game.pull >= c.rule.pullSeconds) {
        game.power = false;
        game.pull = 0;
        game.flashWhite = 0.6;
        game.say(L.hud.quiet);
        game.sound.power();
        spawnBoss(game);
      }
    } else {
      game.pull = Math.max(0, game.pull - dt * 2);
    }
    return;
  }

  if (c.rule.kind === 'knock') {
    if (r.dismissCd > 0) r.dismissCd = Math.max(0, r.dismissCd - dt);
    const dawn = game.clock >= r.dawn;
    if (dawn && !r.dawned) {
      r.dawned = true;
      game.flashWhite = 0.35;
      game.sound.dawn();
      game.say(L.hud.dawnBreak);
      for (const t of game.thralls) if (t.kind === 'hachi') t.dormant = true;
    }
    if (!dawn && !r.knock && game.clock >= r.nextKnock) {
      startKnock(game);
    }
    if (r.knock) updateKnock(game, dt);
    return;
  }

  if (c.rule.kind === 'timetable') {
    r.phaseT += dt;
    if (r.phaseT >= c.rule.phaseSeconds) {
      r.phaseT = 0;
      r.phase = (r.phase + 1) % c.rule.order.length;
      r.open = c.rule.order[r.phase];
      r.admitted = 0;
      // 换班：还留在门斗里（或正卡在门框上）的人被卷帘门推回站台
      for (const a of game.agents) {
        if (a.down || a.taken || a.extracted) continue;
        let caught = false;
        for (const [name, zone] of Object.entries(c.zones)) {
          if (name === 'platform') continue;
          if (inZone(zone, a.x, a.y)) caught = true;
        }
        for (const [name, rect] of Object.entries(c.rule.shutters)) {
          if (name === r.open) continue;
          const [sx, sy, sw, sh] = rect;
          const pad = 24;
          if (a.x > sx - pad && a.x < sx + sw + pad && a.y > sy - pad && a.y < sy + sh + pad) caught = true;
        }
        if (caught) {
          a.hp = Math.max(1, a.hp - 2);
          a.flash = 1;
          a.x = c.spawns.wait.x + (Math.random() - 0.5) * 40;
          a.y = c.spawns.wait.y + (Math.random() - 0.5) * 30;
          a.path = null;
          a.order = { kind: 'hold' };
          a.stuckT = 0;
          r.ejected += 1;
        }
      }
      game.shake = 5;
      game.sound.door();
      game.say(L.hud.gateChange(L.hud.gates[r.open], Math.ceil(c.rule.phaseSeconds)));
    }
    const list = shuttersOf(game);
    if ((r.shutterKey || '') !== list.map((x) => x.join(',')).join('|')) {
      r.shutterKey = list.map((x) => x.join(',')).join('|');
      setExtras(game.level, list);
    }
    return;
  }

  if (c.rule.kind === 'gaze') {
    if (r.avertCd > 0) r.avertCd = Math.max(0, r.avertCd - dt);
    // 借火：提灯要先在田中央的石灯上点着，才谈得上送进农舍
    if (!r.lit) {
      const lamp = game.agents.find((a) => a.role === 'lamp' && !a.down && !a.taken && !a.extracted);
      const at = game.case.rule.lamp;
      if (lamp && Math.hypot(lamp.x - at.x, lamp.y - at.y) < 62) {
        r.lightT += dt;
        if (r.lightT >= 1.2) {
          r.lit = true;
          game.flashWhite = 0.4;
          game.sound.flash();
          game.say(L.hud.lampLit);
        }
      } else {
        r.lightT = Math.max(0, r.lightT - dt);
      }
    }
    // 注视：枪口方向、距离、遮挡，三者同时成立才累积
    for (const k of game.thralls) {
      if (k.kind !== 'kune' || k.dead) continue;
      k.agitation = 0;
    }
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) continue;
      let exposure = 0;
      for (const k of game.thralls) {
        if (k.kind !== 'kune' || k.dead) continue;
        const d = Math.hypot(k.x - a.x, k.y - a.y);
        if (d > r.range) continue;
        let da = Math.atan2(k.y - a.y, k.x - a.x) - a.aim;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > r.cone) continue;
        if (!lineClear(a.x, a.y, k.x, k.y, 4)) continue;
        k.agitation = 1;
        const near = 1 - Math.min(1, d / r.range) * 0.5;
        exposure = Math.max(exposure, (k.rate || 1) * near);
      }
      if (exposure > 0) {
        a.gaze += dt * exposure;
        a.state = a.aversion > 0 ? a.state : 'watching';
        if (a.gaze >= r.limit) {
          a.gaze = r.limit;
          a.taken = true;
          a.path = null;
          r.taken += 1;
          game.shake = 8;
          game.sound.lose();
          game.log(`${a.role} kept looking.`);
          game.say(L.hud.lostOne);
        }
      } else {
        a.gaze = Math.max(0, a.gaze - dt * r.decay);
      }
    }
    return;
  }

  if (c.rule.kind === 'floors') {
    if (r.transition > 0) r.transition = Math.max(0, r.transition - dt);
    // 走进一扇门：门牌等于本层的号，才对
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) continue;
      if (a.order.kind !== 'goto') continue;
      for (let i = 0; i < c.doors.length; i += 1) {
        const d = c.doors[i];
        const stand = { x: d.x + d.nx * 26, y: d.y + d.ny * 26 };
        if (Math.hypot(a.order.x - stand.x, a.order.y - stand.y) < 30 && Math.hypot(a.x - stand.x, a.y - stand.y) < 26) {
          resolveDoor(game, i);
          return;
        }
      }
    }
    return;
  }
}

// ---- 第二案：应门 ---------------------------------------------------------

function startKnock(game) {
  const r = game.rule;
  const doors = game.case.doors;
  let best = 0;
  let bestScore = Infinity;
  const alive = game.agents.filter((a) => !a.down && !a.taken && !a.extracted);
  if (!alive.length) return;
  for (let i = 0; i < doors.length; i += 1) {
    const d = doors[i];
    let near = Infinity;
    for (const a of alive) near = Math.min(near, Math.hypot(a.x - d.x, a.y - d.y));
    // 不敲就在脚边的门，也不敲太远的门
    const score = near < 120 ? near + 900 : Math.abs(near - 260);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  r.knock = { door: best, warn: r.warn, live: r.warn + 4.2, answered: 0 };
  game.sound.knock();
  game.say(L.hud.knock);
  game.log('a door is being knocked on.');
}
function updateKnock(game, dt) {
  const r = game.rule;
  const k = r.knock;
  const door = game.case.doors[k.door];
  k.warn -= dt;
  k.live -= dt;
  if (k.warn > 0) return;
  // 提示结束：340 px 内的人自己把目标改成那扇门
  if (!k.pulled && !k.dismissed) {
    k.pulled = true;
    const stand = doorStand(door);
    for (const a of game.free()) {
      const d = Math.hypot(a.x - door.x, a.y - door.y);
      if (d < r.radius) {
        a.order = { kind: 'goto', x: stand.x, y: stand.y };
        a.path = null;
        a.answered = k.door;
        k.answered += 1;
      }
    }
    if (k.answered) game.say(L.hud.answered(k.answered));
  }
  // 走到门边的人，被门后的人抓走
  for (const a of game.agents) {
    if (a.down || a.taken || a.extracted) continue;
    if (a.answered !== k.door) continue;
    if (Math.hypot(a.x - door.x, a.y - door.y) < 44) {
      a.down = true;
      a.hp = 0;
      a.revive = 0;
      a.answered = null;
      game.shake = 10;
      game.sound.hurt();
      game.log(`${a.role} answered the door.`);
      game.say(L.hud.grabbed);
      const hachi = game.thralls.find((t) => t.kind === 'hachi' && !t.dead);
      if (hachi) {
        const stand = doorStand(door);
        hachi.x = stand.x;
        hachi.y = stand.y;
        hachi.path = null;
        hachi.feed = 0.4;
        // 每一次应门，她都被叫得更近一点：这不是数值，是规则的代价
        hachi.grabs = (hachi.grabs || 0) + 1;
        hachi.speed = Math.min(72, HACHI.speed + hachi.grabs * 6);
      }
      r.knock = null;
      r.nextKnock = game.clock + r.knockEvery + 3;
      return;
    }
  }
  if (k.live <= 0) {
    r.knock = null;
    r.nextKnock = game.clock + 3.2;
  }
}

// 「别应门」：打断所有被吸引的人，代价是冷却
export function dismiss(game) {
  const r = game.rule;
  if (game.state !== 'play' || r.kind !== 'knock') return false;
  if (r.dismissCd > 0) return false;
  let any = false;
  for (const a of game.agents) {
    if (a.answered === null || a.answered === undefined) continue;
    a.answered = null;
    a.order = { kind: 'hold' };
    a.path = null;
    any = true;
  }
  if (r.knock) {
    r.knock.dismissed = true;
    r.knock.answered = 0;
  }
  if (any) {
    for (const a of game.free()) {
      a.order = { kind: 'hold' };
      a.path = null;
    }
  }
  r.dismissCd = game.case.rule.dismissCd;
  r.dismissed += 1;
  game.sound.dismiss();
  game.say(L.hud.refused);
  return true;
}

// ---- 第四案：移开目光 -----------------------------------------------------

export function avert(game) {
  const r = game.rule;
  if (game.state !== 'play' || r.kind !== 'gaze' || r.avertCd > 0) return false;
  r.avertCd = game.case.rule.avertCd;
  let any = false;
  for (const a of game.agents) {
    if (a.down || a.taken || a.extracted) continue;
    const k = nearestGazer(game, a);
    if (!k) continue;
    a.aversion = game.case.rule.avertTime;
    a.avertAngle = Math.atan2(a.y - k.y, a.x - k.x);
    a.gaze = Math.max(0, a.gaze - 0.35);
    any = true;
  }
  if (any) {
    game.sound.avert();
    game.say(L.hud.averted);
  }
  return any;
}

function nearestGazer(game, a) {
  let best = null;
  let bestD = Infinity;
  for (const k of game.thralls) {
    if (k.kind !== 'kune' || k.dead) continue;
    const d = Math.hypot(k.x - a.x, k.y - a.y);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

// ---- 第五案：门与层 -------------------------------------------------------

function mirrorSpots(game) {
  const c = game.case;
  const r = game.rule;
  const spots = [
    { x: 420, y: 660 }, { x: 244, y: 430 }, { x: 1040, y: 300 },
  ];
  // 一个复制品就站在这一层那扇门前面：换层不是脱战，是换一间有你的房间
  if (r && r.plates && c.doors && c.rule.wanted) {
    const want = c.rule.wanted[Math.min(r.floor, c.rule.floors) - 1];
    const idx = r.plates.indexOf(want);
    if (idx >= 0) {
      const d = c.doors[idx];
      spots[0] = { x: d.x + d.nx * 74, y: d.y + d.ny * 74 };
    }
  }
  return spots;
}

function teleportSquad(game) {
  const c = game.case;
  const spots = c.spawns.agents;
  game.agents.forEach((a, i) => {
    const s = spots[i] || spots[0];
    a.x = s.x;
    a.y = s.y;
    a.path = null;
    a.vx = 0;
    a.vy = 0;
    a.order = { kind: 'hold' };
    a.aversion = 0;
  });
}

function resolveDoor(game, index) {
  const r = game.rule;
  const c = game.case;
  const got = r.plates[index];
  const want = c.rule.wanted[r.floor - 1];
  r.lastDoor = index;
  if (got === want) {
    r.floor += 1;
    game.flashWhite = 0.5;
    game.sound.door();
    if (r.floor > c.rule.floors) {
      r.floor = c.rule.floors + 1;
      r.gateOpen = true;
      game.say(L.hud.thirteenth);
      game.log('the stairs are where they always were.');
      teleportSquad(game);
      return;
    }
    game.say(L.hud.floorUp(r.floor, c.rule.floors));
    game.log(`floor ${r.floor}.`);
    r.plates = c.rule.plates[(r.floor - 1) % c.rule.plates.length].slice();
    teleportSquad(game);
    if (r.floor >= 2) spawnMirrorWave(game);
  } else {
    r.loops += 1;
    r.floor = 1;
    r.plates = c.rule.plates[0].slice();
    game.shake = 9;
    game.flashWhite = 0.3;
    game.sound.lose();
    game.say(L.hud.wrongDoor);
    game.log('the same corridor. the same carpet.');
    teleportSquad(game);
    spawnMirrorWave(game);
  }
}

function spawnMirrorWave(game) {
  game.thralls = game.thralls.filter((t) => t.kind !== 'mirror');
  spawnMirrors(game, mirrorSpots(game));
}

// ---- 结算与目标 -----------------------------------------------------------

export function afterRules(game, dt) {
  const r = game.rule;
  const c = game.case;
  if (c.rule.kind === 'power') return;
  if (c.rule.kind === 'knock') {
    // 楼梯间：天亮之后才开，而且不把倒下的人留在楼上
    if (game.clock >= r.dawn && !game.agents.some((a) => a.down)) {
      for (const a of game.agents) {
        if (a.extracted || a.down || a.taken) continue;
        if (inZone(c.zones.stair, a.x, a.y)) {
          a.extracted = true;
          game.extracted += 1;
          game.log(`${a.role} is down the stairs.`);
        }
      }
    }
    return;
  }
  if (c.rule.kind === 'timetable') {
    for (const a of game.agents) {
      if (a.extracted || a.down || a.taken) continue;
      const zone = c.zones[r.open];
      if (inZone(zone, a.x, a.y)) {
        a.extracted = true;
        game.extracted += 1;
        r.admitted += 1;
        game.sound.win();
        game.log(`${a.role} is through the ${r.open} gate.`);
        game.say(L.hud.gateAdmit(L.hud.gates[r.open]));
      }
    }
    return;
  }
  if (c.rule.kind === 'gaze') {
    for (const a of game.agents) {
      if (a.extracted || a.down || a.taken) continue;
      // 进农舍这一刻，眼睛必须是挪开的：门里那盏灯不接一个还在看的人
      if (r.lit && inZone(c.zones.gate, a.x, a.y) && a.gaze < c.rule.limit * 0.55) {
        a.extracted = true;
        game.extracted += 1;
        game.log(`${a.role} is inside the farmhouse.`);
        if (a.role === 'lamp') game.say(L.hud.lampIn);
      }
    }
    return;
  }
  if (c.rule.kind === 'floors') {
    if (!r.gateOpen) return;
    if (game.agents.some((a) => a.down)) return;
    for (const a of game.agents) {
      if (a.extracted || a.down || a.taken) continue;
      if (inZone(c.zones.stair, a.x, a.y)) {
        a.extracted = true;
        game.extracted += 1;
        game.log(`${a.role} is out of the thirteenth floor.`);
      }
    }
  }
}

export function verdict(game) {
  const r = game.rule;
  const c = game.case;
  const alive = game.agents.filter((a) => !a.down && !a.taken && !a.extracted);
  const remaining = game.agents.filter((a) => !a.taken && !a.extracted);

  if (c.rule.kind === 'power') {
    const cleared = game.kills >= game.thralls.length;
    const done = !game.power && cleared;
    if (remaining.length === 0) return done ? 'win' : 'lose';
    if (!remaining.some((a) => !a.down)) return 'lose';
    return null;
  }

  if (c.rule.kind === 'knock') {
    const out = game.agents.filter((a) => !a.taken);
    const allOut = out.length > 0 && out.every((a) => a.extracted);
    if (allOut && !game.agents.some((a) => a.down)) return 'win';
    if (!alive.length && game.extracted === 0) return 'lose';
    if (game.clock >= r.dawn && game.clock > r.dawn + 40) return 'lose';
    return null;
  }

  if (c.rule.kind === 'timetable') {
    if (game.extracted >= game.agents.length) return 'win';
    if (game.clock > c.rule.lastTrain) return 'lose';
    if (!alive.length) return 'lose';
    return null;
  }

  if (c.rule.kind === 'gaze') {
    const lamp = game.agents.find((a) => a.role === 'lamp');
    if (!lamp || lamp.taken) return 'lose';
    if (lamp.extracted) return 'win';
    if (!alive.length) return 'lose';
    if (game.clock > 180) return 'lose';
    return null;
  }

  if (c.rule.kind === 'floors') {
    if (!alive.length && game.extracted === 0) return 'lose';
    if (r.gateOpen) {
      const out = game.agents.filter((a) => !a.taken);
      if (out.length && out.every((a) => a.extracted)) return 'win';
    }
    if (game.clock > 300) return 'lose';
    return null;
  }
  return null;
}

export function objectives(game) {
  const r = game.rule;
  const c = game.case;
  const T = L.cases[c.id].obj;
  if (c.rule.kind === 'power') {
    return [
      { text: T[0], value: game.power ? '—' : L.hud.done, done: !game.power },
      { text: T[1], value: `${game.kills} / ${game.thralls.length}`, done: game.kills >= game.thralls.length },
      { text: T[2], value: `${game.extracted} / ${game.agents.length}`, done: game.won },
    ];
  }
  if (c.rule.kind === 'knock') {
    return [
      { text: T[0], value: L.hud.dawnIn(Math.max(0, Math.ceil(r.dawn - game.clock))), done: game.clock >= r.dawn },
      { text: T[1], value: `${game.extracted} / ${game.agents.length}`, done: game.won },
    ];
  }
  if (c.rule.kind === 'timetable') {
    return [
      { text: T[0], value: L.hud.gates[r.open], done: false },
      { text: T[1], value: `${game.extracted} / ${game.agents.length}`, done: game.won },
      { text: T[2], value: L.hud.secondsLeft(Math.max(0, Math.ceil(c.rule.lastTrain - game.clock))), done: game.clock > c.rule.lastTrain },
    ];
  }
  if (c.rule.kind === 'gaze') {
    const lamp = game.agents.find((a) => a.role === 'lamp');
    return [
      { text: T[0], value: r.lit ? L.hud.done : L.hud.lampOut, done: r.lit },
      { text: T[1], value: lamp && lamp.extracted ? L.hud.done : '—', done: !!(lamp && lamp.extracted) },
      { text: T[2], value: `${game.extracted} / ${game.agents.length}`, done: game.won },
    ];
  }
  if (c.rule.kind === 'floors') {
    return [
      { text: T[0], value: r.gateOpen ? L.hud.done : `${Math.min(r.floor, c.rule.floors)} / ${c.rule.floors}`, done: r.gateOpen },
      { text: T[1], value: L.hud.doorNo(c.rule.wanted[Math.min(r.floor, c.rule.floors) - 1]), done: false },
      { text: T[2], value: `${game.extracted} / ${game.agents.length}`, done: game.won },
    ];
  }
  return [];
}

// 右侧那条「本案规则」读数
export function readout(game) {
  const r = game.rule;
  const c = game.case;
  if (c.rule.kind === 'power') {
    return { stamp: game.power ? L.hud.stampLive : L.hud.stampCut, line: game.power ? L.hud.music : L.hud.quiet, live: game.power };
  }
  if (c.rule.kind === 'knock') {
    if (r.knock) return { stamp: L.hud.stampKnock, line: L.hud.knockAt(r.knock.door + 1), live: true };
    return { stamp: L.hud.stampNight, line: L.hud.dawnIn(Math.max(0, Math.ceil(r.dawn - game.clock))), live: false };
  }
  if (c.rule.kind === 'timetable') {
    const left = Math.ceil(c.rule.phaseSeconds - r.phaseT);
    return { stamp: L.hud.stampGate, line: r.admitted >= 1 ? L.hud.oneThrough : L.hud.nextGate(L.hud.gates[r.open], left), live: true };
  }
  if (c.rule.kind === 'gaze') {
    let worst = 0;
    for (const a of game.agents) if (!a.down && !a.taken) worst = Math.max(worst, a.gaze / c.rule.limit);
    return {
      stamp: r.avertCd > 0 ? L.hud.stampAvert : L.hud.stampGaze,
      line: r.avertCd > 0
        ? L.hud.avertReady(Math.ceil(r.avertCd))
        : r.lit ? L.hud.gazePct(Math.round(worst * 100)) : L.hud.lampOut,
      live: worst > 0.5,
    };
  }
  if (c.rule.kind === 'floors') {
    return {
      stamp: L.hud.stampFloor,
      line: r.gateOpen ? L.hud.stairOpen : L.hud.floorLine(Math.min(r.floor, c.rule.floors), c.rule.floors, c.rule.wanted[Math.min(r.floor, c.rule.floors) - 1]),
      live: true,
      loops: r.loops,
    };
  }
  return { stamp: '', line: '', live: false };
}

// ---- 队长（全自动） -------------------------------------------------------

function sendAll(game, x, y, force = false) {
  const r = game.rule;
  if (!force && r.lastTarget && Math.hypot(r.lastTarget.x - x, r.lastTarget.y - y) < 36) {
    // 目标没变：只补发那些已经停下的人
    const list = game.free();
    list.forEach((a, i) => {
      if (a.order.kind === 'revive' || a.order.kind === 'focus') return;
      if (a.order.kind === 'hold') {
        const off = SLOT[i % SLOT.length];
        let tx = x + off[0];
        let ty = y + off[1];
        if (solid(tx, ty, 14)) {
          tx = x;
          ty = y;
        }
        a.order = { kind: 'goto', x: tx, y: ty };
        a.path = null;
        a.goal = null;
      }
    });
    return;
  }
  r.lastTarget = { x, y };
  const list = game.free();
  list.forEach((a, i) => {
    if (a.order.kind === 'revive') return;
    // 三个人不要挤在同一个点上：各站一处，错开一个身位；错到墙里就退回中心点
    const off = SLOT[i % SLOT.length];
    let tx = x + off[0];
    let ty = y + off[1];
    if (solid(tx, ty, 14)) {
      tx = x;
      ty = y;
    }
    a.order = { kind: 'goto', x: tx, y: ty };
    a.path = null;
    a.goal = null;
  });
}

const SLOT = [[0, 0], [-24, 16], [24, 16], [-24, -16], [24, -16]];

export function directRules(game) {
  const r = game.rule;
  const c = game.case;
  if (c.rule.kind === 'power') {
    const sw = c.spawns.switchboard;
    const nearSwitch = game.agents.some((a) => !a.down && !a.taken && Math.hypot(a.x - sw.x, a.y - sw.y) < 56);
    if (game.power) {
      if (!nearSwitch) sendAll(game, sw.x, sw.y + 34);
      return;
    }
    const alive = game.thralls.filter((t) => !t.dead);
    if (alive.length) {
      let best = null;
      let bestDist = Infinity;
      for (const t of alive) {
        for (const a of game.free()) {
          const d = Math.hypot(t.x - a.x, t.y - a.y);
          if (d < bestDist) {
            bestDist = d;
            best = t;
          }
        }
      }
      const focusing = game.agents.some((a) => a.order.kind === 'focus' && a.order.target && !a.order.target.dead);
      if (!focusing) {
        for (const a of game.free()) {
          if (a.order.kind === 'revive') continue;
          a.order = { kind: 'focus', target: best };
          a.path = null;
        }
      }
      return;
    }
    sendAll(game, c.spawns.exit.x, c.spawns.exit.y);
    return;
  }

  if (c.rule.kind === 'knock') {
    // 有人被门吸走了：立刻「别应门」
    const pulled = game.agents.some((a) => a.answered !== null && a.answered !== undefined && !a.down);
    if (pulled && r.dismissCd <= 0) dismiss(game);
    if (game.clock >= r.dawn - 9) {
      sendAll(game, c.spawns.exit.x, c.spawns.exit.y);
      return;
    }
    if (pulled) return;
    const loop = c.rule.loop;
    const wp = loop[r.wp % loop.length];
    if (game.clock >= r.wpAt) {
      let arrived = 0;
      let total = 0;
      for (const a of game.free()) {
        total += 1;
        if (Math.hypot(a.x - wp.x, a.y - wp.y) < 90) arrived += 1;
      }
      if (total === 0 || arrived >= Math.max(1, total - 0) || game.clock - (r.wpClock || 0) > 11) {
        r.wp = (r.wp + 1) % loop.length;
        r.wpClock = game.clock;
        r.wpAt = game.clock + 0.1;
        const next = loop[r.wp];
        sendAll(game, next.x, next.y, true);
      } else {
        sendAll(game, wp.x, wp.y);
      }
    }
    return;
  }

  if (c.rule.kind === 'timetable') {
    if (r.admitted >= 1) return;
    const gate = c.rule.gates[r.open];
    const left = c.rule.phaseSeconds - r.phaseT;
    // 还有时间就派最近的一两个人先走；来不及就等在站台中央
    if (left > 5) sendAll(game, gate.x, gate.y);
    else sendAll(game, c.spawns.wait.x, c.spawns.wait.y);
    return;
  }

  if (c.rule.kind === 'gaze') {
    const lamp = game.agents.find((a) => a.role === 'lamp' && !a.taken && !a.down) || game.agents[0];
    let near = Infinity;
    let worst = 0;
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) continue;
      worst = Math.max(worst, a.gaze || 0);
      for (const k of game.thralls) {
        if (k.kind !== 'kune') continue;
        near = Math.min(near, Math.hypot(k.x - a.x, k.y - a.y));
      }
    }
    if (r.avertCd <= 0 && (near < 300 || worst > c.rule.limit * 0.5)) avert(game);
    if (!r.lit) {
      sendAll(game, c.rule.lamp.x, c.rule.lamp.y);
      return;
    }
    if (r.wp === undefined) r.wp = 1;
    const dike = c.rule.dike;
    const wp = dike[Math.min(r.wp, dike.length - 1)];
    const d = Math.hypot((lamp.x || 0) - wp.x, (lamp.y || 0) - wp.y);
    if (d < 70 && r.wp < dike.length - 1) {
      r.wp += 1;
      sendAll(game, dike[r.wp].x, dike[r.wp].y, true);
    } else {
      sendAll(game, wp.x, wp.y);
    }
    return;
  }

  if (c.rule.kind === 'floors') {
    if (r.gateOpen) {
      sendAll(game, c.spawns.exit.x, c.spawns.exit.y);
      return;
    }
    const want = c.rule.wanted[Math.min(r.floor, c.rule.floors) - 1];
    let idx = r.plates.indexOf(want);
    if (idx < 0) idx = 0;
    const d = c.doors[idx];
    sendAll(game, d.x + d.nx * 26, d.y + d.ny * 26);
    return;
  }
}

// 供界面用：接管/提灯之外的两个主动作
export function actionA(game) {
  if (game.rule.kind === 'knock') return dismiss(game);
  if (game.rule.kind === 'gaze') return avert(game);
  return false;
}
