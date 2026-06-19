// Make the Face experience.
// Copy the expression shown on screen. Detected from MediaPipe FaceLandmarker
// blendshapes. Match it to score; 60-second session. Needs the camera.

import { sfx } from "../sfx.js";
const TASKS_VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const v = (b, k) => b[k] || 0;
const EXPR = [
  { emoji: "😀", name: "Smile", test: b => (v(b, "mouthSmileLeft") + v(b, "mouthSmileRight")) / 2 > 0.45 },
  { emoji: "😮", name: "Surprise", test: b => v(b, "jawOpen") > 0.45 },
  { emoji: "😗", name: "Pucker", test: b => v(b, "mouthPucker") > 0.45 },
  { emoji: "🤨", name: "Raise Brows", test: b => (v(b, "browOuterUpLeft") + v(b, "browOuterUpRight")) / 2 > 0.4 },
  { emoji: "😠", name: "Angry / Frown", test: b => (v(b, "mouthFrownLeft") + v(b, "mouthFrownRight")) / 2 > 0.05 || (v(b, "browDownLeft") + v(b, "browDownRight")) / 2 > 0.12 },
  { emoji: "😉", name: "Wink", test: b => Math.abs(v(b, "eyeBlinkLeft") - v(b, "eyeBlinkRight")) > 0.3 },
  { emoji: "😐", name: "Neutral", test: b => v(b, "jawOpen") < 0.12 && (v(b, "mouthSmileLeft") + v(b, "mouthSmileRight")) / 2 < 0.12 && v(b, "mouthPucker") < 0.15 }
];
const ROUND = 60, SKIP = 8;

export function createMakeFace(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let face = null, faceReady = false, faceTry = false, lastVideoTime = -1, bs = {};
  async function ensureFace() {
    if (face || faceTry) return; faceTry = true;
    try { const { FaceLandmarker, FilesetResolver } = await import(TASKS_VISION); const fs = await FilesetResolver.forVisionTasks(TASKS_VISION + "/wasm"); face = await FaceLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" }, runningMode: "VIDEO", outputFaceBlendshapes: true, numFaces: 1 }); faceReady = true; } catch (e) { console.error(e); }
  }

  let target, score, timeLeft, hold, state, roundT, prevPinch = false;
  function pick() { let n; do { n = EXPR[(Math.random() * EXPR.length) | 0]; } while (n === target); target = n; hold = 0; roundT = SKIP; }
  function startGame() { score = 0; timeLeft = ROUND; state = "play"; target = null; pick(); }
  function reset() { score = 0; state = "ready"; target = EXPR[0]; hold = 0; }
  reset();

  ctx.setHint("Copy the <b>expression</b> shown. Match it to score! Needs the camera on.");
  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.05); fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);

    if (ctx.cameraLive) {
      ensureFace(); const video = ctx.video;
      if (faceReady && video.readyState >= 2 && video.currentTime !== lastVideoTime) { lastVideoTime = video.currentTime; const res = face.detectForVideo(video, performance.now()); const cats = res.faceBlendshapes?.[0]?.categories; bs = {}; if (cats) for (const c of cats) bs[c.categoryName] = c.score; }
    }

    const pinch = frame.cursor.present && frame.cursor.pinch;
    if (state === "ready" && ctx.cameraLive && pinch && !prevPinch) startGame();
    prevPinch = pinch;

    let matching = false;
    if (state === "play") {
      timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; state = "over"; ctx.setHint("Time! Hold an <b>open palm</b> to play again."); }
      matching = faceReady && target.test(bs);
      if (matching) { hold += dt; if (hold > 0.25) { score++; sfx.ding(); pick(); } } else hold = Math.max(0, hold - dt);
      roundT -= dt; if (roundT <= 0) pick();   // can't do it? skip to a new face
    }
    if (state === "over" && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) reset();

    // ---------- draw ----------
    g.fillStyle = "#0e1322"; g.fillRect(0, 0, W, H);
    if (!ctx.cameraLive) { g.fillStyle = "#9aa3b2"; g.textAlign = "center"; g.font = `${15 * dpr}px Segoe UI`; g.fillText("Enable the camera to play →", W / 2, H / 2); ctx.setTag("camera off"); return; }
    if (state === "ready") {
      g.textAlign = "center"; g.fillStyle = "#e8edf6"; g.font = `bold ${30 * dpr}px Segoe UI`; g.fillText("Copycat Faces", W / 2, H * 0.36);
      g.font = `${44 * dpr}px serif`; g.fillText(EXPR.map(e => e.emoji).join(" "), W / 2, H * 0.52);
      g.fillStyle = faceReady ? "#54e08a" : "#8a93a6"; g.font = `bold ${22 * dpr}px Segoe UI`; g.fillText(faceReady ? "✊ Pinch to start" : "loading face model…", W / 2, H * 0.68);
      ctx.setTag("ready"); return;
    }

    g.textAlign = "center"; g.font = `${120 * dpr}px serif`; g.fillText(target.emoji, W / 2, H * 0.46);
    g.fillStyle = matching ? "#54e08a" : "#e8edf6"; g.font = `bold ${26 * dpr}px Segoe UI`; g.fillText(target.name, W / 2, H * 0.6);
    // hold ring
    g.strokeStyle = "#54e08a"; g.lineWidth = 6 * dpr; g.beginPath(); g.arc(W / 2, H * 0.46 - 40 * dpr, 90 * dpr, -Math.PI / 2, -Math.PI / 2 + Math.min(1, hold / 0.25) * Math.PI * 2); g.stroke();

    const barW = W - 32 * dpr; g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(16 * dpr, 14 * dpr, barW, 8 * dpr);
    g.fillStyle = timeLeft < 10 ? "#ff6a6a" : "#54e08a"; g.fillRect(16 * dpr, 14 * dpr, barW * (timeLeft / ROUND), 8 * dpr);
    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${18 * dpr}px Segoe UI`; g.fillText("Score " + score, 16 * dpr, 44 * dpr);
    g.textAlign = "right"; g.fillText(Math.ceil(timeLeft) + "s", W - 16 * dpr, 44 * dpr);
    if (!faceReady) { g.textAlign = "center"; g.fillStyle = "#8a93a6"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("loading face model…", W / 2, H * 0.8); }

    if (state === "over") { g.fillStyle = "rgba(5,7,12,0.72)"; g.fillRect(0, 0, W, H); g.textAlign = "center"; g.fillStyle = "#54e08a"; g.font = `bold ${36 * dpr}px Segoe UI`; g.fillText("Time's Up!", W / 2, H / 2 - 6 * dpr); g.fillStyle = "#8a93a6"; g.font = `${16 * dpr}px Segoe UI`; g.fillText(`${score} matched · open palm to replay`, W / 2, H / 2 + 24 * dpr); }
    ctx.setTag(state === "over" ? "time up" : `score ${score}`);
  }
  function resize() { fit(); }
  function dispose() { try { face?.close(); } catch {} screen.remove(); }
  return { update, resize, dispose };
}
