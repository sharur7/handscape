// Fishing experience.
// A hook hangs in the tank and slowly sinks. Move your hand to position it; when a
// fish touches the hook it's caught on. Then CIRCLE YOUR PALM (wind the reel) to pull
// the line up — land the fish at the top to score.
import { sfx } from "../sfx.js";

const FISHC = ["#ff8c42", "#6ad1ff", "#54e08a", "#ffd23f", "#ff6ad1"];

export function createFishing(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let fish = [], hookX = 0.5, depth = 0.5, hooked = null, score = 0, hist = [], reelGlow = 0, reelDir = 1, reelSnd = 0, spawnT = 0;
  ctx.setHint("Aim the hook with your hand. Circle your palm <b>clockwise to reel up</b>, anticlockwise to drop it deeper.");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }
  function spawn() { const dir = Math.random() < 0.5 ? 1 : -1; fish.push({ x: dir < 0 ? 1.1 : -0.1, y: 0.35 + Math.random() * 0.5, vx: dir * (0.06 + Math.random() * 0.06), size: 0.04 + Math.random() * 0.025, c: FISHC[(Math.random() * FISHC.length) | 0], hooked: false }); }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.04), t = frame.t; fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const top = 0.12;

    spawnT -= dt; if (spawnT <= 0 && fish.length < 6) { spawn(); spawnT = 1.2; }
    if (reelGlow > 0) reelGlow -= dt * 2; if (reelSnd > 0) reelSnd -= dt;

    const hand = frame.hands[0];
    let winding = 0;
    if (hand) {
      const p = { x: hand.landmarks[9].x, y: hand.landmarks[9].y };
      hist.push(p); if (hist.length > 14) hist.shift();
      const cx = hist.reduce((s, q) => s + q.x, 0) / hist.length, cy = hist.reduce((s, q) => s + q.y, 0) / hist.length;
      hookX += (cx - hookX) * Math.min(1, dt * 6);
      if (hist.length >= 3) {
        const a = hist[hist.length - 2], b = hist[hist.length - 1];
        const rax = a.x - cx, ray = a.y - cy, rbx = b.x - cx, rby = b.y - cy;
        if (Math.hypot(rax, ray) > 0.012 && Math.hypot(rbx, rby) > 0.012) {
          const cross = rax * rby - ray * rbx, dot = rax * rbx + ray * rby;
          winding = Math.atan2(cross, dot);     // signed: +clockwise (screen), −anticlockwise
        }
      }
    } else hist = [];

    // gentle idle sink; CLOCKWISE circle reels up, ANTICLOCKWISE reels down
    depth += 0.02 * dt;
    if (Math.abs(winding) > 0.02) { depth -= winding * 0.16; reelGlow = 1; reelDir = winding > 0 ? 1 : -1; if (reelSnd <= 0) { sfx.tick(); reelSnd = 0.12; } }
    depth = Math.max(top, Math.min(0.92, depth));
    const hx = hookX * W, hy = depth * H;

    // fish movement
    for (const f of fish) { if (!f.hooked) { f.x += f.vx * dt; } }
    fish = fish.filter(f => f.hooked || (f.x > -0.2 && f.x < 1.2));
    // hook a fish
    if (!hooked) for (const f of fish) if (!f.hooked && Math.hypot(f.x * W - hx, f.y * H - hy) < (f.size + 0.02) * H) { f.hooked = true; hooked = f; break; }
    if (hooked) { hooked.x = hookX; hooked.y = depth + 0.03; }
    // landed?
    if (hooked && depth <= top + 0.02) { score++; sfx.pop(); fish = fish.filter(f => f !== hooked); hooked = null; depth = 0.4; }

    // ---------- draw ----------
    const water = g.createLinearGradient(0, 0, 0, H); water.addColorStop(0, "#0e2336"); water.addColorStop(1, "#06121d");
    g.fillStyle = water; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(120,200,255,0.05)"; for (let i = 0; i < 5; i++) { const yy = (i / 5 + (t * 0.02 % 0.2)) * H; g.fillRect(0, yy, W, 2 * dpr); }
    g.fillStyle = "#11151f"; g.fillRect(0, 0, W, top * H);   // surface/air band

    for (const f of fish) if (!f.hooked) drawFish(g, f.x * W, f.y * H, f.size * H, f.c, f.vx < 0);
    // line + hook
    g.strokeStyle = "rgba(220,230,245,0.5)"; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(hx, 0); g.lineTo(hx, hy); g.stroke();
    g.strokeStyle = "#cfd6e2"; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(hx, hy + 6 * dpr, 6 * dpr, Math.PI * 0.1, Math.PI * 1.5); g.stroke();
    if (hooked) drawFish(g, hooked.x * W, hooked.y * H, hooked.size * H, hooked.c, true, true);

    // reel indicator
    g.save(); g.translate(W - 34 * dpr, 34 * dpr); g.rotate(t * (reelGlow > 0 ? 12 * reelDir : 2));
    g.strokeStyle = reelGlow > 0 ? "#54e08a" : "#3a4150"; g.lineWidth = 4 * dpr; g.beginPath(); g.arc(0, 0, 14 * dpr, 0, Math.PI * 2); g.moveTo(-14 * dpr, 0); g.lineTo(14 * dpr, 0); g.moveTo(0, -14 * dpr); g.lineTo(0, 14 * dpr); g.stroke(); g.restore();

    g.fillStyle = "#e8edf6"; g.textAlign = "left"; g.font = `bold ${20 * dpr}px Segoe UI`; g.fillText("🐟 " + score, 16 * dpr, 30 * dpr);
    if (hooked) { g.fillStyle = "#54e08a"; g.textAlign = "center"; g.font = `bold ${16 * dpr}px Segoe UI`; g.fillText("Fish on! Circle palm CLOCKWISE to reel up", W / 2, H - 20 * dpr); }
    else if (!hand) { g.fillStyle = "#8a93a6"; g.textAlign = "center"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("show your hand to fish", W / 2, H - 20 * dpr); }
    ctx.setTag("caught " + score);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}

function drawFish(g, x, y, r, c, faceLeft, wiggle) {
  g.save(); g.translate(x, y); if (faceLeft) g.scale(-1, 1);
  g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(-r, 0); g.lineTo(-r * 1.6, -r * 0.5); g.lineTo(-r * 1.6, r * 0.5); g.closePath(); g.fill();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(r * 0.5, -r * 0.15, r * 0.14, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(r * 0.55, -r * 0.15, r * 0.07, 0, Math.PI * 2); g.fill();
  g.restore();
}
