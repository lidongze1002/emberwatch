// 值班室能听到的东西：枪声是短噪声，命中是闷响，拉闸是金属声，结案是一条和弦。

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.lastShot = 0;
    this.muted = false;
  }

  start() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise();
      this.buildAria();
    } catch {
      this.ctx = null;
    }
  }

  // the house singing: two voices through a lowpass, louder the nearer the squad is to the stage
  buildAria() {
    const ctx = this.ctx;
    const one = ctx.createOscillator();
    const two = ctx.createOscillator();
    one.type = 'sine';
    two.type = 'sine';
    one.frequency.value = 174.6;
    two.frequency.value = 261.6;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    one.connect(filter);
    two.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    // a slow vibrato, like a voice carrying
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 4.6;
    depth.gain.value = 1.6;
    lfo.connect(depth);
    depth.connect(one.frequency);
    one.start();
    two.start();
    lfo.start();
    this.ariaGain = gain;
  }

  aria(level) {
    if (!this.ariaGain) return;
    const now = this.ctx.currentTime;
    this.ariaGain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.045, now, 0.35);
  }

  // a voice gets a place: quiet with distance, off to one side by position
  output(pan = 0) {
    if (!this.ctx) return null;
    if (typeof this.ctx.createStereoPanner !== 'function') return this.master;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-0.9, Math.min(0.9, pan));
    panner.connect(this.master);
    return panner;
  }

  makeNoise() {
    const length = Math.floor(this.ctx.sampleRate * 0.4);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      data[i] = last * 3;
    }
    return buffer;
  }

  tone(freq, duration, type = 'sine', level = 0.08, slide = null, delay = 0, pan = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const out = this.output(pan);
    if (!out) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(level, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t0);
    osc.stop(t0 + duration + 0.04);
  }

  burst(duration, freq, level, type = 'lowpass', pan = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const out = this.output(pan);
    if (!out) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(t0);
    src.stop(t0 + duration + 0.04);
  }

  shot(role, x = 640, y = 400) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastShot < 0.045) return;
    this.lastShot = now;
    const pan = (x - 640) / 640;
    const far = Math.max(0.2, Math.min(1, 1.15 - Math.hypot(x - 840, y - 180) / 1400));
    const gain = (role === 'veteran' ? 0.075 : 0.05) * far;
    this.burst(0.07, role === 'veteran' ? 1600 : 2400, gain, 'bandpass', pan);
    this.tone(role === 'veteran' ? 180 : 240, 0.05, 'square', 0.02 * far, 90, 0, pan);
  }

  kill() {
    this.tone(320, 0.18, 'sine', 0.06, 120);
    this.burst(0.12, 700, 0.05);
  }

  hurt() {
    this.tone(110, 0.3, 'sine', 0.14, 50);
    this.burst(0.24, 260, 0.08);
  }

  power() {
    this.burst(0.35, 300, 0.14);
    this.tone(220, 0.5, 'sawtooth', 0.05, 60);
  }

  flash() {
    this.tone(900, 0.35, 'triangle', 0.05, 1500);
    this.burst(0.5, 2600, 0.06, 'highpass');
  }

  // 第二案：门后再敲三下
  knock() {
    for (let i = 0; i < 3; i += 1) {
      this.tone(96, 0.16, 'sine', 0.1, 58, i * 0.17);
      this.burst(0.09, 420, 0.05, 'lowpass', 0);
    }
  }

  dismiss() {
    this.tone(180, 0.18, 'triangle', 0.04, 120);
  }

  // 第四案：移开目光，一声很轻的呼气
  avert() {
    this.burst(0.28, 900, 0.03, 'highpass');
  }

  // 第三案：卷帘门
  door() {
    this.burst(0.5, 260, 0.12);
    this.tone(70, 0.4, 'sawtooth', 0.05, 48);
  }

  // 第二案：天亮
  dawn() {
    [262, 330, 392].forEach((n, i) => this.tone(n, 1.6, 'sine', 0.03, null, i * 0.2));
  }

  begin() {
    this.tone(164, 1.2, 'sawtooth', 0.03);
    this.tone(220, 1.2, 'sine', 0.04, null, 0.05);
  }

  win() {
    [392, 494, 587, 784].forEach((n, i) => this.tone(n, 0.6, 'triangle', 0.06, null, i * 0.12));
  }

  lose() {
    [330, 262, 196, 147].forEach((n, i) => this.tone(n, 0.9, 'sine', 0.07, null, i * 0.16));
    this.burst(1.1, 180, 0.08);
  }
}
