// Kaleidoscope Mirror experience.
// Your camera feed is reflected into rotating kaleidoscope wedges. Just move around!

export function createKaleidoscope(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");
  const SEG = 12;

  ctx.setHint("Move in front of the camera — your reflection becomes a living kaleidoscope.");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }

  function update(frame) {
    fit();
    const W = screen.width, H = screen.height, t = frame.t, dpr = Math.min(devicePixelRatio, 2);
    const video = ctx.video;
    if (!ctx.cameraLive || video.readyState < 2) {
      g.fillStyle = "#0a0d16"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#9aa3b2"; g.font = `${15 * dpr}px Segoe UI, sans-serif`; g.textAlign = "center";
      g.fillText("Enable the camera to start the kaleidoscope →", W / 2, H / 2);
      ctx.setTag("camera off"); return;
    }

    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
    const ang = Math.PI * 2 / SEG;
    const vw = video.videoWidth, vh = video.videoHeight;
    // sample a roaming sub-region of the camera
    const zoom = 0.45, sw = vw * zoom, sh = vh * zoom;
    const sx = (vw - sw) / 2 + Math.sin(t * 0.3) * (vw - sw) / 2;
    const sy = (vh - sh) / 2 + Math.cos(t * 0.23) * (vh - sh) / 2;

    for (let i = 0; i < SEG; i++) {
      g.save();
      g.translate(cx, cy); g.rotate(i * ang + t * 0.15);
      if (i % 2) g.scale(-1, 1);
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, -ang / 2, ang / 2); g.closePath(); g.clip();
      g.drawImage(video, sx, sy, sw, sh, -R, -R, R * 2, R * 2);
      g.restore();
    }
    // soft center
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.25);
    gl.addColorStop(0, "rgba(255,255,255,0.12)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, R * 0.25, 0, Math.PI * 2); g.fill();
    ctx.setTag("reflecting");
  }
  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}
