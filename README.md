# BEELINE

A honeybee races the dusk. Bank each meadow's nectar quota before the light runs out:
sip golden blooms dry, dash through wasps to stun them, beware the spider-guarded violet
blooms that pay double, choose a blessing after every meadow, and repel the Hornet Queen
on meadows 3, 6 and 9. Clear all nine meadows to save the hive.

An original arcade game for the make.fun bounty
[Make the best game](https://make.fun/bounty/best-game-01). It plays offline in a desktop
browser from the static files under `game/` — no build step, no network request, no library:
every line of the game is in `game/src/`, drawn and sounded live (canvas 2D and WebAudio).

![make.fun bounty](https://make.fun/badge/best-game-01.svg)
![make.fun rank](https://make.fun/badge/best-game-01/Eizdy-ez/BEELINE/rank.svg)
![make.fun reward](https://make.fun/badge/best-game-01/Eizdy-ez/BEELINE/reward.svg)

## Play

```sh
node serve.ts          # serves game/ at http://localhost:8080
```

Open http://localhost:8080 in a desktop browser and press Enter.

- **Fly:** WASD or the arrow keys, or hold the mouse button and steer
- **Dash:** Space or Shift — a dashing bee stuns wasps and the Queen, and cannot be stung
- **Pause:** P or Esc · **Mute:** M · **Choose a blessing:** 1, 2 or 3 (or click its card)

## How the entry is handed in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output
directory and writes `dossier.json` there with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

- `game/` — the playable game as static files (`game/index.html` and its ES modules)
- `screenshots/` — four real renders of the game (title, play, blessing choice, game over)
- `vendor/makefun-game.ts` — the kit's library, unchanged
- `shots.json` — the deterministic screenshot scenes (`?shot=...&seed=...`)

## License

MIT — see `LICENSE`.
