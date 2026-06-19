// Dodge experience.
// Move your hand to steer the orb and DODGE the falling blocks. Survive as long as
// you can — one hit ends it. Open palm to restart.

import { sfx } from "../sfx.js";

export function createDodge(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let rocks, bullets, blasts, px, py, t, state, spawnT, score, prevPinch, shootCool;
  function reset() { rocks = []; bullets = []; blasts = []; px = 0.5; py = 0.7; t = 0; state = "play"; spawnT = 0; score = 0; prevPinch = false; shootCool = 0; }
  reset();
  ctx.setHint("Move your hand to fly &amp; <b>dodge</b> the meteors. <b>Pinch</b> to blast them!");
  const music = sfx.loop([131, 165, 196, 247, 196, 165], 70, "sine", 0.06);   // ambient space pad

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04); fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const cur = frame.cursor;
    if (cur.present) { px += (cur.x - px) * Math.min(1, dt * 14); py += (cur.y - py) * Math.min(1, dt * 14); }
    const ax = px * W, ay = py * H, ar = 16 * dpr;

    if (shootCool > 0) shootCool -= dt;
    if (state === "play") {
      t += dt; spawnT -= dt;
      const rate = Math.max(0.18, 0.6 - t * 0.01);
      if (spawnT <= 0) { spawnT = rate; const s = (0.03 + Math.random() * 0.05) * H; rocks.push({ x: Math.random() * W, y: -s, s, vy: (0.35 + Math.random() * 0.4 + t * 0.01) * H, vx: (Math.random() - 0.5) * 0.2 * W }); }
      // pinch to fire upward
      const pinch = cur.present && cur.pinch;
      if (pinch && !prevPinch && shootCool <= 0) { bullets.push({ x: ax, y: ay - ar, vy: -1.6 * H }); shootCool = 0.18; sfx.shot(); }
      prevPinch = pinch;
      for (const r of rocks) {
        r.y += r.vy * dt; r.x += r.vx * dt;
        if (Math.abs(r.x + r.s / 2 - ax) < r.s / 2 + ar && Math.abs(r.y + r.s / 2 - ay) < r.s / 2 + ar) { state = "over"; sfx.thunk(); }
      }
      // bullets vs meteors
      for (const b of bullets) { b.y += b.vy * dt; for (const r of rocks) if (!r.dead && b.x > r.x && b.x < r.x + r.s && b.y > r.y && b.y < r.y + r.s) { r.dead = true; b.dead = true; score++; sfx.boom(); for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 220; blasts.push({ x: r.x + r.s / 2, y: r.y + r.s / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 }); } break; } }
      bullets = bullets.filter(b => !b.dead && b.y > -20);
      rocks = rocks.filter(r => !r.dead && r.y < H + r.s);
      for (const p of blasts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.6; } blasts = blasts.filter(p => p.life > 0);
    }
    if (state === "over" && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) reset();

    // space background + stars
    g.fillStyle = "#05060e"; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(255,255,255,0.5)"; for (let i = 0; i < 40; i++) { const sx = (i * 97.13 % 1) * W, sy = ((i * 53.7 + t * 30) % H); g.fillRect(sx, sy, 2 * dpr, 2 * dpr); }
    // meteors
    for (const r of rocks) drawMeteor(g, r.x + r.s / 2, r.y + r.s / 2, r.s / 2, r.x * 0.01 + t);
    // bullets + blasts
    g.fillStyle = "#6ad1ff"; for (const b of bullets) { g.fillRect(b.x - 2 * dpr, b.y - 10 * dpr, 4 * dpr, 12 * dpr); }
    g.fillStyle = "#ffb37a"; for (const p of blasts) { g.globalAlpha = Math.max(0, p.life); g.fillRect(p.x, p.y, 4 * dpr, 4 * dpr); } g.globalAlpha = 1;
    // spaceship
    if (state === "play") drawShip(g, ax, ay, ar, t, dpr);

    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${20 * dpr}px Segoe UI, sans-serif`; g.fillText(t.toFixed(1) + "s  ·  💥 " + score, 16 * dpr, 30 * dpr);
    if (!cur.present && state === "play") { g.textAlign = "center"; g.fillStyle = "#8a93a6"; g.font = `${14 * dpr}px Segoe UI, sans-serif`; g.fillText("show your hand to steer", W / 2, 30 * dpr); }
    if (state === "over") {
      g.fillStyle = "rgba(5,7,12,0.72)"; g.fillRect(0, 0, W, H); g.textAlign = "center"; g.fillStyle = "#ff6a6a"; g.font = `bold ${38 * dpr}px Segoe UI, sans-serif`; g.fillText("Hit!", W / 2, H / 2 - 6 * dpr);
      g.fillStyle = "#8a93a6"; g.font = `${16 * dpr}px Segoe UI, sans-serif`; g.fillText(`survived ${t.toFixed(1)}s · ${score} blasted · open palm to retry`, W / 2, H / 2 + 24 * dpr);
    }
    ctx.setTag(state === "over" ? "game over" : t.toFixed(1) + "s");
  }
  function resize() { fit(); }
  function dispose() { music?.stop(); screen.remove(); }
  return { update, resize, dispose };
}

function drawShip(g, x, y, r, t, dpr) {
  g.save(); g.translate(x, y);
  // thruster flame
  g.fillStyle = `rgba(255,${150 + Math.sin(t * 40) * 80 | 0},60,0.9)`; g.beginPath(); g.moveTo(-r * 0.4, r * 0.8); g.lineTo(0, r * (1.5 + Math.sin(t * 30) * 0.3)); g.lineTo(r * 0.4, r * 0.8); g.closePath(); g.fill();
  // body
  g.fillStyle = "#cfd6e2"; g.beginPath(); g.moveTo(0, -r * 1.2); g.lineTo(r, r * 0.9); g.lineTo(-r, r * 0.9); g.closePath(); g.fill();
  g.fillStyle = "#6ad1ff"; g.beginPath(); g.arc(0, -r * 0.1, r * 0.35, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#8a909c"; g.beginPath(); g.moveTo(-r, r * 0.9); g.lineTo(-r * 1.4, r * 1.3); g.lineTo(-r * 0.5, r * 0.9); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(r, r * 0.9); g.lineTo(r * 1.4, r * 1.3); g.lineTo(r * 0.5, r * 0.9); g.closePath(); g.fill();
  g.restore();
}
function drawMeteor(g, x, y, r, seed) {
  g.save(); g.translate(x, y); g.rotate(seed);
  g.fillStyle = "#6b5642"; g.beginPath();
  const n = 9; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = r * (0.8 + ((Math.sin(i * 12.9 + seed) * 43758.5) % 1) * 0.3); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,0.25)"; for (const c of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [0, 0.35, 0.13]]) { g.beginPath(); g.arc(c[0] * r, c[1] * r, c[2] * r, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
