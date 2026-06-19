// Air Piano experience.
// A keyboard sits along the bottom. Hover your hand above it, then DIP a fingertip
// DOWN onto a key to play it — like pressing real keys. Slide across to glissando,
// lift up to stop. Use several fingers / both hands for chords.

const NOTES = [
  ["C4", 261.63], ["D4", 293.66], ["E4", 329.63], ["F4", 349.23],
  ["G4", 392.00], ["A4", 440.00], ["B4", 493.88], ["C5", 523.25]
];
const FINGERS = [8, 12];   // index + middle tips of each hand

export function createPiano(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let audio = null, master = null;
  function ensureAudio() { if (!audio) { const AC = window.AudioContext || window.webkitAudioContext; audio = new AC(); master = audio.createGain(); master.gain.value = 0.5; master.connect(audio.destination); } if (audio.state === "suspended") audio.resume(); }
  const voices = new Map();              // key index -> {osc,gain}
  const keyCount = new Int8Array(NOTES.length);
  function noteOn(k) { ensureAudio(); if (voices.has(k)) return; const o = audio.createOscillator(), gn = audio.createGain(); o.type = "triangle"; o.frequency.value = NOTES[k][1]; gn.gain.setValueAtTime(0.0001, audio.currentTime); gn.gain.exponentialRampToValueAtTime(0.8, audio.currentTime + 0.01); gn.gain.exponentialRampToValueAtTime(0.35, audio.currentTime + 0.25); o.connect(gn); gn.connect(master); o.start(); voices.set(k, { osc: o, gain: gn }); }
  function noteOff(k) { const v = voices.get(k); if (!v) return; const t = audio.currentTime; v.gain.gain.cancelScheduledValues(t); v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), t); v.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); v.osc.stop(t + 0.2); voices.delete(k); }

  const lit = new Float32Array(NOTES.length);
  let fingerKey = {};                    // fingerId -> key index currently pressed (or -1)

  ctx.setHint("Hover above the keys, then <b>dip a fingertip down</b> onto a key to play it.");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = frame.dt; fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const keyTopY = H * 0.55, kw = W / NOTES.length;

    // gather fingertips
    const tips = [];
    frame.hands.forEach((hand, hi) => { if (hi > 1) return; for (const f of FINGERS) { const p = hand.landmarks[f]; tips.push({ id: hi * 10 + f, x: p.x * W, y: p.y * H }); } });

    // which key each finger is pressing (inside keyboard zone)
    const seen = {};
    for (const tp of tips) {
      seen[tp.id] = true;
      const inZone = tp.y >= keyTopY;
      const key = inZone ? Math.min(NOTES.length - 1, Math.max(0, (tp.x / kw) | 0)) : -1;
      const prev = fingerKey[tp.id] ?? -1;
      if (key !== prev) {
        if (prev >= 0 && --keyCount[prev] <= 0) { keyCount[prev] = 0; noteOff(prev); }
        if (key >= 0 && keyCount[key]++ === 0) noteOn(key);
        fingerKey[tp.id] = key;
      }
    }
    // fingers that vanished
    for (const id in fingerKey) if (!seen[id]) { const prev = fingerKey[id]; if (prev >= 0 && --keyCount[prev] <= 0) { keyCount[prev] = 0; noteOff(prev); } delete fingerKey[id]; }

    // ---------- draw ----------
    g.fillStyle = "#070a11"; g.fillRect(0, 0, W, H);
    // hover guide line
    g.strokeStyle = "rgba(106,209,255,0.25)"; g.lineWidth = 1 * dpr; g.setLineDash([6 * dpr, 6 * dpr]); g.beginPath(); g.moveTo(0, keyTopY); g.lineTo(W, keyTopY); g.stroke(); g.setLineDash([]);
    g.fillStyle = "#8a93a6"; g.font = `${11 * dpr}px Segoe UI`; g.textAlign = "left"; g.fillText("▼ dip below this line to play", 10 * dpr, keyTopY - 8 * dpr);

    for (let k = 0; k < NOTES.length; k++) {
      const on = keyCount[k] > 0; lit[k] += ((on ? 1 : 0) - lit[k]) * Math.min(1, dt * 16);
      const x0 = k * kw, depress = lit[k] * 8 * dpr;
      g.fillStyle = "#f3f3f6"; g.fillRect(x0 + 2, keyTopY + depress, kw - 4, H - keyTopY - depress);
      if (lit[k] > 0.01) { g.fillStyle = `rgba(106,209,255,${0.5 * lit[k]})`; g.fillRect(x0 + 2, keyTopY + depress, kw - 4, H - keyTopY - depress); }
      g.fillStyle = on ? "#1a6fa0" : "#566173"; g.font = `${13 * dpr}px Segoe UI`; g.textAlign = "center"; g.fillText(NOTES[k][0], x0 + kw / 2, H - 14 * dpr);
    }
    // fingertips
    for (const tp of tips) { const pressing = tp.y >= keyTopY; g.beginPath(); g.arc(tp.x, tp.y, (pressing ? 10 : 8) * dpr, 0, Math.PI * 2); g.fillStyle = pressing ? "rgba(255,179,71,0.95)" : "rgba(255,255,255,0.5)"; g.fill(); }

    if (!frame.hands.length) { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("show your hands", W / 2, H * 0.3); ctx.setTag("show your hands"); }
    else { let n = 0; for (let k = 0; k < NOTES.length; k++) if (keyCount[k] > 0) n++; ctx.setTag(n ? `${n} key${n > 1 ? "s" : ""}` : "hover & dip"); }
  }

  function resize() { fit(); }
  function dispose() { for (const k of [...voices.keys()]) noteOff(k); setTimeout(() => { try { audio?.close(); } catch {} }, 300); screen.remove(); }
  return { update, resize, dispose };
}
