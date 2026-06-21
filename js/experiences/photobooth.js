// Photo Booth experience.
// Your camera shows in the scene panel with face-tracked props. PINCH to change the
// prop set; SMILE to throw sparkles. Uses MediaPipe FaceLandmarker (mesh + blendshapes).

const TASKS_VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const SETS = [
  { name: "Round Glasses", props: ["glasses"] },
  { name: "Mustache", props: ["glasses", "mustache"] },
  { name: "Crown", props: ["crown"] },
  { name: "Top Hat", props: ["tophat", "mustache"] },
  { name: "Clown", props: ["nose", "glasses"] },
  { name: "Heart Eyes", props: ["hearts"] },
  { name: "Party", props: ["partyhat", "glasses"] },
  { name: "Octopus", props: ["octopus"] },
  { name: "Disguise", props: ["glasses", "mustache", "brows"] }
];
import { sfx } from "../sfx.js";

export function createPhotoBooth(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let face = null, faceReady = false, faceTry = false, lastVideoTime = -1;
  let landmarks = null, smile = 0;
  async function ensureFace() {
    if (face || faceTry) return; faceTry = true;
    try {
      const { FaceLandmarker, FilesetResolver } = await import(TASKS_VISION);
      const fileset = await FilesetResolver.forVisionTasks(TASKS_VISION + "/wasm");
      face = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" }, runningMode: "VIDEO", outputFaceBlendshapes: true, numFaces: 1
      });
      faceReady = true;
    } catch (e) { console.error("face failed", e); }
  }

  let set = 0, lastPinch = false, sparks = [];

  ctx.setHint("<b>Pinch</b> to change props · <b>smile</b> for sparkles. Make sure the camera is on!");

  function fit() {
    const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2);
    if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; }
  }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.05), t = frame.t;
    fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const video = ctx.video;

    if (!ctx.cameraLive) {
      g.fillStyle = "#0a0d16"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#9aa3b2"; g.font = `${15 * dpr}px Segoe UI, sans-serif`; g.textAlign = "center";
      g.fillText("Enable the camera to strike a pose →", W / 2, H / 2);
      ctx.setTag("camera off"); return;
    }
    ensureFace();
    if (faceReady && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const res = face.detectForVideo(video, performance.now());
      landmarks = res.faceLandmarks?.[0] || null;
      const cats = res.faceBlendshapes?.[0]?.categories;
      if (cats) { let l = 0, r = 0; for (const c of cats) { if (c.categoryName === "mouthSmileLeft") l = c.score; else if (c.categoryName === "mouthSmileRight") r = c.score; } smile = (l + r) / 2; }
    }

    // pinch cycles prop set
    const pinch = frame.cursor.present && frame.cursor.pinch;
    if (pinch && !lastPinch) { set = (set + 1) % SETS.length; sfx.tick(); }
    lastPinch = pinch;

    // cover transform for the (mirrored) video
    const vw = video.videoWidth || 16, vh = video.videoHeight || 9, va = vw / vh, ca = W / H;
    let dw, dh; if (va > ca) { dh = H; dw = H * va; } else { dw = W; dh = W / va; }
    const ox = (W - dw) / 2, oy = (H - dh) / 2;
    const SX = (lx) => ox + (1 - lx) * dw, SY = (ly) => oy + ly * dh;   // mirror x for selfie

    // draw mirrored video
    g.fillStyle = "#0a0d16"; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W, 0); g.scale(-1, 1); g.drawImage(video, ox, oy, dw, dh); g.restore();

    if (landmarks) {
      const rEye = mid(landmarks[33], landmarks[133], SX, SY);
      const lEye = mid(landmarks[263], landmarks[362], SX, SY);
      const nose = { x: SX(landmarks[1].x), y: SY(landmarks[1].y) };
      const top = { x: SX(landmarks[10].x), y: SY(landmarks[10].y) };
      const mouth = { x: SX(landmarks[13].x), y: SY(landmarks[13].y) };
      const eyeDist = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y) || 40;
      // order eyes by screen x and clamp so props stay upright (never flip 180°)
      const eL = rEye.x < lEye.x ? rEye : lEye, eR = rEye.x < lEye.x ? lEye : rEye;
      const ang = Math.max(-0.5, Math.min(0.5, Math.atan2(eR.y - eL.y, eR.x - eL.x)));

      const has = k => SETS[set].props.includes(k);
      if (has("glasses")) drawGlasses(g, rEye, lEye, eyeDist, ang);
      if (has("mustache")) drawMustache(g, mouth, nose, eyeDist, ang);
      if (has("crown")) drawCrown(g, top, eyeDist, ang);
      if (has("tophat")) drawTopHat(g, top, eyeDist, ang);
      if (has("nose")) drawNose(g, nose, eyeDist);
      if (has("hearts")) drawHearts(g, rEye, lEye, eyeDist);
      if (has("partyhat")) drawPartyHat(g, top, eyeDist, ang);
      if (has("octopus")) drawOctopus(g, top, eyeDist, ang, t);
      if (has("brows")) drawBrows(g, rEye, lEye, eyeDist, ang);

      // smile sparkles
      if (smile > 0.5) for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, d = eyeDist * (1 + Math.random()); sparks.push({ x: nose.x + Math.cos(a) * d, y: nose.y + Math.sin(a) * d, life: 1, s: 4 + Math.random() * 4 }); }
    }

    for (const s of sparks) { s.y -= 40 * dt; s.life -= dt * 1.5; }
    sparks = sparks.filter(s => s.life > 0);
    g.fillStyle = "#ffe070";
    for (const s of sparks) { g.globalAlpha = Math.max(0, s.life); star(g, s.x, s.y, s.s * dpr); }
    g.globalAlpha = 1;

    // label
    g.fillStyle = "rgba(8,10,16,0.7)"; g.fillRect(0, 0, W, 34 * dpr);
    g.fillStyle = "#e8edf6"; g.textAlign = "center"; g.font = `bold ${16 * dpr}px Segoe UI, sans-serif`;
    g.fillText((faceReady ? SETS[set].name : "loading face model…") + "  ·  pinch to change", W / 2, 22 * dpr);

    ctx.setTag(landmarks ? SETS[set].name : "no face");
  }

  function resize() { fit(); }
  function dispose() { try { face?.close(); } catch {} screen.remove(); }
  return { update, resize, dispose };
}

function mid(a, b, SX, SY) { return { x: (SX(a.x) + SX(b.x)) / 2, y: (SY(a.y) + SY(b.y)) / 2 }; }
// Harry-Potter style round glasses, thin black frame, clear lenses, centred on each eye
function drawGlasses(g, rEye, lEye, d, ang) {
  const r = d * 0.42;
  for (const e of [rEye, lEye]) {
    g.fillStyle = "rgba(180,215,255,0.12)"; g.beginPath(); g.arc(e.x, e.y, r, 0, Math.PI * 2); g.fill();        // lens
    g.strokeStyle = "#0d0d0d"; g.lineWidth = d * 0.1; g.beginPath(); g.arc(e.x, e.y, r, 0, Math.PI * 2); g.stroke();  // round rim
    g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(e.x - r * 0.32, e.y - r * 0.32, r * 0.16, 0, Math.PI * 2); g.fill();  // glint
  }
  g.strokeStyle = "#0d0d0d"; g.lineWidth = d * 0.1; g.lineCap = "round";
  const eL = rEye.x < lEye.x ? rEye : lEye, eR = rEye.x < lEye.x ? lEye : rEye;
  const ux = eR.x - eL.x, uy = eR.y - eL.y, ul = Math.hypot(ux, uy) || 1, nx = ux / ul, ny = uy / ul;
  // bridge between the inner edges of the lenses
  g.beginPath(); g.moveTo(eL.x + nx * r, eL.y + ny * r); g.lineTo(eR.x - nx * r, eR.y - ny * r); g.stroke();
  // temple arms going back to the ears
  g.beginPath(); g.moveTo(eL.x - nx * r, eL.y - ny * r); g.lineTo(eL.x - nx * r * 1.9, eL.y - ny * r * 1.9 - d * 0.12); g.stroke();
  g.beginPath(); g.moveTo(eR.x + nx * r, eR.y + ny * r); g.lineTo(eR.x + nx * r * 1.9, eR.y + ny * r * 1.9 - d * 0.12); g.stroke();
}
function drawMustache(g, mouth, nose, d, ang) {
  const cx = (nose.x + mouth.x) / 2, cy = (nose.y + mouth.y) / 2, w = d * 0.58;   // sits between nose & upper lip
  g.save(); g.translate(cx, cy); g.rotate(ang); g.fillStyle = "#2a1d12";
  g.beginPath(); g.moveTo(0, -d * 0.05);
  g.quadraticCurveTo(-w * 0.3, d * 0.14, -w, -d * 0.1); g.quadraticCurveTo(-w * 0.45, d * 0.2, 0, d * 0.1);
  g.quadraticCurveTo(w * 0.45, d * 0.2, w, -d * 0.1); g.quadraticCurveTo(w * 0.3, d * 0.14, 0, -d * 0.05);
  g.fill(); g.restore();
}
function drawCrown(g, top, d, ang) {
  const w = d * 1.4, h = d * 0.7, y = top.y - d * 0.5;
  g.save(); g.translate(top.x, y); g.rotate(ang); g.fillStyle = "#ffd23f";
  g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h * 0.5);
  g.lineTo(-w / 4, -h * 0.1); g.lineTo(0, -h); g.lineTo(w / 4, -h * 0.1); g.lineTo(w / 2, -h * 0.5); g.lineTo(w / 2, 0); g.closePath(); g.fill();
  g.fillStyle = "#ff5a72"; for (const px of [-w / 4, 0, w / 4]) { g.beginPath(); g.arc(px, -h * 0.15, d * 0.08, 0, Math.PI * 2); g.fill(); } g.restore();
}
function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); const a2 = a + Math.PI / 5; g.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45); } g.closePath(); g.fill(); }
function drawTopHat(g, top, d, ang) {
  const w = d * 1.5, y = top.y - d * 0.35; g.save(); g.translate(top.x, y); g.rotate(ang); g.fillStyle = "#15171d";
  g.fillRect(-w / 2, -d * 0.1, w, d * 0.2);                       // brim
  g.fillRect(-w * 0.32, -d * 1.1, w * 0.64, d);                   // crown
  g.fillStyle = "#ff5a72"; g.fillRect(-w * 0.32, -d * 0.25, w * 0.64, d * 0.15); g.restore();
}
function drawNose(g, nose, d) { g.fillStyle = "#ff3b3b"; g.beginPath(); g.arc(nose.x, nose.y, d * 0.28, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(nose.x - d * 0.08, nose.y - d * 0.08, d * 0.08, 0, Math.PI * 2); g.fill(); }
function drawHearts(g, rEye, lEye, d) { g.fillStyle = "#ff3b5c"; for (const e of [rEye, lEye]) heart(g, e.x, e.y, d * 0.62); }
function heart(g, cx, cy, s) {
  g.save(); g.translate(cx, cy);
  g.beginPath(); g.arc(-s * 0.3, -s * 0.18, s * 0.32, 0, Math.PI * 2); g.arc(s * 0.3, -s * 0.18, s * 0.32, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(-s * 0.6, -s * 0.02); g.lineTo(s * 0.6, -s * 0.02); g.lineTo(0, s * 0.6); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(-s * 0.35, -s * 0.25, s * 0.1, 0, Math.PI * 2); g.fill(); g.fillStyle = "#ff3b5c";
  g.restore();
}
function drawOctopus(g, top, d, ang, t) {
  g.save(); g.translate(top.x, top.y - d * 0.7); g.rotate(ang);
  const r = d * 0.95;
  g.strokeStyle = "#9a4fe0"; g.lineWidth = d * 0.2; g.lineCap = "round";
  for (let i = -3; i <= 3; i++) { if (!i) continue; const bx = i / 3 * r * 0.85; g.beginPath(); g.moveTo(bx, r * 0.2); g.quadraticCurveTo(bx + Math.sin(t * 4 + i) * d * 0.25, r * 0.7, bx + Math.sin(t * 4 + i) * d * 0.4, r * 1.2); g.stroke(); }
  g.fillStyle = "#b06aff"; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(-r * 0.32, -r * 0.05, r * 0.24, 0, Math.PI * 2); g.arc(r * 0.32, -r * 0.05, r * 0.24, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(-r * 0.32, -r * 0.05, r * 0.11, 0, Math.PI * 2); g.arc(r * 0.32, -r * 0.05, r * 0.11, 0, Math.PI * 2); g.fill();
  g.restore();
}
function drawPartyHat(g, top, d, ang) { const y = top.y - d * 0.5; g.save(); g.translate(top.x, y); g.rotate(ang); g.fillStyle = "#6ad1ff"; g.beginPath(); g.moveTo(0, -d * 1.3); g.lineTo(-d * 0.55, 0); g.lineTo(d * 0.55, 0); g.closePath(); g.fill(); g.fillStyle = "#ffd23f"; for (let i = 0; i < 3; i++) g.fillRect(-d * 0.45 + i * d * 0.4, -d * (0.3 + i * 0.3), d * 0.15, d * 0.15); g.fillStyle = "#ff6ad1"; g.beginPath(); g.arc(0, -d * 1.3, d * 0.12, 0, Math.PI * 2); g.fill(); g.restore(); }
function drawBrows(g, rEye, lEye, d, ang) { g.strokeStyle = "#2a1d12"; g.lineWidth = d * 0.16; g.lineCap = "round"; for (const e of [rEye, lEye]) { g.save(); g.translate(e.x, e.y - d * 0.5); g.rotate(ang); g.beginPath(); g.moveTo(-d * 0.35, 0); g.lineTo(d * 0.35, -d * 0.12); g.stroke(); g.restore(); } }
