// Theremin experience.
// Raise/lower your RIGHT hand (the one further right) to change PITCH; your LEFT
// hand height sets VOLUME. One hand = pitch at half volume. Hands-free music.

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function createTheremin(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let audio = null, osc = null, gain = null;
  function ensureAudio() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audio = new AC();
      osc = audio.createOscillator(); osc.type = "sine"; osc.frequency.value = 220;
      gain = audio.createGain(); gain.gain.value = 0;
      const tone = audio.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2200;
      osc.connect(tone); tone.connect(gain); gain.connect(audio.destination); osc.start();
    }
    if (audio.state === "suspended") audio.resume();
  }

  let freq = 220, vol = 0, phase = 0;

  ctx.setHint("Right hand height = <b>pitch</b> · left hand height = <b>volume</b>. Move slowly!");

  function fit() {
    const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2);
    if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; }
  }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.05);
    fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const hands = frame.hands.slice(0, 2).map(h => ({ x: h.landmarks[9].x, y: h.landmarks[9].y }));

    let targetFreq = freq, targetVol = 0, pitchHand = null, volHand = null;
    if (hands.length >= 1) ensureAudio();

    if (hands.length === 2) {
      hands.sort((a, b) => a.x - b.x);            // left-most first
      volHand = hands[0]; pitchHand = hands[1];
      targetVol = (1 - volHand.y) * 0.35;
    } else if (hands.length === 1) {
      pitchHand = hands[0]; targetVol = 0.22;
    }
    if (pitchHand) targetFreq = 130 * Math.pow(2, (1 - pitchHand.y) * 3);   // 3 octaves

    freq += (targetFreq - freq) * Math.min(1, dt * 12);
    vol += (targetVol - vol) * Math.min(1, dt * 10);
    if (audio) {
      osc.frequency.setTargetAtTime(freq, audio.currentTime, 0.03);
      gain.gain.setTargetAtTime(vol, audio.currentTime, 0.03);
    }

    // ---------- draw ----------
    g.fillStyle = "#070a14"; g.fillRect(0, 0, W, H);

    // oscilloscope reacting to freq/vol
    const cycles = 2 + (freq - 130) / 130;
    const amp = (10 + vol * 140) * dpr;
    phase += dt * freq * 0.02;
    g.strokeStyle = `hsl(${190 + (freq - 130) / 5}, 90%, 65%)`; g.lineWidth = 3 * dpr;
    g.shadowColor = g.strokeStyle; g.shadowBlur = 16; g.beginPath();
    for (let x = 0; x <= W; x += 4 * dpr) { const yv = H / 2 + Math.sin((x / W) * Math.PI * 2 * cycles + phase) * amp; x === 0 ? g.moveTo(x, yv) : g.lineTo(x, yv); }
    g.stroke(); g.shadowBlur = 0;

    // hand indicators
    if (pitchHand) handMarker(g, pitchHand.x * W, pitchHand.y * H, "#6ad1ff", "PITCH", dpr);
    if (volHand) handMarker(g, volHand.x * W, volHand.y * H, "#ffb347", "VOL", dpr);

    // readout
    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${20 * dpr}px Segoe UI, sans-serif`;
    g.fillText(noteName(freq), 16 * dpr, 32 * dpr);
    g.fillStyle = "#8a93a6"; g.font = `${13 * dpr}px Segoe UI, sans-serif`;
    g.fillText(Math.round(freq) + " Hz", 16 * dpr, 50 * dpr);
    if (!frame.hands.length) { g.textAlign = "center"; g.fillText("raise a hand to play", W / 2, H - 24 * dpr); }

    ctx.setTag(frame.hands.length ? noteName(freq) : "silent");
  }

  function resize() { fit(); }
  function dispose() { try { gain && gain.gain.setTargetAtTime(0, audio.currentTime, 0.05); setTimeout(() => { try { audio?.close(); } catch {} }, 200); } catch {} screen.remove(); }
  return { update, resize, dispose };
}

function noteName(f) { const n = Math.round(12 * Math.log2(f / 440) + 69); return NOTE_NAMES[(n % 12 + 12) % 12] + (Math.floor(n / 12) - 1); }
function handMarker(g, x, y, c, label, dpr) {
  g.beginPath(); g.arc(x, y, 16 * dpr, 0, Math.PI * 2); g.strokeStyle = c; g.lineWidth = 3 * dpr; g.stroke();
  g.fillStyle = c; g.beginPath(); g.arc(x, y, 5 * dpr, 0, Math.PI * 2); g.fill();
  g.font = `${11 * dpr}px Segoe UI, sans-serif`; g.textAlign = "center"; g.fillText(label, x, y - 22 * dpr);
}
