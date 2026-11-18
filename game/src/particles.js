// One pooled particle system for every sparkle the game makes: pollen bursts when a bloom is
// drained, streaks behind a dash, violet puffs when a wasp is stunned, petals on the wind.
// Particles are plain data in a fixed pool; the renderer reads them, this file only moves them.
const MAX_PARTICLES = 900;

export function createParticles(random) {
  const pool = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', drag: 0, gravity: 0, shrink: true });
  }
  let cursor = 0;

  function spawn(options) {
    const p = pool[cursor];
    cursor = (cursor + 1) % MAX_PARTICLES;
    p.active = true;
    p.x = options.x;
    p.y = options.y;
    p.vx = options.vx ?? 0;
    p.vy = options.vy ?? 0;
    p.maxLife = options.life ?? 0.6;
    p.life = p.maxLife;
    p.size = options.size ?? 3;
    p.color = options.color ?? '#ffffff';
    p.drag = options.drag ?? 1.2;
    p.gravity = options.gravity ?? 0;
    p.shrink = options.shrink !== false;
  }

  function burst(x, y, { count = 12, color = '#ffcf3f', speed = 130, life = 0.55, size = 3.4, gravity = 60 } = {}) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.next() * Math.PI * 2;
      const v = speed * (0.3 + random.next() * 0.9);
      spawn({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 20, life: life * (0.6 + random.next() * 0.7), size: size * (0.6 + random.next() * 0.8), color, gravity });
    }
  }

  return {
    burst,
    /** A short ribbon of fading motes behind a dashing bee. */
    trail(x, y, vx, vy, color) {
      spawn({ x, y, vx: -vx * 0.12 + (random.next() - 0.5) * 30, vy: -vy * 0.12 + (random.next() - 0.5) * 30, life: 0.34, size: 4.5, color, drag: 2.4, gravity: -12 });
    },
    /** One drifting petal or leaf, the visible edge of a gust of wind. */
    drift(x, y, vx, vy, color) {
      spawn({ x, y, vx, vy, life: 1.6, size: 3, color, drag: 0.15, gravity: 6, shrink: false });
    },
    step(dt) {
      for (let i = 0; i < MAX_PARTICLES; i += 1) {
        const p = pool[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vy = p.vy * damp + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },
    list() {
      return pool;
    },
    clear() {
      for (let i = 0; i < MAX_PARTICLES; i += 1) pool[i].active = false;
    },
  };
}
