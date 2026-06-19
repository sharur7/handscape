// Tic-Tac-Toe experience — two players, pass-and-play with gestures.
// Take turns: hover a cell and PINCH to drop your mark. X (blue) goes first,
// then O (orange) — bring a friend and share the camera. Open palm to reset.

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

import { sfx } from "../sfx.js";

export function createTicTacToe(ctx) {
  const { mount } = ctx;
  const screen = document.createElement("canvas");
  screen.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.insertBefore(screen, mount.firstChild);
  const g = screen.getContext("2d");

  let board, turn, winner, winLine, pinchPrev, placeLock;
  function reset() { board = Array(9).fill(0); turn = 1; winner = 0; winLine = null; pinchPrev = false; placeLock = 0; }
  reset();

  ctx.setHint("Take turns: hover a square and <b>pinch</b> to place your mark. X is blue, O is orange.");

  function fit() {
    const w = mount.clientWidth, h = mount.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    if (screen.width !== (w * dpr | 0) || screen.height !== (h * dpr | 0)) { screen.width = w * dpr | 0; screen.height = h * dpr | 0; }
  }

  function checkWin() {
    for (const L of LINES) { const [a, b, c] = L; if (board[a] && board[a] === board[b] && board[b] === board[c]) { winner = board[a]; winLine = L; return; } }
    if (board.every(v => v)) winner = 3; // draw
  }

  function update(frame) {
    const dt = frame.dt;
    fit();
    const W = screen.width, H = screen.height, dpr = Math.min(devicePixelRatio, 2);
    const size = Math.min(W, H) * 0.72;
    const gx0 = (W - size) / 2, gy0 = (H - size) / 2 + 14 * dpr, cell = size / 3;
    const cur = frame.cursor;
    if (placeLock > 0) placeLock -= dt;

    // hovered cell
    let hover = -1;
    if (cur.present && !winner) {
      const px = cur.x * W, py = cur.y * H;
      const col = Math.floor((px - gx0) / cell), row = Math.floor((py - gy0) / cell);
      if (col >= 0 && col < 3 && row >= 0 && row < 3) hover = row * 3 + col;
    }
    // place on pinch rising-edge
    const pinch = cur.present && cur.pinch;
    if (pinch && !pinchPrev && hover >= 0 && !board[hover] && !winner && placeLock <= 0) {
      board[hover] = turn; checkWin();
      if (winner && winner !== 3) sfx.chime(); else sfx.click();
      if (!winner) turn = turn === 1 ? 2 : 1;
      placeLock = 0.4;
    }
    pinchPrev = pinch;

    // restart
    if (winner && frame.hands.some(h => h.openness > 0.7 && !h.pinch.active)) reset();

    // ---------- draw ----------
    g.fillStyle = "#0a0d16"; g.fillRect(0, 0, W, H);

    // turn / result banner
    g.textAlign = "center"; g.font = `bold ${20 * dpr}px Segoe UI, sans-serif`;
    if (!winner) { g.fillStyle = turn === 1 ? "#6ad1ff" : "#ffb347"; g.fillText((turn === 1 ? "X" : "O") + " — your turn", W / 2, 26 * dpr); }
    else if (winner === 3) { g.fillStyle = "#e8edf6"; g.fillText("Draw — open palm to replay", W / 2, 26 * dpr); }
    else { g.fillStyle = winner === 1 ? "#6ad1ff" : "#ffb347"; g.fillText((winner === 1 ? "X" : "O") + " wins! — open palm to replay", W / 2, 26 * dpr); }

    // grid
    g.strokeStyle = "#2a3242"; g.lineWidth = 4 * dpr;
    for (let i = 1; i < 3; i++) {
      g.beginPath(); g.moveTo(gx0 + i * cell, gy0); g.lineTo(gx0 + i * cell, gy0 + size); g.stroke();
      g.beginPath(); g.moveTo(gx0, gy0 + i * cell); g.lineTo(gx0 + size, gy0 + i * cell); g.stroke();
    }

    // hover highlight
    if (hover >= 0 && !board[hover]) {
      const r = (hover / 3 | 0), c = hover % 3;
      g.fillStyle = (turn === 1 ? "rgba(106,209,255,0.14)" : "rgba(255,179,71,0.14)");
      g.fillRect(gx0 + c * cell, gy0 + r * cell, cell, cell);
    }

    // marks
    for (let i = 0; i < 9; i++) {
      if (!board[i]) continue;
      const r = (i / 3 | 0), c = i % 3;
      const x = gx0 + c * cell + cell / 2, y = gy0 + r * cell + cell / 2, s = cell * 0.28;
      g.lineWidth = 8 * dpr; g.lineCap = "round";
      if (board[i] === 1) { g.strokeStyle = "#6ad1ff"; g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke(); }
      else { g.strokeStyle = "#ffb347"; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.stroke(); }
    }

    // winning line
    if (winLine) {
      const a = winLine[0], b = winLine[2];
      const ax = gx0 + (a % 3) * cell + cell / 2, ay = gy0 + ((a / 3 | 0)) * cell + cell / 2;
      const bx = gx0 + (b % 3) * cell + cell / 2, by = gy0 + ((b / 3 | 0)) * cell + cell / 2;
      g.strokeStyle = "#fff"; g.lineWidth = 6 * dpr; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }

    // cursor
    if (cur.present) {
      g.beginPath(); g.arc(cur.x * W, cur.y * H, (cur.pinch ? 7 : 11) * dpr, 0, Math.PI * 2);
      g.fillStyle = cur.pinch ? (turn === 1 ? "#6ad1ff" : "#ffb347") : "rgba(255,255,255,0.35)"; g.fill();
    }

    ctx.setTag(winner ? (winner === 3 ? "draw" : (winner === 1 ? "X wins" : "O wins")) : (turn === 1 ? "X turn" : "O turn"));
  }

  function resize() { fit(); }
  function dispose() { screen.remove(); }
  return { update, resize, dispose };
}
