// Fireworks experience.
// PINCH to launch a firework toward where your hand is — it rockets up and bursts
// into colour. A few also fire on their own for ambience.

const COLORS = ["#ff5a72", "#ffb347", "#54e08a", "#6ad1ff", "#b06aff", "#ffd23f", "#ff6ad1"];
import { sfx } from "../sfx.js";

export function createFireworks(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let rockets = [], parts = [], prevPinch = false, autoT = 0;
  ctx.setHint("<b>Pinch</b> anywhere to launch a firework — it rockets up and bursts into colour!");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }
  function launch(tx, ty, W, H) { rockets.push({ x: tx, y: H, tx, ty, vy: -(0.9 + Math.random() * 0.2) * H, c: COLORS[(Math.random() * COLORS.length) | 0] }); sfx.fwhistle(); }
  function burst(x, y, c) { sfx.fwburst(); const n = 60 + (Math.random() * 40 | 0); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = (0.5 + Math.random()) * 260; parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 + Math.random() * 0.5, c: Math.random() < 0.2 ? "#ffffff" : c }); } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04); fit();
    const W = screen.width, H = screen.height, G = 0.6 * H, dpr = Math.min(devicePixelRatio, 2);
    const cur = frame.cursor;

    if (cur.present && cur.pinch && !prevPinch) launch(cur.x * W, cur.y * H, W, H);
    prevPinch = cur.present && cur.pinch;

    for (const r of rockets) { r.x += (r.tx - r.x) * dt * 2; r.y += r.vy * dt; r.vy += G * 0.5 * dt; if (r.y <= r.ty || r.vy >= 0) { burst(r.x, r.y, r.c); r.dead = true; } }
    rockets = rockets.filter(r => !r.dead);
    for (const p of parts) { p.vy += G * 0.5 * dt; p.vx *= 0.99; p.vy *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    parts = parts.filter(p => p.life > 0);

    // trails: fade instead of clear
    g.fillStyle = "rgba(4,6,12,0.28)"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    for (const r of rockets) { g.fillStyle = r.c; g.beginPath(); g.arc(r.x, r.y, 3 * dpr, 0, Math.PI * 2); g.fill(); }
    for (const p of parts) { g.globalAlpha = Math.max(0, Math.min(1, p.life)); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 2.5 * dpr, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    if (cur.present) { g.beginPath(); g.arc(cur.x * W, cur.y * H, (cur.pinch ? 6 : 10) * dpr, 0, Math.PI * 2); g.fillStyle = cur.pinch ? "#ffd23f" : "rgba(255,255,255,0.35)"; g.fill(); }
    ctx.setTag(parts.length > 30 ? "boom!" : "tap the sky");
  }
  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}
