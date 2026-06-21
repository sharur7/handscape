// Tiny shared sound-effects engine (Web Audio, all synthesized, no asset files).
// Call sfx.<name>() on interaction events. AudioContext resumes lazily (after the
// user has clicked Enable Camera, autoplay is allowed).

let actx = null;
function ac() {
  if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; actx = new AC(); }
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function noiseBuf(a, dur) {
  const n = (a.sampleRate * dur) | 0, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function beep(freq, dur, type, vol, slideTo) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, hp, vol, lp) {
  const a = ac(); if (!a) return;
  const s = a.createBufferSource(); s.buffer = noiseBuf(a, dur);
  const f = a.createBiquadFilter(); f.type = lp ? "lowpass" : "highpass"; f.frequency.value = hp;
  const g = a.createGain(), t = a.currentTime;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur);
}

export const sfx = {
  ctx: ac,
  click() { beep(660, 0.06, "square", 0.18); },
  tick() { beep(1200, 0.03, "square", 0.12); },
  pop() { beep(420, 0.12, "sine", 0.35, 900); },
  pluck(f = 440) { beep(f, 0.25, "triangle", 0.3, f * 0.9); },
  note(f = 440, d = 0.4) { beep(f, d, "triangle", 0.3); },
  whoosh(d = 0.3) { noise(d, 600, 0.25); },
  swish() { noise(0.18, 1200, 0.35); },
  blow() { noise(0.45, 300, 0.3, true); },
  boom() { beep(120, 0.4, "sine", 0.6, 40); noise(0.4, 200, 0.4, true); },
  zap() { beep(900, 0.22, "sawtooth", 0.25, 120); },
  ding(f = 880) { beep(f, 0.4, "sine", 0.3); beep(f * 1.5, 0.5, "sine", 0.15); },
  chime() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.4, "triangle", 0.25), i * 90)); },
  buzz() { beep(80, 0.5, "sawtooth", 0.12); },
  splat() { noise(0.18, 400, 0.4, true); beep(180, 0.12, "square", 0.2, 60); },
  thunk() { beep(160, 0.18, "sine", 0.4, 70); },
  bonk() { beep(300, 0.12, "square", 0.35, 120); },
  crack() { noise(0.12, 2000, 0.3); },
  twang() { beep(330, 0.4, "sawtooth", 0.3, 110); },
  stretch() { beep(200, 0.25, "sawtooth", 0.18, 380); },
  crumple() { noise(0.3, 1500, 0.25); },
  launch() { beep(300, 0.5, "sine", 0.2, 1400); },
  shot() { noise(0.12, 900, 0.5); beep(140, 0.12, "square", 0.45, 50); },
  reload() { beep(420, 0.05, "square", 0.22); setTimeout(() => beep(640, 0.05, "square", 0.22), 90); },
  tink() { beep(1500, 0.14, "sine", 0.3, 800); },
  empty() { beep(320, 0.04, "square", 0.16); },
  lampOn() { beep(900, 0.05, "square", 0.15); beep(220, 0.5, "sine", 0.13, 340); },
  glass() { noise(0.22, 3000, 0.45); for (let i = 0; i < 4; i++) setTimeout(() => beep(1200 + Math.random() * 1600, 0.08, "triangle", 0.16), i * 45); },
  spark() { noise(0.05, 5000, 0.35); setTimeout(() => noise(0.05, 4000, 0.3), 55); },
  fwhistle() { beep(1700, 0.6, "sine", 0.12, 480); },
  fwburst() { noise(0.35, 1100, 0.4); beep(130, 0.35, "sine", 0.45, 45); for (let i = 0; i < 6; i++) setTimeout(() => noise(0.05, 2500, 0.18), i * 45 + 60); },
  deflate() { beep(420, 0.5, "sawtooth", 0.2, 90); },
  electric() { noise(0.06, 3000, 0.2); beep(800, 0.08, "sawtooth", 0.12, 1600); },
  tickTock() { beep(1600, 0.03, "square", 0.2); setTimeout(() => beep(900, 0.04, "square", 0.2), 120); },
  // looping background music; returns { stop() }
  loop(notes, bpm, type = "triangle", vol = 0.1) {
    const a = ac(); if (!a) return { stop() {} };
    const beat = 60 / bpm; let i = 0, stopped = false, timer = null;
    function play() {
      if (stopped) return;
      const n = notes[i % notes.length]; i++;
      if (n) { const o = a.createOscillator(), g2 = a.createGain(); o.type = type; o.frequency.value = n; g2.gain.setValueAtTime(0.0001, a.currentTime); g2.gain.exponentialRampToValueAtTime(vol, a.currentTime + 0.02); g2.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + beat * 0.95); o.connect(g2); g2.connect(a.destination); o.start(); o.stop(a.currentTime + beat); }
      timer = setTimeout(play, beat * 1000);
    }
    play();
    return { stop() { stopped = true; clearTimeout(timer); } };
  }
};
