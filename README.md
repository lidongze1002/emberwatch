# emberwatch

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/lidongze1002/emberwatch/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/lidongze1002/emberwatch/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Night Watch** (夜巡科): a municipal night shift that handles urban legends. You do not move the
three agents — you give them objectives, and they decide how to walk, who to shoot, when to back
off and when to pick a mate up. Five case files, five rules, one screen:

1. **The Opera House** — the house sings while the power is on; cut the switchboard before the
   squad walks onto the stage. Boss: tsuchigumo.
2. **The Apartment** — do not answer the door. Knocks pull the nearest of them toward it, and
   Hachi-sama cannot be killed. Hold out until dawn.
3. **The Station** — the map changes. One gate is live every sixteen seconds, and only one of you
   gets through per departure. No boss, only shutters and the last train.
4. **The Paddy** — do not look too closely. A gaze meter fills while a muzzle rests on the thing in
   the water; E turns the squad's eyes away.
5. **The Thirteenth Floor** — the floor repeats. Thirteen doors, plates renumbered every floor, and
   a copy of your own squad waiting at the next one.

Drawn entirely with canvas code, sounded entirely with WebAudio, no assets and no network.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. Click to open the case files; click a spot to take command
(the squad drives itself until you do). `T` hands them back to the duty officer, `Space`/`E` is the
case's rule action (don't answer / look away / recall), `Q` spends the lamp, `P` pauses, `1`/`2`
sets speed.

## Two editions

`game/index.html` is the English edition; `game/zh.html` is 中文版. Each page loads its own
word-book (`game/src/locale/en.js`, `game/src/locale/zh.js`) and speaks only that language; the
corner note on the title screen is the only link between them. Both run the same engine, so the
rules and the screenshots are the same game in two voices.

## How it is built

`game/` is plain ES modules loaded by `game/index.html` with no build step and no third-party code.
`cases.js` is the five case files (walls, furniture, spawns, zones, rule parameters, boss);
`rules.js` is one rule per case plus the autopilot that plays them; `level.js` the grid, the sight
lines and the dynamic walls the station shutters swap in; `units.js` the three agents, the clerks,
the tsuchigumo, Hachi-sama, the kune-kune and the mirrors; `render.js` the scene; `hud.js` and
`overlays.js` the dossier interface; `game.js` the case flow; `main.js` the loop. `main.ts` hands
the entry in: it copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the kit's `buildDossier`.

Design notes live in `docs/`: `CAMERA.md` (the top-down projection and its seven checks),
`CHARACTERS.md` (proportions and animation), `CASES.md` (the five cases, their rules and the
implementation status) and `ITERATIONS.md` (the twenty rounds on the people and the interface).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
