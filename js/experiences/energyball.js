// Energy Ball experience.
// Hold BOTH hands up to charge a glowing orb between your palms — hold longer / wider
// to grow it. THRUST both hands quickly in a direction to launch it as a blast.
// One hand makes a small orb that follows you.

import { sfx } from "../sfx.js";

export function createEnergyBall(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let charge = 0, sparks = [], bolts = [], booms = [], elecT = 0;
  let prevMid = null, midVel = { x: 0, y: 0 };

  ctx.setHint("Hold <b>both hands</b> up to charge the orb, then <b>thrust</b> to launch it!");

  function fit() {
    const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2);
    if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; }
  }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04), t = frame.t;
    fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const hands = frame.hands.slice(0, 2).map(h => ({ x: h.landmarks[9].x * W, y: h.landmarks[9].y * H }));

    let orb = null;
    if (hands.length === 2) {
      const mid = { x: (hands[0].x + hands[1].x) / 2, y: (hands[0].y + hands[1].y) / 2 };
      const gap = Math.hypot(hands[0].x - hands[1].x, hands[0].y - hands[1].y);
      if (prevMid) { midVel.x = (mid.x - prevMid.x) / dt; midVel.y = (mid.y - prevMid.y) / dt; }
      prevMid = mid;
      charge = Math.min(3, charge + dt * 1.6);
      elecT -= dt; if (elecT <= 0) { sfx.electric(); elecT = 0.13 - charge * 0.025; }   // crackle, faster as it charges
      const r = 16 * dpr + charge * 26 * dpr + gap * 0.22;
      orb = { x: mid.x, y: mid.y, r };
      // launch on a fast thrust
      const speed = Math.hypot(midVel.x, midVel.y);
      if (speed > 1.5 * H && charge > 0.7) {
        const dx = midVel.x / speed, dy = midVel.y / speed;
        bolts.push({ x: mid.x, y: mid.y, vx: dx * Math.max(speed, 1.2 * H), vy: dy * Math.max(speed, 1.2 * H), r, life: 1.4 });
        charge = 0; prevMid = null; sfx.launch();
      }
    } else if (hands.length === 1) {
      charge = Math.max(0, charge - dt * 2); prevMid = null;
      orb = { x: hands[0].x, y: hands[0].y, r: 16 * dpr + charge * 10 * dpr };
    } else { charge = Math.max(0, charge - dt * 3); prevMid = null; }

    // spawn orbiting sparks
    if (orb) for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2; sparks.push({ x: orb.x + Math.cos(a) * orb.r, y: orb.y + Math.sin(a) * orb.r, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.5, ox: orb.x, oy: orb.y }); }
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 2; }
    sparks = sparks.filter(s => s.life > 0);

    for (const b of bolts) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      for (let i = 0; i < 2; i++) sparks.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.4 });
      if (b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50 || b.life <= 0) { boom(b); b._dead = true; }
    }
    bolts = bolts.filter(b => !b._dead);
    for (const p of booms) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.5; }
    booms = booms.filter(p => p.life > 0);

    // ---------- draw (additive glow) ----------
    g.fillStyle = "#04060c"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";

    for (const s of sparks) { g.globalAlpha = Math.max(0, s.life); g.fillStyle = "#9fe6ff"; g.beginPath(); g.arc(s.x, s.y, 2.5 * dpr, 0, Math.PI * 2); g.fill(); }
    for (const p of booms) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 3 * dpr, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;

    for (const b of bolts) glowOrb(g, b.x, b.y, b.r, t);
    if (orb) {
      glowOrb(g, orb.x, orb.y, orb.r, t);
      if (hands.length === 2) lightning(g, hands[0], hands[1], orb, dpr, t);
    }
    g.globalCompositeOperation = "source-over";

    // charge bar
    if (charge > 0.05) { g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(16 * dpr, H - 22 * dpr, 130 * dpr, 8 * dpr); g.fillStyle = "#6ad1ff"; g.fillRect(16 * dpr, H - 22 * dpr, (charge / 3) * 130 * dpr, 8 * dpr); }
    if (frame.hands.length < 2 && !bolts.length) { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${14 * dpr}px Segoe UI, sans-serif`; g.fillText("raise both hands to charge", W / 2, 30 * dpr); }

    ctx.setTag(bolts.length ? "blast!" : charge > 1.5 ? "charged" : frame.hands.length >= 2 ? "charging" : "ready");
  }

  function boom(b) { sfx.boom(); for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 400; booms.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: Math.random() < 0.5 ? "#9fe6ff" : "#ffffff" }); } }
  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function glowOrb(g, x, y, r, t) {
  const pulse = 1 + Math.sin(t * 12) * 0.06;
  const grad = g.createRadialGradient(x, y, 0, x, y, r * 2 * pulse);
  grad.addColorStop(0, "rgba(255,255,255,0.95)"); grad.addColorStop(0.25, "rgba(160,230,255,0.8)");
  grad.addColorStop(0.6, "rgba(80,150,255,0.35)"); grad.addColorStop(1, "rgba(80,150,255,0)");
  g.fillStyle = grad; g.beginPath(); g.arc(x, y, r * 2 * pulse, 0, Math.PI * 2); g.fill();
}
function lightning(g, a, b, orb, dpr, t) {
  for (const h of [a, b]) {
    g.strokeStyle = "rgba(180,230,255,0.7)"; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(h.x, h.y);
    const steps = 5;
    for (let i = 1; i < steps; i++) { const f = i / steps; const jx = (Math.random() - 0.5) * 20 * dpr, jy = (Math.random() - 0.5) * 20 * dpr; g.lineTo(h.x + (orb.x - h.x) * f + jx, h.y + (orb.y - h.y) * f + jy); }
    g.lineTo(orb.x, orb.y); g.stroke();
  }
}
