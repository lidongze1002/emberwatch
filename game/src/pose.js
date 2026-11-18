// 枪的姿态：上半身扭转、斜持、后坐、下沉。渲染画枪、手电打光、子弹出膛三处都读这一份，
// 所以「枪管朝哪、光朝哪、子弹往哪飞」永远是同一个方向。
//
// 局部坐标：-y 是人的正前方，枪口在 (3.2, −26)（枪身内先 translate(0,−4)）。
// 变换顺序与 drawAgents 一致：
//   facing+90° → stepRot → translate(lateral,0) → translate(0,sink) → leanRot → twist
//   → translate(0,gunY) → rotate(carry) → translate(0,−4)

const shortAngle = (v) => Math.atan2(Math.sin(v), Math.cos(v));

export function poseOf(a) {
  const speed = Math.hypot(a.vx || 0, a.vy || 0);
  const poseT = typeof a.poseT === 'number' ? a.poseT : a.pose === 'carry' ? 0 : 1;
  const dip = (a.poseDip || 0) * 1.7;
  const carry = -0.42 * (1 - poseT) + 0.05 * dip;
  const recoil = poseT > 0.5 ? (a.recoil || 0) * 2.4 : 0;
  const gunY = 4 + recoil + dip;
  const stepRot = Math.sin(a.step || 0) * 0.05 * Math.min(1, speed / 110);
  const lateral = Math.sin((a.step || 0) * 0.5) * 0.5 * Math.min(1, speed / 110);
  const lean = shortAngle((a.aim || 0) - (a.facing || 0));
  const leanRot = Math.max(-0.4, Math.min(0.4, lean)) * 0.07;
  const twist = Math.max(-1.2, Math.min(1.2, shortAngle((a.aim || 0) - (a.facing || 0))));
  const sink = 0.7 * (a.firePulse || 0);
  return { speed, poseT, dip, carry, recoil, gunY, stepRot, lateral, leanRot, twist, sink };
}

const rot = (x, y, ang) => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: x * c - y * s, y: x * s + y * c };
};

// 枪口的世界坐标与枪管朝向。所有射击、打光、拖影都用它。
export function muzzleOf(a) {
  const p = poseOf(a);
  const ca = Math.cos(p.carry);
  const sa = Math.sin(p.carry);
  // 局部枪口 (3.2,−26)，先加 translate(0,−4)：相对 gunY 的坐标是 (3.2,−30)
  let q = { x: 3.2 * ca - -30 * sa, y: p.gunY + 3.2 * sa + -30 * ca };
  q = rot(q.x, q.y, p.twist);
  q = rot(q.x, q.y, p.leanRot);
  q.y += p.sink;
  q.x += p.lateral;
  q = rot(q.x, q.y, p.stepRot);
  q = rot(q.x, q.y, (a.facing || 0) + Math.PI / 2);
  return {
    x: (a.x || 0) + q.x,
    y: (a.y || 0) + q.y,
    angle: (a.facing || 0) + p.stepRot + p.leanRot + p.twist + p.carry,
    pose: p,
  };
}
