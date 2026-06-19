// Candle experience.
// A candle burns with a flickering flame. PUCKER YOUR LIPS (as if blowing) at the
// camera to puff it out, then PINCH TWICE quickly to light it again.
// Lip shape is read from MediaPipe FaceLandmarker blendshapes (mouthPucker/Funnel).

import { sfx } from "../sfx.js";
const TASKS_VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export function createCandle(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  // ---------- face landmarker (lip pucker) ----------
  let face = null, faceReady = false, faceTry = false, lastVideoTime = -1;
  let pucker = 0, blowHold = 0;
  async function ensureFace() {
    if (face || faceTry) return;
    faceTry = true;
    try {
      const { FaceLandmarker, FilesetResolver } = await import(TASKS_VISION);
      const fileset = await FilesetResolver.forVisionTasks(TASKS_VISION + "/wasm");
      face = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true,
        numFaces: 1
      });
      faceReady = true;
    } catch (e) { console.error("face landmarker failed", e); }
  }

  // ---------- state ----------
  let lit = true, flame = 1, smoke = [];
  let lastPinch = false, pinchTimes = [];

  ctx.setHint("<b>Pucker your lips</b> (like blowing) at the camera to put it out · <b>pinch twice</b> to relight.");

  function fit() {
    const w = mount.clientWidth, h = mount.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; }
  }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.05), t = frame.t;
    fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);

    // read lip pucker from the camera
    if (ctx.cameraLive) {
      ensureFace();
      const video = ctx.video;
      if (faceReady && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const res = face.detectForVideo(video, performance.now());
        const cats = res.faceBlendshapes?.[0]?.categories;
        if (cats) {
          let p = 0, fn = 0;
          for (const c of cats) { if (c.categoryName === "mouthPucker") p = c.score; else if (c.categoryName === "mouthFunnel") fn = c.score; }
          pucker = Math.max(p, fn);
        }
      }
      if (pucker > 0.4) blowHold += dt; else blowHold = Math.max(0, blowHold - dt * 2);
      if (blowHold > 0.08 && lit) { lit = false; puff(W, H); sfx.blow(); }
    }

    // double-pinch relight
    const pinch = frame.cursor.present && frame.cursor.pinch;
    if (pinch && !lastPinch) {
      if (!lit) sfx.spark();                       // lighter strike on each pinch
      pinchTimes.push(t); pinchTimes = pinchTimes.filter(p => t - p < 0.8);
      if (pinchTimes.length >= 2 && !lit) { lit = true; flame = 0.1; pinchTimes = []; }
    }
    lastPinch = pinch;

    flame += ((lit ? 1 : 0) - flame) * Math.min(1, dt * (lit ? 6 : 14));
    if (flame < 0.02 && !lit) flame = 0;

    for (const s of smoke) { s.y -= s.vy * dt; s.x += Math.sin(t * 2 + s.seed) * 8 * dt; s.life -= dt * 0.5; s.r += dt * 18; }
    smoke = smoke.filter(s => s.life > 0);

    // ---------- draw ----------
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0a0c14"); grad.addColorStop(1, "#05070c");
    g.fillStyle = grad; g.fillRect(0, 0, W, H);

    const cx = W / 2, candleW = 0.15 * W, topY = 0.5 * H, botY = 0.9 * H, wickY = topY;

    if (flame > 0.02) {
      const r = (1.2 + flame * 0.8) * candleW * 2;
      const gl = g.createRadialGradient(cx, wickY, 0, cx, wickY, r);
      gl.addColorStop(0, `rgba(255,180,80,${0.35 * flame})`); gl.addColorStop(1, "rgba(255,180,80,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(cx, wickY, r, 0, Math.PI * 2); g.fill();
    }

    g.fillStyle = "#efe6d2"; roundRect(g, cx - candleW / 2, topY, candleW, botY - topY, 8 * dpr); g.fill();
    g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(cx + candleW / 2 - 8 * dpr, topY, 8 * dpr, botY - topY);
    g.fillStyle = "#f7f0df"; g.beginPath(); g.ellipse(cx, topY, candleW / 2, 6 * dpr, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#2a2118"; g.lineWidth = 3 * dpr; g.beginPath(); g.moveTo(cx, wickY); g.lineTo(cx, wickY - 14 * dpr); g.stroke();

    for (const s of smoke) { g.globalAlpha = Math.max(0, s.life) * 0.4; g.fillStyle = "#9aa3b2"; g.beginPath(); g.arc(s.x, s.y, s.r * dpr, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;

    if (flame > 0.02) {
      const flick = Math.sin(t * 18) * 0.06 + Math.sin(t * 7.3) * 0.04 + (Math.random() - 0.5) * 0.03;
      const fh = (0.14 + 0.04 * Math.sin(t * 10)) * H * flame;
      const fw = (0.045 * W) * flame * (1 + flick);
      const sway = Math.sin(t * 9) * 6 * dpr * flame;
      drawFlame(g, cx + sway, wickY - 14 * dpr, fh, fw);
    }

    // pucker meter
    const mx = 16 * dpr, my = H - 24 * dpr, mw = 130 * dpr;
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(mx, my, mw, 8 * dpr);
    g.fillStyle = pucker > 0.4 ? "#ff7a2a" : "#6ad1ff"; g.fillRect(mx, my, Math.min(1, pucker / 0.7) * mw, 8 * dpr);
    g.fillStyle = "#8a93a6"; g.font = `${12 * dpr}px Segoe UI, sans-serif`; g.textAlign = "left";
    g.fillText(!ctx.cameraLive ? "enable camera to blow it out" : faceReady ? "pucker your lips →" : "loading face model…", mx, my - 6 * dpr);

    ctx.setTag(lit ? "lit" : "out");
  }

  function puff(W, H) {
    const cx = W / 2, y = 0.5 * H - 14 * Math.min(devicePixelRatio, 2);
    for (let i = 0; i < 14; i++) smoke.push({ x: cx + (Math.random() - 0.5) * 10, y, vy: 30 + Math.random() * 40, r: 3 + Math.random() * 3, life: 1, seed: Math.random() * 10 });
  }

  function resize() { fit(); }
  function dispose() { try { face?.close(); } catch {} screen.remove(); }
  return { update, resize, dispose };
}

function drawFlame(g, cx, baseY, h, w) {
  let grad = g.createLinearGradient(0, baseY, 0, baseY - h);
  grad.addColorStop(0, "#ff7a2a"); grad.addColorStop(0.5, "#ffb347"); grad.addColorStop(1, "rgba(255,210,120,0.2)");
  g.fillStyle = grad; g.shadowColor = "#ff9a3a"; g.shadowBlur = 24;
  g.beginPath(); g.moveTo(cx, baseY); g.quadraticCurveTo(cx - w, baseY - h * 0.5, cx, baseY - h); g.quadraticCurveTo(cx + w, baseY - h * 0.5, cx, baseY); g.fill();
  g.shadowBlur = 0;
  grad = g.createLinearGradient(0, baseY, 0, baseY - h * 0.6);
  grad.addColorStop(0, "#fff3c4"); grad.addColorStop(1, "rgba(255,240,180,0.3)");
  g.fillStyle = grad;
  g.beginPath(); g.moveTo(cx, baseY); g.quadraticCurveTo(cx - w * 0.5, baseY - h * 0.35, cx, baseY - h * 0.6); g.quadraticCurveTo(cx + w * 0.5, baseY - h * 0.35, cx, baseY); g.fill();
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
