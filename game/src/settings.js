// 首页的设置：亮度、主音量、胶片颗粒、语言、全屏。只改「画出来的样子」和「听得到的声音」，
// 一条规则都不改。设置存在 localStorage，语言切换也记在这里。
//
// 键：
//   nightwatch.settings.v1   { brightness, volume, grain }
//   nightwatch.lang          'zh' | 'en'
// 语言重定向只做一次：用 sessionStorage 的 nightwatch.langGuard 挡住来回跳。

export const SETTINGS_KEY = 'nightwatch.settings.v1';
export const LANG_KEY = 'nightwatch.lang';
const LANG_GUARD = 'nightwatch.langGuard';

export const DEFAULTS = { brightness: 1, volume: 85, grain: 50 };
export const LIMITS = {
  brightness: [0.6, 1.4],
  volume: [0, 100],
  grain: [0, 100],
};

export const currentLang = () => ((document.documentElement.lang || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en');

const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));

export function loadSettings() {
  const out = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      for (const key of Object.keys(DEFAULTS)) {
        if (saved && Number.isFinite(saved[key])) out[key] = clamp(saved[key], LIMITS[key]);
      }
    }
  } catch {
    /* private mode: the defaults are fine */
  }
  return out;
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      brightness: settings.brightness,
      volume: settings.volume,
      grain: settings.grain,
    }));
  } catch {
    /* no storage, no persistence */
  }
}

export function resetSettings() {
  return { ...DEFAULTS };
}

export function setLanguage(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

// 存的语言和当前页不一致：换页。只换一次，防止两页互相踢。
export function maybeRedirectLanguage() {
  let want = null;
  try {
    want = localStorage.getItem(LANG_KEY);
  } catch {
    return false;
  }
  if (want !== 'zh' && want !== 'en') return false;
  if (want === currentLang()) return false;
  try {
    if (sessionStorage.getItem(LANG_GUARD) === want) {
      sessionStorage.removeItem(LANG_GUARD);
      return false;
    }
    sessionStorage.setItem(LANG_GUARD, want);
  } catch {
    /* if sessionStorage is gone, still try the redirect once */
  }
  window.location.replace(want === 'zh' ? '/zh.html' : '/');
  return true;
}

export function applySettings(game, settings) {
  game.settings = settings;
  if (game.sound && typeof game.sound.setVolume === 'function') game.sound.setVolume(settings.volume);
}

export function nudge(setting, value, dir, step = 0.05) {
  const limits = LIMITS[setting];
  if (!limits) return value;
  const span = setting === 'brightness' ? step : step * 100;
  return clamp(Math.round((value + dir * span) * 100) / 100, limits);
}
