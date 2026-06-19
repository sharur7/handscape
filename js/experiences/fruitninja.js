// Fruit Ninja experience.
// Fruit is launched high toward the top — swipe your hand fast through it to slice.
// Clear 30 fruit to win. Miss 3 fruit OR slice a BOMB and it's game over.
// Open your palm on the end screen to play again.

const FRUITS = [
  { c: "#ff5a52", s: "#ff8b85" }, { c: "#ffb347", s: "#ffd08a" },
  { c: "#54e08a", s: "#8bf0b3" }, { c: "#b06aff", s: "#cfa0ff" }, { c: "#6ad1ff", s: "#a6e6ff" }
];
const TARGET = 30;
import { sfx } from "../sfx.js";

export function createFruitNinja(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let fruits, halves, juice, flash, trails, prevTip, score, lives, spawned, state, spawnT, prevPinch = false;
  function reset() {
    fruits = []; halves = []; juice = []; flash = 0;
    trails = [[], []]; prevTip = [null, null];
    score = 0; lives = 5; spawned = 0; state = "ready"; spawnT = 0.5;
  }
  function startGame() { fruits = []; halves = []; juice = []; score = 0; lives = 5; spawned = 0; spawnT = 0.5; state = "play"; }
  reset();

  ctx.setHint("<b>Swipe</b> fast through the fruit to slice it. Avoid the bombs · clear 30 to win!");

  function fit() {
    const w = mount.clientWidth, h = mount.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; }
  }

  function launch(W, H, bomb) {
    return {
      x: (0.3 + Math.random() * 0.4) * W, y: H + 40,
      vx: (Math.random() - 0.5) * 0.2 * W,
      vy: -(1.55 + Math.random() * 0.25) * H,    // high arc, near the ceiling
      r: (bomb ? 0.05 : 0.045 + Math.random() * 0.012) * H,
      rot: 0, vr: (Math.random() - 0.5) * 5, bomb, sliced: false
    };
  }

  function sliceFruit(fr, ang) {
    fr.sliced = true;
    const f = FRUITS[(Math.random() * FRUITS.length) | 0]; fr.f = f; score++; sfx.swish();
    for (let s = -1; s <= 1; s += 2)
      halves.push({ x: fr.x, y: fr.y, vx: fr.vx + Math.cos(ang + Math.PI / 2) * s * 200, vy: fr.vy - 60, r: fr.r, rot: fr.rot, vr: s * 5, f, side: s, ang });
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, sp = Math.random() * 240; juice.push({ x: fr.x, y: fr.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: f.c }); }
  }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04);
    fit();
    const W = screen.width, H = screen.height, G = 1.7 * H, dpr = Math.min(devicePixelRatio, 2);

    // blades from index fingertips
    const blades = [];
    frame.hands.forEach((hand, hi) => {
      if (hi > 1) return;
      const tip = hand.landmarks[8], p = { x: tip.x * W, y: tip.y * H }, prev = prevTip[hi];
      let speed = 0; if (prev) speed = Math.hypot(p.x - prev.x, p.y - prev.y) / dt;
      prevTip[hi] = p;
      const tr = trails[hi]; tr.push(p); if (tr.length > 10) tr.shift();
      if (speed > 0.8 * H && prev) blades.push({ a: prev, b: p, ang: Math.atan2(p.y - prev.y, p.x - prev.x) });
    });
    for (let i = 0; i < 2; i++) if (!frame.hands[i]) { prevTip[i] = null; if (trails[i].length) trails[i].shift(); }

    const startPinch = frame.cursor.present && frame.cursor.pinch;
    if (state === "ready" && startPinch && !prevPinch) startGame();
    prevPinch = startPinch;

    // spawn (only while we still owe fruit; bombs are extra)
    if (state === "play") {
      spawnT -= dt;
      if (spawnT <= 0 && spawned < TARGET) {
        const bomb = Math.random() < 0.16;
        fruits.push(launch(W, H, bomb));
        if (!bomb) spawned++;
        spawnT = Math.max(0.5, 0.95 - score * 0.012);
      }
    }

    // physics + slicing
    for (const fr of fruits) {
      if (fr.sliced) continue;
      fr.vy += G * dt; fr.x += fr.vx * dt; fr.y += fr.vy * dt; fr.rot += fr.vr * dt;
      if (state === "play") for (const bl of blades) if (segCircle(bl.a, bl.b, fr.x, fr.y, fr.r * 1.15)) {
        if (fr.bomb) { state = "over"; flash = 1; sfx.boom(); ctx.setHint("You sliced a bomb! Hold an <b>open palm</b> to retry."); }
        else sliceFruit(fr, bl.ang);
        break;
      }
      if (!fr.sliced && fr.y - fr.r > H && fr.vy > 0) { fr.dead = true; if (state === "play" && !fr.bomb) { lives--; if (lives <= 0) { state = "over"; ctx.setHint("Out of lives — hold an <b>open palm</b> to retry."); } } }
    }
    fruits = fruits.filter(fr => !fr.sliced && !fr.dead);

    for (const h of halves) { h.vy += G * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; }
    halves = halves.filter(h => h.y - h.r < H + 60);
    for (const j of juice) { j.vy += G * 0.4 * dt; j.x += j.vx * dt; j.y += j.vy * dt; j.life -= dt * 1.5; }
    juice = juice.filter(j => j.life > 0);
    if (flash > 0) flash -= dt * 1.5;

    // win
    if (state === "play" && spawned >= TARGET && fruits.length === 0) { state = "win"; sfx.chime(); ctx.setHint("All sliced! Hold an <b>open palm</b> to play again."); }

    // restart
    if ((state === "over" || state === "win") && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) reset();

    // ---------- draw ----------
    g.fillStyle = "#0a0d16"; g.fillRect(0, 0, W, H);
    for (const j of juice) { g.globalAlpha = Math.max(0, j.life); g.fillStyle = j.c; g.beginPath(); g.arc(j.x, j.y, 4 * dpr, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    for (const h of halves) drawHalf(g, h);
    for (const fr of fruits) fr.bomb ? drawBomb(g, fr, dpr) : drawWhole(g, fr);
    for (const tr of trails) {
      if (tr.length < 2) continue;
      g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 4 * dpr; g.lineCap = "round";
      g.shadowColor = "#6ad1ff"; g.shadowBlur = 16;
      g.beginPath(); g.moveTo(tr[0].x, tr[0].y); for (let i = 1; i < tr.length; i++) g.lineTo(tr[i].x, tr[i].y); g.stroke(); g.shadowBlur = 0;
    }
    if (flash > 0) { g.fillStyle = `rgba(255,120,40,${flash * 0.6})`; g.fillRect(0, 0, W, H); }

    // HUD
    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${20 * dpr}px Segoe UI, sans-serif`;
    g.fillText("Score " + score, 16 * dpr, 30 * dpr);
    g.textAlign = "center"; g.fillStyle = "#8a93a6"; g.font = `${15 * dpr}px Segoe UI, sans-serif`;
    g.fillText(`${spawned}/${TARGET} fruit`, W / 2, 28 * dpr);
    g.textAlign = "right"; g.fillStyle = "#ff6a6a"; g.font = `bold ${18 * dpr}px Segoe UI, sans-serif`;
    g.fillText("♥".repeat(Math.max(0, lives)), W - 16 * dpr, 30 * dpr);

    if (state === "ready") {
      g.fillStyle = "rgba(5,7,12,0.7)"; g.fillRect(0, 0, W, H);
      g.textAlign = "center"; g.fillStyle = "#e8edf6"; g.font = `bold ${36 * dpr}px Segoe UI, sans-serif`; g.fillText("Fruit Ninja 🍉", W / 2, H / 2 - 10 * dpr);
      g.fillStyle = "#54e08a"; g.font = `bold ${22 * dpr}px Segoe UI, sans-serif`; g.fillText("✊ Pinch to start", W / 2, H / 2 + 28 * dpr);
    }
    if (state === "over" || state === "win") {
      g.fillStyle = "rgba(5,7,12,0.72)"; g.fillRect(0, 0, W, H);
      g.textAlign = "center"; g.fillStyle = state === "win" ? "#54e08a" : "#ff6a6a";
      g.font = `bold ${40 * dpr}px Segoe UI, sans-serif`; g.fillText(state === "win" ? "You Win!" : "Game Over", W / 2, H / 2 - 8 * dpr);
      g.fillStyle = "#8a93a6"; g.font = `${17 * dpr}px Segoe UI, sans-serif`;
      g.fillText(`Score ${score} · open your palm to play again`, W / 2, H / 2 + 26 * dpr);
    }

    ctx.setTag(state === "win" ? "win!" : state === "over" ? "game over" : `score ${score}`);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function drawWhole(g, fr) {
  g.save(); g.translate(fr.x, fr.y); g.rotate(fr.rot);
  const f = fr.f || FRUITS[0];
  g.fillStyle = f.c; g.beginPath(); g.arc(0, 0, fr.r, 0, Math.PI * 2); g.fill();
  g.fillStyle = f.s; g.beginPath(); g.arc(-fr.r * 0.3, -fr.r * 0.3, fr.r * 0.35, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#3a2a14"; g.fillRect(-fr.r * 0.06, -fr.r * 1.15, fr.r * 0.12, fr.r * 0.3);
  g.restore();
}
function drawBomb(g, fr, dpr) {
  g.save(); g.translate(fr.x, fr.y); g.rotate(fr.rot);
  g.fillStyle = "#1a1d24"; g.beginPath(); g.arc(0, 0, fr.r, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#3a4150"; g.beginPath(); g.arc(-fr.r * 0.3, -fr.r * 0.3, fr.r * 0.3, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#c9a14a"; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(0, -fr.r); g.lineTo(fr.r * 0.3, -fr.r * 1.4); g.stroke();
  g.fillStyle = "#ff7a2a"; g.beginPath(); g.arc(fr.r * 0.3, -fr.r * 1.4, 3 * dpr, 0, Math.PI * 2); g.fill();
  g.restore();
}
function drawHalf(g, h) {
  g.save(); g.translate(h.x, h.y); g.rotate(h.ang);
  g.fillStyle = h.f.c; g.beginPath(); g.arc(0, 0, h.r, h.side > 0 ? -Math.PI / 2 : Math.PI / 2, h.side > 0 ? Math.PI / 2 : 3 * Math.PI / 2); g.closePath(); g.fill();
  g.fillStyle = "#ffffff"; g.globalAlpha = 0.5; g.fillRect(-1, -h.r, 2, h.r * 2); g.globalAlpha = 1; g.restore();
}
function segCircle(a, b, cx, cy, r) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
  let t = ((cx - a.x) * dx + (cy - a.y) * dy) / l2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(cx - (a.x + t * dx), cy - (a.y + t * dy)) < r;
}
