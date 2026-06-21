// Balloon experience.
// PUCKER your lips to blow air in (the balloon grows). Stop and it slowly leaks air.
// PINCH to tie it off, tie it in the green "sweet spot" for a bonus, and it floats
// away. Blow too much and it POPS. Uses FaceLandmarker (mouthPucker / mouthFunnel).

const TASKS_VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const COLORS = ["#ff5a72", "#6ad1ff", "#54e08a", "#ffb347", "#b06aff", "#ff8c42"];
import { sfx } from "../sfx.js";

const POP = 1.0, BAND_LO = 0.55, BAND_HI = 0.8;

export function createBalloon(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let face = null, faceReady = false, faceTry = false, lastVideoTime = -1, pucker = 0;
  async function ensureFace() {
    if (face || faceTry) return; faceTry = true;
    try { const { FaceLandmarker, FilesetResolver } = await import(TASKS_VISION); const fs = await FilesetResolver.forVisionTasks(TASKS_VISION + "/wasm"); face = await FaceLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" }, runningMode: "VIDEO", outputFaceBlendshapes: true, numFaces: 1 }); faceReady = true; } catch (e) { console.error(e); }
  }

  let size = 0.12, ci = 0, score = 0, pops = 0, lastPinch = false, leaking = false, frags = [], floaters = [];
  ctx.setHint("<b>Pucker</b> to blow it up · <b>pinch</b> to tie it (aim for the green band!), don't pop it.");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.05), t = frame.t; fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);

    if (ctx.cameraLive) {
      ensureFace(); const video = ctx.video;
      if (faceReady && video.readyState >= 2 && video.currentTime !== lastVideoTime) { lastVideoTime = video.currentTime; const res = face.detectForVideo(video, performance.now()); const cats = res.faceBlendshapes?.[0]?.categories; if (cats) { let p = 0, fn = 0; for (const c of cats) { if (c.categoryName === "mouthPucker") p = c.score; else if (c.categoryName === "mouthFunnel") fn = c.score; } pucker = Math.max(p, fn); } }
    }

    const blowing = pucker > 0.4;
    if (blowing) { size += 0.5 * dt; leaking = false; } else { if (size > 0.13 && !leaking) { leaking = true; sfx.deflate(); } size -= 0.06 * dt; }
    size = Math.max(0.1, size);
    if (size >= POP) popBalloon(W, H);

    const pinch = frame.cursor.present && frame.cursor.pinch;
    if (pinch && !lastPinch && size > 0.25 && size < POP) {
      const perfect = size >= BAND_LO && size <= BAND_HI;
      floaters.push({ x: W / 2, y: balloonCy(H), r: balloonR(size, W, H), c: COLORS[ci], vy: 60 + Math.random() * 40, sway: Math.random() * 6 });
      score += perfect ? 2 : 1; sfx.ding(perfect ? 990 : 660); ci = (ci + 1) % COLORS.length; size = 0.12; leaking = false;
    }
    lastPinch = pinch;

    for (const f of floaters) { f.y -= f.vy * dt; f.x += Math.sin(t * 1.5) * f.sway * dt; }
    floaters = floaters.filter(f => f.y + f.r > -20);
    for (const p of frags) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.2; }
    frags = frags.filter(p => p.life > 0);

    // ---------- draw ----------
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0e1422"); bg.addColorStop(1, "#0a0d16");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (const f of floaters) drawBalloon(g, f.x, f.y, f.r, f.c, false, dpr);

    // sweet-spot gauge (left side): shows current size + green band
    const gx = 22 * dpr, gy0 = H * 0.2, gh = H * 0.6;
    g.fillStyle = "rgba(255,255,255,0.1)"; g.fillRect(gx, gy0, 12 * dpr, gh);
    g.fillStyle = "rgba(84,224,138,0.5)"; g.fillRect(gx, gy0 + (1 - BAND_HI) * gh, 12 * dpr, (BAND_HI - BAND_LO) * gh);
    g.fillStyle = "#ff6a6a"; g.fillRect(gx, gy0, 12 * dpr, (1 - 0.92) * gh);
    g.fillStyle = "#fff"; g.fillRect(gx - 3 * dpr, gy0 + (1 - Math.min(1, size)) * gh - 1 * dpr, 18 * dpr, 3 * dpr);

    if (size < POP) {
      const danger = size > 0.85, wob = danger ? Math.sin(t * 30) * 0.02 : 0;
      drawBalloon(g, W / 2, balloonCy(H), balloonR(size, W, H) * (1 + wob), COLORS[ci], danger, dpr);
    }
    for (const p of frags) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.fillRect(p.x, p.y, 5 * dpr, 5 * dpr); } g.globalAlpha = 1;

    const mx = 44 * dpr, my = H - 24 * dpr, mw = 120 * dpr;
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(mx, my, mw, 8 * dpr);
    g.fillStyle = blowing ? "#54e08a" : "#6ad1ff"; g.fillRect(mx, my, Math.min(1, pucker / 0.7) * mw, 8 * dpr);
    g.fillStyle = "#8a93a6"; g.font = `${12 * dpr}px Segoe UI`; g.textAlign = "left"; g.fillText(!ctx.cameraLive ? "enable camera to blow" : faceReady ? "pucker to blow →" : "loading face model…", mx, my - 6 * dpr);

    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${18 * dpr}px Segoe UI`; g.fillText(`Score ${score}`, 44 * dpr, 28 * dpr);
    g.textAlign = "right"; g.fillStyle = "#ff6a6a"; g.fillText(`Pops ${pops}`, W - 16 * dpr, 28 * dpr);
    if (size > 0.85 && size < POP) { g.textAlign = "center"; g.fillStyle = "#ff6a6a"; g.font = `bold ${22 * dpr}px Segoe UI`; g.fillText("PINCH TO TIE!", W / 2, 44 * dpr); }
    ctx.setTag(`score ${score}`);
  }

  function balloonCy(H) { return H * 0.52; }
  function balloonR(s, W, H) { return (0.06 + s * 0.34) * Math.min(W, H); }
  function popBalloon(W, H) { pops++; sfx.boom(); const r = balloonR(size, W, H); for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 350; frags.push({ x: W / 2, y: balloonCy(H), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: 1, c: COLORS[ci] }); } ci = (ci + 1) % COLORS.length; size = 0.12; leaking = false; }

  function resize() { fit(); }
  function dispose() { try { face?.close(); } catch {} screen.remove(); }
  return { update, resize, dispose };
}

function drawBalloon(g, cx, cy, r, c, danger, dpr) {
  g.save();
  g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 1.5 * dpr; g.beginPath(); g.moveTo(cx, cy + r); g.quadraticCurveTo(cx + r * 0.2, cy + r * 1.4, cx, cy + r * 1.8); g.stroke();
  g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, r * 0.86, r, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(cx - 5 * dpr, cy + r); g.lineTo(cx + 5 * dpr, cy + r); g.lineTo(cx, cy + r + 8 * dpr); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.4)"; g.beginPath(); g.ellipse(cx - r * 0.3, cy - r * 0.4, r * 0.16, r * 0.26, -0.4, 0, Math.PI * 2); g.fill();
  if (danger) { g.strokeStyle = "rgba(255,80,80,0.8)"; g.lineWidth = 3 * dpr; g.beginPath(); g.ellipse(cx, cy, r * 0.86, r, 0, 0, Math.PI * 2); g.stroke(); }
  g.restore();
}
