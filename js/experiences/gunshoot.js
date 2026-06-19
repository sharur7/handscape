// Tin Shooter experience.
// The pistol stays on the RIGHT pointing straight across to the LEFT. Move your hand
// UP/DOWN to aim at the two shelves of tins on the left, and PINCH to fire.
import { sfx } from "../sfx.js";

const SHELVES = [0.4, 0.62];   // two shelves; tins on the LEFT

export function createGunShoot(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let cans = [], bullets = [], chips = [], score = 0, flash = 0, cool = 0, prevPinch = false, respawnT = 0, gunY = 0.5;
  ctx.setHint("Move your hand <b>up/down</b> to aim and <b>pinch</b> to fire — knock the tins off the shelves!");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }
  function spawnCans(W, H) { cans = []; const cw = 0.05 * H; for (const sf of SHELVES) for (let i = 0; i < 3; i++) cans.push({ x: (0.12 + i * 0.1) * W, y: sf * H, w: cw, h: cw * 1.5, vx: 0, vy: 0, rot: 0, down: false }); }
  let inited = false;

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04); fit();
    const W = screen.width, H = screen.height, G = 1.7 * H, dpr = Math.min(devicePixelRatio, 2);
    if (!inited) { spawnCans(W, H); inited = true; }
    if (cool > 0) cool -= dt; if (flash > 0) flash -= dt * 6;

    const hand = frame.hands[0];
    if (hand) gunY += (hand.landmarks[9].y - gunY) * Math.min(1, dt * 12);
    const gx = 0.88 * W, gy = gunY * H, muzzle = { x: gx - 64 * dpr, y: gy };
    const pinch = hand ? hand.pinch.active : false;
    if (pinch && !prevPinch && cool <= 0) { bullets.push({ x: muzzle.x, y: muzzle.y, vx: -2.8 * W, vy: 0 }); flash = 1; cool = 0.14; sfx.shot(); }
    prevPinch = pinch;

    for (const b of bullets) {
      b.px = b.x; b.py = b.y; b.x += b.vx * dt;
      for (const c of cans) if (!c.down && b.x > c.x - c.w / 2 && b.x < c.x + c.w / 2 && b.y > c.y - c.h && b.y < c.y) { c.down = true; c.vx = -(180 + Math.random() * 140); c.vy = -150 - Math.random() * 120; c.vr = (Math.random() - 0.5) * 14; score++; b.dead = true; sfx.tink(); for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI * 2; chips.push({ x: c.x, y: c.y - c.h / 2, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5 }); } break; }
    }
    bullets = bullets.filter(b => !b.dead && b.x > -50);
    for (const c of cans) if (c.down) { c.vy += G * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; }
    cans = cans.filter(c => c.y < H + 120 && c.x > -120);
    for (const p of chips) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; } chips = chips.filter(p => p.life > 0);
    if (cans.length === 0) { respawnT += dt; if (respawnT > 1.0) { spawnCans(W, H); respawnT = 0; } } else respawnT = 0;

    // ---------- draw ----------
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#1a2030"); bg.addColorStop(1, "#0c0f18");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (const sf of SHELVES) { g.fillStyle = "#5a3a22"; g.fillRect(0.04 * W, sf * H + 2 * dpr, 0.4 * W, 12 * dpr); g.fillStyle = "#3a2616"; g.fillRect(0.04 * W, sf * H + 14 * dpr, 0.4 * W, 4 * dpr); }
    for (const c of cans) drawCan(g, c, dpr);
    g.fillStyle = "#cfd6e2"; for (const p of chips) { g.globalAlpha = Math.max(0, p.life * 2); g.fillRect(p.x, p.y, 3 * dpr, 3 * dpr); } g.globalAlpha = 1;
    g.strokeStyle = "#ffd23f"; g.lineWidth = 3 * dpr; g.lineCap = "round";
    for (const b of bullets) { g.beginPath(); g.moveTo(b.px ?? b.x, b.py ?? b.y); g.lineTo(b.x, b.y); g.stroke(); }

    // aim line (straight, to the left) + horizontal pistol on the right
    g.strokeStyle = "rgba(255,80,80,0.4)"; g.lineWidth = 1.5 * dpr; g.setLineDash([8 * dpr, 8 * dpr]); g.beginPath(); g.moveTo(muzzle.x, gy); g.lineTo(0, gy); g.stroke(); g.setLineDash([]);
    drawPistol(g, gx, gy, dpr);
    if (flash > 0) { g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(255,210,120,${flash})`; g.beginPath(); g.arc(muzzle.x - 6 * dpr, gy, (10 + flash * 18) * dpr, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = "source-over"; }

    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${22 * dpr}px Segoe UI`; g.fillText("Score " + score, 16 * dpr, 32 * dpr);
    if (!hand) { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("show your hand · move up/down to aim, pinch to fire", W / 2, H - 18 * dpr); }
    ctx.setTag("score " + score);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function drawPistol(g, x, y, dpr) {
  g.save(); g.translate(x, y); g.scale(-1, 1); const u = dpr;   // mirrored: barrel points LEFT
  g.fillStyle = "#3a2a1c"; g.beginPath(); g.moveTo(-6 * u, 4 * u); g.lineTo(2 * u, 4 * u); g.lineTo(8 * u, 34 * u); g.lineTo(-2 * u, 34 * u); g.closePath(); g.fill();
  g.fillStyle = "#2a3038"; g.fillRect(-12 * u, -10 * u, 56 * u, 16 * u);
  g.fillStyle = "#1a1e26"; g.fillRect(40 * u, -7 * u, 26 * u, 10 * u);
  g.fillStyle = "#2a3038"; g.fillRect(22 * u, -14 * u, 6 * u, 5 * u);
  g.strokeStyle = "#2a3038"; g.lineWidth = 3 * u; g.beginPath(); g.arc(6 * u, 12 * u, 8 * u, -0.3, Math.PI + 0.3); g.stroke();
  g.fillStyle = "#11151c"; g.fillRect(2 * u, 6 * u, 6 * u, 9 * u);
  g.restore();
}
function drawCan(g, c, dpr) {
  g.save(); g.translate(c.x, c.y - c.h / 2); if (c.down) g.rotate(c.rot);
  g.fillStyle = "#b9bfca"; g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  g.fillStyle = "#d7dce4"; g.fillRect(-c.w / 2, -c.h / 2, c.w * 0.3, c.h);
  g.fillStyle = "#ff5a52"; g.fillRect(-c.w / 2, -c.h * 0.18, c.w, c.h * 0.36);
  g.fillStyle = "#8a909c"; g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * 0.08); g.fillRect(-c.w / 2, c.h / 2 - c.h * 0.08, c.w, c.h * 0.08);
  g.restore();
}
