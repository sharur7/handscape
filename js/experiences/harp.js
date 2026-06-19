// Air Harp experience.
// Sweep your fingertips across the strings to pluck them. Each string is a note.

const FREQS = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];

export function createHarp(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let audio = null, master = null;
  function ensureAudio() { if (!audio) { const AC = window.AudioContext || window.webkitAudioContext; audio = new AC(); master = audio.createGain(); master.gain.value = 0.5; master.connect(audio.destination); } if (audio.state === "suspended") audio.resume(); }
  function pluck(i) {
    ensureAudio();
    const o = audio.createOscillator(), gn = audio.createGain();
    o.type = "triangle"; o.frequency.value = FREQS[i];
    gn.gain.setValueAtTime(0.0001, audio.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.6, audio.currentTime + 0.008);
    gn.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 1.4);
    o.connect(gn); gn.connect(master); o.start(); o.stop(audio.currentTime + 1.5);
    vib[i] = 1; vdir[i] = Math.random() < 0.5 ? 1 : -1;
  }

  const N = FREQS.length, vib = new Float32Array(N), vdir = new Float32Array(N);
  const TIPS = [8, 12]; let prev = {};

  ctx.setHint("Sweep your <b>fingertips</b> across the strings to pluck them.");
  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04); fit();
    const W = screen.width, H = screen.height, t = frame.t, dpr = Math.min(devicePixelRatio, 2);
    const pad = 0.08, span = 1 - pad * 2;
    const stringX = i => (pad + span * (i / (N - 1)));

    // fingertips -> crossings
    const tips = [];
    frame.hands.forEach((hand, hi) => { if (hi > 1) return; for (const f of TIPS) tips.push({ id: hi * 2 + f, x: hand.landmarks[f].x, y: hand.landmarks[f].y }); });
    const seen = {};
    for (const tp of tips) {
      seen[tp.id] = true; const p = prev[tp.id];
      if (p) for (let i = 0; i < N; i++) { const sx = stringX(i); if ((p.x - sx) * (tp.x - sx) < 0) pluck(i); }
      prev[tp.id] = { x: tp.x, y: tp.y };
    }
    for (const k in prev) if (!seen[k]) delete prev[k];
    for (let i = 0; i < N; i++) vib[i] = Math.max(0, vib[i] - dt * 1.5);

    // ---------- draw ----------
    g.fillStyle = "#0a0d16"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < N; i++) {
      const x = stringX(i) * W, amp = vib[i] * 18 * dpr * vdir[i];
      g.strokeStyle = vib[i] > 0.05 ? "#9fe6ff" : "rgba(140,170,210,0.5)"; g.lineWidth = (vib[i] > 0.05 ? 3 : 1.5) * dpr;
      if (vib[i] > 0.05) { g.shadowColor = "#6ad1ff"; g.shadowBlur = 12; }
      g.beginPath(); g.moveTo(x, 0.06 * H);
      for (let y = 0.06 * H; y <= 0.9 * H; y += 8 * dpr) { const k = (y - 0.06 * H) / (0.84 * H); g.lineTo(x + Math.sin(k * Math.PI) * amp * Math.sin(t * 30), y); }
      g.stroke(); g.shadowBlur = 0;
      g.fillStyle = "#566173"; g.font = `${11 * dpr}px Segoe UI, sans-serif`; g.textAlign = "center"; g.fillText(["C", "D", "E", "G", "A", "C", "D", "E", "G", "A"][i], x, 0.95 * H);
    }
    for (const tp of tips) { g.beginPath(); g.arc(tp.x * W, tp.y * H, 8 * dpr, 0, Math.PI * 2); g.fillStyle = "rgba(255,179,71,0.9)"; g.fill(); }
    if (!frame.hands.length) { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${14 * dpr}px Segoe UI, sans-serif`; g.fillText("show your hands to play", W / 2, 30 * dpr); }
    ctx.setTag(frame.hands.length ? "strumming" : "ready");
  }
  function resize() { fit(); }
  function dispose() { setTimeout(() => { try { audio?.close(); } catch {} }, 200); screen.remove(); }
  return { update, resize, dispose };
}
