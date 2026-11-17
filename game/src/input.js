// 鼠标和键盘，换算成 1280×800 的场景坐标。点就是目标，键就是指令。

import { VIEW } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = VIEW.width / 2;
    this.y = VIEW.height / 2;
    this.inside = false;
    this.clicks = [];
    this.typed = [];
    this.held = new Set();
    this.onFirstGesture = null;
    this.gestureSeen = false;
  }

  attach() {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointermove', (e) => this.locate(e));
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.locate(e);
      this.gesture();
      this.clicks.push({ x: this.x, y: this.y, button: e.button });
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      this.held.add(e.code);
      this.typed.push(e.code);
      this.gesture();
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => this.held.clear());
  }

  gesture() {
    if (this.gestureSeen) return;
    this.gestureSeen = true;
    this.onFirstGesture?.();
  }

  locate(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.x = ((event.clientX - rect.left) / rect.width) * VIEW.width;
    this.y = ((event.clientY - rect.top) / rect.height) * VIEW.height;
    this.inside = true;
  }

  takeClicks() {
    const out = this.clicks;
    this.clicks = [];
    return out;
  }

  takeTyped() {
    const out = this.typed;
    this.typed = [];
    return out;
  }
}
