// Bow & Arrow experience.
// PINCH to grab the string, pull back (a dotted preview shows the shot), RELEASE to
// fire. The arrow flies opposite to your pull. Hit the targets to score.
import { sfx } from "../sfx.js";

export function createBow(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let arrows = [], targets = [], score = 0, prevPinch = false, spawnT = 0, drewSound = false;
  ctx.setHint("<b>Pinch</b> to draw, pull back (watch the dotted aim line) and <b>release</b> to fire.");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }
  function spawnTarget(W, H) { targets.push({ x: (0.6 + Math.random() * 0.32) * W, y: (0.2 + Math.random() * 0.6) * H, r: (0.04 + Math.random() * 0.02) * H, vy: (Math.random() - 0.5) * 0.25 * H }); }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04); fit();
    const W = screen.width, H = screen.height, G = 0.5 * H, dpr = Math.min(devicePixelRatio, 2);
    const ax = 0.2 * W, ay = 0.5 * H, K = 7;
    const cur = frame.cursor;

    spawnT -= dt; if (spawnT <= 0 && targets.length < 4) { spawnTarget(W, H); spawnT = 1.2; }
    for (const tg of targets) { tg.y += tg.vy * dt; if (tg.y < tg.r || tg.y > H - tg.r) tg.vy *= -1; }

    let pull = null, vel = null;
    if (cur.present && cur.pinch) {
      pull = { x: cur.x * W, y: cur.y * H };
      const dx = ax - pull.x, dy = ay - pull.y, d = Math.hypot(dx, dy);
      if (d > 0.03 * W) { const p = Math.min(d, 0.32 * W) * K; vel = { x: dx / d * p, y: dy / d * p }; }
      if (!drewSound) { sfx.stretch(); drewSound = true; }
    } else drewSound = false;

    if (prevPinch && !(cur.present && cur.pinch)) {
      const px = cur.x * W, py = cur.y * H, dx = ax - px, dy = ay - py, d = Math.hypot(dx, dy);
      if (d > 0.04 * W) { const p = Math.min(d, 0.32 * W) * K; arrows.push({ x: ax, y: ay, vx: dx / d * p, vy: dy / d * p }); sfx.twang(); }
    }
    prevPinch = cur.present && cur.pinch;

    for (const a of arrows) { a.vy += G * dt; a.x += a.vx * dt; a.y += a.vy * dt; for (const tg of targets) if (Math.hypot(a.x - tg.x, a.y - tg.y) < tg.r) { tg.dead = true; a.dead = true; score++; sfx.ding(990); } }
    arrows = arrows.filter(a => !a.dead && a.x < W + 40 && a.y < H + 60 && a.x > -40);
    targets = targets.filter(tg => !tg.dead);

    // ---------- draw ----------
    g.fillStyle = "#0a0d16"; g.fillRect(0, 0, W, H);
    for (const tg of targets) { for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(tg.x, tg.y, tg.r * (1 - k * 0.33), 0, Math.PI * 2); g.fillStyle = k % 2 ? "#fff" : "#ff5a52"; g.fill(); } g.fillStyle = "#ffd23f"; g.beginPath(); g.arc(tg.x, tg.y, tg.r * 0.12, 0, Math.PI * 2); g.fill(); }

    // trajectory preview
    if (vel) {
      g.fillStyle = "rgba(255,210,120,0.8)";
      let sx = ax, sy = ay, svx = vel.x, svy = vel.y;
      for (let i = 0; i < 28; i++) { svy += G * 0.05; sx += svx * 0.05; sy += svy * 0.05; if (i % 2 === 0) { g.beginPath(); g.arc(sx, sy, 3 * dpr, 0, Math.PI * 2); g.fill(); } if (sx > W || sy > H) break; }
    }

    // bow + string
    g.strokeStyle = "#c9a14a"; g.lineWidth = 6 * dpr; g.beginPath(); g.arc(ax, ay, 0.16 * H, -Math.PI / 2.2, Math.PI / 2.2); g.stroke();
    const top = { x: ax + Math.cos(-Math.PI / 2.2) * 0.16 * H, y: ay + Math.sin(-Math.PI / 2.2) * 0.16 * H };
    const bot = { x: ax + Math.cos(Math.PI / 2.2) * 0.16 * H, y: ay + Math.sin(Math.PI / 2.2) * 0.16 * H };
    g.strokeStyle = "#dfe6f2"; g.lineWidth = 2 * dpr; g.beginPath();
    if (pull) { g.moveTo(top.x, top.y); g.lineTo(pull.x, pull.y); g.lineTo(bot.x, bot.y); } else { g.moveTo(top.x, top.y); g.lineTo(bot.x, bot.y); }
    g.stroke();
    if (pull) { g.fillStyle = "#ffe6a8"; g.beginPath(); g.arc(pull.x, pull.y, 6 * dpr, 0, Math.PI * 2); g.fill(); }

    g.strokeStyle = "#ffe6a8"; g.lineWidth = 3 * dpr; for (const a of arrows) { const d = Math.hypot(a.vx, a.vy) || 1; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - a.vx / d * 30 * dpr, a.y - a.vy / d * 30 * dpr); g.stroke(); }

    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${20 * dpr}px Segoe UI`; g.fillText("Score " + score, 16 * dpr, 30 * dpr);
    ctx.setTag("score " + score);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}
