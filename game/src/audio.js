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
    } catch {
      this.ctx = null;
    }
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

  tone(freq, duration, type = 'sine', level = 0.08, slide = null, delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(level, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.04);
  }

  burst(duration, freq, level, type = 'lowpass') {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
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
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.04);
  }

  shot(role) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastShot < 0.045) return;
    this.lastShot = now;
    const gain = role === 'veteran' ? 0.075 : 0.05;
    this.burst(0.07, role === 'veteran' ? 1600 : 2400, gain, 'bandpass');
    this.tone(role === 'veteran' ? 180 : 240, 0.05, 'square', 0.02, 90);
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
