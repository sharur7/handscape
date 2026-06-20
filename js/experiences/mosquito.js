// Mosquito Smash experience.
// A fly-swatter follows your hand. CLOSE YOUR FIST over a mosquito to swat it.
// Get as many as you can in 45 seconds. Pinch to start.
import { sfx } from "../sfx.js";

const ROUND = 45;

export function createMosquito(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let bugs, splats, score, timeLeft, state, spawnT, prevFist, swatFx, prevPinch;
  function reset() { bugs = []; splats = []; score = 0; timeLeft = ROUND; state = "ready"; spawnT = 0.4; prevFist = false; swatFx = 0; prevPinch = false; }
  function startGame() { bugs = []; splats = []; score = 0; timeLeft = ROUND; spawnT = 0.4; state = "play"; }
  reset();
  ctx.setHint("A swatter follows your hand — <b>close your fist</b> over a mosquito to smash it!");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }
  function spawn(W, H) { bugs.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.5 * W, vy: (Math.random() - 0.5) * 0.5 * H, ph: Math.random() * 10 }); }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04), t = frame.t; fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2), S = Math.min(W, H);
    if (swatFx > 0) swatFx -= dt * 3;

    const startPinch = frame.cursor.present && frame.cursor.pinch;
    if (state === "ready" && startPinch && !prevPinch) startGame();
    prevPinch = startPinch;

    if (state === "play") {
      timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; state = "over"; ctx.setHint("Time! Hold an <b>open palm</b> to play again."); }
      spawnT -= dt; if (spawnT <= 0) { spawn(W, H); spawnT = Math.max(0.5, 1.4 - score * 0.03); }
    }

    // swatter at the hand; CLOSE FIST to swat
    const hand = frame.hands[0];
    const head = hand ? { x: hand.landmarks[9].x * W, y: hand.landmarks[9].y * H } : null;
    const fist = hand ? hand.openness < 0.35 : false;
    const R = 0.12 * S;
    if (state === "play" && head && fist && !prevFist) {
      let killed = 0;
      bugs = bugs.filter(b => { const hit = Math.hypot(b.x - head.x, b.y - head.y) < R; if (hit) { splats.push({ x: b.x, y: b.y, r: 14 * dpr, life: 1 }); killed++; } return !hit; });
      score += killed; swatFx = 1; killed ? sfx.splat() : sfx.swish();
    }
    prevFist = fist;

    for (const b of bugs) {
      b.vx += (Math.random() - 0.5) * 0.4 * W * dt; b.vy += (Math.random() - 0.5) * 0.4 * H * dt;
      const sp = Math.hypot(b.vx, b.vy), max = 0.5 * S; if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 10) { b.x = 10; b.vx = Math.abs(b.vx); } if (b.x > W - 10) { b.x = W - 10; b.vx = -Math.abs(b.vx); }
      if (b.y < 10) { b.y = 10; b.vy = Math.abs(b.vy); } if (b.y > H - 10) { b.y = H - 10; b.vy = -Math.abs(b.vy); }
    }
    for (const s of splats) s.life -= dt * 0.6; splats = splats.filter(s => s.life > 0);
    if (state === "over" && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) reset();

    // ---------- draw ----------
    g.fillStyle = "#0c1018"; g.fillRect(0, 0, W, H);
    for (const s of splats) { g.globalAlpha = Math.max(0, s.life); g.fillStyle = "#3a4150"; g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill(); g.fillStyle = "#ff6a6a"; g.beginPath(); g.arc(s.x, s.y, s.r * 0.4, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    for (const b of bugs) drawBug(g, b, t, dpr);
    if (head) drawSwatter(g, head.x, head.y, R, fist, swatFx, dpr);

    const barW = W - 32 * dpr;
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(16 * dpr, 14 * dpr, barW, 8 * dpr);
    g.fillStyle = timeLeft < 8 ? "#ff6a6a" : "#54e08a"; g.fillRect(16 * dpr, 14 * dpr, barW * (timeLeft / ROUND), 8 * dpr);
    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${18 * dpr}px Segoe UI`; g.fillText("Splats " + score, 16 * dpr, 44 * dpr);
    g.textAlign = "right"; g.fillText(Math.ceil(timeLeft) + "s", W - 16 * dpr, 44 * dpr);

    if (state === "ready") { g.fillStyle = "rgba(5,7,12,0.7)"; g.fillRect(0, 0, W, H); g.textAlign = "center"; g.fillStyle = "#e8edf6"; g.font = `bold ${32 * dpr}px Segoe UI`; g.fillText("Mosquito Smash 🪰", W / 2, H / 2 - 14 * dpr); g.fillStyle = "#8a93a6"; g.font = `${15 * dpr}px Segoe UI`; g.fillText("close your fist over a mosquito to swat it", W / 2, H / 2 + 14 * dpr); g.fillStyle = "#54e08a"; g.font = `bold ${22 * dpr}px Segoe UI`; g.fillText("✊ Pinch to start", W / 2, H / 2 + 48 * dpr); }
    if (state === "over") { g.fillStyle = "rgba(5,7,12,0.72)"; g.fillRect(0, 0, W, H); g.textAlign = "center"; g.fillStyle = "#54e08a"; g.font = `bold ${38 * dpr}px Segoe UI`; g.fillText("Time's Up!", W / 2, H / 2 - 6 * dpr); g.fillStyle = "#8a93a6"; g.font = `${16 * dpr}px Segoe UI`; g.fillText(`${score} splatted · open your palm to replay`, W / 2, H / 2 + 26 * dpr); }

    ctx.setTag(state === "ready" ? "ready" : state === "over" ? "time up" : `splats ${score} · ${Math.ceil(timeLeft)}s`);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function drawSwatter(g, x, y, R, fist, fx, dpr) {
  g.save(); g.translate(x, y);
  const rw = R * 1.05, rh = R * 1.28, active = fist;
  // handle + grip below the head (bug-zapper racket)
  g.strokeStyle = "#2a2420"; g.lineWidth = 11 * dpr; g.lineCap = "round"; g.beginPath(); g.moveTo(0, rh * 0.92); g.lineTo(0, rh * 0.92 + R * 1.2); g.stroke();
  g.strokeStyle = active ? "#ff6a6a" : "#ffd23f"; g.lineWidth = 6 * dpr; g.beginPath(); g.moveTo(0, rh * 0.96); g.lineTo(0, rh * 0.96 + R * 1.1); g.stroke();
  g.fillStyle = "#2a2420"; g.beginPath(); g.ellipse(0, rh * 0.9, 8 * dpr, 5 * dpr, 0, 0, Math.PI * 2); g.fill();   // neck joint
  // oval head: mesh inside a frame
  g.save(); g.beginPath(); g.ellipse(0, 0, rw - 4 * dpr, rh - 4 * dpr, 0, 0, Math.PI * 2); g.clip();
  g.fillStyle = active ? "rgba(255,120,120,0.22)" : "rgba(106,209,255,0.12)"; g.fillRect(-rw, -rh, rw * 2, rh * 2);
  g.strokeStyle = active ? "rgba(255,150,150,0.6)" : "rgba(160,195,235,0.4)"; g.lineWidth = 1.2 * dpr;
  for (let gx = -rw; gx <= rw; gx += R * 0.22) { g.beginPath(); g.moveTo(gx, -rh); g.lineTo(gx, rh); g.stroke(); }
  for (let gy = -rh; gy <= rh; gy += R * 0.22) { g.beginPath(); g.moveTo(-rw, gy); g.lineTo(rw, gy); g.stroke(); }
  g.restore();
  g.strokeStyle = active ? "#ff6a6a" : "#3a4150"; g.lineWidth = 8 * dpr; g.beginPath(); g.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2); g.stroke();   // frame
  if (fx > 0) { g.globalAlpha = fx; g.strokeStyle = "#fff"; g.lineWidth = 4 * dpr; g.beginPath(); g.ellipse(0, 0, rw + (1 - fx) * 22 * dpr, rh + (1 - fx) * 22 * dpr, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
  g.restore();
}
function drawBug(g, b, t, dpr) {
  g.save(); g.translate(b.x, b.y);
  const flap = Math.sin(t * 40 + b.ph) * 0.5 + 0.5;
  g.fillStyle = "rgba(200,220,255,0.5)";
  g.beginPath(); g.ellipse(-6 * dpr, -6 * dpr, 9 * dpr, (3 + flap * 4) * dpr, -0.6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(6 * dpr, -6 * dpr, 9 * dpr, (3 + flap * 4) * dpr, 0.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#1a1d24"; g.beginPath(); g.ellipse(0, 0, 4 * dpr, 8 * dpr, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(0, -8 * dpr, 3.5 * dpr, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(80,90,110,0.8)"; g.lineWidth = 1 * dpr;
  for (const s of [-1, 1]) for (const o of [0, 3, 6]) { g.beginPath(); g.moveTo(0, o * dpr); g.lineTo(s * 9 * dpr, (o + 6) * dpr); g.stroke(); }
  g.restore();
}
