// Dust Silhouette experience.
// White space. Your body silhouette (MediaPipe selfie segmentation) is drawn as a
// swarm of black dust that flows onto wherever you are and trails as you move.
// Body-based, so it runs its own ImageSegmenter on the shared camera video.

const TASKS_VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";
const SEG_MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
import { sfx } from "../sfx.js";

export function createMemorySand(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  const TH = 0.2;            // lower so thin parts (raised arm/hand) fill in
  const N = 17000;
  const x = new Float32Array(N), y = new Float32Array(N), sz = new Float32Array(N), al = new Float32Array(N);
  for (let i = 0; i < N; i++) { x[i] = Math.random(); y[i] = Math.random(); sz[i] = Math.random() < 0.18 ? 2 : 1; al[i] = 0.4 + Math.random() * 0.5; }

  let segmenter = null, segReady = false, loading = false, lastVideoTime = -1, mask = null, mW = 0, mH = 0, sndT = 0;
  async function ensureSegmenter() {
    if (segmenter || loading) return; loading = true; ctx.setTag("loading model…");
    try { const { ImageSegmenter, FilesetResolver } = await import(TASKS_VISION); const fileset = await FilesetResolver.forVisionTasks(TASKS_VISION + "/wasm"); segmenter = await ImageSegmenter.createFromOptions(fileset, { baseOptions: { modelAssetPath: SEG_MODEL, delegate: "GPU" }, runningMode: "VIDEO", outputConfidenceMasks: true, outputCategoryMask: false }); segReady = true; } catch (e) { console.error("segmenter failed", e); ctx.setTag("model failed"); }
  }
  ctx.setHint("Stand in front of the camera and move, black dust gathers into your silhouette on the white.");

  function inMask(u, v) { if (!mask) return 0; const mx = Math.min(mW - 1, Math.max(0, (1 - u) * mW | 0)), my = Math.min(mH - 1, Math.max(0, v * mH | 0)); return mask[my * mW + mx]; }
  function randInMask() { for (let k = 0; k < 16; k++) { const u = Math.random(), v = Math.random(); if (inMask(u, v) > TH) return [u, v]; } return null; }
  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    const dt = frame.dt; fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);

    if (!ctx.cameraLive) {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#9aa3b2"; g.font = "14px Segoe UI, sans-serif"; g.textAlign = "center";
      g.fillText("Enable the camera to gather the dust →", W / 2, H / 2); ctx.setTag("camera off"); return;
    }
    ensureSegmenter();
    const video = ctx.video;
    if (segReady && video.readyState >= 2 && video.currentTime !== lastVideoTime) { lastVideoTime = video.currentTime; const res = segmenter.segmentForVideo(video, performance.now()); const m = res.confidenceMasks?.[0]; if (m) { mW = m.width; mH = m.height; mask = m.getAsFloat32Array(); } res.close?.(); }

    // white wipe with slight persistence
    g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(0, 0, W, H);
    if (!mask) { ctx.setTag("loading model…"); return; }

    const jit = 0.008; let active = 0;
    g.fillStyle = "#0a0a0a";
    for (let i = 0; i < N; i++) {
      if (inMask(x[i], y[i]) > TH) { x[i] += (Math.random() - 0.5) * jit; y[i] += (Math.random() - 0.5) * jit; active++; }
      else if (Math.random() < 0.6) { const r = randInMask(); if (r) { x[i] = r[0]; y[i] = r[1]; } else { x[i] += (Math.random() - 0.5) * jit * 4; y[i] += (Math.random() - 0.5) * jit * 4; } }
      else { x[i] += (Math.random() - 0.5) * jit * 4; y[i] += (Math.random() - 0.5) * jit * 4; }
      if (x[i] < 0) x[i] += 1; else if (x[i] > 1) x[i] -= 1; if (y[i] < 0) y[i] += 1; else if (y[i] > 1) y[i] -= 1;
      g.globalAlpha = al[i]; g.fillRect(x[i] * W, y[i] * H, sz[i], sz[i]);
    }
    g.globalAlpha = 1;

    // light, occasional sand-whisper while a silhouette is present
    sndT -= dt; if (active / N > 0.08 && sndT <= 0) { sfx.tick(); sndT = 0.5 + Math.random() * 0.8; }
    ctx.setTag((100 * active / N).toFixed(0) + "% dust");
  }

  function resize() { fit(); }
  function dispose() { try { segmenter?.close(); } catch {} screen.remove(); }
  return { update, resize, dispose };
}
