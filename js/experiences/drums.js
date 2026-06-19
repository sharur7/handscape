// Air Drums experience.
// Hit a pad with a quick DOWNWARD stab of your fingertip. Each pad is a drum/cymbal.

const PADS = [
  { name: "KICK", x: 0.5, y: 0.8, r: 0.15, c: "#ff5a72", type: "kick", kind: "drum" },
  { name: "SNARE", x: 0.26, y: 0.66, r: 0.1, c: "#ffb347", type: "snare", kind: "drum" },
  { name: "TOM", x: 0.74, y: 0.66, r: 0.1, c: "#54e08a", type: "tom", kind: "drum" },
  { name: "HAT", x: 0.15, y: 0.4, r: 0.1, c: "#ffd23f", type: "hat", kind: "cymbal" },
  { name: "CRASH", x: 0.85, y: 0.38, r: 0.12, c: "#e6c84d", type: "crash", kind: "cymbal" }
];

export function createDrums(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let audio = null;
  function ensureAudio() { if (!audio) { const AC = window.AudioContext || window.webkitAudioContext; audio = new AC(); } if (audio.state === "suspended") audio.resume(); }
  function noise(dur) { const n = audio.sampleRate * dur, buf = audio.createBuffer(1, n, audio.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const s = audio.createBufferSource(); s.buffer = buf; return s; }
  function hit(type) {
    ensureAudio(); const now = audio.currentTime;
    if (type === "kick") { const o = audio.createOscillator(), gn = audio.createGain(); o.frequency.setValueAtTime(150, now); o.frequency.exponentialRampToValueAtTime(45, now + 0.12); gn.gain.setValueAtTime(1, now); gn.gain.exponentialRampToValueAtTime(0.001, now + 0.25); o.connect(gn); gn.connect(audio.destination); o.start(now); o.stop(now + 0.3); }
    else if (type === "snare" || type === "hat" || type === "crash") { const dur = type === "crash" ? 0.5 : type === "snare" ? 0.2 : 0.05, s = noise(dur), f = audio.createBiquadFilter(), gn = audio.createGain(); f.type = "highpass"; f.frequency.value = type === "hat" ? 8000 : type === "crash" ? 5000 : 1500; gn.gain.setValueAtTime(type === "crash" ? 0.5 : 0.7, now); gn.gain.exponentialRampToValueAtTime(0.001, now + dur); s.connect(f); f.connect(gn); gn.connect(audio.destination); s.start(now); s.stop(now + dur); if (type === "snare") { const o = audio.createOscillator(), g2 = audio.createGain(); o.frequency.value = 180; g2.gain.setValueAtTime(0.4, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.15); o.connect(g2); g2.connect(audio.destination); o.start(now); o.stop(now + 0.15); } }
    else { const o = audio.createOscillator(), gn = audio.createGain(); o.frequency.setValueAtTime(220, now); o.frequency.exponentialRampToValueAtTime(90, now + 0.15); gn.gain.setValueAtTime(0.8, now); gn.gain.exponentialRampToValueAtTime(0.001, now + 0.3); o.connect(gn); gn.connect(audio.destination); o.start(now); o.stop(now + 0.3); }
  }

  const flash = new Float32Array(PADS.length); let prev = {};
  ctx.setHint("Stab a pad with a quick <b>downward</b> hit of your fingertip to play it.");
  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04); fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2), S = Math.min(W, H);
    const tips = []; frame.hands.forEach((hand, hi) => { if (hi > 1) return; [8, 12].forEach(f => tips.push({ id: hi * 10 + f, x: hand.landmarks[f].x * W, y: hand.landmarks[f].y * H })); });
    const seen = {};
    for (const tp of tips) {
      seen[tp.id] = true; const p = prev[tp.id], vy = p ? (tp.y - p.y) / dt : 0;
      for (let i = 0; i < PADS.length; i++) { const pd = PADS[i], cx = pd.x * W, cy = pd.y * H, r = pd.r * S, inside = Math.hypot(tp.x - cx, tp.y - cy) < r, wasIn = p && Math.hypot(p.x - cx, p.y - cy) < r; if (inside && !wasIn && vy > 0.5 * H) { hit(pd.type); flash[i] = 1; } }
      prev[tp.id] = { x: tp.x, y: tp.y };
    }
    for (const k in prev) if (!seen[k]) delete prev[k];
    for (let i = 0; i < flash.length; i++) flash[i] = Math.max(0, flash[i] - dt * 4);

    // ---------- draw ----------
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#11151f"); bg.addColorStop(1, "#0a0d16");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);

    for (let i = 0; i < PADS.length; i++) {
      const pd = PADS[i], cx = pd.x * W, cy = pd.y * H, r = pd.r * S, f = flash[i];
      // stand
      g.strokeStyle = "#3a4150"; g.lineWidth = 4 * dpr; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, H); g.stroke();
      if (pd.kind === "cymbal") {
        g.save(); g.translate(cx, cy); g.scale(1, 0.42);
        const grad = g.createRadialGradient(0, 0, 0, 0, 0, r); grad.addColorStop(0, "#fff2b0"); grad.addColorStop(1, pd.c);
        g.fillStyle = grad; g.beginPath(); g.arc(0, 0, r * (1 + f * 0.08), 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 1.5 * dpr; for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(0, 0, r * k / 3.5, 0, Math.PI * 2); g.stroke(); }
        g.fillStyle = "#8a7a2a"; g.beginPath(); g.arc(0, 0, r * 0.12, 0, Math.PI * 2); g.fill(); g.restore();
      } else {
        // drum: shell + head (top ellipse)
        g.fillStyle = "#1a1d24"; g.fillRect(cx - r, cy, r * 2, r * 0.7);
        g.save(); g.translate(cx, cy); g.scale(1, 0.5);
        const grad = g.createRadialGradient(0, -r * 0.2, 0, 0, 0, r); grad.addColorStop(0, "#fff"); grad.addColorStop(1, "#cfd6e2");
        g.fillStyle = grad; g.beginPath(); g.arc(0, 0, r * (1 + f * 0.05), 0, Math.PI * 2); g.fill();
        g.strokeStyle = pd.c; g.lineWidth = 5 * dpr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
        // lugs
        g.fillStyle = "#8a909c"; for (let a = 0; a < 8; a++) { g.beginPath(); g.arc(Math.cos(a / 8 * Math.PI * 2) * r, Math.sin(a / 8 * Math.PI * 2) * r, r * 0.08, 0, Math.PI * 2); g.fill(); }
        g.restore();
      }
      // hit ripple
      if (f > 0.02) { g.strokeStyle = `rgba(255,255,255,${f})`; g.lineWidth = 3 * dpr; g.save(); g.translate(cx, cy); g.scale(1, pd.kind === "cymbal" ? 0.42 : 0.5); g.beginPath(); g.arc(0, 0, r * (1 + (1 - f) * 0.5), 0, Math.PI * 2); g.stroke(); g.restore(); }
      g.fillStyle = "#e8edf6"; g.font = `bold ${12 * dpr}px Segoe UI`; g.textAlign = "center"; g.fillText(pd.name, cx, cy + (pd.kind === "cymbal" ? r * 0.5 : r * 0.5) + 16 * dpr);
    }
    for (const tp of tips) { g.beginPath(); g.arc(tp.x, tp.y, 9 * dpr, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,0.85)"; g.fill(); }
    if (!frame.hands.length) { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("show your hands & stab the drums", W / 2, 30 * dpr); }
    ctx.setTag(frame.hands.length ? "drumming" : "ready");
  }

  function resize() { fit(); }
  function dispose() { setTimeout(() => { try { audio?.close(); } catch {} }, 200); screen.remove(); }
  return { update, resize, dispose };
}
