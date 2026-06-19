// Air Draw experience.
// Pinch to draw glowing strokes; open your hand to lift. Hover a colour swatch
// (top-left) to switch, hover Clear (top-right) to wipe.
// Uses SPEED-ADAPTIVE smoothing: heavy smoothing when slow (no wobble), light when
// fast (no lag), plus quadratic curves + pinch hysteresis for clean strokes.

const COLORS = ["#6ad1ff", "#ffb347", "#54e08a", "#ff6ad1", "#ffffff", "#b06aff"];

export function createAirDraw(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  const paint = document.createElement("canvas");
  paint.width = 1600; paint.height = 900;
  const pg = paint.getContext("2d");
  pg.lineCap = "round"; pg.lineJoin = "round";

  let color = COLORS[0], clearHover = 0;
  let drawing = false, pen = null, prevPt = null, lastDraw = null;

  ctx.setHint("<b>Pinch</b> to draw, open hand to lift. Hover a colour to switch · hover <b>Clear</b> to wipe.");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    fit();
    const dt = Math.max(0.001, Math.min(frame.dt, 0.05));
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const cur = frame.cursor;

    const sw = 38 * dpr, gap = 8 * dpr, pad = 14 * dpr;
    const swatches = COLORS.map((c, i) => ({ c, x: pad + i * (sw + gap), y: pad, s: sw }));
    // big Clear button right after the colour swatches
    const clearBox = { x: pad + COLORS.length * (sw + gap) + 14 * dpr, y: pad, w: 130 * dpr, h: sw };

    let overUI = false;
    if (cur.present) {
      const cx = cur.x * W, cy = cur.y * H;
      for (const s of swatches) if (cx >= s.x && cx <= s.x + s.s && cy >= s.y && cy <= s.y + s.s) { if (!drawing) color = s.c; overUI = true; }
      const overClear = cx >= clearBox.x && cx <= clearBox.x + clearBox.w && cy >= clearBox.y && cy <= clearBox.y + clearBox.h;
      if (overClear && !drawing) { overUI = true; clearHover += dt; if (clearHover > 0.5) { pg.clearRect(0, 0, paint.width, paint.height); clearHover = 0; } }
      else clearHover = 0;
    } else clearHover = 0;

    const s = cur.present ? (cur.strength || 0) : 0;
    const wantDraw = cur.present && !overUI && (drawing ? s > 0.3 : s > 0.55);

    if (wantDraw) {
      if (!pen) pen = { x: cur.x, y: cur.y };
      // speed-adaptive alpha: slow -> 0.18 (smooth), fast -> 0.85 (responsive)
      const speed = Math.hypot(cur.x - pen.x, cur.y - pen.y) / dt;
      const alpha = Math.max(0.18, Math.min(0.85, 0.18 + speed * 1.1));
      pen.x += (cur.x - pen.x) * alpha; pen.y += (cur.y - pen.y) * alpha;
      const p = { x: pen.x * paint.width, y: pen.y * paint.height };
      if (!drawing) { drawing = true; prevPt = p; lastDraw = p; }
      else {
        const mid = { x: (prevPt.x + p.x) / 2, y: (prevPt.y + p.y) / 2 };
        pg.strokeStyle = color; pg.lineWidth = 8; pg.shadowColor = color; pg.shadowBlur = 12;
        pg.beginPath(); pg.moveTo(lastDraw.x, lastDraw.y); pg.quadraticCurveTo(prevPt.x, prevPt.y, mid.x, mid.y); pg.stroke(); pg.shadowBlur = 0;
        lastDraw = mid; prevPt = p;
      }
    } else { drawing = false; pen = null; prevPt = null; lastDraw = null; }

    // compose
    g.fillStyle = "#070a11"; g.fillRect(0, 0, W, H);
    g.drawImage(paint, 0, 0, W, H);
    for (const s2 of swatches) { g.fillStyle = s2.c; g.fillRect(s2.x, s2.y, s2.s, s2.s); if (s2.c === color) { g.strokeStyle = "#fff"; g.lineWidth = 3; g.strokeRect(s2.x - 1, s2.y - 1, s2.s + 2, s2.s + 2); } }
    g.fillStyle = "rgba(40,46,58,0.9)"; g.fillRect(clearBox.x, clearBox.y, clearBox.w, clearBox.h);
    if (clearHover > 0) { g.fillStyle = "rgba(255,90,90,0.85)"; g.fillRect(clearBox.x, clearBox.y, clearBox.w * Math.min(1, clearHover / 0.5), clearBox.h); }   // fill as you hold
    g.strokeStyle = "#ff6a6a"; g.lineWidth = 2 * dpr; g.strokeRect(clearBox.x, clearBox.y, clearBox.w, clearBox.h);
    g.fillStyle = "#fff"; g.font = `bold ${16 * dpr}px Segoe UI`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("🗑 Clear", clearBox.x + clearBox.w / 2, clearBox.y + clearBox.h / 2); g.textBaseline = "alphabetic";
    if (cur.present) { const cx = (pen ? pen.x : cur.x) * W, cy = (pen ? pen.y : cur.y) * H; g.beginPath(); g.arc(cx, cy, (drawing ? 6 : 10) * dpr, 0, Math.PI * 2); g.fillStyle = drawing ? color : "rgba(255,255,255,0.4)"; g.fill(); g.strokeStyle = color; g.lineWidth = 2; g.stroke(); }
    ctx.setTag(cur.present ? (drawing ? "drawing" : "pen up") : "show your hand");
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}
