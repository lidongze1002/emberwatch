// The page names its language; the game loads one word-book and stays in it.

import { en } from './locale/en.js';
import { zh } from './locale/zh.js';

const tag = (document.documentElement.lang || 'en').toLowerCase();

export const L = tag.startsWith('zh') ? zh : en;
export const fonts = L.fonts;
