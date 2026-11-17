// Every sound in Emberwatch is made here, out of oscillators and one noise buffer: a drone
// under the whole game, a hum that rises with the number of shadows in the beam, and short
// one-shot voices for hits, kills, hurts, waves, cards and the two endings.
// The browser will not let a page make noise before the player touches it, so nothing starts
// until the first gesture, and every voice is wrapped: audio must never break a run.

const MUTE_KEY = 'emberwatch.muted.v1';

export class Sound {
  constructor() {
    this.supported = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
    this.ctx = null;
    this.master = null;
    this.drone = null;
    this.hum = null;
    this.humGain = null;
    this.noise = null;
    this.lastHit = -1;
    this.muted = this.loadMute();
  }

  loadMute() {
    try {
      return window.localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      return false;
    }
  }

  saveMute() {
    try {
      window.localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* private mode: the choice just does not persist */
    }
  }

  start() {
    if (this.ctx || !this.supported) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise();
      this.buildDrone();
      this.buildHum();
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  makeNoise() {
    const length = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      // brown-ish noise: softer than white, better for wind and thuds
      const white = Math.random() * 2 - 1;
      last = (last + 0.035 * white) / 1.035;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  buildDrone() {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    const gain = ctx.createGain();
    gain.gain.value = 0.028;
    const one = ctx.createOscillator();
    const two = ctx.createOscillator();
    one.type = 'sawtooth';
    two.type = 'sawtooth';
    one.frequency.value = 55;
    two.frequency.value = 55 * 1.008;
    one.connect(filter);
    two.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    one.start();
    two.start();
    // a breath of sea under the drone, very quiet
    const sea = ctx.createBufferSource();
    sea.buffer = this.noise;
    sea.loop = true;
    const seaFilter = ctx.createBiquadFilter();
    seaFilter.type = 'lowpass';
    seaFilter.frequency.value = 420;
    const seaGain = ctx.createGain();
    seaGain.gain.value = 0.035;
    sea.connect(seaFilter);
    seaFilter.connect(seaGain);
    seaGain.connect(this.master);
    sea.start();
    this.drone = { filter, gain };
  }

  buildHum() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 96;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 480;
    filter.Q.value = 0.9;
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    osc.connect(filter);
    filter.connect(this.humGain);
    this.humGain.connect(this.master);
    osc.start();
    this.hum = { osc, filter };
  }

  // The hum follows the beam's work: how many shadows are lit, and whether overdrive is up.
  setLit(count, overdrive) {
    if (!this.ctx || !this.humGain) return;
    const now = this.ctx.currentTime;
    const target = overdrive ? 0.075 : Math.min(0.055, count * 0.011);
    this.humGain.gain.setTargetAtTime(this.muted ? 0 : target, now, 0.09);
    this.hum.osc.frequency.setTargetAtTime(88 + count * 6 + (overdrive ? 40 : 0), now, 0.12);
    this.hum.filter.frequency.setTargetAtTime(400 + count * 90, now, 0.12);
  }

  toggleMute() {
    this.muted = !this.muted;
    this.saveMute();
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.04);
    }
    return this.muted;
  }

  // -- one-shot voices -------------------------------------------------------

  tone(freq, duration, type = 'sine', level = 0.1, slideTo = null, delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(level, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  burst(duration, frequency, level, type = 'lowpass', delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, t0);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.05);
  }

  hit() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastHit < 0.05) return;
    this.lastHit = now;
    this.burst(0.05, 1800, 0.035, 'bandpass');
  }

  kill(size = 10) {
    if (!this.ctx) return;
    const pitch = Math.max(110, 460 - size * 9);
    this.burst(0.14, 900, 0.07);
    this.tone(pitch, 0.16, 'sine', 0.05, pitch * 0.6);
  }

  hurt() {
    if (!this.ctx) return;
    this.burst(0.4, 220, 0.16);
    this.tone(92, 0.42, 'sine', 0.16, 44);
  }

  flare() {
    if (!this.ctx) return;
    this.tone(340, 0.45, 'sine', 0.05, 120);
    this.burst(0.5, 1400, 0.05, 'highpass');
  }

  wave() {
    this.tone(392, 0.3, 'triangle', 0.07);
    this.tone(587, 0.5, 'triangle', 0.06, null, 0.12);
  }

  upgrade() {
    this.tone(523, 0.22, 'triangle', 0.06);
    this.tone(659, 0.22, 'triangle', 0.06, null, 0.09);
    this.tone(784, 0.4, 'triangle', 0.06, null, 0.18);
  }

  overdrive() {
    this.tone(180, 0.5, 'sawtooth', 0.06, 900);
    this.burst(0.5, 2400, 0.05, 'highpass');
  }

  victory() {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((note, i) => this.tone(note, 0.7, 'triangle', 0.07, null, i * 0.13));
  }

  defeat() {
    const notes = [440, 349, 293, 220];
    notes.forEach((note, i) => this.tone(note, 0.9, 'sine', 0.08, null, i * 0.18));
    this.burst(1.2, 180, 0.09);
  }

  select() {
    this.tone(660, 0.07, 'square', 0.025);
  }

  begin() {
    this.tone(330, 0.5, 'triangle', 0.06, 660);
  }
}
