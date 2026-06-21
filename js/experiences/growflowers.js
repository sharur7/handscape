// Bloom Garden experience.
// PINCH with your RIGHT hand to sow a seed wherever you pinch. PINCH with your LEFT
// hand to grow every seed a stage, sprout, stem, then a blooming flower.
import { sfx } from "../sfx.js";

const PALETTE = ["#ff5a72", "#ffb347", "#ff6ad1", "#b06aff", "#6ad1ff", "#ffd23f", "#54e08a"];

export function createGrowFlowers(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let seeds = [], rPrev = false, lPrev = false;
  function reset() { seeds = []; rPrev = false; lPrev = false; }
  reset();
  ctx.setHint("<b>Right-hand pinch</b> to sow a seed anywhere · <b>left-hand pinch</b> to grow them all.");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04), t = frame.t; fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const hands = frame.hands;

    // role is fixed to which hand it actually is: your RIGHT hand always sows, your
    // LEFT hand always blooms, works with one hand or two. A hand is Right xor Left,
    // so the same hand can never do both.
    const rightHand = hands.find(h => h.handedness === "Right") || null;
    const leftHand = hands.find(h => h.handedness === "Left") || null;

    // right pinch = sow at pinch point
    const rp = rightHand ? rightHand.pinch.active : false;
    if (rp && !rPrev && seeds.length < 40) { seeds.push({ x: rightHand.pinch.x, y: rightHand.pinch.y, g: 0, c: PALETTE[(Math.random() * PALETTE.length) | 0], sway: Math.random() * 6 }); sfx.pluck(300); }
    rPrev = rp;
    // left pinch = grow all
    const lp = leftHand ? leftHand.pinch.active : false;
    if (lp && !lPrev && seeds.length) { for (const s of seeds) s.target = Math.min(1, (s.target || 0) + 0.25); sfx.note(560, 0.3); }
    lPrev = lp;
    for (const s of seeds) s.g += (((s.target || 0)) - s.g) * Math.min(1, dt * 6);

    // ---------- draw ----------
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#0e1626"); sky.addColorStop(1, "#0a0d16");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (const s of seeds) drawFlower(g, s, W, H, t, dpr);

    // hand markers (labels offset so they don't collide)
    if (rightHand) hint(g, rightHand.pinch.x * W, rightHand.pinch.y * H, "#54e08a", "SOW", -22 * dpr, dpr);
    if (leftHand) hint(g, leftHand.pinch.x * W, leftHand.pinch.y * H, "#ff6ad1", "BLOOM", 30 * dpr, dpr);
    if (!hands.length) { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("right pinch = sow seeds · left pinch = bloom", W / 2, 30 * dpr); }
    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${16 * dpr}px Segoe UI`; g.fillText(`Seeds ${seeds.length}`, 14 * dpr, 26 * dpr);
    ctx.setTag(`${seeds.length} seeds`);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function hint(g, x, y, c, label, off, dpr) { g.beginPath(); g.arc(x, y, 12 * dpr, 0, Math.PI * 2); g.strokeStyle = c; g.lineWidth = 3 * dpr; g.stroke(); g.fillStyle = c; g.font = `bold ${12 * dpr}px Segoe UI`; g.textAlign = "center"; g.fillText(label, x, y + off); }

function drawFlower(g, s, W, H, t, dpr, ) {
  const bx = s.x * W + Math.sin(t + s.sway) * 3 * dpr, by = s.y * H;
  if (s.g < 0.02) { g.fillStyle = "#7a5a3a"; g.beginPath(); g.ellipse(bx, by, 5 * dpr, 4 * dpr, 0, 0, Math.PI * 2); g.fill(); return; }   // seed
  const topY = by - s.g * 0.32 * H;
  g.strokeStyle = "#2f7d3a"; g.lineWidth = 5 * dpr; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.sin(t) * 8 * dpr, (by + topY) / 2, bx, topY); g.stroke();
  if (s.g > 0.35) { g.fillStyle = "#3a9c4a"; g.beginPath(); g.ellipse(bx + 12 * dpr, (by + topY) / 2, 14 * dpr, 6 * dpr, -0.6, 0, Math.PI * 2); g.fill(); }
  const bloom = Math.max(0, (s.g - 0.4) / 0.6), r = (6 + s.g * 18) * dpr;
  g.save(); g.translate(bx, topY);
  for (let i = 0; i < 8; i++) { g.rotate(Math.PI * 2 / 8); g.fillStyle = s.c; g.beginPath(); g.ellipse(0, -r * (0.6 + bloom * 0.9), r * 0.5, r * (0.35 + bloom * 0.7), 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = bloom > 0.2 ? "#ffd23f" : "#3a9c4a"; g.beginPath(); g.arc(0, 0, r * 0.55, 0, Math.PI * 2); g.fill();
  g.restore();
}
