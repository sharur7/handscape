// Hand tracking via MediaPipe Tasks-Vision (HandLandmarker).
// Produces normalized, MIRRORED hand data so it lines up with the selfie video
// and the interactive scene (both use 0..1, x to the right, y down).
//
// NOTE: MediaPipe is imported lazily (inside loadModel) so the UI + Three.js
// scene boot instantly and don't block on the heavy CDN download.

const TASKS_VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";

// Landmark index reference
const WRIST = 0, THUMB_TIP = 4, INDEX_MCP = 5, INDEX_TIP = 8,
      MIDDLE_MCP = 9, MIDDLE_TIP = 12, RING_TIP = 16, PINKY_MCP = 17, PINKY_TIP = 20;

// Connections for drawing the skeleton overlay
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],          // thumb
  [0,5],[5,6],[6,7],[7,8],          // index
  [5,9],[9,10],[10,11],[11,12],     // middle
  [9,13],[13,14],[14,15],[15,16],   // ring
  [13,17],[17,18],[18,19],[19,20],  // pinky
  [0,17]                            // palm base
];

export class HandTracker {
  constructor() {
    this.landmarker = null;
    this.video = null;
    this.overlay = null;
    this.ctx = null;
    this.running = false;
    this.lastVideoTime = -1;
    this.hands = [];          // processed hand frames
    this.onStatus = () => {};
  }

  async loadModel() {
    this.onStatus("loading model…");
    const { HandLandmarker, FilesetResolver } = await import(TASKS_VISION);
    const fileset = await FilesetResolver.forVisionTasks(TASKS_VISION + "/wasm");
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
  }

  async startCamera(videoEl, overlayEl) {
    this.video = videoEl;
    this.overlay = overlayEl;
    this.ctx = overlayEl.getContext("2d");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false
    });
    this.video.srcObject = stream;
    await this.video.play();
    this.running = true;
    this.onStatus("live");
  }

  stop() {
    this.running = false;
    const s = this.video?.srcObject;
    if (s) s.getTracks().forEach(t => t.stop());
  }

  // call once per animation frame; returns array of processed hands
  process() {
    if (!this.running || !this.landmarker || this.video.readyState < 2) return this.hands;

    // keep overlay canvas sized to its element
    const w = this.overlay.clientWidth, h = this.overlay.clientHeight;
    if (this.overlay.width !== w || this.overlay.height !== h) {
      this.overlay.width = w; this.overlay.height = h;
    }

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      const res = this.landmarker.detectForVideo(this.video, performance.now());
      this.hands = this._build(res);
    }
    this._draw();
    return this.hands;
  }

  _build(res) {
    const out = [];
    const lms = res.landmarks || [];
    for (let i = 0; i < lms.length; i++) {
      const raw = lms[i];
      // mirror x so it matches the selfie-flipped video display
      const lm = raw.map(p => ({ x: 1 - p.x, y: p.y, z: p.z }));
      const handed = res.handedness?.[i]?.[0]?.categoryName || "?";
      // because we mirrored x, swap the reported handedness to feel natural
      const handedness = handed === "Left" ? "Right" : handed === "Right" ? "Left" : "?";

      const handSize = dist(lm[WRIST], lm[MIDDLE_MCP]) || 0.0001;
      const pinchDist = dist(lm[THUMB_TIP], lm[INDEX_TIP]) / handSize;
      const pinchActive = pinchDist < 0.55;
      const pinchStrength = clamp(1 - (pinchDist - 0.25) / 0.6, 0, 1);

      // hand orientation: wrist -> middle-finger base
      const rotation = Math.atan2(
        lm[MIDDLE_MCP].y - lm[WRIST].y,
        lm[MIDDLE_MCP].x - lm[WRIST].x
      );

      out.push({
        handedness,
        landmarks: lm,
        rotation,
        pinch: {
          active: pinchActive,
          strength: pinchStrength,
          x: (lm[THUMB_TIP].x + lm[INDEX_TIP].x) / 2,
          y: (lm[THUMB_TIP].y + lm[INDEX_TIP].y) / 2
        },
        pointer: { x: lm[INDEX_TIP].x, y: lm[INDEX_TIP].y },
        openness: fingersOpen(lm, handSize),
        fingersUp: fingersUp(lm)        // [thumb, index, middle, ring, pinky] extended?
      });
    }
    return out;
  }

  _draw() {
    const ctx = this.ctx;
    const w = this.overlay.width, h = this.overlay.height;
    ctx.clearRect(0, 0, w, h);
    const M = this._fitMap();   // normalized video coords -> canvas px (object-fit:contain aware)
    for (const hand of this.hands) {
      const lm = hand.landmarks;
      // connections
      ctx.lineWidth = 3;
      ctx.strokeStyle = hand.pinch.active ? "rgba(255,179,71,.9)" : "rgba(106,209,255,.75)";
      ctx.beginPath();
      for (const [a, b] of HAND_CONNECTIONS) {
        const p = M(lm[a].x, lm[a].y), q = M(lm[b].x, lm[b].y);
        ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
      // joints
      for (let i = 0; i < lm.length; i++) {
        const tip = (i === THUMB_TIP || i === INDEX_TIP || i === MIDDLE_TIP || i === RING_TIP || i === PINKY_TIP);
        ctx.fillStyle = tip ? "#ffffff" : "rgba(180,200,230,.85)";
        const p = M(lm[i].x, lm[i].y);
        ctx.beginPath();
        ctx.arc(p[0], p[1], tip ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // pinch marker
      if (hand.pinch.active) {
        ctx.strokeStyle = "rgba(255,179,71,1)";
        ctx.lineWidth = 2;
        const p = M(hand.pinch.x, hand.pinch.y);
        ctx.beginPath();
        ctx.arc(p[0], p[1], 16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // The <video> uses object-fit:contain, which fits the whole frame inside the
  // panel (letterboxed). Landmarks are normalized to the full frame, so we apply
  // the same contain transform here — otherwise the skeleton drifts off the hand.
  _fitMap() {
    const cw = this.overlay.width, ch = this.overlay.height;
    const vw = this.video.videoWidth || 16, vh = this.video.videoHeight || 9;
    const va = vw / vh, ca = cw / ch;
    let dw, dh;
    if (va > ca) { dw = cw; dh = cw / va; } else { dh = ch; dw = ch * va; }
    const ox = (cw - dw) / 2, oy = (ch - dh) / 2;
    return (x, y) => [ox + x * dw, oy + y * dh];
  }
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// rough 0..1 measure of how open the whole hand is (1 = open palm)
function fingersOpen(lm, handSize) {
  const tips = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
  const mcps = [INDEX_MCP, MIDDLE_MCP, 13, PINKY_MCP];
  let sum = 0;
  for (let i = 0; i < tips.length; i++) sum += dist(lm[tips[i]], lm[WRIST]) - dist(lm[mcps[i]], lm[WRIST]);
  return clamp((sum / handSize) / 3, 0, 1);
}

// which fingers are extended ("up"): a finger is up when its tip is farther from
// the wrist than its middle (PIP) joint. Returns [thumb,index,middle,ring,pinky].
function fingersUp(lm) {
  const w = lm[WRIST];
  const up = (tip, pip) => dist(lm[tip], w) > dist(lm[pip], w) * 1.05;
  return [
    dist(lm[THUMB_TIP], w) > dist(lm[3], w) * 1.05,   // thumb (rough)
    up(INDEX_TIP, 6),
    up(MIDDLE_TIP, 10),
    up(RING_TIP, 14),
    up(PINKY_TIP, 18)
  ];
}
