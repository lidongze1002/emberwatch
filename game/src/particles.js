// One pool of particles, recycled forever: sparks off a burning shadow, embers that stream
// back into the lamp, dark splashes when something reaches the tower, dust in the light, and
// ring shockwaves on the big moments. Nothing here knows the rules; it only knows motion.

import { PALETTE } from './config.js';

const MAX = 900;

function blank() {
  return {
    alive: false,
    kind: 'spark',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    size: 2,
    grow: 0,
    drag: 1,
    colour: PALETTE.fire,
    spin: 0,
    angle: 0,
  };
}

export class Particles {
  constructor() {
    this.items = new Array(MAX);
    for (let i = 0; i < MAX; i += 1) this.items[i] = blank();
    this.cursor = 0;
    this.rings = [];
  }

  take() {
    // Two passes at most: find a free slot, else overwrite the oldest by the cursor.
    for (let i = 0; i < MAX; i += 1) {
      const index = (this.cursor + i) % MAX;
      if (!this.items[index].alive) {
        this.cursor = (index + 1) % MAX;
        return this.items[index];
      }
    }
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    return this.items[index];
  }

  sparks(x, y, count, angle, spread, speed, colour = PALETTE.fire, size = 2.2) {
    for (let i = 0; i < count; i += 1) {
      const p = this.take();
      const heading = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.35 + Math.random() * 0.9);
      p.alive = true;
      p.kind = 'spark';
      p.x = x;
      p.y = y;
      p.vx = Math.cos(heading) * v;
      p.vy = Math.sin(heading) * v;
      p.max = 0.26 + Math.random() * 0.34;
      p.life = p.max;
      p.size = size * (0.6 + Math.random() * 0.9);
      p.drag = 1.8;
      p.colour = colour;
    }
  }

  embers(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const p = this.take();
      const a = Math.random() * Math.PI * 2;
      p.alive = true;
      p.kind = 'ember';
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * (18 + Math.random() * 46);
      p.vy = Math.sin(a) * (18 + Math.random() * 46) - 14;
      p.max = 0.9 + Math.random() * 0.7;
      p.life = p.max;
      p.size = 1.4 + Math.random() * 2.2;
      p.drag = 0.9;
      p.colour = Math.random() < 0.35 ? PALETTE.fireHot : PALETTE.ember;
    }
  }

  splash(x, y, count = 18) {
    for (let i = 0; i < count; i += 1) {
      const p = this.take();
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const v = 40 + Math.random() * 130;
      p.alive = true;
      p.kind = 'splash';
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v;
      p.max = 0.5 + Math.random() * 0.6;
      p.life = p.max;
      p.size = 2 + Math.random() * 4;
      p.drag = 0.8;
      p.colour = PALETTE.ink;
    }
  }

  ring(x, y, radius, colour = PALETTE.fire, strength = 1) {
    this.rings.push({ x, y, r: radius, grow: 150 * strength, life: 0.34, max: 0.34, colour });
    if (this.rings.length > 14) this.rings.shift();
  }

  traumaBurst(x, y, n = 26) {
    this.sparks(x, y, n, -Math.PI / 2, Math.PI * 1.5, 240, PALETTE.fireHot, 2.6);
    this.embers(x, y, 8);
    this.ring(x, y, 6, PALETTE.fireHot, 0.7);
  }

  update(dt, lamp) {
    for (let i = 0; i < MAX; i += 1) {
      const p = this.items[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      if (p.kind === 'ember') {
        // Curve into the lamp: pull grows as the ember gets close, so they stream rather than
        // fly straight, and they die at the glass with a last warm tick.
        const dx = lamp.x - p.x;
        const dy = lamp.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const pull = 320 + (1 - Math.min(1, dist / 420)) * 900;
        p.vx += (dx / dist) * pull * dt;
        p.vy += (dy / dist) * pull * dt;
        p.vx *= 1 - 1.6 * dt;
        p.vy *= 1 - 1.6 * dt;
        if (dist < 16) {
          p.alive = false;
          continue;
        }
      } else {
        p.vy += (p.kind === 'splash' ? 420 : 60) * dt;
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vy *= damp;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const ring = this.rings[i];
      ring.life -= dt;
      ring.r += ring.grow * dt;
      if (ring.life <= 0) this.rings.splice(i, 1);
    }
  }

  draw(ctx) {
    // Additive pass: everything warm.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < MAX; i += 1) {
      const p = this.items[i];
      if (!p.alive || p.kind === 'splash') continue;
      const a = Math.min(1, p.life / p.max);
      ctx.globalAlpha = p.kind === 'ember' ? a : a * a;
      ctx.fillStyle = p.colour;
      const r = Math.max(0.4, p.size * (0.4 + a * 0.8));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (p.kind === 'spark' && a > 0.4) {
        ctx.strokeStyle = p.colour;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.014, p.y - p.vy * 0.014);
        ctx.stroke();
      }
    }
    for (const ring of this.rings) {
      const a = ring.life / ring.max;
      ctx.globalAlpha = a * 0.22;
      ctx.strokeStyle = ring.colour;
      ctx.lineWidth = 1 + a * 1.4;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Ink pass: the dark splashes of something reaching the tower.
    ctx.save();
    for (let i = 0; i < MAX; i += 1) {
      const p = this.items[i];
      if (!p.alive || p.kind !== 'splash') continue;
      const a = Math.min(1, p.life / p.max);
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size, p.size * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
