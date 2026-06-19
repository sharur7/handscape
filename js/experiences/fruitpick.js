// Fruit Picking experience.
// PINCH a fruit on the tree, drag it down to the basket and release to collect it.
// Pick them all before the timer runs out. Open palm to play again.

const COLORS = ["#ff5a52", "#ffb347", "#ff8c42", "#e0455a", "#ffd23f"];
const TOTAL = 12;
const TIME = 60;
import { sfx } from "../sfx.js";

export function createFruitPick(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  // basket (normalized)
  const basket = { x: 0.5, y: 0.84, w: 0.24, h: 0.13 };

  let fruits, held, score, timeLeft, state, pinchPrev;
  function buildFruits() {
    fruits = [];
    for (let i = 0; i < TOTAL; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
      const hx = 0.5 + Math.cos(a) * rr * 0.32;
      const hy = 0.26 + Math.sin(a) * rr * 0.16;
      fruits.push({ hx, hy, x: hx, y: hy, r: 0.032, c: COLORS[i % COLORS.length], collected: false });
    }
    held = null;
  }
  function reset() { buildFruits(); score = 0; timeLeft = TIME; state = "ready"; pinchPrev = false; }
  function startGame() { buildFruits(); score = 0; timeLeft = TIME; state = "play"; }
  reset();

  ctx.setHint("<b>Pinch</b> a fruit, drag it to the <b>basket</b> and release. Pick all before time runs out!");

  function fit() {
    const w = mount.clientWidth, h = mount.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; }
  }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.05);
    fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const cur = frame.cursor;

    if (state === "play") {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; state = score >= TOTAL ? "win" : "over"; ctx.setHint("Time! Hold an <b>open palm</b> to play again."); }
    }

    const pinch = cur.present && cur.pinch;
    if (state === "ready" && pinch && !pinchPrev) startGame();
    // grab
    if (state === "play" && pinch && !pinchPrev && !held) {
      let best = null, bestD = 0.07;
      for (const f of fruits) {
        if (f.collected) continue;
        const d = Math.hypot((f.x - cur.x) * W, (f.y - cur.y) * H) / H;
        if (d < bestD) { bestD = d; best = f; }
      }
      if (best) held = best;
    }
    // carry
    if (held && pinch) { held.x = cur.x; held.y = cur.y; }
    // release
    if (held && !pinch) {
      const inBasket = cur.x > basket.x - basket.w / 2 && cur.x < basket.x + basket.w / 2 &&
                       cur.y > basket.y - basket.h / 2 && cur.y < basket.y + basket.h / 2;
      if (inBasket) { held.collected = true; score++; sfx.pop(); if (score >= TOTAL) { state = "win"; sfx.chime(); ctx.setHint("All picked! Hold an <b>open palm</b> to play again."); } }
      held = null;
    }
    pinchPrev = pinch;

    // fruits glide back home when not held
    for (const f of fruits) if (!f.collected && f !== held) { f.x += (f.hx - f.x) * Math.min(1, dt * 6); f.y += (f.hy - f.y) * Math.min(1, dt * 6); }

    // restart
    if ((state === "win" || state === "over") && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) reset();

    // ---------- draw ----------
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0d1320"); sky.addColorStop(1, "#0a0d16");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    // tree: trunk + canopy
    g.fillStyle = "#5a3a22"; g.fillRect(W * 0.47, H * 0.26, W * 0.06, H * 0.5);
    g.fillStyle = "#1f6b3a";
    for (const [dx, dy, r] of [[0, 0, 0.2], [-0.18, 0.05, 0.15], [0.18, 0.05, 0.15], [-0.1, -0.08, 0.14], [0.1, -0.08, 0.14]])
      { g.beginPath(); g.arc(W * (0.5 + dx), H * (0.26 + dy), Math.min(W, H) * r, 0, Math.PI * 2); g.fill(); }

    // basket
    drawBasket(g, basket.x * W, basket.y * H, basket.w * W, basket.h * H);

    // fruits
    for (const f of fruits) { if (f.collected || f === held) continue; drawFruit(g, f.x * W, f.y * H, f.r * H, f.c); }
    // collected pile in basket
    for (let i = 0; i < score; i++) {
      const bx = (basket.x - basket.w * 0.32) * W + (i % 4) * (basket.w * 0.21 * W);
      const by = (basket.y - basket.h * 0.1) * H - ((i / 4) | 0) * (basket.h * 0.28 * H);
      drawFruit(g, bx, by, basket.h * 0.22 * H, COLORS[i % COLORS.length]);
    }
    if (held) drawFruit(g, held.x * W, held.y * H, held.r * H * 1.1, held.c);

    // cursor
    if (cur.present) {
      g.beginPath(); g.arc(cur.x * W, cur.y * H, (cur.pinch ? 7 : 11) * dpr, 0, Math.PI * 2);
      g.fillStyle = cur.pinch ? "#ffb347" : "rgba(255,255,255,0.4)"; g.fill();
    }

    // HUD: timer bar + count
    const barW = W - 32 * dpr;
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(16 * dpr, 14 * dpr, barW, 8 * dpr);
    g.fillStyle = timeLeft < 6 ? "#ff6a6a" : "#54e08a"; g.fillRect(16 * dpr, 14 * dpr, barW * (timeLeft / TIME), 8 * dpr);
    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${18 * dpr}px Segoe UI, sans-serif`;
    g.fillText(`${score}/${TOTAL}`, 16 * dpr, 44 * dpr);
    g.textAlign = "right"; g.fillText(Math.ceil(timeLeft) + "s", W - 16 * dpr, 44 * dpr);

    if (state === "ready") {
      g.fillStyle = "rgba(5,7,12,0.7)"; g.fillRect(0, 0, W, H);
      g.textAlign = "center"; g.fillStyle = "#e8edf6"; g.font = `bold ${34 * dpr}px Segoe UI, sans-serif`; g.fillText("Orchard Rush 🧺", W / 2, H / 2 - 10 * dpr);
      g.fillStyle = "#54e08a"; g.font = `bold ${22 * dpr}px Segoe UI, sans-serif`; g.fillText("✊ Pinch to start", W / 2, H / 2 + 28 * dpr);
    }
    if (state === "win" || state === "over") {
      g.fillStyle = "rgba(5,7,12,0.72)"; g.fillRect(0, 0, W, H);
      g.textAlign = "center"; g.fillStyle = state === "win" ? "#54e08a" : "#ff6a6a";
      g.font = `bold ${38 * dpr}px Segoe UI, sans-serif`; g.fillText(state === "win" ? "All Picked!" : "Time's Up", W / 2, H / 2 - 6 * dpr);
      g.fillStyle = "#8a93a6"; g.font = `${16 * dpr}px Segoe UI, sans-serif`;
      g.fillText(`${score}/${TOTAL} collected · open your palm to replay`, W / 2, H / 2 + 26 * dpr);
    }

    ctx.setTag(state === "ready" ? "ready" : state === "win" ? "win!" : state === "over" ? "time up" : `${score}/${TOTAL} · ${Math.ceil(timeLeft)}s`);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function drawFruit(g, x, y, r, c) {
  g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2f7d3a"; g.beginPath(); g.ellipse(x + r * 0.3, y - r * 0.9, r * 0.35, r * 0.18, -0.6, 0, Math.PI * 2); g.fill();
}
function drawBasket(g, cx, cy, w, h) {
  g.fillStyle = "#8a5a2b"; g.beginPath();
  g.moveTo(cx - w / 2, cy - h / 2); g.lineTo(cx + w / 2, cy - h / 2);
  g.lineTo(cx + w * 0.38, cy + h / 2); g.lineTo(cx - w * 0.38, cy + h / 2); g.closePath(); g.fill();
  g.strokeStyle = "#6b4420"; g.lineWidth = Math.max(2, w * 0.02);
  for (let i = 1; i < 5; i++) { const x = cx - w / 2 + (w * i / 5); g.beginPath(); g.moveTo(x, cy - h / 2); g.lineTo(x - w * 0.06, cy + h / 2); g.stroke(); }
  g.fillStyle = "#a06a35"; g.fillRect(cx - w / 2 - 4, cy - h / 2 - 6, w + 8, 8);
}
