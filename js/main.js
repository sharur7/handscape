import { HandTracker } from "./handTracking.js";
import { EXPERIENCES } from "./experiences/registry.js";

// ---------- DOM ----------
const listEl     = document.getElementById("experience-list");
const sceneMount = document.getElementById("scene-mount");
const sceneTitle = document.getElementById("scene-title");
const sceneTag   = document.getElementById("scene-tag");
const sceneHint  = document.getElementById("scene-hint");
const cursorEl   = document.getElementById("scene-cursor");
const handTag    = document.getElementById("hand-tag");
const camStatus  = document.getElementById("cam-status");
const video      = document.getElementById("cam-video");
const overlay    = document.getElementById("cam-overlay");
const enableBtn  = document.getElementById("enable-cam");
const gameOverlay= document.getElementById("game-overlay");
const goTitle    = document.getElementById("go-title");
const goBody     = document.getElementById("go-instructions");
const goStart    = document.getElementById("go-start");
const goNote     = document.getElementById("go-note");
const resetBtn   = document.getElementById("reset-btn");

// ---------- experience context ----------
const ctx = {
  mount: sceneMount,
  video,                                       // shared camera <video> (may not be playing yet)
  get width()  { return sceneMount.clientWidth; },
  get height() { return sceneMount.clientHeight; },
  get cameraLive() { return tracker.running; },
  setHint: (html) => { sceneHint.innerHTML = html; },
  setTag:  (txt)  => { sceneTag.textContent = txt; }
};

let active = null;      // active experience instance
let activeId = null;
let activeExp = null;   // active experience definition (for restart)
let phase = "intro";    // "intro" (start screen, paused) | "playing"

// ---------- sidebar ----------
function buildSidebar() {
  listEl.innerHTML = "";
  for (const exp of EXPERIENCES) {
    const card = document.createElement("div");
    card.className = "exp-card" + (exp.status === "soon" ? " soon" : "");
    card.dataset.id = exp.id;
    card.innerHTML = `
      <div class="exp-icon">${exp.icon}</div>
      <div class="exp-meta">
        <div class="exp-name">${exp.name}</div>
        <div class="exp-tag">${exp.tag}</div>
      </div>
      <button class="exp-info" title="How to play" aria-label="How to play">i</button>`;
    if (exp.status === "ready") card.addEventListener("click", () => selectExperience(exp.id));
    card.querySelector(".exp-info").addEventListener("click", (e) => { e.stopPropagation(); showInfo(exp, e.currentTarget); });
    listEl.appendChild(card);
  }
}

// ---------- info popover ----------
const infoPop = document.createElement("div");
infoPop.id = "info-pop";
document.body.appendChild(infoPop);
let infoOpenFor = null;
function showInfo(exp, btn) {
  if (infoOpenFor === exp.id) { hideInfo(); return; }
  infoPop.innerHTML = `<div class="ip-title">${exp.icon} ${exp.name}</div><div class="ip-body">${exp.info || exp.tag}</div>`;
  infoPop.classList.add("show");
  const r = btn.getBoundingClientRect();
  let x = r.right + 10, y = r.top - 4;
  const pw = infoPop.offsetWidth, ph = infoPop.offsetHeight;
  if (x + pw > innerWidth - 8) x = r.left - pw - 10;
  if (y + ph > innerHeight - 8) y = innerHeight - ph - 8;
  infoPop.style.left = Math.max(8, x) + "px";
  infoPop.style.top = Math.max(8, y) + "px";
  infoOpenFor = exp.id;
}
function hideInfo() { infoPop.classList.remove("show"); infoOpenFor = null; }
document.addEventListener("click", (e) => { if (!e.target.closest("#info-pop") && !e.target.closest(".exp-info")) hideInfo(); });
window.addEventListener("resize", hideInfo);

function selectExperience(id) {
  if (id === activeId) return;
  const exp = EXPERIENCES.find(e => e.id === id);
  if (!exp || exp.status !== "ready") return;

  if (active?.dispose) active.dispose();
  active = exp.create(ctx);
  activeId = id;
  activeExp = exp;
  sceneTitle.textContent = exp.name;
  sceneTag.textContent = "-";
  active.resize(ctx.width, ctx.height);

  document.querySelectorAll(".exp-card").forEach(c =>
    c.classList.toggle("active", c.dataset.id === id));

  closeMenu();    // on mobile, picking a game closes the menu
  showIntro(exp); // show the Start / how-to screen (paused until Start)
}

// ---------- start screen / reset / camera gate ----------
function showIntro(exp) {
  phase = "intro";
  goTitle.innerHTML = `${exp.icon} ${exp.name}`;
  goBody.innerHTML = exp.info || exp.tag;
  gameOverlay.classList.remove("hidden");
  refreshStartBtn();
}
function refreshStartBtn() {
  goStart.dataset.mode = "start";
  goStart.textContent = "▶ Start";
  goNote.innerHTML = tracker.isLive() ? "Camera ready." : "Press <b>Start</b> to play (we'll enable your camera).";
}
async function startGame() {
  if (!activeExp) return;
  // Camera already live: Start plays straight away.
  if (tracker.isLive()) { phase = "playing"; gameOverlay.classList.add("hidden"); return; }
  // Camera off: first press of Start turns into an explicit "Enable camera" step.
  if (goStart.dataset.mode !== "enable") {
    goStart.dataset.mode = "enable";
    goStart.textContent = "📷 Enable camera";
    goNote.innerHTML = "Tap to turn on your <b>webcam</b>, then the game starts.";
    return;
  }
  // Second press: enable the camera, then start automatically once it's live.
  goStart.disabled = true; goNote.innerHTML = "Turning on the camera…";
  try { await enableCamera(); } catch (e) { console.error(e); }
  goStart.disabled = false;
  if (tracker.isLive()) { phase = "playing"; gameOverlay.classList.add("hidden"); }
  else { goStart.textContent = "📷 Enable camera"; goNote.innerHTML = "Camera access is needed. Allow it in your browser, then tap again."; }
}
function resetGame() {
  if (!activeExp) return;
  if (active?.dispose) active.dispose();
  active = activeExp.create(ctx);
  active.resize(ctx.width, ctx.height);
  sceneTag.textContent = "-";
  showIntro(activeExp);   // back to the Start / how-to screen, fresh
}
goStart.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);

// ---------- mobile games menu ----------
const appEl = document.getElementById("app");
const menuBtn = document.getElementById("menu-btn");
function closeMenu() { appEl.classList.remove("menu-open"); if (menuBtn) menuBtn.textContent = "☰"; }
menuBtn?.addEventListener("click", () => {
  const open = appEl.classList.toggle("menu-open");
  menuBtn.textContent = open ? "✕" : "☰";
});

// ---------- hand tracking ----------
const tracker = new HandTracker();
tracker.onStatus = (s) => {
  camStatus.textContent = "camera: " + s;
  camStatus.classList.toggle("live", s === "live");
  if (s === "live") { enableBtn.classList.add("hidden"); if (phase === "intro") refreshStartBtn(); }
  if (s === "ended" || s === "error") {
    enableBtn.classList.remove("hidden"); enableBtn.textContent = "▶ Enable camera"; enableBtn.disabled = false;
    if (phase === "playing" && activeExp) { showIntro(activeExp); goNote.innerHTML = "Camera turned off. Allow it again to keep playing."; }
    else if (phase === "intro") refreshStartBtn();
  }
};

async function enableCamera() {              // shared by the cam-panel button and the Start button
  if (tracker.isLive()) return;
  if (!tracker.landmarker) await tracker.loadModel();
  await tracker.startCamera(video, overlay);
}

enableBtn.addEventListener("click", async () => {
  enableBtn.textContent = "starting…";
  enableBtn.disabled = true;
  try {
    await enableCamera();
    enableBtn.classList.add("hidden");
  } catch (err) {
    console.error(err);
    enableBtn.textContent = "⚠ camera failed, retry";
    enableBtn.disabled = false;
    camStatus.textContent = "camera: " + (err?.message || "error");
  }
});

// ---------- primary cursor from hands ----------
function primaryCursor(hands) {
  if (!hands.length) return { present: false, x: 0.5, y: 0.5, pinch: false, rotation: 0, strength: 0 };
  // prefer a pinching hand
  const h = hands.find(h => h.pinch.active) || hands[0];
  return {
    present: true,
    x: h.pinch.x, y: h.pinch.y,
    pinch: h.pinch.active,
    rotation: h.rotation,
    strength: h.pinch.strength
  };
}

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const hands = tracker.process();
  const cursor = primaryCursor(hands);

  // update DOM cursor over the scene panel
  if (cursor.present) {
    cursorEl.classList.add("visible");
    cursorEl.classList.toggle("pinch", cursor.pinch);
    cursorEl.style.left = (cursor.x * ctx.width) + "px";
    cursorEl.style.top  = (cursor.y * ctx.height) + "px";
  } else {
    cursorEl.classList.remove("visible");
  }
  handTag.textContent = hands.length
    ? `${hands.length} hand${hands.length > 1 ? "s" : ""}${cursor.pinch ? " · pinch" : ""}`
    : "no hands";

  if (phase === "playing") {
    if (!tracker.isLive()) {                       // camera lost/revoked → pause back to Start
      if (activeExp) { showIntro(activeExp); goNote.innerHTML = "Camera turned off. Allow it again to keep playing."; }
    } else if (active?.update) {
      active.update({ hands, cursor, dt, t: now / 1000 });
    }
  }

  requestAnimationFrame(frame);
}

// ---------- resize ----------
new ResizeObserver(() => { if (active?.resize) active.resize(ctx.width, ctx.height); })
  .observe(sceneMount);

// ---------- boot ----------
buildSidebar();
selectExperience(EXPERIENCES[0].id);   // first game's Start screen (camera gated)
requestAnimationFrame(frame);

// dismiss the "best on desktop" mobile notice, and reclaim the space it reserved at the top
document.getElementById("mn-close")?.addEventListener("click", () => {
  const n = document.getElementById("mobile-notice"); if (n) n.style.display = "none";
  document.getElementById("app")?.classList.add("notice-dismissed");
  if (active?.resize) active.resize(ctx.width, ctx.height);   // let the game re-fit to the taller stage
});
