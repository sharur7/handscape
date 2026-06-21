// Whack-a-Mole experience.
// Moles pop up from the holes, move your hand over one while it's up to bonk it.
// Score as many as you can in 45 seconds. Open palm to replay.

const ROUND = 45;
import { sfx } from "../sfx.js";

export function createMole(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  const COLS = 3, ROWS = 3;
  let holes, score, timeLeft, state, spawnT, pops, prevPinch = false;
  function reset() {
    holes = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) holes.push({ cx: (c + 0.5) / COLS, cy: 0.28 + r * 0.24, up: 0, target: 0, timer: 0, bonk: 0 });
    score = 0; timeLeft = ROUND; state = "ready"; spawnT = 0.6; pops = [];
  }
  function startGame() { score = 0; timeLeft = ROUND; spawnT = 0.6; state = "play"; for (const m of holes) { m.target = 0; m.up = 0; } }
  reset();
  ctx.setHint("<b>Pinch</b> over a popped-up mole to bonk it!");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04); fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const R = Math.min(W / COLS, H / 4) * 0.32;

    const startPinch = frame.cursor.present && frame.cursor.pinch;
    if (state === "ready" && startPinch && !prevPinch) startGame();
    prevPinch = startPinch;

    if (state === "play") {
      timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; state = "over"; ctx.setHint("Time! Hold an <b>open palm</b> to replay."); }
      spawnT -= dt; if (spawnT <= 0) { const down = holes.filter(h => h.target === 0); if (down.length) { const m = down[(Math.random() * down.length) | 0]; m.target = 1; m.timer = 0.8 + Math.random() * 0.9; } spawnT = Math.max(0.35, 0.9 - score * 0.02); }
    }
    for (const m of holes) {
      m.up += (m.target - m.up) * Math.min(1, dt * 12);
      if (m.target === 1) { m.timer -= dt; if (m.timer <= 0) m.target = 0; }
      if (m.bonk > 0) m.bonk -= dt * 3;
    }

    // whack: PINCH over an up mole
    const pts = []; frame.hands.forEach(h => { if (h.pinch.active) { pts.push(h.landmarks[8]); pts.push(h.landmarks[9]); } });
    if (state === "play") for (const m of holes) if (m.up > 0.6 && m.target === 1) {
      const mx = m.cx * W, my = m.cy * H;
      for (const p of pts) if (Math.hypot(p.x * W - mx, p.y * H - my) < R) { m.target = 0; m.bonk = 1; score++; sfx.bonk(); for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI * 2; pops.push({ x: mx, y: my, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 1 }); } break; }
    }
    for (const p of pops) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; }
    pops = pops.filter(p => p.life > 0);
    if (state === "over" && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) reset();

    // ---------- draw ----------
    g.fillStyle = "#0e1322"; g.fillRect(0, 0, W, H);
    for (const m of holes) {
      const x = m.cx * W, y = m.cy * H;
      g.fillStyle = "#0a0d14"; g.beginPath(); g.ellipse(x, y + R * 0.6, R, R * 0.4, 0, 0, Math.PI * 2); g.fill();
      if (m.up > 0.02) {
        const oy = y + R * 0.6 - m.up * R * 1.1;
        g.save(); g.beginPath(); g.ellipse(x, y + R * 0.6, R, R * 0.4, 0, 0, Math.PI * 2); g.clip();
        g.fillStyle = m.bonk > 0 ? "#ff8c8c" : "#9c6b3f"; g.beginPath(); g.arc(x, oy, R * 0.8, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#2a1d12"; g.beginPath(); g.arc(x - R * 0.28, oy - R * 0.1, R * 0.1, 0, Math.PI * 2); g.arc(x + R * 0.28, oy - R * 0.1, R * 0.1, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ff9aa0"; g.beginPath(); g.arc(x, oy + R * 0.12, R * 0.14, 0, Math.PI * 2); g.fill(); g.restore();
      }
    }
    g.fillStyle = "#ffd23f"; for (const p of pops) { g.globalAlpha = Math.max(0, p.life); g.fillRect(p.x, p.y, 5 * dpr, 5 * dpr); } g.globalAlpha = 1;
    for (const h of frame.hands) { const p = h.landmarks[9]; g.beginPath(); g.arc(p.x * W, p.y * H, 18 * dpr, 0, Math.PI * 2); g.strokeStyle = "rgba(106,209,255,0.7)"; g.lineWidth = 3 * dpr; g.stroke(); }

    const barW = W - 32 * dpr; g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(16 * dpr, 14 * dpr, barW, 8 * dpr);
    g.fillStyle = timeLeft < 8 ? "#ff6a6a" : "#54e08a"; g.fillRect(16 * dpr, 14 * dpr, barW * (timeLeft / ROUND), 8 * dpr);
    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${18 * dpr}px Segoe UI, sans-serif`; g.fillText("Bonks " + score, 16 * dpr, 44 * dpr);
    g.textAlign = "right"; g.fillText(Math.ceil(timeLeft) + "s", W - 16 * dpr, 44 * dpr);
    if (state === "ready") { g.fillStyle = "rgba(5,7,12,0.7)"; g.fillRect(0, 0, W, H); g.textAlign = "center"; g.fillStyle = "#e8edf6"; g.font = `bold ${34 * dpr}px Segoe UI, sans-serif`; g.fillText("Whack-a-Mole 🔨", W / 2, H / 2 - 10 * dpr); g.fillStyle = "#54e08a"; g.font = `bold ${22 * dpr}px Segoe UI, sans-serif`; g.fillText("✊ Pinch to start", W / 2, H / 2 + 28 * dpr); }
    if (state === "over") { g.fillStyle = "rgba(5,7,12,0.72)"; g.fillRect(0, 0, W, H); g.textAlign = "center"; g.fillStyle = "#54e08a"; g.font = `bold ${36 * dpr}px Segoe UI, sans-serif`; g.fillText("Time's Up!", W / 2, H / 2 - 6 * dpr); g.fillStyle = "#8a93a6"; g.font = `${16 * dpr}px Segoe UI, sans-serif`; g.fillText(`${score} bonked · open palm to replay`, W / 2, H / 2 + 24 * dpr); }
    ctx.setTag(state === "ready" ? "ready" : state === "over" ? "time up" : `bonks ${score} · ${Math.ceil(timeLeft)}s`);
  }
  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}
