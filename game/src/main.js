// Boot: one canvas, one game, one loop. The scene is a fixed 1280 x 800 world letterboxed
// into whatever window it finds, simulated at a fixed 1/60 s step so a run is the same run on
// a slow machine, and resized by CSS rather than by the rules. `?shot=` hands the first frame
// to the staging module and then holds it for the camera.

import { VIEW } from './config.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { prepareShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const status = document.getElementById('status');

const sound = new Sound();
const input = new Input(canvas);
input.onFirstGesture = () => {
  sound.start();
  sound.resume();
};
input.attach();

const game = new Game(sound, input);
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed')) || 1;
const shotMode = Boolean(shotName) && prepareShot(game, shotName, seed);

let drawn = 0;
function fit() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
  canvas.width = Math.round(VIEW.width * dpr);
  canvas.height = Math.round(VIEW.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', fit);
fit();

if (shotMode) {
  document.title = `Emberwatch — ${shotName}`;
}

let last = performance.now();
let accumulator = 0;
const STEP = 1 / 60;

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;

  const clicks = input.takeClicks();
  const typed = input.takeTyped();
  if (!shotMode) game.handleInput(clicks, typed);

  if (!shotMode) {
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP && steps < 6) {
      game.update(STEP);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 6) accumulator = 0;
  }

  game.draw(ctx, now / 1000);
  drawn += 1;

  if (shotMode && drawn >= 1) {
    window.__shotReady = true;
    if (status) status.textContent = `Screenshot scene ${shotName} ready.`;
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Exposed only so a test harness can read the run's state; the game never consults it.
window.__emberwatch = { game, sound, input };
