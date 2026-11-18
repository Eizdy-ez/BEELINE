// The screenshot scenes behind ?shot=start|play|upgrade|end. Each plays the real rules forward
// from a fresh world with a pilot at the controls, so the frame is what a real game looks like:
// the start scene idles under the title, the play scene is a good pilot mid-meadow, the upgrade
// scene is the moment a meadow is banked, and the end scene is a careless pilot meeting dusk.
// The same seed always flies the same scenes.
import { BEE, STEP } from './config.js';
import { EVENT_GAME_OVER, EVENT_LEVEL_CLEAR } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';

function nearestBloom(state, includeTraps) {
  let best = null;
  let bestScore = Infinity;
  for (const flower of state.flowers) {
    if (flower.phase !== 'bloom') continue;
    if (flower.trap && !includeTraps) continue;
    const d = Math.hypot(flower.x - state.bee.x, flower.y - 26 - state.bee.y) * (flower.trap ? 1.7 : 1);
    if (d < bestScore) {
      bestScore = d;
      best = flower;
    }
  }
  return best;
}

function nearestThreat(state) {
  let best = null;
  let bestD = Infinity;
  for (const wasp of state.wasps) {
    if (wasp.stun > 0) continue;
    const d = Math.hypot(wasp.x - state.bee.x, wasp.y - state.bee.y);
    if (d < bestD) {
      bestD = d;
      best = wasp;
    }
  }
  if (state.queen && !state.queen.repelled && state.queen.stun <= 0) {
    const d = Math.hypot(state.queen.x - state.bee.x, state.queen.y - state.bee.y);
    if (d < bestD) {
      bestD = d;
      best = state.queen;
    }
  }
  return { threat: best, distance: bestD };
}

/** A competent pilot: drink the nearest safe bloom, dash through anything that closes in. */
function goodPilot(state) {
  const bee = state.bee;
  const { threat, distance } = nearestThreat(state);
  if (threat && distance < 105) {
    const dx = threat.x - bee.x;
    const dy = threat.y - bee.y;
    if (bee.dashCooldown <= 0 && bee.dashTime <= 0) {
      const d = Math.hypot(dx, dy) || 1;
      return { x: dx / d, y: dy / d, dash: true, pointer: null };
    }
    const d = Math.hypot(dx, dy) || 1;
    return { x: -dx / d + -dy / d * 0.6, y: -dy / d + dx / d * 0.6, dash: false, pointer: null };
  }
  const flower = nearestBloom(state, state.nectar + 2 >= state.quota) ?? nearestBloom(state, true);
  if (!flower) return { x: 0, y: 0, dash: false, pointer: null };
  const dx = flower.x - bee.x;
  const dy = flower.y - 26 - bee.y;
  const d = Math.hypot(dx, dy);
  if (d < BEE.sipRadius * 0.5) return { x: 0, y: 0, dash: false, pointer: null };
  return { x: dx / d, y: dy / d, dash: d > 260 && bee.dashCooldown <= 0, pointer: null };
}

/** A careless pilot: drifts at blooms slowly, never dashes, and rests at the worst moments. */
function poorPilot(state) {
  const bee = state.bee;
  if (Math.sin(state.time * 0.9) > 0.55) return { x: 0, y: 0, dash: false, pointer: null };
  const flower = nearestBloom(state, true);
  if (!flower) return { x: 0, y: 0, dash: false, pointer: null };
  const dx = flower.x - bee.x;
  const dy = flower.y - 26 - bee.y;
  const d = Math.hypot(dx, dy) || 1;
  if (d < BEE.sipRadius * 0.5) return { x: 0, y: 0, dash: false, pointer: null };
  return { x: (dx / d) * 0.55, y: (dy / d) * 0.55, dash: false, pointer: null };
}

function fly(world, pilot, seconds, stopOnClear) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = world.step(STEP, pilot(world.state));
    if (events & EVENT_GAME_OVER) return 'over';
    if (stopOnClear && events & EVENT_LEVEL_CLEAR) return 'clear';
  }
  return 'time';
}

/**
 * Set `world` to the named scene and return what the shell should draw over it:
 * the screen, the best score to show, and the blessing offers for the upgrade scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    fly(world, goodPilot, 8.5, false);
    return { screen: SCREEN_PLAY, best: 0, offers: [] };
  }
  if (name === 'upgrade') {
    const result = fly(world, goodPilot, 240, true);
    if (result === 'clear') {
      return { screen: SCREEN_UPGRADE, best: 0, offers: world.offerBlessings() };
    }
    return { screen: SCREEN_PLAY, best: 0, offers: [] };
  }
  if (name === 'end') {
    let result = fly(world, poorPilot, 300, false);
    if (result !== 'over' && !world.state.over) {
      // The careless pilot somehow banked the meadow: keep flying badly in the next one.
      world.startMeadow(2);
      result = fly(world, poorPilot, 300, false);
    }
    return { screen: SCREEN_OVER, best: world.state.score, offers: [] };
  }
  // start: a few seconds of good flying under the title card.
  fly(world, goodPilot, 5, false);
  return { screen: SCREEN_TITLE, best: 0, offers: [] };
}
