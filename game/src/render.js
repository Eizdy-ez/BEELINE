// Everything the player sees: the meadow at dawn and at dusk, the flowers and their spiders,
// the bee, the wasps and the Queen, the HUD, and the title, blessing, pause and end screens.
// Canvas 2D only, drawn from the world state each frame; ambient motion (petal sway, wing
// flutter, glows breathing) runs on the render clock so even a frozen screen feels alive.
import { BEE, FIELD, FLOWER, PALETTE, QUEEN } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(from, to, t) {
  const f = parseInt(from.slice(1), 16);
  const g = parseInt(to.slice(1), 16);
  const r = Math.round(lerp(f >> 16, g >> 16, t));
  const gg = Math.round(lerp((f >> 8) & 255, g >> 8 & 255, t));
  const b = Math.round(lerp(f & 255, g & 255, t));
  return `rgb(${r},${gg},${b})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function drawSky(state, duskFrac) {
    const top = lerpColor(PALETTE.skyDawnTop, PALETTE.skyDuskTop, 1 - duskFrac);
    const bottom = lerpColor(PALETTE.skyDawnBottom, PALETTE.skyDuskBottom, 1 - duskFrac);
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, top);
    grad.addColorStop(0.62, bottom);
    grad.addColorStop(0.63, lerpColor(PALETTE.ground, '#1d1430', 1 - duskFrac));
    grad.addColorStop(1, lerpColor(PALETTE.groundDark, '#120c22', 1 - duskFrac));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // The sun rides its arc down as the light burns: high and gold at dawn, low and red at dusk.
    const sunX = lerp(180, FIELD.width - 180, 1 - duskFrac);
    const sunY = lerp(92, 400, Math.pow(1 - duskFrac, 1.4));
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
    glow.addColorStop(0, 'rgba(255,214,90,0.55)');
    glow.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
    ctx.fillStyle = lerpColor('#fff3b0', '#ff7043', 1 - duskFrac);
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHills(duskFrac) {
    ctx.fillStyle = lerpColor(PALETTE.hillFar, '#241a3e', 1 - duskFrac);
    ctx.beginPath();
    ctx.moveTo(0, 452);
    for (let x = 0; x <= FIELD.width; x += 64) {
      ctx.lineTo(x, 452 - Math.sin(x * 0.006 + 1.7) * 34 - Math.sin(x * 0.017) * 10);
    }
    ctx.lineTo(FIELD.width, 720);
    ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lerpColor(PALETTE.hillNear, '#1a1230', 1 - duskFrac);
    ctx.beginPath();
    ctx.moveTo(0, 505);
    for (let x = 0; x <= FIELD.width; x += 64) {
      ctx.lineTo(x, 505 - Math.sin(x * 0.009 + 0.4) * 20 - Math.sin(x * 0.023 + 2) * 7);
    }
    ctx.lineTo(FIELD.width, 720);
    ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.fill();
  }

  function drawFlower(flower, time, duskFrac) {
    const sway = Math.sin(flower.sway + time * 0.7) * 3;
    const topX = flower.x + sway;
    const topY = flower.y - 26;
    ctx.strokeStyle = lerpColor('#4a7c3a', '#17251c', 1 - duskFrac);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(flower.x, flower.y + 16);
    ctx.quadraticCurveTo(flower.x + sway * 0.4, flower.y - 4, topX, topY);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.ellipse(flower.x + 6 + sway * 0.3, flower.y + 2, 8, 3.4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    if (flower.phase === 'bud') {
      ctx.fillStyle = flower.trap ? '#7e57c2' : '#7cb342';
      ctx.beginPath();
      ctx.ellipse(topX, topY, 6.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (flower.phase === 'spent') {
      ctx.fillStyle = '#6d7c5f';
      ctx.beginPath();
      ctx.ellipse(topX, topY + 4, 7, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // Blooming: open petals around a glowing heart, breathing with the render clock.
    const pulse = 1 + Math.sin(time * 3 + flower.sway * 3) * 0.07;
    const petal = (flower.trap ? 13 : 12) * pulse;
    const glow = ctx.createRadialGradient(topX, topY, 2, topX, topY, 44);
    glow.addColorStop(0, flower.trap ? 'rgba(179,136,255,0.5)' : 'rgba(255,207,63,0.55)');
    glow.addColorStop(1, 'rgba(255,207,63,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(topX - 46, topY - 46, 92, 92);
    ctx.fillStyle = flower.trap ? '#b388ff' : '#fff59d';
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2 + flower.sway * 0.2;
      ctx.beginPath();
      ctx.ellipse(topX + Math.cos(angle) * petal * 0.72, topY + Math.sin(angle) * petal * 0.72, petal * 0.62, petal * 0.4, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = flower.trap ? '#7e57c2' : '#ffb300';
    ctx.beginPath();
    ctx.arc(topX, topY, 6.4 * pulse, 0, Math.PI * 2);
    ctx.fill();
    if (flower.trap) drawSpider(topX, topY, flower, time);
    if (flower.sip > 0.03) {
      ctx.strokeStyle = 'rgba(255,248,225,0.9)';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(topX, topY, 21, -Math.PI / 2, -Math.PI / 2 + flower.sip * Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawSpider(x, y, flower, time) {
    const dangle = 12 + Math.sin(time * 2.2 + flower.sway) * 2.4;
    ctx.strokeStyle = 'rgba(20,14,28,0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x + 3, y + dangle);
    ctx.stroke();
    const sx = x + 3;
    const sy = y + dangle + 5;
    ctx.fillStyle = '#1d1428';
    ctx.beginPath();
    ctx.arc(sx, sy, 6.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1d1428';
    ctx.lineWidth = 1.6;
    for (let leg = 0; leg < 4; leg += 1) {
      const spread = (leg - 1.5) * 3.4;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy + spread * 0.4);
      ctx.lineTo(sx - 11, sy + spread);
      ctx.moveTo(sx + 4, sy + spread * 0.4);
      ctx.lineTo(sx + 11, sy + spread);
      ctx.stroke();
    }
    ctx.fillStyle = '#ef5350';
    ctx.fillRect(sx - 3.4, sy - 2.4, 2.2, 2.2);
    ctx.fillRect(sx + 1.4, sy - 2.4, 2.2, 2.2);
  }

  function drawBee(bee, time) {
    const blink = bee.hurtTime > 0 && Math.sin(time * 34) > 0;
    ctx.save();
    ctx.translate(bee.x, bee.y);
    ctx.scale(bee.face, 1);
    if (blink) ctx.globalAlpha = 0.35;
    const stretch = bee.dashTime > 0 ? 1.25 : 1;
    ctx.scale(stretch, 1);
    // Wings: two translucent ellipses beating on the wing phase.
    const flap = Math.sin(bee.wingPhase) * 0.55;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(-2, -10);
      ctx.rotate(side * (0.5 + flap * 0.5));
      ctx.beginPath();
      ctx.ellipse(side * 7, -6, 12, 5.4, side * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body: a golden ellipse with two dark stripes, a head and a sting.
    ctx.fillStyle = PALETTE.beeBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 12.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 12.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = PALETTE.beeStripe;
    ctx.fillRect(-4, -13, 6.4, 26);
    ctx.fillRect(6, -13, 5.4, 26);
    ctx.restore();
    ctx.fillStyle = PALETTE.beeStripe;
    ctx.beginPath();
    ctx.moveTo(-17, 0);
    ctx.lineTo(-24, -3);
    ctx.lineTo(-24, 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a3510';
    ctx.beginPath();
    ctx.arc(13.5, -1.5, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(15.6, -3.6, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3510';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(15, -7.5);
    ctx.quadraticCurveTo(19, -13, 23, -13.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawWasp(wasp, time) {
    ctx.save();
    ctx.translate(wasp.x, wasp.y);
    const angle = Math.atan2(wasp.vy, wasp.vx);
    ctx.scale(Math.cos(angle) < 0 ? -1 : 1, 1);
    if (wasp.stun > 0) ctx.rotate(Math.sin(time * 6 + wasp.wobble) * 0.5);
    const flap = Math.sin(wasp.wingPhase) * 0.6;
    ctx.fillStyle = 'rgba(230,230,255,0.4)';
    ctx.save();
    ctx.translate(-2, -9);
    ctx.rotate(0.5 + flap * 0.5);
    ctx.beginPath();
    ctx.ellipse(6, -5, 11, 4.6, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PALETTE.waspBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 10.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = PALETTE.waspStripe;
    ctx.fillRect(-8, -11, 4.6, 22);
    ctx.fillRect(2.5, -11, 4.2, 22);
    ctx.restore();
    ctx.fillStyle = '#1c1410';
    ctx.beginPath();
    ctx.arc(12.5, -1, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef5350';
    ctx.beginPath();
    ctx.arc(14.6, -2.6, 2.4, 0, Math.PI * 2);
    ctx.fill();
    if (wasp.stun > 0) {
      ctx.fillStyle = '#fff59d';
      ctx.font = 'bold 13px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦ ✦', 0, -20);
    }
    ctx.restore();
  }

  function drawQueen(queen, state, time) {
    if (queen.mode === 'aim') {
      ctx.save();
      ctx.strokeStyle = `rgba(239,83,80,${0.35 + Math.sin(time * 18) * 0.2})`;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([9, 8]);
      ctx.beginPath();
      ctx.moveTo(queen.x, queen.y);
      ctx.lineTo(state.bee.x, state.bee.y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(queen.x, queen.y);
    ctx.scale(state.bee.x < queen.x ? -1 : 1, 1);
    if (queen.stun > 0) ctx.rotate(Math.sin(time * 5) * 0.3);
    const flap = Math.sin(queen.wingPhase) * 0.6;
    ctx.fillStyle = 'rgba(255,235,238,0.45)';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(-4, -18);
      ctx.rotate(side * (0.55 + flap * 0.45));
      ctx.beginPath();
      ctx.ellipse(side * 13, -10, 21, 8.6, side * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#a05a1e';
    ctx.beginPath();
    ctx.ellipse(0, 0, 31, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 31, 20, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#241207';
    ctx.fillRect(-14, -21, 8, 42);
    ctx.fillRect(3, -21, 7, 42);
    ctx.fillRect(17, -21, 6, 42);
    ctx.restore();
    ctx.fillStyle = '#1c1410';
    ctx.beginPath();
    ctx.arc(24, -3, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef5350';
    ctx.beginPath();
    ctx.arc(27.5, -6.5, 3.8, 0, Math.PI * 2);
    ctx.fill();
    // Her crown: three gold spikes over the head.
    ctx.fillStyle = '#ffd54f';
    for (let spike = 0; spike < 3; spike += 1) {
      const sx = 17 + spike * 7;
      ctx.beginPath();
      ctx.moveTo(sx, -11);
      ctx.lineTo(sx + 3, -21 - (spike === 1 ? 3 : 0));
      ctx.lineTo(sx + 6, -11);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    if (queen.stuns > 0 && !queen.repelled) {
      ctx.fillStyle = 'rgba(255,248,225,0.92)';
      ctx.font = 'bold 13px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Queen stunned ${queen.stuns}/${QUEEN.stunsToRepel}`, queen.x, queen.y - 46);
    }
  }

  function drawParticles(particles) {
    for (const p of particles.list()) {
      if (!p.active) continue;
      const frac = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, frac * 1.6);
      ctx.fillStyle = p.color;
      const size = p.shrink ? p.size * frac + 0.6 : p.size;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawComb(x, y, state) {
    // The honeycomb quota: one hex cell per nectar the meadow asks, filled as the bee banks.
    const cell = 15;
    for (let i = 0; i < state.quota; i += 1) {
      const cx = x + (i % 10) * (cell + 4);
      const cy = y + Math.floor(i / 10) * (cell + 4);
      ctx.beginPath();
      for (let k = 0; k < 6; k += 1) {
        const angle = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const px = cx + Math.cos(angle) * cell * 0.58;
        const py = cy + Math.sin(angle) * cell * 0.58;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (i < state.nectar) {
        ctx.fillStyle = PALETTE.nectar;
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,248,225,0.75)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
  }

  function drawHud(state, view) {
    ctx.save();
    ctx.fillStyle = 'rgba(24,16,8,0.34)';
    roundRect(ctx, 14, 12, 330, state.quota > 10 ? 92 : 66, 12);
    ctx.fill();
    drawComb(30, 32, state);
    ctx.fillStyle = PALETTE.paper;
    ctx.font = 'bold 13px Verdana, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`NECTAR ${state.nectar}/${state.quota}`, 30, state.quota > 10 ? 108 : 66 + 16);
    // Hearts and the dash pip, under the comb panel.
    for (let i = 0; i < state.maxHearts; i += 1) {
      const hx = 30 + i * 26;
      const hy = state.quota > 10 ? 128 : 102;
      ctx.fillStyle = i < state.hearts ? '#ef5350' : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 5);
      ctx.bezierCurveTo(hx - 9, hy - 4, hx - 3, hy - 11, hx, hy - 5);
      ctx.bezierCurveTo(hx + 3, hy - 11, hx + 9, hy - 4, hx, hy + 5);
      ctx.fill();
    }
    const dashReady = state.bee.dashCooldown <= 0;
    ctx.fillStyle = dashReady ? '#80d8ff' : 'rgba(255,255,255,0.3)';
    roundRect(ctx, 30 + state.maxHearts * 26 + 8, (state.quota > 10 ? 128 : 102) - 10, 64, 9, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.paper;
    ctx.font = '11px Verdana, sans-serif';
    ctx.fillText(dashReady ? 'DASH READY' : 'DASH…', 30 + state.maxHearts * 26 + 12, (state.quota > 10 ? 128 : 102) + 12);
    // Score, top right.
    ctx.textAlign = 'right';
    ctx.font = 'bold 25px Verdana, sans-serif';
    ctx.fillStyle = PALETTE.paper;
    ctx.fillText(String(state.score), FIELD.width - 26, 42);
    ctx.font = '12px Verdana, sans-serif';
    ctx.fillStyle = 'rgba(255,248,225,0.8)';
    ctx.fillText(`SCORE · BEST ${Math.max(view.best, state.score)}`, FIELD.width - 26, 62);
    ctx.fillText(`MEADOW ${state.level} OF 9`, FIELD.width - 26, 80);
    // The dusk gauge: a sun sliding along a thin arc of sky at the top centre.
    const frac = Math.max(0, state.duskLeft / state.duskTotal);
    ctx.strokeStyle = 'rgba(255,248,225,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(470, 30);
    ctx.lineTo(810, 30);
    ctx.stroke();
    ctx.strokeStyle = '#ffb300';
    ctx.beginPath();
    ctx.moveTo(470, 30);
    ctx.lineTo(470 + 340 * frac, 30);
    ctx.stroke();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(470 + 340 * frac, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.paper;
    ctx.font = 'bold 13px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`DUSK IN ${Math.ceil(state.duskLeft)}s`, 640, 56);
    if (state.combo >= 2) {
      ctx.font = 'bold 17px Verdana, sans-serif';
      ctx.fillStyle = '#ffe082';
      ctx.fillText(`COMBO ×${state.combo}`, state.bee.x, state.bee.y - 34);
    }
    if (state.bannerTime > 0 && state.banner) {
      ctx.font = 'bold 21px Georgia, serif';
      ctx.fillStyle = 'rgba(255,248,225,0.96)';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 8;
      ctx.fillText(state.banner, FIELD.width / 2, 108);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function veil(alpha) {
    ctx.fillStyle = `rgba(16,10,24,${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(28,20,12,0.82)';
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,207,63,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawTitle(state, view, time) {
    veil(0.28);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 96px Georgia, serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 18;
    ctx.fillText('B E E L I N E', FIELD.width / 2, 168);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.paper;
    ctx.font = 'italic 21px Georgia, serif';
    ctx.fillText('A honeybee races the dusk: bank the meadow’s nectar before the light runs out.', FIELD.width / 2, 208);
    panel(FIELD.width / 2 - 305, 244, 610, 218);
    ctx.fillStyle = PALETTE.paper;
    ctx.font = '16.5px Verdana, sans-serif';
    const lines = [
      'FLY with WASD or the arrow keys — or hold the mouse.',
      'SIP the golden blooms dry to fill the honeycomb.',
      'Violet blooms pay double, but a spider guards them.',
      'DASH with Space or Shift: a dashing bee stuns wasps',
      'and the Hornet Queen herself — three stuns repel her.',
      'Bank the quota before dusk, choose a blessing, and',
      'clear all nine meadows to save the hive.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 282 + i * 25));
    ctx.font = 'bold 19px Verdana, sans-serif';
    ctx.fillStyle = '#ffe082';
    const pulse = 0.72 + Math.sin(time * 3.2) * 0.28;
    ctx.globalAlpha = pulse;
    ctx.fillText('PRESS ENTER OR CLICK TO FLY', FIELD.width / 2, 516);
    ctx.globalAlpha = 1;
    ctx.font = '14px Verdana, sans-serif';
    ctx.fillStyle = 'rgba(255,248,225,0.85)';
    ctx.fillText(`Best score ${view.best} · P pauses · M mutes`, FIELD.width / 2, 552);
  }

  function drawUpgrade(state, view, time) {
    veil(0.45);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText(`Meadow ${state.level} banked!`, FIELD.width / 2, 150);
    ctx.fillStyle = PALETTE.paper;
    ctx.font = '17px Verdana, sans-serif';
    ctx.fillText(`The hive grows stronger. Choose one blessing for the road ahead.`, FIELD.width / 2, 186);
    const offers = view.offers ?? [];
    offers.forEach((blessing, i) => {
      const x = FIELD.width / 2 - 330 + i * 228;
      const y = 238;
      const hover = Math.sin(time * 2 + i) * 2;
      panel(x, y + hover, 204, 218);
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 21px Georgia, serif';
      const words = blessing.name.split(' ');
      words.forEach((word, wi) => ctx.fillText(word, x + 102, y + hover + 52 + wi * 25));
      ctx.fillStyle = PALETTE.paper;
      ctx.font = '13.5px Verdana, sans-serif';
      wrapText(blessing.text, x + 102, y + hover + 118, 168, 19);
      ctx.fillStyle = '#80d8ff';
      ctx.font = 'bold 16px Verdana, sans-serif';
      ctx.fillText(`PRESS ${i + 1}`, x + 102, y + hover + 192);
    });
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lineHeight;
      } else {
        line = trial;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawEnd(state, view, victory) {
    veil(0.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = victory ? '#ffd54f' : '#ffab91';
    ctx.font = 'bold 52px Georgia, serif';
    const heading = victory ? 'THE HIVE ENDURES' : state.overReason === 'dusk' ? 'DUSK FALLS' : 'STUNG OUT';
    ctx.fillText(heading, FIELD.width / 2, 168);
    ctx.fillStyle = PALETTE.paper;
    ctx.font = 'italic 18px Georgia, serif';
    const sub = victory
      ? 'Nine meadows banked, and the winter stores are full.'
      : state.overReason === 'dusk'
        ? 'The light ran out with the comb unfilled.'
        : 'Too many stings for one small bee.';
    ctx.fillText(sub, FIELD.width / 2, 204);
    panel(FIELD.width / 2 - 220, 240, 440, 196);
    ctx.font = '17px Verdana, sans-serif';
    const rows = [
      ['Final score', String(state.score)],
      ['Best score', String(Math.max(view.best, state.score))],
      ['Meadows banked', `${state.stats.meadows} of 9`],
      ['Blooms sipped', String(state.stats.sips)],
      ['Wasps stunned', String(state.stats.stuns)],
    ];
    rows.forEach(([label, value], i) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,248,225,0.85)';
      ctx.fillText(label, FIELD.width / 2 - 180, 282 + i * 33);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffe082';
      ctx.font = 'bold 17px Verdana, sans-serif';
      ctx.fillText(value, FIELD.width / 2 + 180, 282 + i * 33);
      ctx.font = '17px Verdana, sans-serif';
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe082';
    ctx.font = 'bold 19px Verdana, sans-serif';
    ctx.fillText('PRESS ENTER TO FLY AGAIN', FIELD.width / 2, 492);
  }

  function draw(state, screen, view) {
    const time = view.time;
    const duskFrac = screen === SCREEN_TITLE ? 0.88 : Math.max(0, state.duskLeft / state.duskTotal);
    drawSky(state, duskFrac);
    drawHills(duskFrac);
    const sorted = [...state.flowers].sort((a, b) => a.y - b.y);
    for (const flower of sorted) drawFlower(flower, time, duskFrac);
    if (state.wind.time > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        const y = 120 + i * 110 + Math.sin(time * 3 + i) * 8;
        ctx.beginPath();
        ctx.moveTo(state.wind.dir > 0 ? 60 : FIELD.width - 260, y);
        ctx.lineTo(state.wind.dir > 0 ? 260 : FIELD.width - 60, y - 12);
        ctx.stroke();
      }
    }
    drawParticles(view.particles);
    for (const wasp of state.wasps) drawWasp(wasp, time);
    if (state.queen) drawQueen(state.queen, state, time);
    drawBee(state.bee, time);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_UPGRADE) drawHud(state, view);
    if (screen === SCREEN_TITLE) drawTitle(state, view, time);
    else if (screen === SCREEN_UPGRADE) drawUpgrade(state, view, time);
    else if (screen === SCREEN_OVER) drawEnd(state, view, false);
    else if (screen === SCREEN_VICTORY) drawEnd(state, view, true);
    else if (screen === SCREEN_PAUSED) {
      veil(0.4);
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.paper;
      ctx.font = 'bold 40px Georgia, serif';
      ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2);
      ctx.font = '16px Verdana, sans-serif';
      ctx.fillText('Press P to keep flying', FIELD.width / 2, FIELD.height / 2 + 34);
    }
  }

  return { draw };
}
