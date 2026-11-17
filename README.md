# emberwatch

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/lidongze1002/emberwatch/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/lidongze1002/emberwatch/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A one-screen arcade defence game: you keep the last lighthouse on a cliff while the night sends
shadows up out of the sea. The mouse aims the beam, light burns what it touches, kills feed the
lamp, and every cleared wave offers one of three upgrades. Eight waves, the last of them a
leviathan. Drawn entirely with canvas code, sounded entirely with WebAudio, no assets and no
network.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. Mouse aims the beam, Space or right click spends Overdrive,
1/2/3 pick an upgrade card, M mutes, and C opens the record from the title or the ending.

## Two editions

`game/index.html` is the English edition; `game/zh.html` is 中文版. Each page loads its own
word-book (`game/src/locale/en.js`, `game/src/locale/zh.js`) and speaks only that language;
the corner note on the title screen is the only link between them. Both run the same engine,
so the rules and the screenshots are the same game in two voices.

The record (`C`) is the written content: seven shadows with how each one dies, the ten gifts
the lamp offers, and the eight tides with a line of the keeper's lore for each — with the wave
banner carrying a new line of the story into every tide.

## How it is built

`game/` is plain ES modules loaded by `game/index.html` with no build step and no third-party
code: `config.js` holds the tuning and the wave table, `rng.js` a seeded generator, `beam.js` the
cone and its damage, `enemies.js` the seven shadow behaviours, `upgrades.js` the ten cards,
`render.js` the scene, `hud.js` and `overlays.js` the interface, `game.js` the run, `shots.js` the
deterministic scenes the screenshots are captured from, and `main.js` the loop. `main.ts` hands
the entry in: it copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the kit's `buildDossier`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
