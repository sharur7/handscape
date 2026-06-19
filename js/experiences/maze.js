// Marble Maze experience.
// TILT your hand to rotate the maze; gravity rolls the marble. Steer it through the
// gaps and out the bottom exit to clear a level. 3 hand-built mazes, each harder.
// Open palm to restart.
import { sfx } from "../sfx.js";

const TH = 0.05;
const border = (gapLo, gapHi) => [
  { x: 0, y: 0, w: 1, h: TH }, { x: 0, y: 0, w: TH, h: 1 }, { x: 1 - TH, y: 0, w: TH, h: 1 },
  { x: 0, y: 1 - TH, w: gapLo, h: TH }, { x: gapHi, y: 1 - TH, w: 1 - gapHi, h: TH }
];
const LEVELS = [
  { start: { x: 0.12, y: 0.12 }, gap: [0.42, 0.58], walls: [...border(0.42, 0.58),
    { x: 0, y: 0.36, w: 0.72, h: TH }, { x: 0.28, y: 0.66, w: 0.72, h: TH }] },
  { start: { x: 0.12, y: 0.12 }, gap: [0.44, 0.6], walls: [...border(0.44, 0.6),
    { x: 0.2, y: 0.26, w: 0.8, h: TH }, { x: 0, y: 0.46, w: 0.6, h: TH }, { x: 0.42, y: 0.66, w: 0.58, h: TH }, { x: 0, y: 0.82, w: 0.62, h: TH }] },
  { start: { x: 0.12, y: 0.1 }, gap: [0.78, 0.95], walls: [...border(0.78, 0.95),   // serpentine
    { x: 0, y: 0.2, w: 0.78, h: TH }, { x: 0.22, y: 0.36, w: 0.78, h: TH }, { x: 0, y: 0.52, w: 0.78, h: TH }, { x: 0.22, y: 0.68, w: 0.78, h: TH }, { x: 0, y: 0.84, w: 0.78, h: TH }] }
];

export function createMaze(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let level, ball, angle, state, banner;
  function load(i) { const L = LEVELS[i]; ball = { x: L.start.x, y: L.start.y, vx: 0, vy: 0, r: 0.028 }; banner = 1.5; }
  function reset() { level = 0; angle = 0; state = "play"; load(0); }
  reset();
  ctx.setHint("<b>Tilt your hand</b> to rotate the maze and roll the marble out the bottom exit. 3 levels!");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }
  function advance() { sfx.chime(); if (level + 1 >= LEVELS.length) { state = "win"; ctx.setHint("All mazes cleared! Hold an <b>open palm</b> to play again."); } else { level++; load(level); } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.03); fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const size = Math.min(W, H) * 0.84, cx = W / 2, cy = H / 2, L = LEVELS[level];
    if (banner > 0) banner -= dt;

    const hand = frame.hands[0];
    const targetA = hand ? Math.max(-1.1, Math.min(1.1, (hand.rotation + Math.PI / 2) * 3.0)) : 0;
    angle += (targetA - angle) * Math.min(1, dt * 10);

    if (state === "play") {
      const G = 5.0, dn = { x: Math.sin(angle) * G, y: Math.cos(angle) * G };
      ball.vx += dn.x * dt; ball.vy += dn.y * dt; ball.vx *= 0.99; ball.vy *= 0.99;
      const sp = Math.hypot(ball.vx, ball.vy), MAX = 1.8; if (sp > MAX) { ball.vx *= MAX / sp; ball.vy *= MAX / sp; }  // cap so it can't tunnel
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;

      for (const wl of L.walls) {
        const nx = Math.max(wl.x, Math.min(ball.x, wl.x + wl.w)), ny = Math.max(wl.y, Math.min(ball.y, wl.y + wl.h));
        let ddx = ball.x - nx, ddy = ball.y - ny, d = Math.hypot(ddx, ddy);
        if (d < ball.r) {
          if (d < 1e-4) { ddx = 0; ddy = -1; d = 1; }
          const push = ball.r - d; ball.x += ddx / d * push; ball.y += ddy / d * push;
          const vn = ball.vx * ddx / d + ball.vy * ddy / d; ball.vx -= vn * ddx / d; ball.vy -= vn * ddy / d;   // slide, no bounce
        }
      }
      // keep inside the box (never flies off & resets) except dropping through the exit gap
      const inGap = ball.x > L.gap[0] && ball.x < L.gap[1];
      if (ball.x < ball.r) { ball.x = ball.r; if (ball.vx < 0) ball.vx = 0; }
      if (ball.x > 1 - ball.r) { ball.x = 1 - ball.r; if (ball.vx > 0) ball.vx = 0; }
      if (ball.y < ball.r) { ball.y = ball.r; if (ball.vy < 0) ball.vy = 0; }
      if (!inGap && ball.y > 1 - ball.r) { ball.y = 1 - ball.r; if (ball.vy > 0) ball.vy = 0; }
      if (inGap && ball.y - ball.r > 1.0) advance();
    }
    if (state === "win" && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) reset();

    // ---------- draw ----------
    g.fillStyle = "#0a0d16"; g.fillRect(0, 0, W, H);
    g.save(); g.translate(cx, cy); g.rotate(angle); g.translate(-size / 2, -size / 2); g.scale(size, size);
    g.fillStyle = "rgba(40,48,64,0.5)"; g.fillRect(0, 0, 1, 1);
    g.fillStyle = "#8a5a2b"; g.fillRect(L.gap[0], 1.0, L.gap[1] - L.gap[0], 0.12);   // exit chute / basket
    g.fillStyle = "#3b4658"; for (const wl of L.walls) g.fillRect(wl.x, wl.y, wl.w, wl.h);
    g.beginPath(); g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); g.fillStyle = "#6ad1ff"; g.fill();
    g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.3, 0, Math.PI * 2); g.fill();
    g.restore();

    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${16 * dpr}px Segoe UI`; g.fillText(`Maze ${level + 1}/${LEVELS.length}`, 14 * dpr, 26 * dpr);
    if (banner > 0 && state === "play") { g.textAlign = "center"; g.fillStyle = `rgba(106,209,255,${Math.min(1, banner)})`; g.font = `bold ${30 * dpr}px Segoe UI`; g.fillText("Level " + (level + 1), W / 2, 48 * dpr); }
    if (!hand && state === "play") { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("show your hand & tilt to roll the marble", W / 2, H - 16 * dpr); }
    if (state === "win") { g.fillStyle = "rgba(5,7,12,0.7)"; g.fillRect(0, 0, W, H); g.textAlign = "center"; g.fillStyle = "#54e08a"; g.font = `bold ${36 * dpr}px Segoe UI`; g.fillText("All Mazes Cleared! 🎉", W / 2, H / 2); g.fillStyle = "#8a93a6"; g.font = `${16 * dpr}px Segoe UI`; g.fillText("open your palm to play again", W / 2, H / 2 + 30 * dpr); }
    ctx.setTag(state === "win" ? "cleared!" : `maze ${level + 1}/${LEVELS.length}`);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}
