// The meadow simulation: the bee, the blooms, the wasps, the wind and the Hornet Queen.
// Pure rules, no drawing and no sound: step() advances one fixed step for a control input and
// returns event flags, and the shell (main.js) turns those into sound and screen changes.
import { BEE, BLESSINGS, FIELD, FLOWER, HEARTS_MAX, HEARTS_START, MEADOWS, QUEEN, SCORE, WASP } from './config.js';

export const EVENT_SIP = 1;
export const EVENT_TRAP_SIP = 2;
export const EVENT_HURT = 4;
export const EVENT_STUN = 8;
export const EVENT_LEVEL_CLEAR = 16;
export const EVENT_GAME_OVER = 32;
export const EVENT_GUST = 64;
export const EVENT_QUEEN_REPELLED = 128;
export const EVENT_DASH = 256;
export const EVENT_QUEEN_ARRIVES = 512;

const GUARD_LIMIT = 0.85;

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function createWorld(random, particles) {
  const state = {
    time: 0,
    level: 1,
    score: 0,
    combo: 0,
    hearts: HEARTS_START,
    maxHearts: HEARTS_START,
    nectar: 0,
    quota: MEADOWS[0].quota,
    duskLeft: MEADOWS[0].dusk,
    duskTotal: MEADOWS[0].dusk,
    over: false,
    overReason: '',
    cleared: false,
    charmForgiven: false,
    banner: '',
    bannerTime: 0,
    bee: null,
    flowers: [],
    wasps: [],
    queen: null,
    wind: { warn: 0, time: 0, next: 16, dir: 1 },
    blessings: { wings: 0, dash: 0, magnet: 0, hide: 0, dew: 0, charm: 0 },
    stats: { sips: 0, stuns: 0, meadows: 0 },
    offered: [],
  };

  function speedMul() {
    return 1 + 0.12 * state.blessings.wings;
  }
  function dashMul() {
    return 1 + 0.45 * state.blessings.dash;
  }
  function sipRadius() {
    return BEE.sipRadius + 16 * state.blessings.magnet;
  }

  function makeBee() {
    return {
      x: FIELD.width * 0.3,
      y: FIELD.height * 0.55,
      vx: 0,
      vy: 0,
      face: 1,
      dashTime: 0,
      dashDirX: 1,
      dashDirY: 0,
      dashCooldown: 0,
      hurtTime: 0,
      wingPhase: random.range(0, 6),
    };
  }

  function makeFlower(index) {
    const trap = random.chance(FLOWER.trapShare);
    return {
      x: 70 + (FIELD.width - 140) * ((index % 7) / 6) + random.range(-34, 34),
      y: 150 + (FIELD.height - 260) * (Math.floor(index / 7) / 3) + random.range(-30, 30),
      phase: 'bud',
      timer: random.range(0.2, FLOWER.budMax),
      sip: 0,
      guard: 0,
      trap,
      sway: random.range(0, Math.PI * 2),
      hue: trap ? 0 : random.range(-14, 14),
    };
  }

  function startMeadow(level) {
    state.level = level;
    const meadow = MEADOWS[level - 1];
    state.quota = meadow.quota;
    state.duskTotal = meadow.dusk + 10 * state.blessings.dew;
    state.duskLeft = state.duskTotal;
    state.nectar = 0;
    state.cleared = false;
    state.charmForgiven = false;
    state.banner = level === 1 ? '' : `Meadow ${level}`;
    state.bannerTime = level === 1 ? 0 : 2.2;
    state.bee = makeBee();
    state.flowers = [];
    for (let i = 0; i < FLOWER.count; i += 1) state.flowers.push(makeFlower(i));
    // A few blooms open at once so the first seconds always offer a choice.
    let opened = 0;
    for (const flower of state.flowers) {
      if (opened >= 5) break;
      if (!flower.trap) {
        flower.phase = 'bloom';
        flower.timer = FLOWER.bloomSeconds;
        opened += 1;
      }
    }
    state.wasps = [];
    state.waspTimer = WASP.spawnStart;
    state.queen = null;
    state.queenAnnounced = false;
    state.wind = { warn: 0, time: 0, next: random.range(14, 20), dir: 1 };
    particles.clear();
  }

  function spawnWasp(edge) {
    const fromLeft = edge ?? random.chance(0.5);
    state.wasps.push({
      x: fromLeft ? -24 : FIELD.width + 24,
      y: random.range(120, FIELD.height - 120),
      vx: 0,
      vy: 0,
      stun: 0,
      wobble: random.range(0, Math.PI * 2),
      wingPhase: random.range(0, 6),
    });
  }

  function spawnQueen() {
    state.queen = {
      x: FIELD.width / 2,
      y: -40,
      vx: 0,
      vy: 0,
      stun: 0,
      stuns: 0,
      mode: 'enter',
      modeTime: 1.6,
      wingPhase: 0,
      repelled: false,
    };
  }

  function hurtBee(fromX, fromY, events) {
    const bee = state.bee;
    state.hearts -= 1;
    if (state.blessings.charm > 0 && !state.charmForgiven) {
      state.charmForgiven = true;
    } else {
      state.combo = 0;
    }
    bee.hurtTime = BEE.hurtSeconds;
    const away = Math.atan2(bee.y - fromY, bee.x - fromX);
    bee.vx = Math.cos(away) * 420;
    bee.vy = Math.sin(away) * 420;
    particles.burst(bee.x, bee.y, { count: 16, color: '#ff8a65', speed: 170, size: 3.6 });
    if (state.hearts <= 0) {
      state.over = true;
      state.overReason = 'stings';
      return events | EVENT_HURT | EVENT_GAME_OVER;
    }
    return events | EVENT_HURT;
  }

  function stepBee(dt, control, events) {
    const bee = state.bee;
    let ax = control.x;
    let ay = control.y;
    if (control.pointer) {
      const dx = control.pointer.x - bee.x;
      const dy = control.pointer.y - bee.y;
      const d = Math.hypot(dx, dy);
      if (d > 12) {
        ax = dx / d;
        ay = dy / d;
      }
    }
    const length = Math.hypot(ax, ay);
    if (length > 1) {
      ax /= length;
      ay /= length;
    }
    if (control.dash && bee.dashCooldown <= 0 && bee.dashTime <= 0) {
      const dx = length > 0.1 ? ax : bee.face;
      const dy = length > 0.1 ? ay : 0;
      const dl = Math.hypot(dx, dy) || 1;
      bee.dashDirX = dx / dl;
      bee.dashDirY = dy / dl;
      bee.dashTime = BEE.dashSeconds * dashMul();
      bee.dashCooldown = BEE.dashCooldown;
      events |= EVENT_DASH;
    }
    if (bee.dashTime > 0) {
      bee.dashTime -= dt;
      bee.vx = bee.dashDirX * BEE.dashSpeed;
      bee.vy = bee.dashDirY * BEE.dashSpeed;
      particles.trail(bee.x, bee.y, bee.vx, bee.vy, '#ffe082');
    } else {
      bee.vx += ax * BEE.accel * speedMul() * dt;
      bee.vy += ay * BEE.accel * speedMul() * dt;
      const damp = Math.max(0, 1 - BEE.drag * dt);
      bee.vx *= damp;
      bee.vy *= damp;
      const speed = Math.hypot(bee.vx, bee.vy);
      const cap = BEE.maxSpeed * speedMul();
      if (speed > cap) {
        bee.vx = (bee.vx / speed) * cap;
        bee.vy = (bee.vy / speed) * cap;
      }
    }
    if (state.wind.time > 0) {
      bee.vx += state.wind.dir * 300 * dt;
      bee.vy += Math.sin(state.time * 2.1) * 40 * dt;
    }
    bee.x += bee.vx * dt;
    bee.y += bee.vy * dt;
    bee.x = Math.min(FIELD.width - BEE.radius, Math.max(BEE.radius, bee.x));
    bee.y = Math.min(FIELD.height - BEE.radius, Math.max(BEE.radius + 64, bee.y));
    if (Math.abs(bee.vx) > 24) bee.face = bee.vx > 0 ? 1 : -1;
    bee.wingPhase += dt * (bee.dashTime > 0 ? 46 : 30);
    if (bee.dashCooldown > 0) bee.dashCooldown -= dt;
    if (bee.hurtTime > 0) bee.hurtTime -= dt;
    return events;
  }

  function stepFlowers(dt, events) {
    const bee = state.bee;
    const radius = sipRadius();
    for (const flower of state.flowers) {
      flower.sway += dt * 1.4;
      if (flower.phase === 'bud') {
        flower.timer -= dt;
        if (flower.timer <= 0) {
          flower.phase = 'bloom';
          flower.timer = FLOWER.bloomSeconds;
          flower.sip = 0;
          flower.guard = 0;
        }
        continue;
      }
      if (flower.phase === 'spent') {
        flower.timer -= dt;
        if (flower.timer <= 0) {
          flower.phase = 'bud';
          flower.timer = random.range(FLOWER.budMin, FLOWER.budMax);
          flower.trap = random.chance(FLOWER.trapShare);
        }
        continue;
      }
      // Blooming: the light fades whether or not anyone drinks.
      flower.timer -= dt;
      if (flower.timer <= 0) {
        flower.phase = 'bud';
        flower.timer = random.range(FLOWER.budMin, FLOWER.budMax);
        flower.sip = 0;
        continue;
      }
      const near = distance(bee, flower) <= radius + 12;
      if (flower.trap) {
        if (near) flower.guard += dt;
        else flower.guard = Math.max(0, flower.guard - dt * 2);
        if (flower.guard > GUARD_LIMIT && bee.hurtTime <= 0 && bee.dashTime <= 0) {
          flower.phase = 'spent';
          flower.timer = 2.4;
          events = hurtBee(flower.x, flower.y - 10, events) | events;
          state.banner = 'The spider strikes!';
          state.bannerTime = 1.4;
          continue;
        }
      }
      if (near && bee.dashTime <= 0) {
        const needed = flower.trap ? FLOWER.trapSipSeconds : FLOWER.sipSeconds;
        flower.sip += dt / needed;
        if (flower.sip >= 1) {
          flower.phase = 'spent';
          flower.timer = random.range(1.4, 2.6);
          const gained = flower.trap ? 2 : 1;
          state.nectar += gained;
          state.combo += 1;
          state.stats.sips += 1;
          const base = flower.trap ? SCORE.trapNectar : SCORE.nectar;
          const comboPay = state.combo * 5 * (state.blessings.charm > 0 ? 2 : 1);
          state.score += base + comboPay;
          particles.burst(flower.x, flower.y - 14, {
            count: flower.trap ? 20 : 13,
            color: flower.trap ? '#ce93d8' : '#ffcf3f',
            speed: 120,
            size: 3.4,
          });
          events |= flower.trap ? EVENT_TRAP_SIP : EVENT_SIP;
          if (state.nectar >= state.quota && !state.cleared) {
            state.cleared = true;
            state.stats.meadows += 1;
            state.score += Math.round(state.duskLeft) * SCORE.duskSecondLeft;
            events |= EVENT_LEVEL_CLEAR;
          }
        }
      } else {
        flower.sip = Math.max(0, flower.sip - dt * 1.6);
      }
    }
    return events;
  }

  function stepWasps(dt, events) {
    const bee = state.bee;
    const cap = Math.min(3 + state.level, 11);
    state.waspTimer -= dt;
    if (state.waspTimer <= 0 && state.wasps.length < cap) {
      spawnWasp();
      state.waspTimer = Math.max(2.6, WASP.spawnEvery - state.level * 0.3);
    }
    const speed = WASP.baseSpeed + WASP.speedPerLevel * state.level;
    for (const wasp of state.wasps) {
      wasp.wingPhase += dt * 34;
      if (wasp.stun > 0) {
        wasp.stun -= dt;
        wasp.vx *= 0.94;
        wasp.vy = wasp.vy * 0.94 + 26 * dt;
        wasp.x += wasp.vx * dt;
        wasp.y += wasp.vy * dt;
        continue;
      }
      wasp.wobble += dt * 3.1;
      const dx = bee.x - wasp.x;
      const dy = bee.y - wasp.y;
      const d = Math.hypot(dx, dy) || 1;
      const wx = Math.cos(wasp.wobble) * 0.35;
      const wy = Math.sin(wasp.wobble * 1.3) * 0.35;
      wasp.vx += ((dx / d + wx) * speed - wasp.vx) * Math.min(1, WASP.steer * dt);
      wasp.vy += ((dy / d + wy) * speed - wasp.vy) * Math.min(1, WASP.steer * dt);
      if (state.wind.time > 0) wasp.vx += state.wind.dir * 130 * dt;
      wasp.x += wasp.vx * dt;
      wasp.y += wasp.vy * dt;
      if (distance(wasp, bee) < WASP.radius + BEE.radius - 2) {
        if (bee.dashTime > 0) {
          wasp.stun = WASP.stunSeconds;
          wasp.vx = bee.dashDirX * 300;
          wasp.vy = bee.dashDirY * 300 - 60;
          state.stats.stuns += 1;
          state.score += SCORE.stun;
          particles.burst(wasp.x, wasp.y, { count: 14, color: '#b39ddb', speed: 150, size: 3.2 });
          events |= EVENT_STUN;
        } else if (bee.hurtTime <= 0) {
          events = hurtBee(wasp.x, wasp.y, events);
        }
      }
    }
    state.wasps = state.wasps.filter((w) => w.x > -70 && w.x < FIELD.width + 70 && w.y > -70 && w.y < FIELD.height + 70);
    return events;
  }

  function stepQueen(dt, events) {
    if (!QUEEN.levels.includes(state.level)) return events;
    if (!state.queen && !state.queenAnnounced) {
      state.queenAnnounced = true;
      spawnQueen();
      state.banner = 'The Hornet Queen comes for the meadow!';
      state.bannerTime = 2.6;
      events |= EVENT_QUEEN_ARRIVES;
    }
    const queen = state.queen;
    if (!queen) return events;
    const bee = state.bee;
    queen.wingPhase += dt * 26;
    if (queen.repelled) {
      queen.y -= 190 * dt;
      queen.x += queen.vx * dt;
      if (queen.y < -90) state.queen = null;
      return events;
    }
    if (queen.stun > 0) {
      queen.stun -= dt;
      queen.x += queen.vx * dt;
      queen.y += queen.vy * dt;
      return events;
    }
    queen.modeTime -= dt;
    if (queen.mode === 'enter') {
      queen.y += (150 - queen.y) * Math.min(1, dt * 1.6);
      queen.x += (FIELD.width / 2 - queen.x) * Math.min(1, dt);
      if (queen.modeTime <= 0) {
        queen.mode = 'stalk';
        queen.modeTime = random.range(1.6, 2.4);
      }
    } else if (queen.mode === 'stalk') {
      const dx = bee.x - queen.x;
      queen.vx += (Math.sign(dx) * QUEEN.speed * 0.7 - queen.vx) * Math.min(1, dt * 2);
      queen.vy += (Math.sin(state.time * 1.7) * 36 - queen.vy) * Math.min(1, dt * 2);
      queen.x += queen.vx * dt;
      queen.y += queen.vy * dt + (150 - queen.y) * dt * 0.4;
      if (queen.modeTime <= 0) {
        queen.mode = 'aim';
        queen.modeTime = 0.7;
      }
    } else if (queen.mode === 'aim') {
      queen.vx *= 0.9;
      queen.vy *= 0.9;
      queen.x += queen.vx * dt;
      queen.y += queen.vy * dt;
      if (queen.modeTime <= 0) {
        const dx = bee.x - queen.x;
        const dy = bee.y - queen.y;
        const d = Math.hypot(dx, dy) || 1;
        queen.vx = (dx / d) * QUEEN.chargeSpeed;
        queen.vy = (dy / d) * QUEEN.chargeSpeed;
        queen.mode = 'charge';
        queen.modeTime = 0.62;
      }
    } else if (queen.mode === 'charge') {
      queen.x += queen.vx * dt;
      queen.y += queen.vy * dt;
      if (queen.modeTime <= 0) {
        queen.mode = 'rest';
        queen.modeTime = 1.15;
      }
    } else {
      queen.vx *= 0.92;
      queen.vy *= 0.92;
      queen.x += queen.vx * dt;
      queen.y += queen.vy * dt;
      if (queen.modeTime <= 0) {
        queen.mode = 'stalk';
        queen.modeTime = random.range(1.4, 2.2);
      }
    }
    queen.x = Math.min(FIELD.width - 30, Math.max(30, queen.x));
    queen.y = Math.min(FIELD.height - 60, Math.max(70, queen.y));
    if (distance(queen, bee) < QUEEN.radius + BEE.radius - 4) {
      if (bee.dashTime > 0) {
        queen.stun = 1.1;
        queen.stuns += 1;
        queen.vx = bee.dashDirX * 260;
        queen.vy = bee.dashDirY * 260;
        particles.burst(queen.x, queen.y, { count: 22, color: '#ffab91', speed: 190, size: 4 });
        events |= EVENT_STUN;
        if (queen.stuns >= QUEEN.stunsToRepel) {
          queen.repelled = true;
          state.score += SCORE.queenRepelled;
          state.banner = 'The Queen retreats! +250';
          state.bannerTime = 2.2;
          events |= EVENT_QUEEN_REPELLED;
        }
      } else if (bee.hurtTime <= 0 && queen.mode !== 'rest') {
        events = hurtBee(queen.x, queen.y, events);
      }
    }
    return events;
  }

  function stepWind(dt, events) {
    const wind = state.wind;
    if (wind.warn > 0) {
      wind.warn -= dt;
      if (wind.warn <= 0) wind.time = 3;
    } else if (wind.time > 0) {
      wind.time -= dt;
      if (random.chance(0.35)) {
        particles.drift(wind.dir > 0 ? -8 : FIELD.width + 8, random.range(90, FIELD.height - 60), wind.dir * random.range(190, 300), random.range(-16, 16), random.chance(0.5) ? '#c5e1a5' : '#fff9c4');
      }
      if (wind.time <= 0) wind.next = random.range(13, 20);
    } else {
      wind.next -= dt;
      if (wind.next <= 0) {
        wind.dir = random.chance(0.5) ? -1 : 1;
        wind.warn = 1.2;
        state.banner = wind.dir > 0 ? 'A gust rolls in from the west…' : 'A gust rolls in from the east…';
        state.bannerTime = 1.6;
        events |= EVENT_GUST;
      }
    }
    return events;
  }

  function step(dt, control) {
    if (state.over || state.cleared) {
      particles.step(dt);
      return 0;
    }
    let events = 0;
    state.time += dt;
    state.duskLeft -= dt;
    if (state.bannerTime > 0) state.bannerTime -= dt;
    events = stepBee(dt, control, events);
    events = stepFlowers(dt, events);
    if (!state.over) events = stepWasps(dt, events);
    if (!state.over) events = stepQueen(dt, events);
    events = stepWind(dt, events);
    if (random.chance(0.25)) {
      particles.drift(random.range(0, FIELD.width), FIELD.height + 6, random.range(-9, 9), random.range(-34, -18), '#fff59d');
    }
    particles.step(dt);
    if (state.duskLeft <= 0 && !state.cleared && !state.over) {
      state.over = true;
      state.overReason = 'dusk';
      events |= EVENT_GAME_OVER;
    }
    return events;
  }

  function offerBlessings() {
    const pool = BLESSINGS.filter((b) => b.id !== 'hide' || state.maxHearts < HEARTS_MAX);
    const offers = [];
    const copy = [...pool];
    while (offers.length < 3 && copy.length > 0) {
      const index = Math.floor(random.next() * copy.length) % copy.length;
      offers.push(copy.splice(index, 1)[0]);
    }
    state.offered = offers;
    return offers;
  }

  function applyBlessing(id) {
    state.blessings[id] = (state.blessings[id] ?? 0) + 1;
    if (id === 'hide') {
      state.maxHearts = Math.min(HEARTS_MAX, state.maxHearts + 1);
      state.hearts = Math.min(state.maxHearts, state.hearts + 1);
    }
  }

  function reset() {
    state.score = 0;
    state.combo = 0;
    state.hearts = HEARTS_START;
    state.maxHearts = HEARTS_START;
    state.over = false;
    state.overReason = '';
    state.blessings = { wings: 0, dash: 0, magnet: 0, hide: 0, dew: 0, charm: 0 };
    state.stats = { sips: 0, stuns: 0, meadows: 0 };
    state.time = 0;
    startMeadow(1);
  }

  state.bee = makeBee();
  startMeadow(1);

  return { state, step, reset, startMeadow, offerBlessings, applyBlessing };
}
