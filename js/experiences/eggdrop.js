// Egg Drop experience.
// Move your hand to slide the basket and catch the falling eggs. Miss 3 and it's
// game over. Open palm to play again.

import { sfx } from "../sfx.js";

export function createEggDrop(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let eggs, bx, score, lives, t, state, spawnT, splats;
  function reset() { eggs = []; bx = 0.5; score = 0; lives = 3; t = 0; state = "play"; spawnT = 0.6; splats = []; }
  reset();
  ctx.setHint("Slide the <b>basket</b> to catch eggs — but dodge the <b>green rotten ones</b> (−1)!");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04); fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const cur = frame.cursor; if (cur.present) bx += (cur.x - bx) * Math.min(1, dt * 14);
    const bw = 0.16 * W, by = 0.82 * H, bpx = bx * W;

    if (state === "play") {
      t += dt; spawnT -= dt;
      if (spawnT <= 0) { spawnT = Math.max(0.4, 1.1 - t * 0.012); eggs.push({ x: (0.1 + Math.random() * 0.8) * W, y: -20, vy: (0.4 + Math.random() * 0.25 + t * 0.012) * H, bad: Math.random() < 0.22 }); }
      for (const e of eggs) {
        e.y += e.vy * dt;
        if (!e.done && e.y > by - 10 * dpr && e.y < by + 30 * dpr && Math.abs(e.x - bpx) < bw / 2) {
          e.done = true; e.caught = true;
          if (e.bad) { score = Math.max(0, score - 1); sfx.crack(); }   // caught a rotten one!
          else { score++; sfx.pop(); }
        }
        else if (!e.done && e.y > H) { e.done = true; if (!e.bad) { lives--; splats.push({ x: e.x, y: H - 6 * dpr, life: 1 }); sfx.crack(); if (lives <= 0) { state = "over"; ctx.setHint("Out of eggs — hold an <b>open palm</b> to retry."); } } }
      }
      eggs = eggs.filter(e => !e.done);
    }
    for (const s of splats) s.life -= dt; splats = splats.filter(s => s.life > 0);
    if (state === "over" && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) reset();

    // ---------- draw ----------
    g.fillStyle = "#0e1322"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#16331f"; g.fillRect(0, H - 8 * dpr, W, 8 * dpr);
    for (const s of splats) { g.globalAlpha = Math.max(0, s.life); g.fillStyle = "#ffd23f"; g.beginPath(); g.ellipse(s.x, s.y, 22 * dpr, 7 * dpr, 0, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
    for (const e of eggs) {
      g.fillStyle = e.bad ? "#6b8f3a" : "#fff7e6"; g.beginPath(); g.ellipse(e.x, e.y, 12 * dpr, 16 * dpr, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(0,0,0,0.1)"; g.beginPath(); g.ellipse(e.x + 3 * dpr, e.y + 3 * dpr, 6 * dpr, 9 * dpr, 0, 0, Math.PI * 2); g.fill();
      if (e.bad) { g.fillStyle = "#3f5a1f"; for (const o of [[-4, -6], [4, -2], [-2, 5]]) { g.beginPath(); g.arc(e.x + o[0] * dpr, e.y + o[1] * dpr, 2.5 * dpr, 0, Math.PI * 2); g.fill(); } }
    }
    // basket
    g.fillStyle = "#8a5a2b"; g.beginPath(); g.moveTo(bpx - bw / 2, by); g.lineTo(bpx + bw / 2, by); g.lineTo(bpx + bw * 0.38, by + 0.1 * H); g.lineTo(bpx - bw * 0.38, by + 0.1 * H); g.closePath(); g.fill();
    g.strokeStyle = "#6b4420"; g.lineWidth = 3 * dpr; for (let i = 1; i < 5; i++) { const x = bpx - bw / 2 + bw * i / 5; g.beginPath(); g.moveTo(x, by); g.lineTo(x - bw * 0.06, by + 0.1 * H); g.stroke(); }

    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${18 * dpr}px Segoe UI`; g.fillText("Caught " + score, 16 * dpr, 30 * dpr);
    g.textAlign = "right"; g.fillStyle = "#ff6a6a"; g.fillText("♥".repeat(Math.max(0, lives)), W - 16 * dpr, 30 * dpr);
    if (!cur.present && state === "play") { g.textAlign = "center"; g.fillStyle = "#8a93a6"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("show your hand to move the basket", W / 2, 30 * dpr); }
    if (state === "over") { g.fillStyle = "rgba(5,7,12,0.72)"; g.fillRect(0, 0, W, H); g.textAlign = "center"; g.fillStyle = "#ff6a6a"; g.font = `bold ${36 * dpr}px Segoe UI`; g.fillText("Game Over", W / 2, H / 2 - 6 * dpr); g.fillStyle = "#8a93a6"; g.font = `${16 * dpr}px Segoe UI`; g.fillText(`caught ${score} · open palm to retry`, W / 2, H / 2 + 24 * dpr); }
    ctx.setTag(state === "over" ? "game over" : "caught " + score);
  }
  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}
