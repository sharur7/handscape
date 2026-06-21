// Stack experience.
// A block swings from the top. PINCH to drop it onto the tower, it lands trimmed
// to the overlap (classic stack game). Reach the FINISH line to win. Miss the tower
// completely and it crashes to the ground = game over. Open palm to restart.

import { sfx } from "../sfx.js";

export function createStack(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  const COLORS = ["#6ad1ff", "#54e08a", "#ffb347", "#ff6ad1", "#b06aff"];
  const GOAL = 10;                  // blocks above the base to win

  let stack, falling, state, pinchPrev, result, swayT;
  function reset() {
    stack = null;                   // built on first frame when we know size
    falling = null; state = "swing"; pinchPrev = false; result = ""; swayT = 0;
  }
  reset();

  ctx.setHint("A block swings up top, <b>pinch</b> to drop it square onto the tower. Reach the line!");

  function fit() {
    const w = mount.clientWidth, h = mount.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; }
  }

  function init(W, H) {
    const bh = 0.05 * H;
    stack = [{ cx: W / 2, w: 0.42 * W, top: H - bh, h: bh }];
  }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04);
    fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    if (!stack) init(W, H);

    const bh = stack[0].h;
    const top = stack[stack.length - 1];
    const finishY = H - bh - (GOAL + 0.5) * bh;
    const swingY = Math.min(finishY - 1.4 * bh, 0.12 * H);
    const cur = frame.cursor;

    if (state === "swing") {
      swayT += dt;
      const cx = W / 2 + Math.sin(swayT * 1.6) * 0.34 * W;
      if (!falling || falling.parked) falling = { cx, w: top.w, top: swingY, h: bh, vy: 0, parked: true };
      else falling.cx = cx, falling.top = swingY;
      // pinch (rising edge) -> drop
      if (cur.present && cur.pinch && !pinchPrev) { falling.parked = false; state = "fall"; }
    } else if (state === "fall") {
      falling.vy += 2.4 * H * dt;
      falling.top += falling.vy * dt;
      if (falling.top + falling.h >= top.top) {
        // landed at tower height, measure overlap
        const fl = falling.cx - falling.w / 2, fr = falling.cx + falling.w / 2;
        const tl = top.cx - top.w / 2, tr = top.cx + top.w / 2;
        const ol = Math.max(fl, tl), or = Math.min(fr, tr);
        const ow = or - ol;
        if (ow <= 2 * dpr) { state = "over"; result = "Missed!"; sfx.boom(); ctx.setHint("Crashed to the ground, hold an <b>open palm</b> to restart."); }
        else {
          const nb = { cx: (ol + or) / 2, w: ow, top: top.top - falling.h, h: falling.h };
          stack.push(nb); falling = null; sfx.thunk();
          if (stack.length - 1 >= GOAL) { state = "win"; result = "You win!"; sfx.chime(); ctx.setHint("Tower complete! Hold an <b>open palm</b> to play again."); }
          else state = "swing";
        }
      }
    }
    pinchPrev = cur.present && cur.pinch;

    // restart
    if ((state === "over" || state === "win") && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) { reset(); init(W, H); }

    // ---------- draw ----------
    g.fillStyle = "#0a0d16"; g.fillRect(0, 0, W, H);
    // ground
    g.fillStyle = "#161b27"; g.fillRect(0, H - bh * 0.18, W, bh * 0.18);
    // finish line
    g.strokeStyle = "rgba(106,209,255,0.8)"; g.lineWidth = 2 * dpr; g.setLineDash([10 * dpr, 8 * dpr]);
    g.beginPath(); g.moveTo(0, finishY); g.lineTo(W, finishY); g.stroke(); g.setLineDash([]);
    g.fillStyle = "#6ad1ff"; g.font = `${12 * dpr}px Segoe UI, sans-serif`; g.textAlign = "left";
    g.fillText("FINISH", 10 * dpr, finishY - 6 * dpr);

    stack.forEach((b, i) => drawBlock(g, b, COLORS[i % COLORS.length]));
    if (falling) drawBlock(g, falling, COLORS[stack.length % COLORS.length]);
    // crane string for swinging block
    if (state === "swing" && falling) {
      g.strokeStyle = "#3a4252"; g.lineWidth = 2 * dpr;
      g.beginPath(); g.moveTo(falling.cx, 0); g.lineTo(falling.cx, falling.top); g.stroke();
    }

    // HUD
    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${18 * dpr}px Segoe UI, sans-serif`;
    g.fillText(`${stack.length - 1}/${GOAL}`, 12 * dpr, 26 * dpr);

    if (state === "over" || state === "win") {
      g.fillStyle = "rgba(5,7,12,0.7)"; g.fillRect(0, 0, W, H);
      g.fillStyle = state === "win" ? "#54e08a" : "#ff6a6a"; g.textAlign = "center";
      g.font = `bold ${40 * dpr}px Segoe UI, sans-serif`; g.fillText(result, W / 2, H / 2);
      g.fillStyle = "#8a93a6"; g.font = `${16 * dpr}px Segoe UI, sans-serif`;
      g.fillText("open your palm to play again", W / 2, H / 2 + 30 * dpr);
    }

    ctx.setTag(state === "win" ? "win!" : state === "over" ? "game over" : `${stack.length - 1}/${GOAL}`);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function drawBlock(g, b, color) {
  g.fillStyle = color;
  g.fillRect(b.cx - b.w / 2, b.top, b.w, b.h);
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.fillRect(b.cx - b.w / 2, b.top, b.w, b.h * 0.28);
}
