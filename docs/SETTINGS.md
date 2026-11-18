# 设置（SETTINGS）

标题页右下角的一枚细线按钮：`设置 / SETTINGS`。它只改**看见的样子**与**听见的音量**，
不改案子、不改规则、不改名册。

---

## 1. 键与默认值

存在 `localStorage`：

| 键 | 内容 | 默认 | 范围 |
| --- | --- | --- | --- |
| `nightwatch.settings.v1` | `{ brightness, volume, grain }` | `1.0 / 85 / 50` | `0.6–1.4 / 0–100 / 0–100` |
| `nightwatch.lang` | `'zh'` 或 `'en'` | 无 | —— |

另外用一次性的 `sessionStorage['nightwatch.langGuard']` 挡住语言重定向来回跳。

## 2. 每一项怎么生效

| 项 | 落在哪 | 说明 |
| --- | --- | --- |
| 亮度 Brightness | `render.js` `drawBrightness()` | 在 `drawPost` 之后、遮幅之前。暗＝黑覆盖（最多 0.5 alpha），亮＝`lighter` 低 alpha 白（最多 0.12）。设置面板画在它上面，暗下来也读得清 |
| 主音量 Master | `audio.js` `Sound.setVolume()` | 直接写 `master.gain.value = volume / 100`；`muted` 时只记数值，不自动解除静音 |
| 胶片颗粒 Grain | `render.js` `drawPost()` | 0 不铺；50 是原来的 0.5 alpha；100 是 1.0。只改画，不改逻辑 |
| 语言 Language | `settings.js` `setLanguage()` + 跳转 | 记 `nightwatch.lang` 后跳 `./zh.html` ↔ `/`；名册与现金本来就在 localStorage，不丢 |
| 全屏 Fullscreen | `game.toggleFullscreen()` | `requestFullscreen()` / `exitFullscreen()`；失败时安静地什么都不做 |

## 3. 交互

- 面板打开时：`Esc` 关闭，`Tab` / `↑↓` 换一项，`←→` 微调（亮度 0.05、音量与颗粒 5）。
- 滑杆可以用指针拖动；按下的那一下也会把数值跳到指针处。
- 面板打开时标题页其它按钮一律不响应；`Tab` 不会把焦点带出画布。
- `恢复默认` 只重置三项数值，不碰语言、不碰名册。
- 语言一段两个按钮：`中文 / English`（英文页写作 `CHINESE / English`）。

## 4. 语言重定向

页面加载时读 `nightwatch.lang`：与当前页不一致就换一次页。

- 当前页为中文（`lang="zh-CN"`）而存的是 `en` → `/`
- 当前页为英文而存的是 `zh` → `/zh.html`
- 换页前把目标语言写进 `sessionStorage['nightwatch.langGuard']`；如果已经写过同一个值，就**不再跳**，避免两页互相踢。

## 5. 验收

`tools/nw-settings.mjs`：

1. 首页点设置 → 面板出现，标题页点其它地方不进入目录。
2. 把亮度拖到 1.30 → 刷新 → 仍是 1.30。
3. 点 English → URL 变成 `/`、`lang="en"`、DOM 与 `en.js` 的词条里没有中日韩字符。
4. 点 CHINESE → URL 回到 `/zh.html`、`lang="zh-CN"`。
5. 键盘：`Tab Tab` 到颗粒、`←` 改成 45、`Esc` 关闭。
