// The night's shapes: what each kind of shadow is, how it walks, and what it looks like.
// A shadow always knows exactly one thing — where the lamp is — and each species bends that
// one instinct differently. Damage is dealt by the beam, not here; this file owns the body,
// the approach, and the silhouette.

import { LAMP, PALETTE, SHADOWS, TUNING, VIEW } from './config.js';

let nextId = 1;

export function shadowScale(waveIndex) {
  const step = Math.max(0, waveIndex);
  return {
    hp: 1 + TUNING.hpPerWave * step,
    speed: 1 + TUNING.speedPerWave * step,
  };
}

export function createShadow(type, waveIndex, rng, angle = null, ring = TUNING.spawnRing) {
  const specs = SHADOWS[type];
  const scale = shadowScale(waveIndex);
  const heading = angle ?? rng.float(TUNING.spawnArc.from, TUNING.spawnArc.to) * Math.PI;
  const radius = type === 'boss' ? ring.outer + 40 : rng.float(ring.inner, ring.outer);
  const hp = Math.round(specs.hp * scale.hp * 10) / 10;
  return {
    id: nextId += 1,
    type,
    x: LAMP.x + Math.cos(heading) * radius,
    // whatever the angle, a shadow comes out of the sea, below the horizon
    y: Math.max(176, LAMP.y + Math.sin(heading) * radius),
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    speed: specs.speed * scale.speed,
    radius: specs.radius,
    score: specs.score,
    heading: Math.atan2(LAMP.y - (LAMP.y + Math.sin(heading) * radius), LAMP.x - (LAMP.x + Math.cos(heading) * radius)),
    phase: rng.float(0, Math.PI * 2),
    freq: rng.float(0.8, 1.25),
    lit: false,
    litTime: 0,
    glow: 0,
    flash: 0,
    hurt: 0,
    wobble: 0,
    dead: false,
    age: 0,
    tendrils: type === 'boss' ? Array.from({ length: 7 }, () => rng.float(0, Math.PI * 2)) : null,
  };
}

export function updateShadow(e, dt, game) {
  e.age += dt;
  const dx = LAMP.x - e.x;
  const dy = LAMP.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const sideX = -ny;
  const sideY = nx;
  let speed = e.speed;

  if (e.type === 'crawler') {
    speed *= 1 + Math.sin(e.age * 2.2 + e.phase) * 0.12;
  } else if (e.type === 'skitter') {
    const weave = Math.sin(e.age * 4.4 * e.freq + e.phase) * 26;
    e.x += sideX * weave * dt;
    e.y += sideY * weave * dt;
    speed *= 1 + Math.sin(e.age * 6 + e.phase) * 0.18;
  } else if (e.type === 'bulwark') {
    speed *= 1;
  } else if (e.type === 'splitter') {
    speed *= 1 + Math.sin(e.age * 3.1 + e.phase) * 0.22;
  } else if (e.type === 'moth') {
    const drift = Math.sin(e.age * 1.7 + e.phase) * 44 + Math.sin(e.age * 3.9 + e.phase * 2.3) * 20;
    e.x += sideX * drift * dt;
    e.y += sideY * drift * dt;
    speed *= 1.1;
  } else if (e.type === 'boss') {
    speed *= 1 + Math.sin(e.age * 0.7) * 0.08;
  }

  if (e.lit) speed *= TUNING.beam.litSlow;
  if (game.stats.slowAura && dist < TUNING.nearTower) speed *= TUNING.nearTowerSlow;

  const vx = nx * speed;
  const vy = ny * speed;
  e.vx = vx;
  e.vy = vy;
  e.x += vx * dt;
  e.y += vy * dt;
  e.heading = Math.atan2(ny, nx);
  e.wobble = Math.sin(e.age * 5 + e.phase) * 0.12;

  if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 7);
  if (e.hurt > 0) e.hurt = Math.max(0, e.hurt - dt * 4);
  e.glow += ((e.lit ? 1 : 0) - e.glow) * Math.min(1, dt * 12);
  if (!e.lit) e.litTime = Math.max(0, e.litTime - dt * 2.4);
}

export function drawShadow(ctx, e, time) {
  const r = e.radius;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.heading + Math.PI / 2);
  ctx.scale(1, 0.92);

  const lit = e.glow;
  const silhouette = lit > 0.02 ? `rgba(${Math.round(9 + lit * 12)}, ${Math.round(6 + lit * 7)}, ${Math.round(5 + lit * 6)}, 0.97)` : 'rgba(4, 6, 12, 0.94)';

  // A cold halo behind unlit shapes keeps them legible against the sea; lit shapes burn.
  if (lit > 0.03) {
    const halo = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * (2.4 + lit));
    halo.addColorStop(0, `rgba(255, 150, 70, ${0.34 * lit})`);
    halo.addColorStop(0.45, `rgba(255, 110, 40, ${0.12 * lit})`);
    halo.addColorStop(1, 'rgba(255, 90, 20, 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * (2.4 + lit), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.shadowColor = lit > 0.05 ? `rgba(255, 140, 60, ${0.7 * lit})` : 'rgba(80, 120, 160, 0.3)';
  ctx.shadowBlur = lit > 0.05 ? 18 * lit : 9;
  ctx.fillStyle = silhouette;
  ctx.strokeStyle = lit > 0.05 ? `rgba(255, 170, 100, ${0.35 + lit * 0.55})` : 'rgba(124, 168, 205, 0.58)';
  ctx.lineWidth = 1.15;

  const t = time + e.phase;
  ctx.beginPath();
  switch (e.type) {
    case 'skitter': {
      // a low diamond of a body on six stilt legs
      ctx.moveTo(0, -r * 1.15);
      ctx.lineTo(r * 0.85, 0);
      ctx.lineTo(0, r * 0.95);
      ctx.lineTo(-r * 0.85, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 3; i += 1) {
        const y = -r * 0.5 + i * r * 0.55;
        const kick = Math.sin(t * 11 + i * 2) * r * 0.3;
        ctx.moveTo(-r * 0.5, y);
        ctx.lineTo(-r * 1.7, y - r * 0.3 + kick);
        ctx.lineTo(-r * 2.1, y + r * 0.5 + kick);
        ctx.moveTo(r * 0.5, y);
        ctx.lineTo(r * 1.7, y - r * 0.3 - kick);
        ctx.lineTo(r * 2.1, y + r * 0.5 - kick);
      }
      ctx.stroke();
      break;
    }
    case 'bulwark': {
      // a slab of wet stone with two shoulders and a slit of a face
      ctx.moveTo(-r * 1.25, -r * 0.6);
      ctx.quadraticCurveTo(-r * 1.5, -r * 1.1, -r * 0.7, -r * 1.25);
      ctx.lineTo(r * 0.7, -r * 1.25);
      ctx.quadraticCurveTo(r * 1.5, -r * 1.1, r * 1.25, -r * 0.6);
      ctx.quadraticCurveTo(r * 1.1, r * 1.1, 0, r * 1.15);
      ctx.quadraticCurveTo(-r * 1.1, r * 1.1, -r * 1.25, -r * 0.6);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.15);
      ctx.lineTo(r * 0.45, -r * 0.15);
      ctx.strokeStyle = lit > 0.05 ? 'rgba(255, 210, 150, 0.85)' : 'rgba(140, 175, 205, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case 'splitter': {
      // two lobes straining apart, a seam of light between them
      ctx.ellipse(-r * 0.45, 0, r * 0.85, r * 1.05, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(r * 0.45, 0, r * 0.85, r * 1.05, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(0, r * 0.9);
      ctx.strokeStyle = `rgba(255, 130, 60, ${0.25 + lit * 0.6})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      break;
    }
    case 'moth': {
      // wings that beat, too fast and too nearly symmetrical
      const flap = Math.sin(t * 9) * 0.35 + 0.55;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.42, r * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-r * 0.95, -r * 0.1, r * 0.95, r * 0.55 * flap + r * 0.35, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(r * 0.95, -r * 0.1, r * 0.95, r * 0.55 * flap + r * 0.35, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'spawnling': {
      ctx.moveTo(0, -r * 1.3);
      ctx.quadraticCurveTo(r * 1.05, r * 0.2, 0, r * 1.15);
      ctx.quadraticCurveTo(-r * 1.05, r * 0.2, 0, -r * 1.3);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'boss': {
      // The Leviathan: a mass with a shell, eyes, and tendrils that trail the water.
      const shell = ctx.createLinearGradient(-r, -r, r, r);
      shell.addColorStop(0, lit > 0.05 ? '#2a1b13' : '#080b12');
      shell.addColorStop(1, lit > 0.05 ? '#120d0b' : '#04060c');
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.35);
      ctx.bezierCurveTo(r * 1.15, -r * 1.1, r * 1.3, r * 0.2, r * 0.75, r * 1.05);
      ctx.bezierCurveTo(r * 0.3, r * 1.5, -r * 0.3, r * 1.5, -r * 0.75, r * 1.05);
      ctx.bezierCurveTo(-r * 1.3, r * 0.2, -r * 1.15, -r * 1.1, 0, -r * 1.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = lit > 0.05 ? `rgba(255, 150, 70, ${0.25 + lit * 0.5})` : 'rgba(90, 130, 165, 0.4)';
      for (const t0 of e.tendrils) {
        const sway = Math.sin(t * 1.4 + t0) * r * 0.35;
        ctx.beginPath();
        ctx.moveTo(Math.cos(t0) * r * 0.7, r * 0.9);
        ctx.quadraticCurveTo(Math.cos(t0) * r * 1.1 + sway, r * 1.6, Math.cos(t0) * r * 0.6 + sway, r * 2.2);
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
      ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(side * r * 0.42, -r * 0.5);
        ctx.arc(side * r * 0.34, -r * 0.45, r * 0.12, 0, Math.PI * 2);
      }
      ctx.fillStyle = lit > 0.05 ? 'rgba(255, 225, 170, 0.95)' : 'rgba(150, 190, 215, 0.7)';
      ctx.fill();
      break;
    }
    default: {
      // crawler: a hunched body, two arms, a head that leans in
      ctx.strokeStyle = 'rgba(120, 160, 195, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.95, r * 1.7, r * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, r * 0.1, r * 1.05, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.72, r * 0.5, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // limbs in the same ink, so the silhouette is one solid animal
      ctx.strokeStyle = silhouette;
      ctx.lineWidth = r * 0.34;
      ctx.lineCap = 'round';
      const swing = Math.sin(t * 3.4) * r * 0.22;
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, r * 0.1);
      ctx.quadraticCurveTo(-r * 1.5, r * 0.2, -r * 1.25, r * 0.85 + swing);
      ctx.moveTo(r * 0.75, r * 0.1);
      ctx.quadraticCurveTo(r * 1.5, r * 0.2, r * 1.25, r * 0.85 - swing);
      ctx.moveTo(-r * 0.4, r * 0.7);
      ctx.lineTo(-r * 0.52, r * 1.2);
      ctx.moveTo(r * 0.4, r * 0.7);
      ctx.lineTo(r * 0.52, r * 1.2);
      ctx.stroke();
      break;
    }
  }

  // the hit flash: a hot rim and a small core, never a wash over the whole body
  if (e.flash > 0.02) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = Math.min(0.6, e.flash * 0.9);
    ctx.strokeStyle = PALETTE.fireHot;
    ctx.lineWidth = 1.6 + e.flash * 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.min(0.34, e.flash * 0.5);
    ctx.fillStyle = PALETTE.fireHot;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // armoured shadows keep a thin broken ring while they are ignoring the light
  if ((e.type === 'bulwark' && e.litTime < TUNING.armour.bulwark) || (e.type === 'boss' && e.litTime < TUNING.armour.leviathan)) {
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = e.lit ? 'rgba(150, 200, 230, 0.5)' : 'rgba(110, 150, 185, 0.32)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Where a shadow sits relative to the tower, and whether it is close enough to matter.
export function shadowDistance(e) {
  return Math.hypot(LAMP.x - e.x, LAMP.y - e.y);
}

export function insideView(e, pad = 80) {
  return e.x > -pad && e.x < VIEW.width + pad && e.y > -pad && e.y < VIEW.height + pad;
}

// The order the record lists the bestiary in: smallest trouble first, the leviathan last.
export const SHADOW_ORDER = ['crawler', 'skitter', 'bulwark', 'splitter', 'spawnling', 'moth', 'boss'];

// A still, warm-lit portrait of one shadow, for the record. Same silhouette code as the game,
// scaled down, so the book cannot drift away from what the player actually meets.
export function drawShadowPortrait(ctx, type, x, y, radius, time) {
  drawShadow(ctx, {
    id: 0,
    type,
    x,
    y,
    radius,
    heading: Math.PI / 2,
    glow: 0.3,
    lit: false,
    litTime: 0,
    flash: 0,
    age: 0,
    phase: 0,
    tendrils: [0.3, 1.1, 2.0, 2.9, 3.8, 4.7, 5.6],
  }, time);
}
