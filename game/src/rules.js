// 规则：每一案只有一条，但必须是机制。这里同时放三样东西——规则怎么跑、目标怎么读、
// 队长（game.direct）怎么把这一案自动打完。渲染不认识这里，只读 game.rule 的状态。

import { HACHI } from './config.js';
import { L } from './text.js';
import { spawnBoss, spawnEcho, spawnGazers, spawnMirrors } from './units.js';
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
    r.manifestCd = 7;
    r.knocks = 0;
    spawnBoss(game);
  }
  if (c.rule.kind === 'timetable') {
    r.phase = 0;
    r.phaseT = 0;
    r.open = c.rule.order[0];
    r.admitted = 0;
    r.ejected = 0;
    // 一张票只卖给一个人：上车前先到小卖亭拿票
    r.tickets = 0;
    for (const a of game.agents) {
      a.ticket = false;
      a.ticketT = 0;
    }
    setExtras(game.level, shuttersOf(game));
  }
  if (c.rule.kind === 'gaze') {
    r.avertCd = 0;
    r.taken = 0;
    r.lit = false;
    r.lights = 0;
    r.lightT = 0;
    r.heat = 0;
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
    r.contested = 0;
    r.race = null;
    game.copyThrough = () => copyThrough(game);
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
        const t = spawnBoss(game);
        // 她起身这一下是一颗镜头：0.8 秒推到台口，给一个剪影，再交还跟随。
        if (t) {
          game.shot = { kind: 'rise', x: t.x, y: t.y + 100, scale: 1.92, t: 0 };
          t.rise = 0;
        }
      }
    } else {
      game.pull = Math.max(0, game.pull - dt * 2);
    }
    return;
  }

  if (c.rule.kind === 'knock') {
    if (r.dismissCd > 0) r.dismissCd = Math.max(0, r.dismissCd - dt);
    if (r.manifestCd > 0) r.manifestCd = Math.max(0, r.manifestCd - dt);
    const dawn = game.clock >= r.dawn;
    if (dawn && !r.dawned) {
      r.dawned = true;
      game.flashWhite = 0.35;
      game.sound.dawn();
      game.say(L.hud.dawnBreak);
      for (const t of game.thralls) if (t.kind === 'hachi') t.dormant = true;
    }
    if (!dawn) maybeManifest(game);
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
    // 借火：两盏石灯各要站 1.2 秒。第一盏点着之后，第二条田埂南口那盏还是黑的。
    if (!r.lit) {
      const lamp = game.agents.find((a) => a.role === 'lamp' && !a.down && !a.taken && !a.extracted);
      const lamps = c.rule.lamps;
      const at = lamps[Math.min(r.lights, lamps.length - 1)];
      if (lamp && Math.hypot(lamp.x - at.sx, lamp.y - at.sy) < 56) {
        r.lightT += dt;
        if (r.lightT >= 1.2) {
          r.lights += 1;
          r.lightT = 0;
          game.flashWhite = 0.35;
          game.sound.flash();
          if (r.lights >= lamps.length) {
            r.lit = true;
            game.say(L.hud.lampLit);
            game.log('the lantern is lit. the field goes quiet.');
          } else {
            game.say(L.hud.lampHalf);
            game.log('one lantern. the other is still dark.');
          }
        }
      } else {
        r.lightT = Math.max(0, r.lightT - dt);
      }
    }
    // 注视：枪口方向、距离、遮挡，三者同时成立才累积
    for (const k of game.thralls) {
      if (k.kind !== 'kune' || k.dead) continue;
      k.agitation = 0;
      k.hunt && (k.hunt.heat = 0);
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
    // 她盯着谁，就走得越快：注视条越高，大くねくね越不肯待在原地。
    let heat = 0;
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) continue;
      heat = Math.max(heat, (a.gaze || 0) / r.limit);
    }
    r.heat = heat;
    for (const k of game.thralls) {
      if (k.kind === 'kune' && k.hunt) k.hunt.heat = heat;
    }
    return;
  }

  if (c.rule.kind === 'floors') {
    if (r.transition > 0) r.transition = Math.max(0, r.transition - dt);
    // 第三层起，守着你那扇门的复制品也会往门里走：它看你走了两层，学会了那个号。
    if (!r.contested && r.race === null && r.floor >= 3) {
      const guard = game.thralls.find((t) => t.kind === 'mirror' && t.gate && !t.dead && !t.racing);
      if (guard) {
        const want = c.rule.wanted[Math.min(r.floor, c.rule.floors) - 1];
        const idx = r.plates.indexOf(want);
        if (idx >= 0) {
          const d = c.doors[idx];
          const stand = { x: d.x + d.nx * 26, y: d.y + d.ny * 26 };
          let near = Infinity;
          for (const a of game.agents) {
            if (a.down || a.taken || a.extracted) continue;
            near = Math.min(near, Math.hypot(a.x - stand.x, a.y - stand.y));
          }
          if (near < 470) {
            // 它从门边站出来：刚才它就在那扇门后，只是没人在看。
            if (guard.post) {
              guard.x = guard.post.x;
              guard.y = guard.post.y;
              guard.path = null;
            }
            guard.cooldown = Math.max(guard.cooldown, 0.7);
            guard.racing = true;
            guard.raceDoor = idx;
            r.race = idx + 1;
            game.sound.knock();
            game.say(L.hud.race);
            game.log('it knows the number too.');
          }
        }
      }
    }
    if (r.race !== null) {
      const g2 = game.thralls.find((t) => t.kind === 'mirror' && t.racing);
      if (!g2 || g2.dead) {
        // 它没走到门口就被按下了：这一层是自己的。
        r.race = null;
        r.contested = 1;
      }
    }
    // 走到一扇门前，低头读一下牌子（0.45 秒）；牌子上的号等于本层的号才对。
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) {
        a.readT = 0;
        continue;
      }
      let at = -1;
      for (let i = 0; i < c.doors.length; i += 1) {
        const d = c.doors[i];
        const stand = { x: d.x + d.nx * 26, y: d.y + d.ny * 26 };
        if (Math.hypot(a.x - stand.x, a.y - stand.y) >= 26) continue;
        // 只有「被派到这扇门前」才算在读它：路过不算。
        const ordered = a.order.kind === 'goto' && Math.hypot(a.order.x - stand.x, a.order.y - stand.y) < 30;
        const arrived = a.order.kind === 'hold' && a.goal && Math.hypot(a.goal.x - stand.x, a.goal.y - stand.y) < 40;
        if (ordered || arrived) {
          at = i;
          break;
        }
      }
      if (at < 0) {
        a.readT = 0;
        continue;
      }
      a.readT = (a.readT || 0) + dt;
      if (a.readT > 0.45) {
        a.readT = 0;
        resolveDoor(game, at);
        return;
      }
    }
    return;
  }
}

// ---- 第二案：应门 ---------------------------------------------------------

// 她从不「跑」过来。她只在你没看的时候，从下一扇门里出来，站在你要走的那条路上。
function maybeManifest(game) {
  const r = game.rule;
  const c = game.case;
  if (r.manifestCd > 0) return;
  const hachi = game.thralls.find((t) => t.kind === 'hachi' && !t.dead);
  if (!hachi || hachi.dormant || hachi.feed > 0 || hachi.stun > 0) return;
  const alive = game.agents.filter((a) => !a.down && !a.taken && !a.extracted);
  if (alive.length < 2) return;
  // 天快亮了，她就不出去拦了：这一夜的最后一段留给楼梯
  if (game.clock > r.dawn - 16) return;
  if (r.knock) return;
  // 有人在看她，她就不动
  for (const a of alive) if (lineClear(a.x, a.y, hachi.x, hachi.y, 4)) return;
  let cx = 0;
  let cy = 0;
  for (const a of alive) {
    cx += a.x;
    cy += a.y;
  }
  cx /= alive.length;
  cy /= alive.length;
  // 队伍正在往哪走：下一个环上的点
  const wp = c.rule.loop[(r.wp || 0) % c.rule.loop.length];
  const hx = wp.x - cx;
  const hy = wp.y - cy;
  const hl = Math.hypot(hx, hy) || 1;
  const spots = [];
  for (const cut of c.rule.cuts) spots.push(cut);
  for (const d of c.doors) spots.push(doorStand(d));
  let best = null;
  let bestScore = -Infinity;
  for (const s of spots) {
    const d = Math.hypot(s.x - cx, s.y - cy);
    if (d < 200 || d > 430) continue;
    if (solid(s.x, s.y, 20)) continue;
    // 不站在楼梯口：那不是拦路，是把门堵死
    if (Math.hypot(s.x - 158, s.y - 669) < 220) continue;
    let seen = false;
    for (const a of alive) if (lineClear(a.x, a.y, s.x, s.y, 4)) seen = true;
    if (seen) continue;
    // 在队伍前面（顺着下一个路点）+ 落在走廊收窄处更好
    const ahead = ((s.x - cx) * hx + (s.y - cy) * hy) / (d * hl);
    const cut = c.rule.cuts.some((p) => Math.hypot(p.x - s.x, p.y - s.y) < 40);
    const score = ahead * 60 + (cut ? 40 : 0) - Math.abs(d - 300) * 0.08;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  if (!best || bestScore < 10) return;
  hachi.x = best.x;
  hachi.y = best.y;
  hachi.path = null;
  hachi.appear = 0.9;
  hachi.aim = Math.atan2(cy - best.y, cx - best.x);
  r.manifestCd = c.rule.manifest;
  game.sound.knock();
  game.say(L.hud.cutOff);
  game.log('she is already at the next door.');
}

function startKnock(game) {
  const r = game.rule;
  const doors = game.case.doors;
  const hachi = game.thralls.find((t) => t.kind === 'hachi' && !t.dead);
  let best = 0;
  let bestScore = Infinity;
  const alive = game.agents.filter((a) => !a.down && !a.taken && !a.extracted);
  if (!alive.length) return;
  // 她记住了应门的那一扇：每隔一次，还去敲那一扇。
  const remembered = hachi && hachi.remember !== undefined ? hachi.remember : null;
  if (remembered !== null && r.knocks % 2 === 1) {
    best = remembered;
  } else {
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
  }
  r.knocks += 1;
  r.knock = { door: best, warn: r.warn, live: r.warn + 4.2, answered: 0 };
  // 敲的是「她记住的那扇」时，她也站在门后，等有人来应。
  if (hachi && remembered === best && !hachi.dormant) {
    const stand = doorStand(doors[best]);
    hachi.x = stand.x;
    hachi.y = stand.y;
    hachi.path = null;
    hachi.appear = 0.7;
  }
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
      if (a.deaf) continue;
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
        hachi.remember = k.door;
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
    const k = threatFor(game, a);
    if (!k) continue;
    a.aversion = game.case.rule.avertTime;
    a.avertAngle = safeAim(game, a, Math.atan2(a.y - k.y, a.x - k.x));
    a.gaze = Math.max(0, a.gaze - 0.35);
    any = true;
  }
  if (any) {
    game.sound.avert();
    game.say(L.hud.averted);
  }
  return any;
}

// 现在正在「看」的那一只：枪口方向落在它身上、距离内、看得见。移开目光要离开它，
// 不是离开最近的那只——否则转开脸，眼睛还留在大的那只身上。
function threatFor(game, a) {
  const r = game.rule;
  let best = null;
  let bestScore = -1;
  for (const k of game.thralls) {
    if (k.kind !== 'kune' || k.dead) continue;
    const d = Math.hypot(k.x - a.x, k.y - a.y);
    if (d > r.range) continue;
    let da = Math.atan2(k.y - a.y, k.x - a.x) - a.aim;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) > r.cone) continue;
    if (!lineClear(a.x, a.y, k.x, k.y, 4)) continue;
    const score = (k.rate || 1) * (1 - Math.min(1, d / r.range) * 0.5);
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return best || nearestGazer(game, a);
}

// 把目光挪到「没有一只在枪口上」的方向：先想正对面，若那个方向还是撞上另一只，
// 就一档一档往两边偏，直到这一眼落在空处。转开脸却对上另一只，等于没移开。
function safeAim(game, a, away) {
  const r = game.rule;
  const clear = (ang) => {
    for (const k of game.thralls) {
      if (k.kind !== 'kune' || k.dead) continue;
      if (Math.hypot(k.x - a.x, k.y - a.y) > r.range + 40) continue;
      let da = Math.atan2(k.y - a.y, k.x - a.x) - ang;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < r.cone + 0.14) return false;
    }
    return true;
  };
  for (const off of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, 2.8]) {
    if (clear(away + off)) return away + off;
  }
  return away;
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
  // 三个复制品各守一扇门：第一个就守在这一层那扇「对的门」前。
  if (r && r.plates && c.doors && c.rule.wanted) {
    const want = c.rule.wanted[Math.min(r.floor, c.rule.floors) - 1];
    const idx = r.plates.indexOf(want);
    if (idx >= 0) {
      for (let k = 0; k < 3; k += 1) {
        const d = c.doors[(idx + k * 4) % c.doors.length];
        spots[k] = { x: d.x + d.nx * 74, y: d.y + d.ny * 74 };
      }
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
    a.readT = 0;
    // 楼梯把你们吐回去的时候，伤也一起重来：楼层是重复的，身上的洞不是新的。
    if (!a.down && !a.taken) {
      a.hp = a.maxHp;
      a.flash = 0;
    }
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
    reviveSquad(game);
    teleportSquad(game);
    spawnMirrorWave(game);
    // 走错的那一扇，把上一层的一个也带了下来
    spawnEcho(game);
  }
}

function spawnMirrorWave(game) {
  game.thralls = game.thralls.filter((t) => t.kind !== 'mirror');
  spawnMirrors(game, mirrorSpots(game));
}

function reviveSquad(game) {
  for (const a of game.agents) {
    if (a.taken || a.extracted) continue;
    a.down = false;
    a.revive = 0;
    a.hp = a.maxHp;
    a.flash = 0;
  }
}

// 复制品先进了那扇对的门：这一层作废，整队回到楼梯口，而它从上一层跟下来。
function copyThrough(game) {
  const r = game.rule;
  const c = game.case;
  r.loops += 1;
  r.contested = 1;
  r.race = null;
  r.floor = 1;
  r.plates = c.rule.plates[0].slice();
  r.gateOpen = false;
  r.lastDoor = -1;
  game.shake = 9;
  game.flashWhite = 0.35;
  game.sound.lose();
  game.say(L.hud.copyThrough);
  game.log('it went through the door first. the floor repeats.');
  reviveSquad(game);
  teleportSquad(game);
  spawnMirrorWave(game);
  spawnEcho(game);
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
    const kiosk = c.rule.kiosk;
    for (const a of game.agents) {
      if (a.extracted || a.down || a.taken) continue;
      // 先到小卖亭拿票，再上车
      if (!a.ticket && kiosk) {
        const dx = Math.max(0, Math.abs(a.x - kiosk.x) - kiosk.w / 2);
        const dy = Math.max(0, Math.abs(a.y - kiosk.y) - kiosk.h / 2);
        if (Math.hypot(dx, dy) < 62) {
          a.ticketT = (a.ticketT || 0) + dt;
          if (a.ticketT > 0.7) {
            a.ticket = true;
            r.tickets = (r.tickets || 0) + 1;
            game.log(`${a.role} is holding a ticket.`);
            game.say(L.hud.ticketGot);
          }
        } else {
          a.ticketT = 0;
        }
        continue;
      }
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
    const pending = game.thralls.some((t) => t.death && !t.death.done);
    const cleared = game.kills >= game.thralls.length && !pending;
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
    if (lamp.extracted) {
      // 灯先进去了，身后的两个人也跟着进门；只有真的有人被落在院子里，才先结案。
      if (r.inAt === undefined) r.inAt = game.clock;
      const left = game.agents.some((a) => !a.extracted && !a.taken && !a.down && Math.hypot(a.x - 640, a.y - 150) < 110);
      if (!left || game.clock - r.inAt > 4) return 'win';
      return null;
    }
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
      { text: T[0], value: r.lit ? L.hud.done : L.hud.lampStage(r.lights, c.rule.lamps.length), done: r.lit },
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
    const hachi = game.thralls.find((t) => t.kind === 'hachi');
    if (hachi && hachi.remember !== null && hachi.remember !== undefined) {
      return { stamp: L.hud.stampNight, line: L.hud.remembers(hachi.remember + 1), live: true };
    }
    return { stamp: L.hud.stampNight, line: L.hud.dawnIn(Math.max(0, Math.ceil(r.dawn - game.clock))), live: false };
  }
  if (c.rule.kind === 'timetable') {
    const left = Math.ceil(c.rule.phaseSeconds - r.phaseT);
    const tickets = L.hud.tickets(r.tickets || 0, game.agents.length);
    return {
      stamp: L.hud.stampGate,
      line: `${tickets} · ${r.admitted >= 1 ? L.hud.oneThrough : L.hud.nextGate(L.hud.gates[r.open], left)}`,
      live: true,
    };
  }
  if (c.rule.kind === 'gaze') {
    let worst = 0;
    for (const a of game.agents) if (!a.down && !a.taken) worst = Math.max(worst, a.gaze / c.rule.limit);
    return {
      stamp: r.avertCd > 0 ? L.hud.stampAvert : L.hud.stampGaze,
      line: r.avertCd > 0
        ? L.hud.avertReady(Math.ceil(r.avertCd))
        : r.lit ? L.hud.gazePct(Math.round(worst * 100)) : L.hud.lampStage(r.lights, c.rule.lamps.length),
      live: worst > 0.5,
    };
  }
  if (c.rule.kind === 'floors') {
    return {
      stamp: L.hud.stampFloor,
      line: r.race !== null && r.race !== undefined
        ? L.hud.race
        : r.gateOpen ? L.hud.stairOpen : L.hud.floorLine(Math.min(r.floor, c.rule.floors), c.rule.floors, c.rule.wanted[Math.min(r.floor, c.rule.floors) - 1]),
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
      if (a.order.kind === 'revive') return;
      // 目标已经死了的「集火」不算命令：否则这个人会一直卡在一条旧的 focus 上
      if (a.order.kind === 'focus' && a.order.target && !a.order.target.dead) return;
      const stale = a.order.kind === 'goto' && Math.hypot(a.order.x - x, a.order.y - y) > 110;
      if (a.order.kind === 'hold' || a.order.kind === 'focus' || stale) {
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
    // 地上还有人：先救，再撤。没人会把他留在礼堂里。
    const downed = game.agents.find((a) => a.down && !a.taken && !a.extracted);
    if (downed) {
      for (const a of game.free()) {
        if (a.order.kind === 'revive') continue;
        a.order = { kind: 'revive', mate: downed };
        a.path = null;
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
    // 先拿票。三个人一起去小卖亭，一人一张，然后才去活着的门。
    const kiosk = c.rule.kiosk;
    const need = kiosk && game.agents.some((a) => !a.extracted && !a.down && !a.taken && !a.ticket);
    if (need) {
      sendAll(game, kiosk.x, kiosk.y + kiosk.h / 2 + 20, true);
      return;
    }
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
    let big = null;
    let nearAny = Infinity;
    let nearBig = Infinity;
    let worst = 0;
    let eyesAway = 0;
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) continue;
      worst = Math.max(worst, (a.gaze || 0) / c.rule.limit);
      eyesAway = Math.max(eyesAway, a.aversion || 0);
    }
    for (const k of game.thralls) {
      if (k.kind !== 'kune' || k.dead) continue;
      const d = Math.hypot(k.x - lamp.x, k.y - lamp.y);
      nearAny = Math.min(nearAny, d);
      if (k.size > 1.4) {
        big = k;
        nearBig = d;
      }
    }
    const near = nearBig < Infinity ? nearBig : nearAny;
    const ready = r.avertCd <= 0.05;
    const calm = () => {
      for (const a of game.agents) if ((a.aversion || 0) > 0.4) return true;
      return false;
    };
    // 离她远一点的那个点：退，也要退到能转身的地方
    const backOff = (from) => {
      const ang = big ? Math.atan2(lamp.y - big.y, lamp.x - big.x) : Math.PI * 0.5;
      const bx = Math.max(96, Math.min(1180, from.x + Math.cos(ang) * 150));
      const by = Math.max(96, Math.min(700, from.y + Math.sin(ang) * 150));
      sendAll(game, bx, by);
    };
    // 最后一段：进农舍。要等「移开目光」转好，再一口气过去；冷却里就退到门口外。
    if (r.lit) {
      if (r.wp === undefined) r.wp = 0;
      const dike = c.rule.dike;
      const last = r.wp >= dike.length - 1;
      if (last && near < 340) {
        if (!calm() && ready) {
          avert(game);
        }
        const yard = dike[dike.length - 1];
        let together = true;
        for (const a of game.agents) {
          if (a.down || a.taken || a.extracted) continue;
          if (Math.hypot(a.x - yard.x, a.y - yard.y) > 80) together = false;
        }
        if (calm() && together) {
          sendAll(game, yard.x, yard.y);
        } else if (calm()) {
          // 等人齐：门里那盏灯不接一个把同伴丢在田里的人
          sendAll(game, dike[dike.length - 2].x, dike[dike.length - 2].y);
        } else {
          backOff(dike[dike.length - 2]);
        }
        return;
      }
    }
    // 「看」和「走」不能同时做：她拦在路中间，先移开目光；冷却没好的那两秒，不拿脸往她那边走。
    if ((nearAny < 300 || worst > 0.4) && ready && !calm()) avert(game);
    // 注视条已经烫手的人自己会先退：退离他此刻正看着的那一只，而不是最远/最近的那只。
    let hot = null;
    for (const a of game.agents) {
      if (a.down || a.taken || a.extracted) continue;
      if ((a.gaze || 0) / c.rule.limit > 0.6) {
        const k = threatFor(game, a);
        if (k) {
          const ang = Math.atan2(a.y - k.y, a.x - k.x);
          a.order = {
            kind: 'goto',
            x: Math.max(96, Math.min(1180, a.x + Math.cos(ang) * 160)),
            y: Math.max(96, Math.min(700, a.y + Math.sin(ang) * 160)),
          };
          a.path = null;
          a.goal = null;
          hot = a;
        }
      }
    }
    if (hot) return;
    if (big && !calm() && eyesAway <= 0.4 && (worst > 0.4 || (near < 240 && worst > 0.24))) {
      backOff(lamp);
      return;
    }
    // 掉队的人在田里是最先被看没的。眼睛不烫的时候，整队按最慢的那个走。
    if (worst < 0.34) {
      let far = null;
      let farD = 0;
      for (const a of game.agents) {
        if (a.down || a.taken || a.extracted || a === lamp) continue;
        const d = Math.hypot(a.x - lamp.x, a.y - lamp.y);
        if (d > farD) {
          farD = d;
          far = a;
        }
      }
      if (far && farD > 190 && nearAny < 340) {
        sendAll(game, far.x, far.y);
        return;
      }
    }
    if (!r.lit) {
      const lamps = c.rule.lamps;
      const at = lamps[Math.min(r.lights, lamps.length - 1)];
      sendAll(game, at.sx, at.sy);
      return;
    }
    if (r.wp === undefined) r.wp = 0;
    const dike = c.rule.dike;
    const wp = dike[Math.min(r.wp, dike.length - 1)];
    const d = Math.hypot(lamp.x - wp.x, lamp.y - wp.y);
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
