// 启动：一块画布、一局值班、一个固定 1/60 秒的循环。场景是 1280×800，按窗口等比缩放。

import { VIEW } from './config.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

const sound = new Sound();
const input = new Input(canvas);
input.onFirstGesture = () => sound.start();
input.attach();

const game = new Game(sound, input);
game.onNavigate = (href) => {
  window.location.href = href;
};

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

let last = performance.now();
let accumulator = 0;
const STEP = 1 / 60;

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;

  game.handleInput(input.takeClicks(), input.takeTyped());

  accumulator += elapsed;
  const cap = 6 * game.speed;
  let steps = 0;
  while (accumulator >= STEP && steps < cap) {
    game.update(STEP);
    accumulator -= STEP;
    steps += 1;
  }
  if (steps >= cap) accumulator = 0;

  game.draw(ctx, now / 1000);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
window.__nightwatch = { game, sound, input };
