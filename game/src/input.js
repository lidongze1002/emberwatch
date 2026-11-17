// Pointer and keyboard, in the game's own coordinates. The canvas is letterboxed, so every
// client position is mapped back onto the 1280 x 800 scene before anything else sees it.
// Keys are collected whole, then handed to the game once per frame and cleared.

import { VIEW } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = VIEW.width / 2;
    this.y = VIEW.height * 0.95;
    this.inside = false;
    this.down = false;
    this.clicks = [];
    this.typed = [];
    this.held = new Set();
    this.onFirstGesture = null;
    this.gestureSeen = false;
  }

  attach() {
    const c = this.canvas;
    c.addEventListener('contextmenu', (event) => event.preventDefault());
    c.addEventListener('pointermove', (event) => this.locate(event));
    c.addEventListener('pointerenter', (event) => {
      this.inside = true;
      this.locate(event);
    });
    c.addEventListener('pointerleave', () => {
      this.inside = false;
      this.down = false;
    });
    c.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.locate(event);
      this.down = true;
      this.gesture();
      this.clicks.push({ x: this.x, y: this.y, button: event.button });
      c.setPointerCapture?.(event.pointerId);
    });
    c.addEventListener('pointerup', () => {
      this.down = false;
    });
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
      if (event.repeat) return;
      this.held.add(event.code);
      this.typed.push(event.code);
      this.gesture();
    });
    window.addEventListener('keyup', (event) => this.held.delete(event.code));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.down = false;
    });
  }

  gesture() {
    if (this.gestureSeen) return;
    this.gestureSeen = true;
    this.onFirstGesture?.();
  }

  locate(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.x = ((event.clientX - rect.left) / rect.width) * VIEW.width;
    this.y = ((event.clientY - rect.top) / rect.height) * VIEW.height;
    this.inside = true;
  }

  isHeld(code) {
    return this.held.has(code);
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
