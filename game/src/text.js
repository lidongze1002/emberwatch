// The page names its language; the game loads one word-book and stays in it.

import { en } from './locale/en.js';
import { zh } from './locale/zh.js';

const tag = (document.documentElement.lang || 'en').toLowerCase();

export const L = tag.startsWith('zh') ? zh : en;
export const fonts = L.fonts;

export function postName(post) {
  return (L.post && L.post[post]) || post;
}

export function traitName(trait) {
  return (L.trait && L.trait[trait]) || trait;
}

export function traitLine(trait) {
  return (L.trait && L.trait.line && L.trait.line[trait]) || '';
}

export function personName(m) {
  if (!m) return '—';
  if (m.nameIdx < 0) return L.roster.substitute;
  return L.names[m.nameIdx % L.names.length];
}
