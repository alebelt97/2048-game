'use strict';

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  board: [],
  score: 0,
  best: 0,
  won: false,
  over: false,
  keepPlaying: false
};

// ─── DOM references ───────────────────────────────────────────────────────────

const scoreEl     = document.getElementById('score');
const bestEl      = document.getElementById('best');
const gridTiles   = document.getElementById('grid-tiles');
const overlayOver = document.getElementById('overlay-over');
const overlayWin  = document.getElementById('overlay-win');

let tileElements = [];

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  gridTiles.innerHTML = '';
  tileElements = [];
  for (let r = 0; r < 4; r++) {
    tileElements[r] = [];
    for (let c = 0; c < 4; c++) {
      const el = document.createElement('div');
      el.className = 'tile';
      gridTiles.appendChild(el);
      tileElements[r][c] = el;
    }
  }

  state.best = parseInt(localStorage.getItem('2048-best') || '0', 10);
  newGame();
}

function newGame() {
  state.board = createBoard();
  state.score = 0;
  state.won = false;
  state.over = false;
  state.keepPlaying = false;

  overlayOver.classList.remove('visible');
  overlayWin.classList.remove('visible');

  spawnTile();
  spawnTile();
  render();
}

// ─── Board helpers ────────────────────────────────────────────────────────────

function createBoard() {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function spawnTile() {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (state.board[r][c] === 0) empty.push([r, c]);

  if (empty.length === 0) return;

  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  state.board[r][c] = Math.random() < 0.9 ? 2 : 4;

  if (tileElements[r] && tileElements[r][c]) {
    tileElements[r][c].dataset.animate = 'new';
  }
}

// ─── Core slide algorithm ─────────────────────────────────────────────────────

function slideRow(row) {
  const merged = [false, false, false, false];
  let compacted = row.filter(v => v !== 0);

  let scoreGained = 0;
  for (let i = 0; i < compacted.length - 1; i++) {
    if (compacted[i] === compacted[i + 1]) {
      compacted[i] *= 2;
      scoreGained += compacted[i];
      compacted.splice(i + 1, 1);
      merged[i] = true;
    }
  }

  while (compacted.length < 4) compacted.push(0);
  return { row: compacted, scoreGained, merged };
}

// ─── Board transformations ────────────────────────────────────────────────────

function transpose(board) {
  return board[0].map((_, c) => board.map(row => row[c]));
}

function reverseRows(board) {
  return board.map(row => [...row].reverse());
}

// ─── Move ─────────────────────────────────────────────────────────────────────

function move(direction) {
  if (state.over) return false;
  if (state.won && !state.keepPlaying) return false;

  const before = state.board.map(r => [...r]);

  let working = state.board.map(r => [...r]);
  if (direction === 'right') working = reverseRows(working);
  if (direction === 'up')    working = transpose(working);
  if (direction === 'down')  working = reverseRows(transpose(working));

  let totalScore = 0;
  const mergeMap = createBoard();

  for (let r = 0; r < 4; r++) {
    const { row, scoreGained, merged } = slideRow(working[r]);
    working[r] = row;
    totalScore += scoreGained;
    for (let c = 0; c < 4; c++) {
      if (merged[c]) mergeMap[r][c] = 1;
    }
  }

  if (direction === 'right') working = reverseRows(working);
  if (direction === 'up')    working = transpose(working);
  if (direction === 'down')  working = transpose(reverseRows(working));

  let finalMergeMap = mergeMap;
  if (direction === 'right') finalMergeMap = reverseRows(mergeMap);
  if (direction === 'up')    finalMergeMap = transpose(mergeMap);
  if (direction === 'down')  finalMergeMap = transpose(reverseRows(mergeMap));

  const changed = working.some((row, r) => row.some((v, c) => v !== before[r][c]));
  if (!changed) return false;

  state.board = working;
  state.score += totalScore;
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('2048-best', state.best);
  }

  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (finalMergeMap[r][c]) tileElements[r][c].dataset.animate = 'merged';

  spawnTile();
  checkWin();
  if (!state.won || state.keepPlaying) checkGameOver();

  render();
  return true;
}

// ─── Win / Game-over detection ────────────────────────────────────────────────

function checkWin() {
  if (state.won) return;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (state.board[r][c] === 2048) {
        state.won = true;
        launchConfetti();
        return;
      }
}

function checkGameOver() {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (state.board[r][c] === 0) return;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = state.board[r][c];
      if (c < 3 && state.board[r][c + 1] === v) return;
      if (r < 3 && state.board[r + 1][c] === v) return;
    }
  }

  state.over = true;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function launchConfetti() {
  const colors = ['#f67c5f', '#edc22e', '#edcf72', '#f2b179', '#f9f6f2'];
  confetti({ particleCount: 120, spread: 70, origin: { y: 0.55 }, colors });
  setTimeout(() => confetti({ particleCount: 80, angle: 60,  spread: 60, origin: { x: 0, y: 0.6 }, colors }), 350);
  setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors }), 700);
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  scoreEl.textContent = state.score;
  bestEl.textContent  = state.best;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const el  = tileElements[r][c];
      const val = state.board[r][c];

      el.textContent       = val === 0 ? '' : val;
      el.dataset.value     = val === 0 ? '' : val;

      const anim = el.dataset.animate;
      delete el.dataset.animate;

      if (anim === 'new' && val !== 0) {
        anime({
          targets: el,
          scale: [0, 1],
          duration: 220,
          easing: 'spring(1, 90, 12, 0)'
        });
      } else if (anim === 'merged') {
        anime({
          targets: el,
          scale: [1, 1.18, 1],
          duration: 200,
          easing: 'easeOutElastic(1, 0.5)'
        });
      }
    }
  }

  overlayOver.classList.toggle('visible', state.over);
  overlayWin.classList.toggle('visible', state.won && !state.keepPlaying);
}

// ─── Input ────────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  const map = {
    ArrowLeft: 'left', ArrowRight: 'right',
    ArrowUp: 'up',     ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down'
  };
  const dir = map[e.key];
  if (dir) { e.preventDefault(); move(dir); }
});

let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 20;

document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
  if (Math.abs(dx) >= Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
  else move(dy > 0 ? 'down' : 'up');
}, { passive: true });

document.getElementById('new-game-btn').addEventListener('click', newGame);
document.getElementById('retry-btn').addEventListener('click', newGame);
document.getElementById('new-game-win-btn').addEventListener('click', newGame);
document.getElementById('keep-playing-btn').addEventListener('click', () => {
  state.keepPlaying = true;
  overlayWin.classList.remove('visible');
});

// ─── Start ────────────────────────────────────────────────────────────────────

init();
