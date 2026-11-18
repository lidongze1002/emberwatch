// 光与视线：从一支手电的枪口射出一扇射线，被墙和门板截断，得到「此刻真的被照到」
// 的那块多边形。纯数学，不碰画布；渲染端用它挖暗部、裁光锥，玩法用它判定敌人是否在墙后。
//
// 做法是射线扇：每条射线和每个矩形求最近交点（slab 法），相邻交点连成多边形。
// 96 条射线在 320 px 的射程上约 2 px 一格，阴影边缘再叠淡出，看不出锯齿。

const TAU = Math.PI * 2;

// 射线的 slab 求交：返回进入矩形时的 t（0..maxT），打不到返回 Infinity。
// 起点在矩形里时不算遮挡（贴着墙站的人不该被自己脚下的墙挡住）。
function rayRect(ox, oy, dx, dy, r, maxT) {
  const rx = r[0];
  const ry = r[1];
  const rw = r[2];
  const rh = r[3];
  let tmin = 0;
  let tmax = maxT;

  if (Math.abs(dx) < 1e-9) {
    if (ox < rx || ox > rx + rw) return Infinity;
  } else {
    let t1 = (rx - ox) / dx;
    let t2 = (rx + rw - ox) / dx;
    if (t1 > t2) {
      const s = t1;
      t1 = t2;
      t2 = s;
    }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }

  if (Math.abs(dy) < 1e-9) {
    if (oy < ry || oy > ry + rh) return Infinity;
  } else {
    let t1 = (ry - oy) / dy;
    let t2 = (ry + rh - oy) / dy;
    if (t1 > t2) {
      const s = t1;
      t1 = t2;
      t2 = s;
    }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }

  if (tmax < 0) return Infinity;
  return tmin > 0.001 ? tmin : Infinity;
}

function fan(sx, sy, reach, from, to, rects, rays, closed) {
  const pts = [{ x: sx, y: sy }];
  const count = closed ? rays : rays + 1;
  const span = to - from;
  for (let i = 0; i < count; i += 1) {
    const a = from + (span * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let t = reach;
    for (let k = 0; k < rects.length; k += 1) {
      const hit = rayRect(sx, sy, dx, dy, rects[k], t);
      if (hit < t) t = hit;
    }
    // 退 0.6 px：光停在墙面内侧，不压到墙上亮成一条线
    const d = Math.max(0, t - 0.6);
    pts.push({ x: sx + dx * d, y: sy + dy * d });
  }
  return pts;
}

// 手电锥：angle 是枪管方向，half 是半角（弧度）。
export function cone(sx, sy, reach, angle, half, rects, rays = 96) {
  return fan(sx, sy, reach, angle - half, angle + half, rects, rays, false);
}

// 身边的一小圈余光：站定的人不是瞎子，近处能看见轮廓。
export function circle(sx, sy, reach, rects, rays = 44) {
  return fan(sx, sy, reach, 0, TAU, rects, rays, true);
}
