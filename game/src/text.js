// The page chooses the word-book; nothing switches language during a run. index.html is English,
// zh.html is Chinese, and each one loads exactly one of these two trees.

import { en } from './locale/en.js';
import { zh } from './locale/zh.js';

const tag = (document.documentElement.lang || 'en').toLowerCase();

export const L = tag.startsWith('zh') ? zh : en;
export const fonts = L.fonts;
export const isCJK = L.cjk;

// Grouping commas look the same in both editions, so scores are printed one way everywhere.
export function number(value) {
  return Math.round(value).toLocaleString('en-US');
}
