const SIZE = 4;
const ANIM_MS = 140;

const $ = (id) => document.getElementById(id);

const gridEl = $("grid");
const tilesEl = $("tiles");
const scoreEl = $("score");
const bestEl = $("best");
const overlayEl = $("overlay");
const overlayTitleEl = $("overlayTitle");
const overlayTextEl = $("overlayText");

let bestScore = Number(localStorage.getItem("bestScore") || "0");
let state = null;
let locked = false;
let tileEls = new Map();

function rngPickSpawnValue() {
  return Math.random() < 0.9 ? 2 : 4;
}

function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null));
}

function newTile(id, r, c, value) {
  return { id, r, c, value, mergedInto: null };
}

function initState() {
  const grid = emptyGrid();
  const tiles = new Map();
  const nextId = { v: 1 };
  const s = { grid, tiles, score: 0, won: false, over: false, keepPlaying: false, nextId };
  spawnRandomTile(s);
  spawnRandomTile(s);
  return s;
}

function eachCell(fn) {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) fn(r, c);
}

function listEmptyCells(s) {
  const cells = [];
  eachCell((r, c) => {
    if (!s.grid[r][c]) cells.push([r, c]);
  });
  return cells;
}

function spawnRandomTile(s) {
  const empties = listEmptyCells(s);
  if (empties.length === 0) return null;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const id = s.nextId.v++;
  const t = newTile(id, r, c, rngPickSpawnValue());
  s.tiles.set(id, t);
  s.grid[r][c] = id;
  return t;
}

function canMove(s) {
  if (listEmptyCells(s).length > 0) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const id = s.grid[r][c];
      const t = s.tiles.get(id);
      const v = t.value;
      if (r + 1 < SIZE) {
        const id2 = s.grid[r + 1][c];
        if (s.tiles.get(id2).value === v) return true;
      }
      if (c + 1 < SIZE) {
        const id2 = s.grid[r][c + 1];
        if (s.tiles.get(id2).value === v) return true;
      }
    }
  }
  return false;
}

function dirVectors(dir) {
  switch (dir) {
    case "left":
      return { dr: 0, dc: -1 };
    case "right":
      return { dr: 0, dc: 1 };
    case "up":
      return { dr: -1, dc: 0 };
    case "down":
      return { dr: 1, dc: 0 };
    default:
      return { dr: 0, dc: 0 };
  }
}

function buildTraversal(dir) {
  const rows = [...Array(SIZE).keys()];
  const cols = [...Array(SIZE).keys()];
  if (dir === "right") cols.reverse();
  if (dir === "down") rows.reverse();
  return { rows, cols };
}

function within(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function findFarthest(s, startR, startC, dr, dc) {
  let r = startR;
  let c = startC;
  let nextR = r + dr;
  let nextC = c + dc;
  while (within(nextR, nextC) && s.grid[nextR][nextC] === null) {
    r = nextR;
    c = nextC;
    nextR = r + dr;
    nextC = c + dc;
  }
  return { r, c, nextR, nextC };
}

function move(dir) {
  if (locked) return;
  if (!state || state.over) return;

  const { dr, dc } = dirVectors(dir);
  const { rows, cols } = buildTraversal(dir);

  for (const t of state.tiles.values()) t.mergedInto = null;

  const prev = snapshotForAnimation(state);

  let moved = false;
  let scoreGain = 0;

  const newGrid = emptyGrid();
  const claimedMerge = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false));

  rows.forEach((r) => {
    cols.forEach((c) => {
      const id = state.grid[r][c];
      if (!id) return;
      const tile = state.tiles.get(id);

      const { r: fr, c: fc, nextR, nextC } = findFarthest({ grid: newGrid }, tile.r, tile.c, dr, dc);

      if (within(nextR, nextC) && newGrid[nextR][nextC] !== null) {
        const otherId = newGrid[nextR][nextC];
        const other = state.tiles.get(otherId);
        if (!claimedMerge[nextR][nextC] && other.value === tile.value && other.mergedInto === null) {
          tile.mergedInto = otherId;
          tile.r = nextR;
          tile.c = nextC;
          claimedMerge[nextR][nextC] = true;
          moved = true;
          return;
        }
      }

      tile.r = fr;
      tile.c = fc;
      if (newGrid[fr][fc] === null) {
        newGrid[fr][fc] = id;
      }
      if (tile.r !== r || tile.c !== c) moved = true;
    });
  });

  if (!moved) return;

  for (const tile of state.tiles.values()) {
    if (tile.mergedInto) continue;
    newGrid[tile.r][tile.c] = tile.id;
  }

  for (const tile of state.tiles.values()) {
    if (!tile.mergedInto) continue;
    const target = state.tiles.get(tile.mergedInto);
    target.value *= 2;
    if (target.value === 2048) state.won = true;
    scoreGain += target.value;
  }

  for (const tile of [...state.tiles.values()]) {
    if (tile.mergedInto) {
      state.tiles.delete(tile.id);
    }
  }

  state.grid = emptyGrid();
  for (const tile of state.tiles.values()) state.grid[tile.r][tile.c] = tile.id;

  state.score += scoreGain;
  if (state.score > bestScore) {
    bestScore = state.score;
    localStorage.setItem("bestScore", String(bestScore));
  }

  const spawned = spawnRandomTile(state);

  if (!canMove(state)) state.over = true;

  const anim = buildAnimation(prev, state, spawned);
  playAnimation(anim);
}

function snapshotForAnimation(s) {
  const tiles = [];
  for (const t of s.tiles.values()) {
    tiles.push({ id: t.id, r: t.r, c: t.c, value: t.value });
  }
  return {
    score: s.score,
    tiles,
  };
}

function buildAnimation(prev, next, spawned) {
  const prevById = new Map(prev.tiles.map((t) => [t.id, t]));
  const nextById = new Map([...next.tiles.values()].map((t) => [t.id, { id: t.id, r: t.r, c: t.c, value: t.value }]));

  const moves = [];
  const merges = new Set();
  const removed = [];

  for (const pt of prev.tiles) {
    const nt = nextById.get(pt.id);
    if (!nt) {
      removed.push(pt.id);
      continue;
    }
    moves.push({ id: pt.id, from: { r: pt.r, c: pt.c }, to: { r: nt.r, c: nt.c }, value: nt.value, prevValue: pt.value });
    if (pt.value !== nt.value) merges.add(pt.id);
  }

  const added = [];
  if (spawned) {
    added.push({ id: spawned.id, r: spawned.r, c: spawned.c, value: spawned.value });
  }

  return { moves, merges, removed, added, score: next.score };
}

function cellTranslate(r, c) {
  const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gap")) || 12;
  const boardRect = tilesEl.getBoundingClientRect();
  const tileSize = (boardRect.width - 3 * gap) / 4;
  return {
    x: c * (tileSize + gap),
    y: r * (tileSize + gap),
  };
}

function ensureTileEl(id) {
  let el = tileEls.get(id);
  if (el) return el;
  el = document.createElement("div");
  el.className = "tile";
  el.dataset.id = String(id);
  tileEls.set(id, el);
  tilesEl.appendChild(el);
  return el;
}

function removeTileEl(id) {
  const el = tileEls.get(id);
  if (el) el.remove();
  tileEls.delete(id);
}

function renderScores() {
  scoreEl.textContent = String(state.score);
  bestEl.textContent = String(bestScore);
}

function setOverlay(mode) {
  if (mode === "hidden") {
    overlayEl.classList.add("hidden");
    return;
  }
  overlayEl.classList.remove("hidden");
  if (mode === "won") {
    overlayTitleEl.textContent = "You win!";
    overlayTextEl.textContent = "Keep going for a higher score?";
  } else {
    overlayTitleEl.textContent = "Game Over";
    overlayTextEl.textContent = "No moves left.";
  }
}

function playAnimation(anim) {
  locked = true;

  renderScores();

  for (const a of anim.added) {
    const el = ensureTileEl(a.id);
    el.textContent = String(a.value);
    el.dataset.value = String(a.value);
    const { x, y } = cellTranslate(a.r, a.c);
    el.style.setProperty("--t", `translate3d(${x}px, ${y}px, 0)`);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  for (const m of anim.moves) {
    const el = ensureTileEl(m.id);
    el.textContent = String(m.value);
    el.dataset.value = String(m.value);
    const from = cellTranslate(m.from.r, m.from.c);
    const to = cellTranslate(m.to.r, m.to.c);
    el.style.setProperty("--t", `translate3d(${to.x}px, ${to.y}px, 0)`);
    el.style.transform = `translate3d(${from.x}px, ${from.y}px, 0)`;
  }

  for (const id of anim.removed) {
    const el = ensureTileEl(id);
    el.style.opacity = "1";
  }

  requestAnimationFrame(() => {
    for (const a of anim.added) {
      const el = ensureTileEl(a.id);
      el.classList.remove("spawn");
      void el.offsetWidth;
      el.classList.add("spawn");
    }

    for (const m of anim.moves) {
      const el = ensureTileEl(m.id);
      const to = cellTranslate(m.to.r, m.to.c);
      el.style.transform = `translate3d(${to.x}px, ${to.y}px, 0)`;
    }

    setTimeout(() => {
      for (const id of anim.removed) removeTileEl(id);

      for (const id of anim.merges) {
        const el = tileEls.get(id);
        if (!el) continue;
        el.classList.remove("merge");
        void el.offsetWidth;
        el.classList.add("merge");
      }

      for (const t of state.tiles.values()) {
        const el = ensureTileEl(t.id);
        el.textContent = String(t.value);
        el.dataset.value = String(t.value);
        const { x, y } = cellTranslate(t.r, t.c);
        el.style.setProperty("--t", `translate3d(${x}px, ${y}px, 0)`);
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      if (state.over) {
        setOverlay("over");
      } else if (state.won && !state.keepPlaying) {
        setOverlay("won");
      } else {
        setOverlay("hidden");
      }

      locked = false;
    }, ANIM_MS);
  });
}

function renderInitial() {
  tilesEl.innerHTML = "";
  tileEls.clear();

  for (const t of state.tiles.values()) {
    const el = ensureTileEl(t.id);
    el.textContent = String(t.value);
    el.dataset.value = String(t.value);
    const { x, y } = cellTranslate(t.r, t.c);
    el.style.setProperty("--t", `translate3d(${x}px, ${y}px, 0)`);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.classList.add("spawn");
  }

  renderScores();
  setOverlay("hidden");
}

function newGame() {
  state = initState();
  bestEl.textContent = String(bestScore);
  requestAnimationFrame(renderInitial);
}

function setupGrid() {
  gridEl.innerHTML = "";
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    gridEl.appendChild(cell);
  }
}

function keyToDir(e) {
  const k = e.key;
  if (k === "ArrowLeft" || k === "a" || k === "A") return "left";
  if (k === "ArrowRight" || k === "d" || k === "D") return "right";
  if (k === "ArrowUp" || k === "w" || k === "W") return "up";
  if (k === "ArrowDown" || k === "s" || k === "S") return "down";
  return null;
}

function setupInput() {
  window.addEventListener("keydown", (e) => {
    const dir = keyToDir(e);
    if (!dir) return;
    e.preventDefault();
    move(dir);
  });

  const board = $("board");
  let start = null;

  board.addEventListener(
    "pointerdown",
    (e) => {
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      board.setPointerCapture(e.pointerId);
    },
    { passive: true }
  );

  board.addEventListener(
    "pointerup",
    (e) => {
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const threshold = 24;
      if (Math.max(absX, absY) < threshold) return;

      if (absX > absY) move(dx < 0 ? "left" : "right");
      else move(dy < 0 ? "up" : "down");
    },
    { passive: true }
  );
}

function setupButtons() {
  $("newGame").addEventListener("click", () => newGame());
  $("tryAgain").addEventListener("click", () => newGame());
  $("keepPlaying").addEventListener("click", () => {
    state.keepPlaying = true;
    setOverlay("hidden");
  });
}

function relayout() {
  if (!state) return;
  for (const t of state.tiles.values()) {
    const el = tileEls.get(t.id);
    if (!el) continue;
    const { x, y } = cellTranslate(t.r, t.c);
    el.style.setProperty("--t", `translate3d(${x}px, ${y}px, 0)`);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
}

function main() {
  setupGrid();
  setupInput();
  setupButtons();
  bestEl.textContent = String(bestScore);
  newGame();
  window.addEventListener("resize", () => relayout());
}

main();
