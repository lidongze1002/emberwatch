// 卷宗里的证件照：近黑底、单一暖光、颗粒、低饱和、写实剪影。
// 没有外部图片：每一张都是在这里用 canvas 画出来的，256×256，按「人」缓存一次。
//
// 七种轮廓（先认衣服，再认脸）：
//   veteran  老兵    大檐帽 + 立起来的风衣领 + 左眉旧疤
//   rookie   新兵    雨衣兜帽 + 额前的湿发
//   lamp     提灯人  低束的黑发 + 粗呢高领；光是**从下往上**的
//   constable 老警   宽檐雨帽 + 哨绳 + 制服领
//   student  学生    乱发 + 圆眼镜（两片反光）+ 围巾
//   sister   修女    白头巾 + 黑纱 + 领口里的十字架
//   docker   码头工  油布帽 + 极宽的肩 + 盐霜下颌
//
// 没有数据时不是崩溃，是一张空相纸：一条铅笔编号，中间什么也没有。

const SIZE = 256;
const cache = new Map();
let noise = null;

function hash(text) {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function noiseTile() {
  if (noise) return noise;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + Math.random() * 165;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 34 + Math.random() * 46;
  }
  g.putImageData(img, 0, 0);
  noise = c;
  return c;
}

export function lookOf(person) {
  if (!person) return null;
  if (person.look) return person.look;
  if (person.post === 'veteran') return 'veteran';
  if (person.post === 'rookie') return 'rookie';
  if (person.post === 'lamp') return 'lamp';
  return 'veteran';
}

function headPath(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.bezierCurveTo(cx + w * 0.98, cy - h * 0.84, cx + w, cy + h * 0.16, cx + w * 0.7, cy + h * 0.56);
  ctx.bezierCurveTo(cx + w * 0.46, cy + h * 0.94, cx - w * 0.46, cy + h * 0.94, cx - w * 0.7, cy + h * 0.56);
  ctx.bezierCurveTo(cx - w, cy + h * 0.16, cx - w * 0.98, cy - h * 0.84, cx, cy - h);
  ctx.closePath();
}

// 一张纸：骨白相纸，照片窗口 238×218，下面留 18 px 写编号。
function paper(ctx) {
  ctx.fillStyle = '#cfc5ae';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  g.addColorStop(0, 'rgba(240, 232, 212, 0.35)');
  g.addColorStop(0.6, 'rgba(168, 156, 132, 0.06)');
  g.addColorStop(1, 'rgba(60, 50, 36, 0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = 'rgba(92, 80, 62, 0.36)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);
  // a coffee ring or a fold, once in a while
  ctx.strokeStyle = 'rgba(120, 96, 64, 0.12)';
  ctx.beginPath();
  ctx.arc(214, 26, 18, 0, Math.PI * 2);
  ctx.stroke();
}

function ground(ctx, keyX, keyY, warm = 'rgba(236, 196, 142, 0.34)') {
  const base = ctx.createLinearGradient(0, 8, 0, 226);
  base.addColorStop(0, '#1b1a1a');
  base.addColorStop(0.5, '#10100f');
  base.addColorStop(1, '#070708');
  ctx.fillStyle = base;
  ctx.fillRect(8, 8, 238, 218);
  const glow = ctx.createRadialGradient(keyX, keyY, 4, keyX, keyY, 150);
  glow.addColorStop(0, warm);
  glow.addColorStop(0.5, 'rgba(200, 150, 100, 0.08)');
  glow.addColorStop(1, 'rgba(180, 130, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(8, 8, 238, 218);
}

function shoulders(ctx, width, y, tone, keyX, keyY) {
  const g = ctx.createLinearGradient(keyX - 70, y - 90, keyX + 100, y + 40);
  g.addColorStop(0, tone.lit);
  g.addColorStop(0.45, tone.mid);
  g.addColorStop(1, tone.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(128 - width * 0.5, 232);
  ctx.bezierCurveTo(128 - width * 0.52, y + 26, 128 - width * 0.34, y - 6, 128 - 26, y - 14);
  ctx.quadraticCurveTo(128, y - 22, 128 + 26, y - 14);
  ctx.bezierCurveTo(128 + width * 0.34, y - 6, 128 + width * 0.52, y + 26, 128 + width * 0.5, 232);
  ctx.closePath();
  ctx.fill();
}

function face(ctx, cx, cy, w, h, p, keyX, keyY) {
  ctx.save();
  headPath(ctx, cx, cy, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(keyX - 30, keyY - 20, cx + w * 1.15, cy + h * 1.25);
  g.addColorStop(0, '#b09878');
  g.addColorStop(0.35, '#8d7660');
  g.addColorStop(0.7, '#63513f');
  g.addColorStop(1, '#332b23');
  ctx.fillStyle = g;
  ctx.fillRect(cx - w, cy - h, w * 2, h * 2);
  // the temple and the shadow under the cheekbone
  ctx.fillStyle = 'rgba(38, 28, 22, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.62, cy + h * 0.06, w * 0.3, h * 0.34, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(60, 40, 30, 0.16)';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.5, cy + h * 0.2, w * 0.34, h * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // eye sockets, brow, nose, mouth: shadows, not lines
  const ex = w * p.eyeGap;
  const ey = cy - h * 0.06;
  ctx.fillStyle = 'rgba(26, 20, 16, 0.5)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * ex, ey, w * 0.16, h * 0.07, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  // the brow ridge catches the key; one brow sits a little lower than the other
  ctx.strokeStyle = 'rgba(232, 204, 166, 0.26)';
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    const tilt = p.browTilt * s;
    ctx.beginPath();
    ctx.moveTo(cx + s * (ex + w * 0.14), ey - h * (0.13 - tilt));
    ctx.quadraticCurveTo(cx + s * (ex + w * 0.02), ey - h * (0.19 + tilt), cx + s * (ex - w * 0.1), ey - h * (0.14 - tilt));
    ctx.stroke();
  }
  // eyes: one dark bead each, only the lit one has a catch
  ctx.fillStyle = 'rgba(14, 11, 9, 0.9)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * ex, ey + h * 0.01, w * 0.095, h * 0.024, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(214, 178, 142, 0.26)';
  ctx.lineWidth = 0.8;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * ex - w * 0.09, ey + h * 0.04);
    ctx.quadraticCurveTo(cx + s * ex, ey + h * 0.06, cx + s * ex + w * 0.09, ey + h * 0.04);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(245, 226, 196, 0.42)';
  ctx.beginPath();
  ctx.arc(cx - ex + w * 0.025, ey - h * 0.005, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // nose: a lit ridge and a hard shadow on the shadow side
  ctx.strokeStyle = 'rgba(236, 204, 164, 0.2)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(cx - 0.5, ey + h * 0.02);
  ctx.quadraticCurveTo(cx - 1.5, ey + h * 0.2, cx + 2, ey + h * 0.29);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42, 28, 20, 0.35)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.055, ey + h * 0.06);
  ctx.quadraticCurveTo(cx + w * 0.05, ey + h * 0.24, cx + w * 0.02, ey + h * 0.3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(32, 22, 16, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx + 1, ey + h * 0.34, p.noseW, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  // mouth: a seam, a shadow under the lower lip
  ctx.strokeStyle = 'rgba(38, 22, 18, 0.66)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - w * p.mouthW, cy + h * 0.36);
  ctx.quadraticCurveTo(cx, cy + h * 0.39, cx + w * p.mouthW, cy + h * 0.36);
  ctx.stroke();
  ctx.fillStyle = 'rgba(224, 188, 150, 0.18)';
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + h * 0.43, w * 0.14, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  // cheekbone on the key side and a warm patch on the forehead
  ctx.fillStyle = 'rgba(240, 210, 170, 0.12)';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.52, cy + h * 0.1, w * 0.26, h * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(250, 220, 176, 0.08)';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.24, cy - h * 0.5, w * 0.34, h * 0.18, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // skin is not plastic: a few pores in the light
  ctx.fillStyle = 'rgba(80, 58, 42, 0.16)';
  for (let i = 0; i < 40; i += 1) {
    const a = Math.PI * (0.05 + p.rnd() * 0.9);
    const r = 0.25 + p.rnd() * 0.66;
    ctx.fillRect(cx + Math.cos(a) * w * r, cy + Math.sin(a) * h * r, 0.8, 0.8);
  }
  // stubble
  if (p.stubble) {
    ctx.fillStyle = `rgba(30, 24, 20, ${0.1 + p.stubble * 0.2})`;
    for (let i = 0; i < 70; i += 1) {
      const a = Math.PI * (0.12 + p.rnd() * 0.76);
      const r = 0.82 + p.rnd() * 0.12;
      ctx.fillRect(cx + Math.cos(a) * w * r, cy + Math.sin(a) * h * r, 1, 1);
    }
  }
  // the old scar, through the left brow
  if (p.scar) {
    ctx.strokeStyle = 'rgba(206, 172, 142, 0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - ex - w * 0.06, ey - h * 0.3);
    ctx.lineTo(cx - ex + w * 0.02, ey - h * 0.02);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60, 38, 28, 0.28)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - ex - w * 0.02, ey - h * 0.29);
    ctx.lineTo(cx - ex + w * 0.06, ey - h * 0.03);
    ctx.stroke();
  }
  ctx.restore();
  // ears, and the jaw shadow that ties the head to the neck
  for (const s of [-1, 1]) {
    ctx.fillStyle = s < 0 ? '#7d6753' : '#4c3e31';
    ctx.beginPath();
    ctx.ellipse(cx + s * w * 0.98, cy + h * 0.06, w * 0.12, h * 0.16, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(10, 8, 7, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.84, w * 0.6, h * 0.12, 0, 0, Math.PI);
  ctx.fill();
}

function hatPeaked(ctx, cy, w, h) {
  // crown, band, visor, and the shadow the visor throws across the brow
  ctx.fillStyle = '#1a1d22';
  ctx.beginPath();
  ctx.ellipse(128, cy - h * 0.62, w * 1.12, h * 0.46, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(128 - w * 1.12, cy - h * 0.64, w * 2.24, h * 0.18);
  ctx.fillStyle = '#0f1216';
  ctx.fillRect(128 - w * 1.06, cy - h * 0.52, w * 2.12, h * 0.09);
  ctx.fillStyle = '#242a31';
  ctx.beginPath();
  ctx.ellipse(128, cy - h * 0.42, w * 1.0, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(214, 190, 150, 0.2)';
  ctx.beginPath();
  ctx.ellipse(128 - 5, cy - h * 0.5, w * 0.9, h * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(10, 8, 8, 0.5)';
  ctx.beginPath();
  ctx.ellipse(128, cy - h * 0.3, w * 1.02, h * 0.1, 0, 0, Math.PI);
  ctx.fill();
}

function hatBrim(ctx, cy, w, h, tone = '#14171a') {
  ctx.fillStyle = tone;
  ctx.beginPath();
  ctx.ellipse(128, cy - h * 0.48, w * 1.55, h * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(210, 196, 166, 0.12)';
  ctx.beginPath();
  ctx.ellipse(128, cy - h * 0.5, w * 1.5, h * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tone;
  ctx.beginPath();
  ctx.ellipse(128, cy - h * 0.72, w * 0.86, h * 0.34, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(128, cy - h * 0.36, w * 1.1, h * 0.08, 0, 0, Math.PI);
  ctx.fill();
}

function drawHood(ctx, cy, w, h) {
  ctx.fillStyle = '#1a2026';
  ctx.beginPath();
  ctx.moveTo(128 - w * 2.1, 236);
  ctx.bezierCurveTo(128 - w * 2.2, cy - h * 0.2, 128 - w * 1.5, cy - h * 1.5, 128, cy - h * 1.55);
  ctx.bezierCurveTo(128 + w * 1.5, cy - h * 1.5, 128 + w * 2.2, cy - h * 0.2, 128 + w * 2.1, 236);
  ctx.closePath();
  ctx.fill();
  // the opening: a pale inner edge, then the face
  ctx.strokeStyle = 'rgba(150, 166, 170, 0.22)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(128, cy - h * 0.05, w * 1.28, h * 1.28, 0, Math.PI * 0.7, Math.PI * 2.3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(5, 7, 9, 0.6)';
  ctx.beginPath();
  ctx.ellipse(128, cy, w * 1.22, h * 1.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function hairCap(ctx, cy, w, h, colour, grey = 0) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(128, cy - h * 0.32, w * 1.03, h * 0.78, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.fill();
  ctx.fillRect(128 - w * 1.0, cy - h * 0.42, w * 2.0, h * 0.16);
  // temples
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(128 + s * w * 0.92, cy - h * 0.12, w * 0.2, h * 0.28, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (grey > 0) {
    ctx.strokeStyle = `rgba(206, 204, 198, ${grey * 0.4})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 9; i += 1) {
      const x = 128 - w * 0.8 + i * w * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, cy - h * 0.95);
      ctx.quadraticCurveTo(x + 2, cy - h * 0.7, x + 1, cy - h * 0.42);
      ctx.stroke();
    }
  }
}

function render(person, number) {
  const look = lookOf(person) || 'veteran';
  const seed = hash(`${look}|${person.id || ''}|${person.nameIdx ?? 0}`);
  const rnd = rng(seed);
  const p = {
    faceW: 27 + rnd() * 5,
    faceH: 35 + rnd() * 5,
    scar: look === 'veteran' || rnd() < 0.25,
    stubble: look === 'veteran' || look === 'docker' || look === 'constable' ? 0.3 + rnd() * 0.6 : 0,
    eyeGap: 0.31 + rnd() * 0.07,
    browTilt: -0.03 + rnd() * 0.12,
    mouthW: 0.15 + rnd() * 0.07,
    noseW: 1.6 + rnd() * 1.2,
    brow: rnd(),
    rnd,
  };
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  paper(ctx);

  const lowLight = look === 'lamp';
  const keyX = lowLight ? 118 : 58;
  const keyY = lowLight ? 238 : 54;
  ctx.save();
  ctx.beginPath();
  ctx.rect(9, 9, 236, 216);
  ctx.clip();
  ground(ctx, keyX, keyY, lowLight ? 'rgba(255, 186, 110, 0.5)' : 'rgba(236, 196, 142, 0.34)');

  // the room is out of focus behind them: a door edge, a cold window, one warm patch
  ctx.fillStyle = 'rgba(6, 8, 11, 0.6)';
  ctx.fillRect(24, 18, 44, 212);
  ctx.fillStyle = 'rgba(96, 122, 136, 0.06)';
  ctx.fillRect(198, 24, 34, 190);
  ctx.strokeStyle = 'rgba(150, 176, 190, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(206, 24);
  ctx.lineTo(206, 214);
  ctx.moveTo(224, 24);
  ctx.lineTo(224, 214);
  ctx.stroke();

  const cx = 128;
  const cy = 108;
  const w = p.faceW;
  const h = p.faceH;
  const width = look === 'docker' ? 196 : look === 'sister' ? 142 : look === 'rookie' ? 158 : 162;
  const coat = look === 'sister'
    ? { lit: '#4a4640', mid: '#2b2925', dark: '#131211' }
    : look === 'docker'
      ? { lit: '#3f4038', mid: '#22231f', dark: '#0d0e0c' }
      : { lit: '#3a3d42', mid: '#22252a', dark: '#0c0e11' };

  shoulders(ctx, width, 186, coat, keyX, keyY);
  // neck: narrower at the jaw, widening into the collar; the key catches one side
  const neck = ctx.createLinearGradient(keyX, keyY, keyX + 150, keyY + 120);
  neck.addColorStop(0, '#9a8470');
  neck.addColorStop(1, '#3e342c');
  ctx.fillStyle = neck;
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy + h * 0.7);
  ctx.quadraticCurveTo(cx - 14, 174, cx - 20, 190);
  ctx.lineTo(cx + 20, 190);
  ctx.quadraticCurveTo(cx + 14, 174, cx + 12, cy + h * 0.7);
  ctx.closePath();
  ctx.fill();
  // the collar's shadow cuts across the base of the neck
  ctx.fillStyle = 'rgba(8, 7, 6, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, 183, 23, 6, 0, 0, Math.PI);
  ctx.fill();

  if (look === 'rookie') drawHood(ctx, cy, w, h);
  if (look === 'sister') {
    // a black veil behind the coif
    ctx.fillStyle = '#0f1013';
    ctx.beginPath();
    ctx.moveTo(cx - w * 1.9, 236);
    ctx.bezierCurveTo(cx - w * 1.9, cy - h * 1.1, cx - w * 0.8, cy - h * 1.5, cx, cy - h * 1.5);
    ctx.bezierCurveTo(cx + w * 0.8, cy - h * 1.5, cx + w * 1.9, cy - h * 1.1, cx + w * 1.9, 236);
    ctx.closePath();
    ctx.fill();
  }
  if (look === 'lamp') {
    // long black hair, pulled back, and the bun at the nape
    ctx.fillStyle = '#111014';
    ctx.beginPath();
    ctx.ellipse(cx, cy - h * 0.1, w * 1.22, h * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 1.18, w * 0.5, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // the face, then the hair / hat on top of it
  face(ctx, cx, cy, w, h, p, keyX, keyY);

  if (look === 'veteran') {
    hairCap(ctx, cy, w, h, '#26241f', 1);
    hatPeaked(ctx, cy, w, h);
  } else if (look === 'rookie') {
    hairCap(ctx, cy, w, h, '#171412', 0.2);
    // wet strands on the forehead
    ctx.strokeStyle = 'rgba(10, 9, 8, 0.8)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.55 + i * w * 0.3, cy - h * 0.82);
      ctx.quadraticCurveTo(cx - w * 0.3 + i * w * 0.3, cy - h * 0.4, cx - w * 0.2 + i * w * 0.28, cy - h * 0.16);
      ctx.stroke();
    }
  } else if (look === 'lamp') {
    // a low hairline with a centre part, then a few strands catching the lantern below
    ctx.fillStyle = '#111014';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.98, cy - h * 0.22);
    ctx.quadraticCurveTo(cx - w * 0.62, cy - h * 1.04, cx, cy - h * 1.02);
    ctx.quadraticCurveTo(cx + w * 0.62, cy - h * 1.04, cx + w * 0.98, cy - h * 0.22);
    ctx.lineTo(cx + w * 0.86, cy - h * 0.12);
    ctx.quadraticCurveTo(cx, cy - h * 0.6, cx - w * 0.86, cy - h * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(214, 186, 154, 0.2)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.7 + i * w * 0.4, cy - h * 0.78);
      ctx.quadraticCurveTo(cx - w * 0.8 + i * w * 0.42, cy - h * 0.3, cx - w * 0.9 + i * w * 0.45, cy + h * 0.1);
      ctx.stroke();
    }
  } else if (look === 'constable') {
    hairCap(ctx, cy, w, h, '#3a3630', 0.7);
    // moustache and the whistle cord
    ctx.strokeStyle = 'rgba(196, 188, 176, 0.42)';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.22, cy + h * 0.31);
    ctx.quadraticCurveTo(cx, cy + h * 0.26, cx + w * 0.22, cy + h * 0.31);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150, 138, 112, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 14, 176);
    ctx.quadraticCurveTo(cx, 200, cx + 14, 176);
    ctx.stroke();
    hatBrim(ctx, cy, w, h, '#191b1d');
  } else if (look === 'student') {
    hairCap(ctx, cy, w, h, '#141210', 0);
    // a messy fringe: three wedges
    ctx.fillStyle = '#141210';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx + i * w * 0.45 - w * 0.2, cy - h * 0.9);
      ctx.lineTo(cx + i * w * 0.45 + w * 0.2, cy - h * 0.86);
      ctx.lineTo(cx + i * w * 0.4, cy - h * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    // round glasses, one lens catching the key
    ctx.strokeStyle = 'rgba(196, 198, 190, 0.55)';
    ctx.lineWidth = 1.6;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + s * w * 0.34, cy - h * 0.06, w * 0.26, h * 0.16, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.08, cy - h * 0.06);
    ctx.lineTo(cx + w * 0.08, cy - h * 0.06);
    ctx.stroke();
    ctx.fillStyle = 'rgba(226, 244, 242, 0.24)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.4, cy - h * 0.1, w * 0.1, h * 0.05, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // scarf
    ctx.fillStyle = '#2b2a28';
    ctx.beginPath();
    ctx.moveTo(cx - 34, 178);
    ctx.quadraticCurveTo(cx, 194, cx + 34, 178);
    ctx.lineTo(cx + 38, 236);
    ctx.lineTo(cx - 38, 236);
    ctx.closePath();
    ctx.fill();
  } else if (look === 'sister') {
    // the coif: a white band framing the face, over the veil
    ctx.fillStyle = '#d9d2c2';
    ctx.beginPath();
    ctx.moveTo(cx - w * 1.15, cy - h * 0.15);
    ctx.quadraticCurveTo(cx - w * 1.2, cy - h * 1.25, cx, cy - h * 1.3);
    ctx.quadraticCurveTo(cx + w * 1.2, cy - h * 1.25, cx + w * 1.15, cy - h * 0.15);
    ctx.lineTo(cx + w * 1.0, cy - h * 0.05);
    ctx.quadraticCurveTo(cx, cy - h * 0.55, cx - w * 1.0, cy - h * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 236, 224, 0.7)';
    ctx.beginPath();
    ctx.moveTo(cx - w * 1.05, cy - h * 0.4);
    ctx.quadraticCurveTo(cx, cy - h * 0.9, cx + w * 1.05, cy - h * 0.4);
    ctx.lineTo(cx + w * 0.98, cy - h * 0.3);
    ctx.quadraticCurveTo(cx, cy - h * 0.78, cx - w * 0.98, cy - h * 0.3);
    ctx.closePath();
    ctx.fill();
    // white collar and a cross
    ctx.fillStyle = '#cfc9bb';
    ctx.beginPath();
    ctx.moveTo(cx - 30, 184);
    ctx.lineTo(cx - 12, 214);
    ctx.lineTo(cx + 12, 214);
    ctx.lineTo(cx + 30, 184);
    ctx.quadraticCurveTo(cx, 200, cx - 30, 184);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b8b2a2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 214);
    ctx.lineTo(cx, 232);
    ctx.moveTo(cx - 5, 220);
    ctx.lineTo(cx + 5, 220);
    ctx.stroke();
  } else if (look === 'docker') {
    hairCap(ctx, cy, w, h, '#211f1b', 0.5);
    hatBrim(ctx, cy, w, h, '#242520');
    // salt on the jaw
    ctx.fillStyle = 'rgba(214, 214, 206, 0.18)';
    for (let i = 0; i < 36; i += 1) {
      const a = Math.PI * (0.15 + p.rnd() * 0.7);
      ctx.fillRect(cx + Math.cos(a) * w * 0.85, cy + Math.sin(a) * h * 0.8, 1.2, 1.2);
    }
  }

  // collars: the shape that tells one silhouette from another
  if (look === 'veteran') {
    ctx.fillStyle = '#20252a';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 18, 172);
      ctx.lineTo(cx + s * 62, 190);
      ctx.lineTo(cx + s * 50, 236);
      ctx.lineTo(cx + s * 16, 214);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(198, 206, 212, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + s * 20, 176);
      ctx.lineTo(cx + s * 60, 192);
      ctx.stroke();
    }
  } else if (look === 'lamp') {
    // a high tweed collar, buttoned to the throat
    ctx.fillStyle = '#2c2a24';
    ctx.beginPath();
    ctx.moveTo(cx - 44, 236);
    ctx.bezierCurveTo(cx - 44, 190, cx - 26, 176, cx, 176);
    ctx.bezierCurveTo(cx + 26, 176, cx + 44, 190, cx + 44, 236);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(190, 172, 132, 0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx - 34 + i * 17, 186);
      ctx.lineTo(cx - 34 + i * 17, 232);
      ctx.stroke();
    }
  } else if (look === 'rookie') {
    ctx.strokeStyle = 'rgba(160, 180, 190, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 70, 210);
    ctx.quadraticCurveTo(cx, 228, cx + 70, 210);
    ctx.stroke();
  } else if (look === 'constable') {
    ctx.fillStyle = '#1a1d21';
    ctx.beginPath();
    ctx.moveTo(cx - 26, 178);
    ctx.lineTo(cx - 44, 230);
    ctx.lineTo(cx - 10, 230);
    ctx.lineTo(cx - 4, 196);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 26, 178);
    ctx.lineTo(cx + 44, 230);
    ctx.lineTo(cx + 10, 230);
    ctx.lineTo(cx + 4, 196);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(196, 190, 174, 0.45)';
    ctx.beginPath();
    ctx.arc(cx, 206, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // rim light: one warm hairline on the key side of the head and shoulders
  ctx.strokeStyle = lowLight ? 'rgba(255, 206, 150, 0.38)' : 'rgba(255, 226, 180, 0.3)';
  ctx.lineWidth = 1.6;
  headPath(ctx, cx, cy, w * 0.99, h * 0.99);
  ctx.save();
  ctx.beginPath();
  ctx.rect(8, 8, 238, 218);
  ctx.clip();
  ctx.stroke();
  ctx.restore();
  // and a cold bounce on the other side — one lamp in a cold room, not a single flat key
  const anti = Math.atan2(keyY - cy, keyX - cx) + Math.PI;
  ctx.strokeStyle = 'rgba(150, 178, 196, 0.18)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 1.01, h * 1.01, 0, anti - 0.55, anti + 0.55);
  ctx.stroke();
  ctx.strokeStyle = lowLight ? 'rgba(255, 206, 150, 0.16)' : 'rgba(255, 226, 180, 0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.5 + 6, 228);
  ctx.quadraticCurveTo(cx - width * 0.3, 196, cx - 28, 184);
  ctx.stroke();

  // one warm key laid over the whole print: everything in the frame stands in the same light
  const beam = ctx.createLinearGradient(lowLight ? 60 : 20, lowLight ? 220 : 10, lowLight ? 150 : 170, lowLight ? 60 : 150);
  beam.addColorStop(0, lowLight ? 'rgba(255, 206, 150, 0.18)' : 'rgba(255, 216, 160, 0.14)');
  beam.addColorStop(1, 'rgba(255, 214, 160, 0)');
  ctx.fillStyle = beam;
  ctx.fillRect(8, 8, 238, 218);
  const cold = ctx.createLinearGradient(210, 20, 250, 200);
  cold.addColorStop(0, 'rgba(120, 156, 180, 0.08)');
  cold.addColorStop(1, 'rgba(120, 156, 180, 0)');
  ctx.fillStyle = cold;
  ctx.fillRect(8, 8, 238, 218);

  // grain, then the vignette
  const n = noiseTile();
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.globalCompositeOperation = 'overlay';
  for (let y = 8; y < 226; y += 128) {
    for (let x = 8; x < 246; x += 128) ctx.drawImage(n, x, y);
  }
  ctx.restore();
  const vig = ctx.createRadialGradient(cx, 110, 40, cx, 120, 190);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(8, 8, 238, 218);

  // the print's edge and the pencil number
  ctx.strokeStyle = 'rgba(232, 226, 210, 0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(9.5, 9.5, 235, 215);
  ctx.restore();

  if (number) {
    ctx.fillStyle = 'rgba(46, 38, 28, 0.78)';
    ctx.font = '10px "Consolas", "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(number, 14, 242);
  }
  ctx.strokeStyle = 'rgba(60, 48, 34, 0.32)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(128, 238);
  ctx.lineTo(196, 238);
  ctx.stroke();
  return canvas;
}

function blank(ctx, x, y, size, number) {
  ctx.fillStyle = '#c9bfa8';
  ctx.fillRect(x, y, size, size);
  const ix = x + size * 0.04;
  const iy = y + size * 0.04;
  const iw = size * 0.92;
  const ih = size * 0.8;
  ctx.fillStyle = 'rgba(12, 14, 18, 0.92)';
  ctx.fillRect(ix, iy, iw, ih);
  const g = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih);
  g.addColorStop(0, 'rgba(200, 190, 170, 0.06)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(ix, iy, iw, ih);
  if (number) {
    ctx.fillStyle = 'rgba(48, 40, 30, 0.8)';
    ctx.font = `${Math.max(6, size * 0.04)}px "Consolas", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(number, x + size * 0.05, y + size * 0.96);
  }
}

export function drawPortrait(ctx, x, y, size, person, number) {
  if (!person) {
    blank(ctx, x, y, size, number);
    return;
  }
  const key = `${lookOf(person)}|${person.id || ''}|${person.nameIdx ?? 0}|${number || ''}`;
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = render(person, number);
    cache.set(key, canvas);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, x, y, size, size);
}

// tools 用：把八种轮廓排成一张联络表
export function drawContactSheet(ctx, people, size = 128) {
  people.forEach((person, i) => {
    drawPortrait(ctx, (i % 4) * size, Math.floor(i / 4) * size, size, person, `#${String(i + 1).padStart(3, '0')}`);
  });
}
