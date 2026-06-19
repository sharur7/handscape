// Crumble Paper experience.
// PINCH the sheet THREE times to crumple it up (it wrinkles more each time). On the
// 3rd pinch it's a ball in your hand — move and RELEASE to throw it in the dustbin.
import { sfx } from "../sfx.js";

export function createCrumblePaper(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let paper, score, shots, prevPinch, prevC, aimVX = 0, aimVY = 0;
  function newPaper() { paper = { x: 0.4, y: 0.42, vx: 0, vy: 0, crumple: 0, state: "flat" }; }
  function reset() { score = 0; shots = 0; prevPinch = false; prevC = null; newPaper(); }
  reset();
  ctx.setHint("<b>Pinch 3 times</b> to crumple the paper into a ball, then <b>flick your hand</b> to toss it in the bin.");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = Math.max(0.001, Math.min(frame.dt, 0.04)); fit();
    const W = screen.width, H = screen.height, G = 1.6 * H, dpr = Math.min(devicePixelRatio, 2);
    const cur = frame.cursor;
    const cpx = cur.present ? cur.x * W : 0, cpy = cur.present ? cur.y * H : 0;
    let cvx = 0, cvy = 0; if (cur.present && prevC) { cvx = (cpx - prevC.x) / dt; cvy = (cpy - prevC.y) / dt; }
    const bin = { x: W * 0.74, y: H * 0.62, w: W * 0.18, h: H * 0.3 }, floor = H * 0.92;
    const pinch = cur.present && cur.pinch;

    if (paper.state === "flat") {
      const near = Math.hypot((cur.x - paper.x) * W, (cur.y - paper.y) * H) < 0.13 * H;
      if (pinch && !prevPinch && near) {
        paper.crumple = Math.min(3, paper.crumple + 1); sfx.crumple();
        if (paper.crumple >= 3) { paper.state = "held"; paper.heldT = 0; aimVX = 0; aimVY = 0; }   // now a ball in your hand
      }
    }
    if (paper.state === "held") {                            // ball follows hand — FLICK to toss
      paper.x = cur.present ? cur.x : paper.x; paper.y = cur.present ? cur.y : paper.y;
      paper.heldT += dt;
      aimVX += (cvx - aimVX) * 0.25; aimVY += (cvy - aimVY) * 0.25;   // smoothed velocity = the aim preview
      // toss when the SMOOTHED flick is strong, and launch with that exact smoothed
      // velocity so the ball goes where the dotted arc shows (no random jitter).
      const aimSpeed = Math.hypot(aimVX, aimVY);
      if (paper.heldT > 0.4 && aimSpeed > 0.7 * W) { paper.state = "flying"; paper.fx = cpx; paper.fy = cpy; paper.vx = Math.max(-2.2 * W, Math.min(2.2 * W, aimVX)); paper.vy = Math.max(-2.6 * H, Math.min(0.6 * H, aimVY)); shots++; sfx.whoosh(0.25); }
    }
    if (paper.state === "flying") {
      paper.vy += G * dt; paper.fx += paper.vx * dt; paper.fy += paper.vy * dt;
      if (paper.vy > 0 && paper.fx > bin.x + bin.w * 0.15 && paper.fx < bin.x + bin.w * 0.85 && paper.fy > bin.y && paper.fy < bin.y + 30 * dpr) { score++; sfx.ding(740); newPaper(); }
      else if (paper.fy > floor) { sfx.thunk(); newPaper(); }
      else if (paper.fx < -40 || paper.fx > W + 40) newPaper();
    }
    prevPinch = pinch; prevC = cur.present ? { x: cpx, y: cpy } : null;

    // ---------- draw ----------
    g.fillStyle = "#101520"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1c2330"; g.fillRect(0, floor, W, H - floor);
    // bin
    g.fillStyle = "#3b4658"; g.beginPath(); g.moveTo(bin.x, bin.y); g.lineTo(bin.x + bin.w, bin.y); g.lineTo(bin.x + bin.w * 0.86, bin.y + bin.h); g.lineTo(bin.x + bin.w * 0.14, bin.y + bin.h); g.closePath(); g.fill();
    g.fillStyle = "#0a0d14"; g.beginPath(); g.ellipse(bin.x + bin.w / 2, bin.y, bin.w / 2, 8 * dpr, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#2a3242"; g.lineWidth = 3 * dpr; for (let i = 1; i < 4; i++) { const yy = bin.y + bin.h * i / 4; g.beginPath(); g.moveTo(bin.x + bin.w * 0.13, yy); g.lineTo(bin.x + bin.w * 0.87, yy); g.stroke(); }

    const px = paper.state === "flying" ? paper.fx : paper.x * W;
    const py = paper.state === "flying" ? paper.fy : paper.y * H;
    drawSheet(g, px, py, 0.07 * H, paper.crumple, dpr);
    // aim preview: dotted arc of where a flick right now would land
    if (paper.state === "held") {
      g.fillStyle = "rgba(255,210,120,0.7)"; let sx = px, sy = py, svx = aimVX, svy = aimVY;
      for (let i = 0; i < 30; i++) { svy += G * 0.05; sx += svx * 0.05; sy += svy * 0.05; if (i % 2 === 0) { g.beginPath(); g.arc(sx, sy, 3 * dpr, 0, Math.PI * 2); g.fill(); } if (sy > floor || sx > W + 20 || sx < -20) break; }
    }
    // on-paper prompt
    g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${13 * dpr}px Segoe UI`;
    if (paper.state === "flat") g.fillText(`crumple ${paper.crumple}/3`, px, py - 0.09 * H);
    else if (paper.state === "held") g.fillText("flick your hand to toss it!", px, py - 0.09 * H);

    if (cur.present) { g.beginPath(); g.arc(cpx, cpy, (pinch ? 7 : 10) * dpr, 0, Math.PI * 2); g.fillStyle = pinch ? "#ffd23f" : "rgba(255,255,255,0.35)"; g.fill(); }
    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${20 * dpr}px Segoe UI`; g.fillText(`In bin: ${score}`, 16 * dpr, 30 * dpr);
    g.textAlign = "right"; g.fillStyle = "#8a93a6"; g.font = `${14 * dpr}px Segoe UI`; g.fillText(`shots ${shots}`, W - 16 * dpr, 28 * dpr);
    ctx.setTag(`in bin ${score}`);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function drawSheet(g, x, y, r, crumple, dpr) {
  g.save(); g.translate(x, y);
  if (crumple === 0) {
    g.fillStyle = "#f3f0e6"; g.fillRect(-r, -r * 1.3, r * 2, r * 2.6);
    g.strokeStyle = "#c8c4b4"; g.lineWidth = 1 * dpr; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-r * 0.8, i * r * 0.4); g.lineTo(r * 0.8, i * r * 0.4); g.stroke(); }
  } else {
    const wrink = crumple, sides = 8 + crumple * 2;
    g.fillStyle = crumple >= 3 ? "#eceadf" : "#f0ede2"; g.beginPath();
    for (let i = 0; i < sides; i++) { const a = i / sides * Math.PI * 2, rr = r * (1 - crumple * 0.08) * (0.78 + Math.sin(i * 3.7 + crumple) * (0.1 + crumple * 0.05)); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(150,145,130,0.7)"; g.lineWidth = 1.2 * dpr;
    for (let i = 0; i < wrink * 3; i++) { g.beginPath(); g.moveTo((Math.random() - 0.5) * r, (Math.random() - 0.5) * r); g.lineTo((Math.random() - 0.5) * r, (Math.random() - 0.5) * r); g.stroke(); }
  }
  g.restore();
}
