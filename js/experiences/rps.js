// Rock Paper Scissors experience.
// On "Shoot!" hold up ✊ rock (fist), ✋ paper (open hand) or ✌️ scissors (two fingers).
// Best the computer — first to read your move when the countdown hits zero.
import { sfx } from "../sfx.js";

const EMO = { rock: "✊", paper: "✋", scissors: "✌️", none: "✋?" };
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };

export function createRPS(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let you = 0, cpu = 0, phase = "ready", timer = 3, playerMove = "none", cpuMove = "rock", result = "", prevPinch = false;
  ctx.setHint("On <b>Shoot!</b> show ✊ rock (fist), ✋ paper (open hand) or ✌️ scissors (two fingers).");

  function fit() { const w = mount.clientWidth, h = mount.clientHeight, dpr = Math.min(devicePixelRatio, 2); if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; } }
  function detect(hand) {
    if (!hand) return "none";
    const f = hand.fingersUp, n = (f[1] ? 1 : 0) + (f[2] ? 1 : 0) + (f[3] ? 1 : 0) + (f[4] ? 1 : 0);
    if (n === 0) return "rock";
    if (f[1] && f[2] && !f[3] && !f[4]) return "scissors";
    if (n >= 3) return "paper";
    return "none";
  }

  function update(frame) {
    const dt = Math.min(frame.dt, 0.05); fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const live = detect(frame.hands[0]);
    const pinch = frame.cursor.present && frame.cursor.pinch;
    if (phase === "ready" && pinch && !prevPinch) { phase = "count"; timer = 3; you = 0; cpu = 0; result = ""; }
    prevPinch = pinch;

    if (phase !== "ready") timer -= dt;
    if (phase === "count") {
      if (timer <= 0) {
        playerMove = live; cpuMove = ["rock", "paper", "scissors"][(Math.random() * 3) | 0];
        if (playerMove === "none") result = "no move!";
        else if (playerMove === cpuMove) result = "Draw";
        else if (BEATS[playerMove] === cpuMove) { result = "You win!"; you++; sfx.chime(); }
        else { result = "You lose"; cpu++; sfx.thunk(); }
        phase = "reveal"; timer = 2.6;
      }
    } else if (phase === "reveal" && timer <= 0) { phase = "count"; timer = 3; result = ""; }

    // ---------- draw ----------
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#141a2a"); bg.addColorStop(1, "#0a0d16");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);

    // scoreboard
    g.textAlign = "center"; g.fillStyle = "#6ad1ff"; g.font = `bold ${22 * dpr}px Segoe UI`; g.fillText("YOU  " + you, W * 0.28, 40 * dpr);
    g.fillStyle = "#ff6a6a"; g.fillText(cpu + "  CPU", W * 0.72, 40 * dpr);

    const emo = (m, x) => { g.font = `${Math.min(110, W / 7)}px serif`; g.fillText(EMO[m] || "✊", x, H * 0.52); };
    if (phase === "ready") {
      g.fillStyle = "#e8edf6"; g.font = `bold ${30 * dpr}px Segoe UI`; g.fillText("Rock · Paper · Scissors", W / 2, H * 0.4);
      g.font = `${56 * dpr}px serif`; g.fillText("✊ ✋ ✌️", W / 2, H * 0.55);
      g.fillStyle = "#54e08a"; g.font = `bold ${22 * dpr}px Segoe UI`; g.fillText("✊ Pinch to start", W / 2, H * 0.72);
      ctx.setTag("ready"); return;
    }
    if (phase === "count") {
      g.fillStyle = "#fff"; g.font = `bold ${Math.min(120, W / 6)}px Segoe UI`; g.fillText(Math.max(1, Math.ceil(timer)), W / 2, H * 0.52);
      g.fillStyle = "#8a93a6"; g.font = `${18 * dpr}px Segoe UI`; g.fillText("get ready… you're showing: " + (EMO[live] || "—"), W / 2, H * 0.72);
    } else {
      g.fillStyle = "#cfd6e2"; emo(playerMove, W * 0.28); emo(cpuMove, W * 0.72);
      g.fillStyle = "#8a93a6"; g.font = `${16 * dpr}px Segoe UI`; g.fillText("you", W * 0.28, H * 0.62); g.fillText("computer", W * 0.72, H * 0.62);
      g.fillStyle = result.startsWith("You win") ? "#54e08a" : result === "Draw" ? "#ffd23f" : "#ff6a6a";
      g.font = `bold ${Math.min(48, W / 9)}px Segoe UI`; g.fillText(result, W / 2, H * 0.84);
    }
    if (!frame.hands.length && phase === "count") { g.fillStyle = "#8a93a6"; g.font = `${14 * dpr}px Segoe UI`; g.fillText("show your hand", W / 2, H * 0.9); }
    ctx.setTag(`you ${you} · cpu ${cpu}`);
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}
