// Lightsaber experience.
// Show your RIGHT hand to ignite the blade (it points where your hand points). SWING
// it to slice the flying droids (it hums & swooshes). PINCH with your LEFT hand to
// cycle colour: blue → red → green.

const COLORS = [
  { core: "#dff6ff", glow: "#6ad1ff", name: "blue" },
  { core: "#ffd9d9", glow: "#ff4444", name: "red" },
  { core: "#dcffe6", glow: "#54e08a", name: "green" }
];

import { sfx } from "../sfx.js";

export function createLightsaber(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let actx = null, hum = null, humGain = null, vib = null;
  function ensureAudio() {
    if (actx) { if (actx.state === "suspended") actx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC();
    hum = actx.createOscillator(); hum.type = "sawtooth"; hum.frequency.value = 92;
    vib = actx.createOscillator(); vib.type = "sine"; vib.frequency.value = 5;
    const vibG = actx.createGain(); vibG.gain.value = 4; vib.connect(vibG); vibG.connect(hum.frequency);
    humGain = actx.createGain(); humGain.gain.value = 0;
    const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    hum.connect(lp); lp.connect(humGain); humGain.connect(actx.destination); hum.start(); vib.start();
  }
  function swoosh(intensity) {
    if (!actx) return; const t = actx.currentTime, dur = 0.25, n = actx.sampleRate * dur, b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = actx.createBufferSource(); s.buffer = b;
    const f = actx.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1600, t + dur); f.Q.value = 6;
    const gn = actx.createGain(); gn.gain.setValueAtTime(Math.min(0.4, intensity), t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(gn); gn.connect(actx.destination); s.start(t); s.stop(t + dur);
  }

  let blade = 0, colorI = 0, prevTip = null, swooshCool = 0, leftPrevPinch = false, ignited = false, music = null;
  let droids = [], halves = [], score = 0, spawnT = 0;

  ctx.setHint("Show your <b>right hand</b> to ignite. <b>Swing</b> to slice the droids. <b>Left pinch</b> = colour.");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }
  function pick(side, hands) { let h = hands.find(x => x.handedness === side); if (!h && hands.length) { const s = [...hands].sort((a, b) => a.landmarks[9].x - b.landmarks[9].x); h = side === "Left" ? s[0] : s[s.length - 1]; } return h; }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04), t = frame.t; fit();
    const W = screen.width, H = screen.height, G = 0.5 * H, dpr = Math.min(devicePixelRatio, 2);
    if (frame.hands.length) ensureAudio();
    if (frame.hands.length && !music) music = sfx.loop([196, 262, 294, 392, 330, 262, 294, 196], 150, "sawtooth", 0.05);
    if (swooshCool > 0) swooshCool -= dt;

    // saber = rightmost hand; colour = leftmost hand's pinch (deterministic by screen x)
    const sorted = [...frame.hands].sort((a, b) => a.landmarks[9].x - b.landmarks[9].x);
    const right = sorted.length ? sorted[sorted.length - 1] : null;
    const left = sorted.length >= 2 ? sorted[0] : null;
    const lp = left ? left.pinch.active : false;
    if (lp && !leftPrevPinch) colorI = (colorI + 1) % COLORS.length;
    leftPrevPinch = lp;

    blade += ((right ? 1 : 0) - blade) * Math.min(1, dt * 6);
    if (right && !ignited) { swoosh(0.3); ignited = true; } if (!right) ignited = false;

    let base = null, tip = null;
    if (blade > 0.02 && right) {
      const wrist = right.landmarks[0], palm = right.landmarks[9];
      const bx = palm.x * W, by = palm.y * H, dx = palm.x - wrist.x, dy = palm.y - wrist.y, d = Math.hypot(dx, dy) || 1;
      const len = blade * 0.5 * Math.min(W, H);
      base = { x: bx, y: by, dx: dx / d, dy: dy / d };
      tip = { x: bx + dx / d * len, y: by + dy / d * len };
      let speed = 0; if (prevTip) speed = Math.hypot(tip.x - prevTip.x, tip.y - prevTip.y) / dt; prevTip = tip;
      const inten = Math.min(1, speed / (1.6 * H));
      if (humGain) humGain.gain.setTargetAtTime(0.04 + inten * 0.12, actx.currentTime, 0.05);
      if (inten > 0.4 && swooshCool <= 0) { swoosh(inten * 0.4); swooshCool = 0.18; }
    } else { prevTip = null; if (humGain) humGain.gain.setTargetAtTime(0, actx ? actx.currentTime : 0, 0.1); }

    // spawn droids
    spawnT -= dt; if (spawnT <= 0 && droids.length < 5) { spawnT = 1.1; const fromL = Math.random() < 0.5; droids.push({ x: fromL ? -30 : W + 30, y: (0.2 + Math.random() * 0.5) * H, vx: (fromL ? 1 : -1) * (0.12 + Math.random() * 0.1) * W, vy: 0.04 * H, r: 0.045 * H, rot: 0 }); }
    for (const o of droids) { o.x += o.vx * dt; o.y += o.vy * dt; o.rot += dt; }
    // slice test
    if (base && tip) for (const o of droids) { if (!o.sliced && segCircle(base, tip, o.x, o.y, o.r)) { o.sliced = true; score++; if (swooshCool <= 0) { swoosh(0.5); swooshCool = 0.1; } for (const s of [-1, 1]) halves.push({ x: o.x, y: o.y, vx: base.dy * s * 200 + o.vx, vy: -base.dx * s * 200, r: o.r, rot: o.rot, vr: s * 6, side: s, c: COLORS[colorI].glow }); for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; halves.push({ x: o.x, y: o.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 0, life: 0.5, spark: true, c: "#ffd23f" }); } } }
    droids = droids.filter(o => !o.sliced && o.x > -60 && o.x < W + 60 && o.y < H + 60);
    for (const h of halves) { h.vy += G * dt; h.x += h.vx * dt; h.y += h.vy * dt; if (h.spark) h.life -= dt * 2; else h.rot += h.vr * dt; }
    halves = halves.filter(h => (h.spark ? h.life > 0 : h.y < H + 80));

    // ---------- draw ----------
    g.fillStyle = "#05060c"; g.fillRect(0, 0, W, H);
    for (const o of droids) drawDroid(g, o, dpr);
    for (const h of halves) { if (h.spark) { g.globalAlpha = Math.max(0, h.life); g.fillStyle = h.c; g.beginPath(); g.arc(h.x, h.y, 3 * dpr, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; } else { g.save(); g.translate(h.x, h.y); g.rotate(h.rot); g.fillStyle = "#7a8699"; g.beginPath(); g.arc(0, 0, h.r, h.side > 0 ? -Math.PI / 2 : Math.PI / 2, h.side > 0 ? Math.PI / 2 : 3 * Math.PI / 2); g.fill(); g.restore(); } }

    if (base && tip) {
      const col = COLORS[colorI];
      // short hilt
      g.strokeStyle = "#9aa3b2"; g.lineWidth = 12 * dpr; g.lineCap = "round";
      g.beginPath(); g.moveTo(base.x - base.dx * 26 * dpr, base.y - base.dy * 26 * dpr); g.lineTo(base.x, base.y); g.stroke();
      g.strokeStyle = "#3a4150"; g.lineWidth = 14 * dpr; g.beginPath(); g.moveTo(base.x - base.dx * 26 * dpr, base.y - base.dy * 26 * dpr); g.lineTo(base.x - base.dx * 18 * dpr, base.y - base.dy * 18 * dpr); g.stroke();
      // blade
      g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      g.strokeStyle = col.glow; g.lineWidth = 24 * dpr; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(tip.x, tip.y); g.stroke();
      g.lineWidth = 13 * dpr; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(tip.x, tip.y); g.stroke();
      g.strokeStyle = col.core; g.lineWidth = 5 * dpr; g.globalAlpha = 1; g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(tip.x, tip.y); g.stroke();
      g.fillStyle = col.core; g.beginPath(); g.arc(tip.x, tip.y, 5 * dpr, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = "source-over";
    } else { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${15 * dpr}px Segoe UI`; g.fillText("show your right hand to ignite the blade", W / 2, H / 2); }

    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${18 * dpr}px Segoe UI`; g.fillText("Sliced " + score, 16 * dpr, 28 * dpr);
    g.fillStyle = COLORS[colorI].glow; g.beginPath(); g.arc(W - 24 * dpr, 24 * dpr, 9 * dpr, 0, Math.PI * 2); g.fill();
    ctx.setTag(base ? COLORS[colorI].name + " · " + score : "off");
  }

  function resize() { fit(); }
  function dispose() { try { music?.stop(); humGain && (humGain.gain.value = 0); hum?.stop(); vib?.stop(); setTimeout(() => { try { actx?.close(); } catch {} }, 100); } catch {} screen.remove(); }
  return { update, resize, dispose };
}

function drawDroid(g, o, dpr) {
  g.save(); g.translate(o.x, o.y); g.rotate(Math.sin(o.rot) * 0.3);
  g.fillStyle = "#5b6678"; g.beginPath(); g.arc(0, 0, o.r, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2a3140"; g.beginPath(); g.arc(0, 0, o.r * 0.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ff5a52"; g.beginPath(); g.arc(0, 0, o.r * 0.25, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#3a4150"; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(-o.r, 0); g.lineTo(-o.r * 1.3, 0); g.moveTo(o.r, 0); g.lineTo(o.r * 1.3, 0); g.stroke();
  g.restore();
}
function segCircle(a, b, cx, cy, r) { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1; let t = ((cx - a.x) * dx + (cy - a.y) * dy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(cx - (a.x + t * dx), cy - (a.y + t * dy)) < r; }
