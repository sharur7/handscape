// Magic Runes experience.
// PINCH and draw a shape in the air, then release to cast:
//   ○ circle  -> star shield      △ triangle -> fireball
//   ⚡ zigzag  -> lightning       , line/slash -> slash wave
// Shape is recognised with lightweight stroke heuristics.
import { sfx } from "../sfx.js";

export function createRunes(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let stroke = [], drawing = false, pen = null;
  let effects = [], label = "", labelT = 0;

  ctx.setHint("<b>Pinch</b> and draw: ○ circle · △ triangle · ⚡ zigzag ·, line. Release to cast!");

  function fit() {
    const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2);
    if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; }
  }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04), t = frame.t;
    fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const cur = frame.cursor;
    const s = cur.present ? (cur.strength || 0) : 0;
    const want = cur.present && (drawing ? s > 0.3 : s > 0.55);

    if (want) {
      if (!pen) pen = { x: cur.x, y: cur.y };
      pen.x += (cur.x - pen.x) * 0.5; pen.y += (cur.y - pen.y) * 0.5;
      if (!drawing) { drawing = true; stroke = []; }
      const p = { x: pen.x, y: pen.y };
      if (!stroke.length || Math.hypot(p.x - stroke[stroke.length - 1].x, p.y - stroke[stroke.length - 1].y) > 0.005) stroke.push(p);
    } else if (drawing) {
      drawing = false;
      if (stroke.length > 8) cast(recognize(stroke), stroke, W, H, dpr);
      stroke = []; pen = null;
    }

    // advance effects
    for (const e of effects) { e.age += dt; for (const p of e.parts) { p.vy += (e.grav || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * (e.fade || 1.2); } e.parts = e.parts.filter(p => p.life > 0); }
    effects = effects.filter(e => e.parts.length || e.age < e.dur);
    if (labelT > 0) labelT -= dt;

    // ---------- draw ----------
    g.fillStyle = "#06070d"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    for (const e of effects) for (const p of e.parts) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";

    // current stroke
    if (stroke.length > 1) {
      g.strokeStyle = "#9fe6ff"; g.lineWidth = 5 * dpr; g.lineCap = "round"; g.lineJoin = "round";
      g.shadowColor = "#6ad1ff"; g.shadowBlur = 16; g.beginPath();
      g.moveTo(stroke[0].x * W, stroke[0].y * H); for (let i = 1; i < stroke.length; i++) g.lineTo(stroke[i].x * W, stroke[i].y * H);
      g.stroke(); g.shadowBlur = 0;
    }

    if (labelT > 0) { g.globalAlpha = Math.min(1, labelT); g.fillStyle = "#fff"; g.textAlign = "center"; g.font = `bold ${34 * dpr}px Segoe UI, sans-serif`; g.fillText(label, W / 2, 60 * dpr); g.globalAlpha = 1; }
    if (cur.present) { g.beginPath(); g.arc((pen ? pen.x : cur.x) * W, (pen ? pen.y : cur.y) * H, (drawing ? 6 : 10) * dpr, 0, Math.PI * 2); g.fillStyle = drawing ? "#9fe6ff" : "rgba(255,255,255,0.4)"; g.fill(); }

    ctx.setTag(drawing ? "drawing rune…" : (labelT > 0 ? label.toLowerCase() : "ready"));
  }

  function cast(type, st, W, H, dpr) {
    ({ circle: () => sfx.chime(), triangle: () => sfx.boom(), lightning: () => sfx.zap(), slash: () => sfx.swish() }[type] || (() => {}))();
    const cx = st.reduce((s, p) => s + p.x, 0) / st.length * W;
    const cy = st.reduce((s, p) => s + p.y, 0) / st.length * H;
    const parts = [];
    if (type === "circle") {
      label = "✦ Star Shield";
      for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, sp = 180; parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.1, r: 3, c: i % 2 ? "#ffe070" : "#9fe6ff" }); }
      effects.push({ parts, age: 0, dur: 1.1, fade: 0.9 });
    } else if (type === "triangle") {
      label = "🔥 Fireball";
      for (let i = 0; i < 70; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2, sp = 80 + Math.random() * 260; parts.push({ x: cx + (Math.random() - 0.5) * 40, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, r: 3 + Math.random() * 3, c: Math.random() < 0.5 ? "#ff7a2a" : "#ffd23f" }); }
      effects.push({ parts, age: 0, dur: 1, grav: -200, fade: 1 });
    } else if (type === "lightning") {
      label = "⚡ Lightning";
      let x = cx + (Math.random() - 0.5) * 40, y = 0;
      while (y < cy) { const ny = y + 24 * dpr, nx = x + (Math.random() - 0.5) * 50 * dpr; for (let k = 0; k < 3; k++) parts.push({ x: x + (nx - x) * k / 3, y: y + (ny - y) * k / 3, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.6, r: 3, c: "#bfe9ff" }); x = nx; y = ny; }
      for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, sp = Math.random() * 300; parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.8, r: 3, c: "#ffffff" }); }
      effects.push({ parts, age: 0, dur: 0.8, fade: 1.4 });
    } else {
      label = "💨 Slash";
      const a = st[0], b = st[st.length - 1]; const ang = Math.atan2((b.y - a.y) * H, (b.x - a.x) * W);
      for (let i = 0; i < 50; i++) { const f = i / 50; const px = (a.x + (b.x - a.x) * f) * W, py = (a.y + (b.y - a.y) * f) * H; parts.push({ x: px, y: py, vx: Math.cos(ang + Math.PI / 2) * (Math.random() - 0.5) * 300, vy: Math.sin(ang + Math.PI / 2) * (Math.random() - 0.5) * 300, life: 0.7, r: 3, c: "#dfffff" }); }
      effects.push({ parts, age: 0, dur: 0.7, fade: 1.4 });
    }
    labelT = 1.4;
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

// ---- lightweight shape recognition ----
function recognize(raw) {
  const pts = resample(raw, 32);
  let path = 0; for (let i = 1; i < pts.length; i++) path += dist(pts[i], pts[i - 1]);
  const closed = dist(pts[0], pts[pts.length - 1]) / (path || 1);
  let absTurn = 0, corners = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const a1 = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
    const a2 = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
    let d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d;
    absTurn += d; if (d > 1.0) corners++;
  }
  if (closed < 0.28) {                 // shape returns near its start
    if (corners <= 1 && absTurn > 4.5) return "circle";
    return "triangle";
  }
  if (corners >= 2) return "lightning";
  return "slash";
}
function resample(pts, n) {
  let path = 0; for (let i = 1; i < pts.length; i++) path += dist(pts[i], pts[i - 1]);
  const step = path / (n - 1), out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let d = dist(pts[i], pts[i - 1]);
    while (acc + d >= step && out.length < n) {
      const r = (step - acc) / d; const np = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * r, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * r };
      out.push(np); pts.splice(i, 0, np); d = dist(pts[i], pts[i - 1]); acc = 0;
    }
    acc += d;
  }
  while (out.length < n) out.push(pts[pts.length - 1]);
  return out;
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
