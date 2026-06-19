// Slingshot experience.
// PINCH the pouch, pull it back/down (a dotted preview shows the shot), and RELEASE
// to fling a stone. POP the floating balloons for points. They refill when cleared.
import { sfx } from "../sfx.js";

const BCOL = ["#ff5a72", "#6ad1ff", "#54e08a", "#ffb347", "#b06aff", "#ff6ad1"];

export function createSlingshot(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let balloons = [], pops = [], stone = null, score = 0, prevPinch = false, drew = false, inited = false, respawnT = 0;
  function spawnBalloons(W, H) { balloons = []; for (let i = 0; i < 6; i++) balloons.push({ x: (0.5 + Math.random() * 0.42) * W, y: (0.2 + Math.random() * 0.5) * H, r: (0.04 + Math.random() * 0.015) * H, c: BCOL[i % BCOL.length], ph: Math.random() * 6, vy: (Math.random() - 0.5) * 0.05 * H }); }

  ctx.setHint("<b>Pinch</b> the pouch, pull back (watch the aim line) and <b>release</b> to pop the balloons!");
  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04); fit();
    const W = screen.width, H = screen.height, G = 1.2 * H, dpr = Math.min(devicePixelRatio, 2);
    if (!inited) { spawnBalloons(W, H); inited = true; }
    const fx = 0.2 * W, fy = 0.55 * H, ground = 0.86 * H, K = 5.5, t = frame.t;
    const cur = frame.cursor;

    for (const b of balloons) { b.y += b.vy * dt; if (b.y < 0.15 * H || b.y > 0.78 * H) b.vy *= -1; }

    let pouch = null, vel = null;
    if (cur.present && cur.pinch && !stone) { pouch = { x: cur.x * W, y: cur.y * H }; const dx = fx - pouch.x, dy = fy - pouch.y, d = Math.hypot(dx, dy); if (d > 0.03 * W) vel = { x: dx * K, y: dy * K }; if (!drew) { sfx.stretch(); drew = true; } } else drew = false;
    if (prevPinch && !(cur.present && cur.pinch) && !stone) { const px = cur.x * W, py = cur.y * H, dx = fx - px, dy = fy - py, d = Math.hypot(dx, dy); if (d > 0.04 * W) { stone = { x: fx, y: fy, vx: dx * K, vy: dy * K, r: 0.02 * H }; sfx.whoosh(0.22); } }
    prevPinch = cur.present && cur.pinch;

    if (stone) {
      stone.vy += G * dt; stone.x += stone.vx * dt; stone.y += stone.vy * dt;
      for (const b of balloons) if (!b.dead && Math.hypot(stone.x - b.x, stone.y - b.y) < b.r + stone.r) { b.dead = true; score++; sfx.pop(); for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 200; pops.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: b.c }); } }
      if (stone.y > ground + stone.r || stone.x > W + 40 || stone.x < -40) stone = null;
    }
    balloons = balloons.filter(b => !b.dead);
    if (balloons.length === 0) { respawnT += dt; if (respawnT > 1.0) { spawnBalloons(W, H); respawnT = 0; } } else respawnT = 0;
    for (const p of pops) { p.vy += G * 0.4 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.4; } pops = pops.filter(p => p.life > 0);

    // ---------- draw ----------
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0e1626"); bg.addColorStop(1, "#0a0d16");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = "#16331f"; g.fillRect(0, ground, W, H - ground);

    for (const b of balloons) drawBalloon(g, b.x, b.y + Math.sin(t + b.ph) * 4 * dpr, b.r, b.c, dpr);
    for (const p of pops) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.fillRect(p.x, p.y, 5 * dpr, 5 * dpr); } g.globalAlpha = 1;

    if (vel) { g.fillStyle = "rgba(255,210,120,0.8)"; let sx = fx, sy = fy, svx = vel.x, svy = vel.y; for (let i = 0; i < 30; i++) { svy += G * 0.05; sx += svx * 0.05; sy += svy * 0.05; if (i % 2 === 0) { g.beginPath(); g.arc(sx, sy, 3 * dpr, 0, Math.PI * 2); g.fill(); } if (sy > ground || sx > W) break; } }

    g.strokeStyle = "#5a3a22"; g.lineWidth = 8 * dpr; g.beginPath(); g.moveTo(fx, ground); g.lineTo(fx, fy + 4 * dpr); g.stroke();
    g.lineWidth = 6 * dpr; g.beginPath(); g.moveTo(fx - 18 * dpr, fy - 30 * dpr); g.lineTo(fx, fy); g.lineTo(fx + 18 * dpr, fy - 30 * dpr); g.stroke();
    const p = pouch || { x: fx, y: fy };
    g.strokeStyle = "#b9b9c0"; g.lineWidth = 3 * dpr; g.beginPath(); g.moveTo(fx - 18 * dpr, fy - 30 * dpr); g.lineTo(p.x, p.y); g.lineTo(fx + 18 * dpr, fy - 30 * dpr); g.stroke();
    if (pouch) { g.fillStyle = "#aaa"; g.beginPath(); g.arc(pouch.x, pouch.y, 0.02 * H, 0, Math.PI * 2); g.fill(); }
    if (stone) { g.fillStyle = "#aaa"; g.beginPath(); g.arc(stone.x, stone.y, stone.r, 0, Math.PI * 2); g.fill(); }

    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${20 * dpr}px Segoe UI`; g.fillText("Popped " + score, 16 * dpr, 30 * dpr);
    ctx.setTag("popped " + score);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function drawBalloon(g, cx, cy, r, c, dpr) {
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1.5 * dpr; g.beginPath(); g.moveTo(cx, cy + r); g.quadraticCurveTo(cx + r * 0.3, cy + r * 1.6, cx, cy + r * 2.2); g.stroke();
  g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, r * 0.85, r, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(cx - 4 * dpr, cy + r); g.lineTo(cx + 4 * dpr, cy + r); g.lineTo(cx, cy + r + 7 * dpr); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.4)"; g.beginPath(); g.ellipse(cx - r * 0.3, cy - r * 0.4, r * 0.15, r * 0.24, -0.4, 0, Math.PI * 2); g.fill();
}
