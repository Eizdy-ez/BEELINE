// Boot and the one loop: BEELINE's screens (title, play, paused, blessing choice, game over,
// victory) over one fixed-step world. Input is read every frame, the world advances in 1/60 s
// steps, world events become sounds and screen changes, and the renderer paints the result.
//
// ?seed=N fixes the meadow pattern. ?shot=start|play|upgrade|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createParticles } from './particles.js';
import {
  createWorld,
  EVENT_DASH,
  EVENT_GAME_OVER,
  EVENT_GUST,
  EVENT_HURT,
  EVENT_LEVEL_CLEAR,
  EVENT_QUEEN_ARRIVES,
  EVENT_QUEEN_REPELLED,
  EVENT_SIP,
  EVENT_STUN,
  EVENT_TRAP_SIP,
} from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_UPGRADE,
  SCREEN_VICTORY,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const particles = createParticles(random);
const world = createWorld(random, particles);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const view = { best: scene.best, offers: scene.offers, time: 0, particles };
  let painted = 0;
  function paint() {
    view.time = painted * 0.37;
    renderer.draw(world.state, scene.screen, view);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let offers = [];
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function pointerInField() {
    const pointer = input.pointer();
    if (!pointer) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((pointer.x - rect.left) / rect.width) * FIELD.width,
      y: ((pointer.y - rect.top) / rect.height) * FIELD.height,
    };
  }

  function startRun() {
    world.reset();
    offers = [];
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Flying. Bank the nectar before dusk.');
  }

  function finishRun(victoryScreen) {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    screen = victoryScreen ? SCREEN_VICTORY : SCREEN_OVER;
    if (victoryScreen) audio.victory();
    else audio.gameOver();
    announce(victoryScreen ? `Victory. Score ${world.state.score}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function chooseBlessing(index) {
    const blessing = offers[index];
    if (!blessing) return;
    world.applyBlessing(blessing.id);
    offers = [];
    world.startMeadow(world.state.level + 1);
    screen = SCREEN_PLAY;
    announce(`Blessing taken: ${blessing.name}. Meadow ${world.state.level}.`);
  }

  window.addEventListener('keydown', (event) => {
    if (screen !== SCREEN_UPGRADE) return;
    if (event.code === 'Digit1') chooseBlessing(0);
    if (event.code === 'Digit2') chooseBlessing(1);
    if (event.code === 'Digit3') chooseBlessing(2);
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (screen !== SCREEN_UPGRADE) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * FIELD.width;
    const y = ((event.clientY - rect.top) / rect.height) * FIELD.height;
    for (let i = 0; i < 3; i += 1) {
      const cardX = FIELD.width / 2 - 330 + i * 228;
      if (x >= cardX && x <= cardX + 204 && y >= 238 && y <= 456) chooseBlessing(i);
    }
  });

  function handleEvents(events) {
    if (events & EVENT_SIP) audio.sip(world.state.combo);
    if (events & EVENT_TRAP_SIP) audio.trapSip();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_STUN) audio.stun();
    if (events & EVENT_HURT) audio.hurt();
    if (events & EVENT_GUST) audio.gust();
    if (events & EVENT_QUEEN_ARRIVES) audio.gust();
    if (events & EVENT_QUEEN_REPELLED) audio.levelClear();
    if (events & EVENT_LEVEL_CLEAR) {
      audio.levelClear();
      if (world.state.level >= 9) finishRun(true);
      else {
        offers = world.offerBlessings();
        screen = SCREEN_UPGRADE;
        announce(`Meadow ${world.state.level} banked. Choose a blessing: 1, 2 or 3.`);
      }
    }
    if (events & EVENT_GAME_OVER) finishRun(false);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.toggleMute();
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY) startRun();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Flying.');
      }
    }
    return actions;
  }

  function stepOnce(actions) {
    if (screen === SCREEN_TITLE) {
      // The meadow lives behind the title: a quiet demo flight, reset whenever it ends.
      const events = world.step(STEP, demoControl());
      if (events & (EVENT_GAME_OVER | EVENT_LEVEL_CLEAR)) world.reset();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const dir = input.direction();
    const events = world.step(STEP, {
      x: dir.x,
      y: dir.y,
      dash: (actions & ACTION_DASH) !== 0,
      pointer: pointerInField(),
    });
    handleEvents(events);
  }

  let demoPhase = 0;
  function demoControl() {
    demoPhase += STEP;
    const state = world.state;
    let target = null;
    let bestD = Infinity;
    for (const flower of state.flowers) {
      if (flower.phase !== 'bloom' || flower.trap) continue;
      const d = Math.hypot(flower.x - state.bee.x, flower.y - state.bee.y);
      if (d < bestD) {
        bestD = d;
        target = flower;
      }
    }
    if (!target) return { x: Math.cos(demoPhase * 0.6) * 0.4, y: Math.sin(demoPhase * 0.8) * 0.3, dash: false, pointer: null };
    const dx = target.x - state.bee.x;
    const dy = target.y - 26 - state.bee.y;
    const d = Math.hypot(dx, dy);
    if (d < 30) return { x: 0, y: 0, dash: false, pointer: null };
    return { x: dx / d, y: dy / d, dash: false, pointer: null };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        stepOnce(actions);
        accumulator -= STEP;
        if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, { best, offers, time: now / 1000, particles });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('BEELINE. Press Enter or click to fly.');
  requestAnimationFrame(frame);
}

// A small handle for scripted play-tests and screenshot tooling; the game never reads it.
window.__beeline = { world, state: world.state };

if (shot) runShot(shot);
else runGame();
