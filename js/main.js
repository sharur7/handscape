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
  sceneTitle.textContent = exp.name;
  sceneTag.textContent = "—";
  active.resize(ctx.width, ctx.height);

  document.querySelectorAll(".exp-card").forEach(c =>
    c.classList.toggle("active", c.dataset.id === id));
}

// ---------- hand tracking ----------
const tracker = new HandTracker();
tracker.onStatus = (s) => {
  camStatus.textContent = "camera: " + s;
  camStatus.classList.toggle("live", s === "live");
};

enableBtn.addEventListener("click", async () => {
  enableBtn.textContent = "starting…";
  enableBtn.disabled = true;
  try {
    if (!tracker.landmarker) await tracker.loadModel();
    await tracker.startCamera(video, overlay);
    enableBtn.classList.add("hidden");
  } catch (err) {
    console.error(err);
    enableBtn.textContent = "⚠ camera failed — retry";
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

  if (active?.update) active.update({ hands, cursor, dt, t: now / 1000 });

  requestAnimationFrame(frame);
}

// ---------- resize ----------
new ResizeObserver(() => { if (active?.resize) active.resize(ctx.width, ctx.height); })
  .observe(sceneMount);

// ---------- boot ----------
buildSidebar();
selectExperience("lightbulb");   // show the scene right away (camera optional)
requestAnimationFrame(frame);
