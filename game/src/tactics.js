// 小队的作战习惯：谁在前面、谁看哪一边、谁在动、谁在警戒。纯逻辑，不画任何东西。
// 依据的是三人清房的通行做法（FM 3-06.11 / Battle Drill 5 / MCWP 3-35.3）：
//   1 号 point 盯门缝与近角，2 号 cover 看反方向远端，3 号 rear 看门口与背后。
// 门口不散站：贴同一侧列队；进房不在门框里停；移动时轮流跃进，永远有人持枪警戒。
//
// 这个文件只做三件事：把三个人排成角色、算出各自该看的方向、给出门口/房间角落的站位。

export const ROLES = ['point', 'cover', 'rear'];
export const TWIST = 1.2;      // 与 units.js 的腰拧上限一致

const TAU = Math.PI * 2;
const wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v));

export function roleOf(index) {
  return ROLES[((index % ROLES.length) + ROLES.length) % ROLES.length];
}

// 三个方向：正前、右侧 115°、左侧 115°。两两夹角都 ≥115°，任何两个人不会看同一个扇区。
export function sectorFor(index, heading) {
  const off = index % 3 === 0 ? 0 : index % 3 === 1 ? 2.0 : -2.0;
  return wrap(heading + off);
}

// 门口堆叠：贴在门的一侧，沿墙排成一列——1 号最靠门，2 号半步后，3 号再后。
// 不站在门洞里（门中心 ±26 是致命漏斗），每个人都退到门面外 30 px。
export function stackSlots(x, y, nx, ny, count = 3) {
  const tx = -ny;
  const ty = nx;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      x: x + nx * 30 + tx * (10 - i * 26),
      y: y + ny * 30 + ty * (10 - i * 26),
    });
  }
  return out;
}

// 进房后的角落（point of domination）：四个角各让开 30 px，按角色分。
export function dominationPoint(zone, index) {
  if (!zone) return null;
  const inset = 34;
  const spots = [
    { x: zone.x + zone.w - inset, y: zone.y + zone.h - inset },
    { x: zone.x + inset, y: zone.y + zone.h - inset },
    { x: zone.x + inset, y: zone.y + inset },
    { x: zone.x + zone.w - inset, y: zone.y + inset },
  ];
  return spots[index % spots.length];
}

export function tacticsOf(game) {
  if (!game.tactics) {
    game.tactics = { heading: -Math.PI / 2, holder: null, lastLog: -99, door: null };
  }
  return game.tactics;
}

function nearestDoor(game, a, reach) {
  let best = null;
  let bestD = reach;
  for (const d of game.case.doors || []) {
    const dd = Math.hypot(d.x - a.x, d.y - a.y);
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

// 门口不许停：站在门框里的（26 px 内）把人挪到门面外 42 px，贴着同一侧。
export function offDoor(game, a) {
  const d = nearestDoor(game, a, 26);
  if (!d) return null;
  const nx = d.nx || 0;
  const ny = d.ny || 0;
  if (!nx && !ny) return null;
  return { x: d.x + nx * 42 - ny * 12, y: d.y + ny * 42 + nx * 12 };
}

// 每帧一次：谁在动、谁警戒、谁该看哪一边、谁站进了门框。
// 跃进节奏 4 秒一换：1–2 人前进，另一个人原地持枪。
export function overwatchTick(game) {
  const t = tacticsOf(game);
  const live = game.agents.filter((a) => !a.down && !a.taken && !a.extracted && !a.charmed);

  // 队伍的行进方向：跟着还在走的人的平均速度走；都停了就保持上一次的朝向
  let vx = 0;
  let vy = 0;
  let n = 0;
  for (const a of live) {
    if (a.order && a.order.kind === 'goto' && Math.hypot(a.vx, a.vy) > 16) {
      vx += a.vx;
      vy += a.vy;
      n += 1;
    }
  }
  if (n) t.heading = wrap(Math.atan2(vy, vx));

  // 一个人动、两个人警戒；轮流来。少于三个人就不摆队形，别把人留成孤零零一个。
  // 只在「有接触」时跃进：没有敌人就正常走，别为了队形把一趟路走成两倍长。
  const contact = game.thralls.some((th) => !th.dead && !th.noTarget
    && live.some((a) => Math.hypot(th.x - a.x, th.y - a.y) < 340));
  const movers = live.filter((a) => !(a.order && a.order.kind === 'revive'));
  let anchor = null;
  if (contact && live.length >= 3 && movers.length) {
    const slot = Math.floor(game.clock / 4) % movers.length;
    anchor = movers[slot];
  }

  live.forEach((a, i) => {
    const wasWatch = a.overwatch;
    a.tacticsRole = roleOf(i);
    // 门口：谁站在门框里，谁就被挪出去；门口的人枪口下压，按角色贴门列队
    const door = nearestDoor(game, a, 118);
    a.stack = door ? i : null;
    a.overwatch = false;
    if (a.order && a.order.kind === 'hold') {
      // 警戒的人不能被落在后面：离队超过 150 px 就自己跟上，别给那东西送一个单的。
      if (wasWatch && a.boundTarget) {
        let near = Infinity;
        for (const other of live) {
          if (other !== a) near = Math.min(near, Math.hypot(other.x - a.x, other.y - a.y));
        }
        if (near > 150 || a.hp < a.maxHp * 0.4) {
          a.order = { kind: 'goto', x: a.boundTarget.x, y: a.boundTarget.y };
          a.path = null;
          a.boundTarget = null;
          return;
        }
      }
      const shift = offDoor(game, a);
      if (shift) {
        a.order = { kind: 'goto', x: shift.x, y: shift.y };
        a.path = null;
        return;
      }
      const d = nearestDoor(game, a, 118);
      a.guard = d
        ? sectorFor(i, Math.atan2(d.y - a.y, d.x - a.x))
        : sectorFor(i, t.heading);
      if (d) a.stackSide = { nx: d.nx, ny: d.ny };
      return;
    }
    if (a === anchor) {
      // 跃进：轮到警戒的人停下，其余人继续。停下的位置不是终点，所以下一轮会再走。
      // 最后 130 px 不拦：快到门口/出口时一起进去，否则谁都不算「到齐」。
      const far = a.order && a.order.kind === 'goto'
        && Math.hypot(a.order.x - a.x, a.order.y - a.y) > 130;
      if (far) {
        a.boundTarget = { x: a.order.x, y: a.order.y };
        a.order = { kind: 'hold' };
        a.path = null;
        a.guard = sectorFor(i, t.heading);
        a.overwatch = true;
        if (t.holder !== a.id && game.clock - t.lastLog > 1.5) {
          t.holder = a.id;
          t.lastLog = game.clock;
          game.log('bound', a.role);
        }
      } else {
        a.overwatch = a.state !== 'fighting' && !(a.order && a.order.kind === 'focus');
      }
    }
  });
  if (!anchor) t.holder = null;
}

// 给验收脚本用：驻守时三个人的朝向是两两分开的
export function guardSpread(agents) {
  const angles = agents.map((a) => a.facing);
  const gaps = [];
  for (let i = 0; i < angles.length; i += 1) {
    for (let j = i + 1; j < angles.length; j += 1) {
      gaps.push(Math.abs(wrap(angles[i] - angles[j])));
    }
  }
  return gaps.length ? Math.min(...gaps) : TAU;
}
