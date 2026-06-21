// Marble Maze experience.
// TILT your hand to rotate the maze; gravity rolls the marble gently through the gaps.
// 2 mazes: a serpentine, then a circular ring-maze. Open palm to restart.
import { sfx } from "../sfx.js";

const TH = 0.05;
const border = (gapLo, gapHi) => [
  { x: 0, y: 0, w: 1, h: TH }, { x: 0, y: 0, w: TH, h: 1 }, { x: 1 - TH, y: 0, w: TH, h: 1 },
  { x: 0, y: 1 - TH, w: gapLo, h: TH }, { x: gapHi, y: 1 - TH, w: 1 - gapHi, h: TH }
];

const LEVELS = [
  // 1) serpentine, roll down through alternating gaps; ends bottom-left into a WIDE exit
  //    that sits right where the ball lands (no dead-end pocket, no far-off chute)
  { type: "rect", start: { x: 0.12, y: 0.1 }, gap: [0, 0.3], walls: [...border(0, 0.3),
    { x: 0, y: 0.24, w: 0.78, h: TH }, { x: 0.22, y: 0.42, w: 0.78, h: TH }, { x: 0, y: 0.6, w: 0.78, h: TH }, { x: 0.22, y: 0.78, w: 0.78, h: TH }] },
  // 2) circular, start in the centre, thread out through 4 rings; gaps alternate sides
  //    and are narrower, so you have to keep rotating back and forth to line each one up
  { type: "circle", start: { x: 0.5, y: 0.5 }, escapeR: 0.49, ht: 0.018,
    rings: [
      { R: 0.13, gapA: Math.PI / 2 + 1.2, gapHalf: 0.7 },    // right
      { R: 0.23, gapA: Math.PI / 2 - 1.2, gapHalf: 0.7 },    // left
      { R: 0.33, gapA: Math.PI / 2 + 0.4, gapHalf: 0.62 },   // lower-right
      { R: 0.43, gapA: Math.PI / 2 - 1.4, gapHalf: 0.62 }    // far left
    ] }
];

const wrapPi = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

export function createMaze(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let level, ball, angle, state, banner;
  function load(i) { const L = LEVELS[i]; ball = { x: L.start.x, y: L.start.y, vx: 0, vy: 0, r: 0.026 }; banner = 1.5; }
  const PLAY_HINT = "<b>Tilt your hand</b> to rotate the maze and roll the marble out. 2 mazes, a serpentine, then a circular one!";
  function reset() { level = 0; angle = 0; state = "play"; load(0); ctx.setHint(PLAY_HINT); }
  reset();

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }
  function advance() { sfx.chime(); if (level + 1 >= LEVELS.length) { state = "win"; ctx.setHint("Both mazes cleared! Hold an <b>open palm</b> to play again."); } else { level++; load(level); } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.03); fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const size = Math.min(W, H) * 0.84, cx = W / 2, cy = H / 2, L = LEVELS[level];
    if (banner > 0) banner -= dt;

    const hand = frame.hands[0];
    // gentle, controllable tilt, small, clamped, smoothly followed (no slamming to the edge)
    const targetA = hand ? Math.max(-1.7, Math.min(1.7, (hand.rotation + Math.PI / 2) * 2.0)) : 0;
    angle += (targetA - angle) * Math.min(1, dt * 8);

    if (state === "play") {
      const G = 3.0, dn = { x: Math.sin(angle) * G, y: Math.cos(angle) * G };
      ball.vx += dn.x * dt; ball.vy += dn.y * dt; ball.vx *= 0.985; ball.vy *= 0.985;
      const sp = Math.hypot(ball.vx, ball.vy), MAX = 1.0; if (sp > MAX) { ball.vx *= MAX / sp; ball.vy *= MAX / sp; }  // low cap → never tunnels or rockets
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;

      if (L.type === "rect") {
        for (const wl of L.walls) {
          const nx = Math.max(wl.x, Math.min(ball.x, wl.x + wl.w)), ny = Math.max(wl.y, Math.min(ball.y, wl.y + wl.h));
          let ddx = ball.x - nx, ddy = ball.y - ny, d = Math.hypot(ddx, ddy);
          if (d < ball.r) {
            if (d < 1e-4) { ddx = 0; ddy = -1; d = 1; }
            const push = ball.r - d; ball.x += ddx / d * push; ball.y += ddy / d * push;
            const vn = ball.vx * ddx / d + ball.vy * ddy / d; ball.vx -= vn * ddx / d; ball.vy -= vn * ddy / d;   // slide, no bounce
          }
        }
        const inGap = ball.x > L.gap[0] && ball.x < L.gap[1];
        if (ball.x < ball.r) { ball.x = ball.r; if (ball.vx < 0) ball.vx = 0; }
        if (ball.x > 1 - ball.r) { ball.x = 1 - ball.r; if (ball.vx > 0) ball.vx = 0; }
        if (ball.y < ball.r) { ball.y = ball.r; if (ball.vy < 0) ball.vy = 0; }
        if (!inGap && ball.y > 1 - ball.r) { ball.y = 1 - ball.r; if (ball.vy > 0) ball.vy = 0; }
        if (inGap && ball.y - ball.r > 1.0) advance();
      } else {  // circular rings
        for (const ring of L.rings) {
          const dx = ball.x - 0.5, dy = ball.y - 0.5, dist = Math.hypot(dx, dy) || 1e-4;
          const ang = Math.atan2(dy, dx);
          if (Math.abs(wrapPi(ang - ring.gapA)) < ring.gapHalf) continue;   // lined up with the gap → pass through
          if (dist > ring.R - L.ht - ball.r && dist < ring.R + L.ht + ball.r) {
            const nx = dx / dist, ny = dy / dist;
            const target = dist < ring.R ? ring.R - L.ht - ball.r : ring.R + L.ht + ball.r;
            ball.x = 0.5 + nx * target; ball.y = 0.5 + ny * target;
            const vr = ball.vx * nx + ball.vy * ny; ball.vx -= vr * nx; ball.vy -= vr * ny;   // slide along the ring
          }
        }
        if (Math.hypot(ball.x - 0.5, ball.y - 0.5) > L.escapeR) advance();
      }
    }
    if (state === "win" && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) reset();

    // ---------- draw ----------
    g.fillStyle = "#0a0d16"; g.fillRect(0, 0, W, H);
    g.save(); g.translate(cx, cy); g.rotate(angle); g.translate(-size / 2, -size / 2); g.scale(size, size);
    g.fillStyle = "rgba(40,48,64,0.5)"; g.fillRect(0, 0, 1, 1);

    if (L.type === "rect") {
      g.fillStyle = "#8a5a2b"; g.fillRect(L.gap[0], 1.0, L.gap[1] - L.gap[0], 0.12);   // exit chute
      g.fillStyle = "#3b4658"; for (const wl of L.walls) g.fillRect(wl.x, wl.y, wl.w, wl.h);
    } else {
      g.strokeStyle = "rgba(106,209,255,0.25)"; g.lineWidth = 0.006; g.setLineDash([0.02, 0.02]); g.beginPath(); g.arc(0.5, 0.5, L.escapeR, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      g.strokeStyle = "#3b4658"; g.lineWidth = L.ht * 2; g.lineCap = "round";
      for (const ring of L.rings) { g.beginPath(); g.arc(0.5, 0.5, ring.R, ring.gapA + ring.gapHalf, ring.gapA - ring.gapHalf + Math.PI * 2); g.stroke(); }
      g.fillStyle = "#54e08a"; g.beginPath(); g.arc(0.5, 0.5, 0.012, 0, Math.PI * 2); g.fill();   // centre start dot
    }

    g.beginPath(); g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); g.fillStyle = "#6ad1ff"; g.fill();
    g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.3, 0, Math.PI * 2); g.fill();
    g.restore();

    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${16 * dpr}px Segoe UI`; g.fillText(`Maze ${level + 1}/${LEVELS.length}`, 14 * dpr, 26 * dpr);
    if (banner > 0 && state === "play") { g.textAlign = "center"; g.fillStyle = `rgba(106,209,255,${Math.min(1, banner)})`; g.font = `bold ${30 * dpr}px Segoe UI`; g.fillText(level === 0 ? "Serpentine" : "Circular", W / 2, 48 * dpr); }
    if (!hand && state === "play") { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("show your hand & tilt to roll the marble", W / 2, H - 16 * dpr); }
    if (state === "win") { g.fillStyle = "rgba(5,7,12,0.7)"; g.fillRect(0, 0, W, H); g.textAlign = "center"; g.fillStyle = "#54e08a"; g.font = `bold ${36 * dpr}px Segoe UI`; g.fillText("Both Mazes Cleared! 🎉", W / 2, H / 2); g.fillStyle = "#8a93a6"; g.font = `${16 * dpr}px Segoe UI`; g.fillText("open your palm to play again", W / 2, H / 2 + 30 * dpr); }
    ctx.setTag(state === "win" ? "cleared!" : `maze ${level + 1}/${LEVELS.length}`);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}
