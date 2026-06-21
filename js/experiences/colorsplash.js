// Color Splash experience.
// A stencil sits on the paper. Move your hands to fling paint and PINCH for a big
// splash, paint only fills inside the stencil. Beat the timer, then the stencil
// lifts to reveal your artwork: "Wow!". Open palm for a new one.
import { sfx } from "../sfx.js";

const SHAPES = ["star", "heart", "circle", "diamond", "triangle", "flower"];
const ROUND = 20;

export function createColorSplash(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let blobs = [], prev = {}, prevPinch = {}, hue = Math.random() * 360, shape, timeLeft, state, wowT = 0, readyPrev = false;
  function reset() { blobs = []; shape = SHAPES[(Math.random() * SHAPES.length) | 0]; timeLeft = ROUND; state = "ready"; wowT = 0; }
  function startGame() { blobs = []; shape = SHAPES[(Math.random() * SHAPES.length) | 0]; timeLeft = ROUND; state = "play"; wowT = 0; }
  reset();
  ctx.setHint("Splash paint inside the stencil, move to streak, <b>pinch</b> for a big splash. Beat the clock!");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }
  function addBlob(x, y, r, c) { blobs.push({ x, y, r, c }); if (blobs.length > 3500) blobs.shift(); }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04); fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const cx = W / 2, cy = H / 2, s = Math.min(W, H) * 0.34;
    hue = (hue + dt * 80) % 360;

    const anyPinch = frame.hands.some(h => h.pinch.active);
    if (state === "ready") { if (anyPinch && !readyPrev) startGame(); }
    readyPrev = anyPinch;

    if (state === "play") {
      timeLeft -= dt;
      frame.hands.forEach((hand, hi) => {
        if (hi > 1) return;
        const p = { x: hand.landmarks[9].x * W, y: hand.landmarks[9].y * H }, pp = prev[hi];
        let speed = 0; if (pp) speed = Math.hypot(p.x - pp.x, p.y - pp.y) / dt;
        const color = `hsl(${(hue + hi * 130) % 360},85%,58%)`;
        if (speed > 0.12 * H) for (let k = 0; k < 3; k++) { const f = k / 3; addBlob(pp.x + (p.x - pp.x) * f, pp.y + (p.y - pp.y) * f, (8 + speed / H * 24) * dpr, color); }
        const pinch = hand.pinch.active;
        if (pinch && !prevPinch[hi]) { addBlob(p.x, p.y, (38 + Math.random() * 26) * dpr, color); for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, d = (10 + Math.random() * 50) * dpr; addBlob(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, (6 + Math.random() * 8) * dpr, color); } sfx.splat(); }
        prevPinch[hi] = pinch; prev[hi] = p;
      });
      for (let i = 0; i < 2; i++) if (!frame.hands[i]) { prev[i] = null; prevPinch[i] = false; }
      if (timeLeft <= 0) { timeLeft = 0; state = "reveal"; wowT = 0; sfx.chime(); }
    } else if (state === "reveal") { wowT += dt; if (frame.hands.some(h => h.openness > 0.7 && !h.pinch.active) && wowT > 1) reset(); }

    // ---------- draw ----------
    g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, W, H);                    // paper
    // paint clipped to the stencil
    g.save(); stencilPath(g, shape, cx, cy, s); g.clip();
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    for (const b of blobs) { g.fillStyle = b.c; g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // stencil outline (while painting and on the start screen)
    if (state === "play" || state === "ready") { g.strokeStyle = "#2a3242"; g.lineWidth = 3 * dpr; g.setLineDash([10 * dpr, 8 * dpr]); stencilPath(g, shape, cx, cy, s); g.stroke(); g.setLineDash([]); }

    for (const hand of frame.hands.slice(0, 2)) { const p = hand.landmarks[9]; g.beginPath(); g.arc(p.x * W, p.y * H, (hand.pinch.active ? 8 : 12) * dpr, 0, Math.PI * 2); g.strokeStyle = "rgba(0,0,0,0.4)"; g.lineWidth = 2 * dpr; g.stroke(); }

    if (state === "play") {
      const barW = W - 32 * dpr; g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(16 * dpr, 14 * dpr, barW, 8 * dpr);
      g.fillStyle = timeLeft < 5 ? "#ff6a6a" : "#54e08a"; g.fillRect(16 * dpr, 14 * dpr, barW * (timeLeft / ROUND), 8 * dpr);
      g.fillStyle = "#2a3242"; g.textAlign = "right"; g.font = `bold ${18 * dpr}px Segoe UI`; g.fillText(Math.ceil(timeLeft) + "s", W - 16 * dpr, 44 * dpr);
      if (!frame.hands.length) { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("show your hands to splash paint", W / 2, H - 18 * dpr); }
    } else if (state === "ready") {
      g.fillStyle = "#1a6fa0"; g.textAlign = "center"; g.font = `bold ${28 * dpr}px Segoe UI`; g.fillText("Splash Studio 🎨", cx, cy - s - 24 * dpr);
      g.fillStyle = "#2a7d3a"; g.font = `bold ${22 * dpr}px Segoe UI`; g.fillText("✊ Pinch to start", cx, cy + s + 40 * dpr);
    } else {
      g.fillStyle = "#1a6fa0"; g.textAlign = "center"; g.font = `bold ${Math.min(64, W / 9)}px Segoe UI`; g.fillText("Wow! 🎉", cx, cy - s - 24 * dpr);
      g.fillStyle = "#566173"; g.font = `${16 * dpr}px Segoe UI`; g.fillText("open your palm for a new stencil", cx, cy + s + 36 * dpr);
    }
    ctx.setTag(state === "ready" ? "ready" : state === "play" ? `${shape} · ${Math.ceil(timeLeft)}s` : "wow!");
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function stencilPath(g, type, cx, cy, s) {
  g.beginPath();
  if (type === "star") {
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath();
  } else if (type === "heart") {
    g.moveTo(cx, cy + s * 0.55);
    g.bezierCurveTo(cx + s * 1.1, cy - s * 0.4, cx + s * 0.45, cy - s * 0.95, cx, cy - s * 0.3);
    g.bezierCurveTo(cx - s * 0.45, cy - s * 0.95, cx - s * 1.1, cy - s * 0.4, cx, cy + s * 0.55);
    g.closePath();
  } else if (type === "circle") {
    g.arc(cx, cy, s, 0, Math.PI * 2);
  } else if (type === "diamond") {
    g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.78, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s * 0.78, cy); g.closePath();
  } else if (type === "triangle") {
    g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.92, cy + s * 0.7); g.lineTo(cx - s * 0.92, cy + s * 0.7); g.closePath();
  } else { // flower, 6 round petals around a centre, single smooth path per petal
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const px = cx + Math.cos(a) * s * 0.6, py = cy + Math.sin(a) * s * 0.6; g.moveTo(px + s * 0.42, py); g.arc(px, py, s * 0.42, 0, Math.PI * 2); }
    g.moveTo(cx + s * 0.42, cy); g.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
  }
}
