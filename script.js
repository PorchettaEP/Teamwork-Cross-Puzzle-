/*
  Teamwork Soft Skills Crossword
  Words: RELIABLE, PARTICIPATES, COOPERATIVE, FLEXIBLE, COMMITTED, RESPECTFUL
  Grid: 15x15
  Layout below is hand-designed for clear crossings and classroom play.
*/

const SIZE = 15;

// Crossword word placements (1-based rows/cols for readability).
// dir: "across" or "down"
const WORDS = [
  { name: "COOPERATIVE", row: 7, col: 2, dir: "across" },
  { name: "RELIABLE",     row: 7, col: 7, dir: "down"   },
  { name: "FLEXIBLE",     row: 10, col: 3, dir: "across" },
  { name: "COMMITTED",    row: 3, col: 10, dir: "down"   },
  { name: "RESPECTFUL",   row: 6, col: 5, dir: "down"    },
  { name: "PARTICIPATES", row: 2, col: 2, dir: "down"    },
];

// Build solution grid and cell map
const solution = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
const letterCells = new Map(); // key "r,c" -> { expected, inputs: [inputEl], words: [wordName] }

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function placeWords() {
  for (const w of WORDS) {
    const word = w.name.toUpperCase();
    let r = w.row - 1;
    let c = w.col - 1;

    for (let i = 0; i < word.length; i++) {
      const rr = r + (w.dir === "down" ? i : 0);
      const cc = c + (w.dir === "across" ? i : 0);
      if (!inBounds(rr, cc)) {
        console.error(`Out of bounds placing ${w.name}`);
        continue;
      }
      const existing = solution[rr][cc];
      const ch = word[i];
      if (existing && existing !== ch) {
        console.error(`Conflict at ${rr},${cc} for ${w.name}: ${existing} vs ${ch}`);
      }
      solution[rr][cc] = ch;
    }
  }
}

function buildGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  // We’ll number starting cells (across/down) like standard crosswords
  const startNumbers = computeStartNumbers();

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const wrapper = document.createElement("div");
      wrapper.className = "cell";
      wrapper.dataset.row = r;
      wrapper.dataset.col = c;

      const key = `${r},${c}`;
      if (!solution[r][c]) {
        wrapper.classList.add("block");
        grid.appendChild(wrapper);
        continue;
      }

      // numbering
      const num = startNumbers.get(key);
      if (num) {
        const numEl = document.createElement("div");
        numEl.className = "num";
        numEl.textContent = num;
        wrapper.appendChild(numEl);
      }

      const input = document.createElement("input");
      input.className = "letter";
      input.type = "text";
      input.maxLength = 1;
      input.autocomplete = "off";
      input.inputMode = "latin";
      input.ariaLabel = `Row ${r+1} Column ${c+1}`;
      input.addEventListener("input", onInput);
      input.addEventListener("keydown", onKey);
      input.addEventListener("focus", () => highlightCellWords(r, c));
      wrapper.appendChild(input);

      // collect references
      if (!letterCells.has(key)) {
        letterCells.set(key, { expected: solution[r][c], inputs: [], words: [] });
      }
      letterCells.get(key).inputs.push(input);

      grid.appendChild(wrapper);
    }
  }

  // map cells to words for highlighting
  for (const w of WORDS) {
    const word = w.name.toUpperCase();
    for (let i = 0; i < word.length; i++) {
      const r = (w.row - 1) + (w.dir === "down" ? i : 0);
      const c = (w.col - 1) + (w.dir === "across" ? i : 0);
      const key = `${r},${c}`;
      const cell = letterCells.get(key);
      if (cell) cell.words.push(w.name);
    }
  }
}

function computeStartNumbers() {
  const map = new Map();
  let n = 1;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!solution[r][c]) continue;

      const startAcross = (!inBounds(r, c-1) || !solution[r][c-1]) && inBounds(r, c+1) && solution[r][c+1];
      const startDown = (!inBounds(r-1, c) || !solution[r-1][c]) && inBounds(r+1, c) && solution[r+1][c];

      if (startAcross || startDown) {
        map.set(`${r},${c}`, n++);
      }
    }
  }
  return map;
}

function onInput(e) {
  const input = e.target;
  input.value = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0,1);

  const wrapper = input.closest(".cell");
  const r = +wrapper.dataset.row;
  const c = +wrapper.dataset.col;
  const key = `${r},${c}`;
  const expected = letterCells.get(key).expected;

  // visual correctness
  wrapper.classList.remove("wrong");
  if (input.value && input.value !== expected) {
    wrapper.classList.add("wrong");
  }

  // move forward (if active word context)
  const activeWord = getActiveWordName();
  if (activeWord) {
    moveToNextInWord(activeWord, r, c);
  }

  // check words and completion
  updateWordStatuses();
  checkWin();
}

function onKey(e) {
  const input = e.target;
  const wrapper = input.closest(".cell");
  const r = +wrapper.dataset.row;
  const c = +wrapper.dataset.col;

  const active = getActiveWordName();

  if (e.key === "ArrowRight") { focusMove(r, c+1); e.preventDefault(); }
  else if (e.key === "ArrowLeft") { focusMove(r, c-1); e.preventDefault(); }
  else if (e.key === "ArrowDown") { focusMove(r+1, c); e.preventDefault(); }
  else if (e.key === "ArrowUp") { focusMove(r-1, c); e.preventDefault(); }
  else if (e.key === "Backspace" && !input.value) {
    if (active) moveToPrevInWord(active, r, c);
    else focusPrev(r, c);
    e.preventDefault();
  }
}

function focusMove(r, c) {
  if (!inBounds(r, c) || !solution[r]?.[c]) return;
  const key = `${r},${c}`;
  const input = letterCells.get(key)?.inputs[0];
  if (input) input.focus();
}

function focusPrev(r, c) {
  // simple previous cell in reading order
  for (let cc = c-1; cc >= 0; cc--) if (solution[r][cc]) return focusMove(r, cc);
  for (let rr = r-1; rr >= 0; rr--) {
    for (let cc = SIZE-1; cc >= 0; cc--) if (solution[rr][cc]) return focusMove(rr, cc);
  }
}

function getWordCells(wordName) {
  const w = WORDS.find(W => W.name === wordName);
  const cells = [];
  for (let i = 0; i < w.name.length; i++) {
    const r = (w.row - 1) + (w.dir === "down" ? i : 0);
    const c = (w.col - 1) + (w.dir === "across" ? i : 0);
    cells.push({ r, c, key: `${r},${c}`, expected: solution[r][c] });
  }
  return cells;
}

function moveToNextInWord(wordName, r, c) {
  const w = WORDS.find(W => W.name === wordName);
  const cells = getWordCells(wordName);

  // find current index
  let idx = cells.findIndex(p => p.r === r && p.c === c);
  if (idx === -1) return;
  idx = Math.min(idx + 1, cells.length - 1);

  const next = cells[idx];
  const nextInput = letterCells.get(next.key)?.inputs[0];
  if (nextInput) nextInput.focus();
}

function moveToPrevInWord(wordName, r, c) {
  const cells = getWordCells(wordName);
  let idx = cells.findIndex(p => p.r === r && p.c === c);
  if (idx === -1) return;
  idx = Math.max(idx - 1, 0);

  const prev = cells[idx];
  const prevInput = letterCells.get(prev.key)?.inputs[0];
  if (prevInput) prevInput.focus();
}

let activeWord = null;

function setActiveWord(wordName) {
  activeWord = wordName;
  // highlight cells for that word
  document.querySelectorAll(".cell").forEach(el => el.classList.remove("active"));
  const cells = getWordCells(wordName);
  for (const { key } of cells) {
    const cellEl = findCellElByKey(key);
    cellEl?.classList.add("active");
  }

  // activate in word bank
  document.querySelectorAll(".word-bank li").forEach(li => li.classList.remove("active"));
  const li = document.querySelector(`.word-bank li[data-word="${wordName}"]`);
  if (li) li.classList.add("active");

  // focus first empty, else first
  const firstEmpty = cells.find(({ key, expected }) => {
    const val = letterCells.get(key)?.inputs[0]?.value.toUpperCase() || "";
    return val !== expected;
  }) || cells[0];
  const firstInput = letterCells.get(firstEmpty.key)?.inputs[0];
  firstInput?.focus();
}

function getActiveWordName() { return activeWord; }

function findCellElByKey(key) {
  const [r, c] = key.split(",").map(Number);
  return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
}

function highlightCellWords(r, c) {
  // If a cell belongs to multiple words, prefer the current active; else choose one.
  const key = `${r},${c}`;
  const words = letterCells.get(key)?.words || [];
  if (words.length === 0) return;

  if (!activeWord || !words.includes(activeWord)) {
    setActiveWord(words[0]);
  } else {
    // refresh highlight
    setActiveWord(activeWord);
  }
}

function updateWordStatuses() {
  // Clear previous styles
  document.querySelectorAll(".cell").forEach(el => el.classList.remove("correct"));
  document.querySelectorAll(".word-bank li").forEach(li => li.classList.remove("done"));

  // For each word, if all letters match, mark green
  for (const w of WORDS) {
    const cells = getWordCells(w.name);
    const allGood = cells.every(({ key, expected }) => {
      const val = letterCells.get(key)?.inputs[0]?.value.toUpperCase() || "";
      return val === expected;
    });
    if (allGood) {
      // mark cells
      for (const { key } of cells) {
        const el = findCellElByKey(key);
        el?.classList.add("correct");
      }
      // mark word bank item
      const li = document.querySelector(`.word-bank li[data-word="${w.name}"]`);
      li?.classList.add("done");
    }
  }
}

function checkWin() {
  for (const [key, info] of letterCells) {
    const val = info.inputs[0].value.toUpperCase() || "";
    if (val !== info.expected) {
      setStatus("Keep going! You’re close.");
      return;
    }
  }
  // All correct
  setStatus("All correct — amazing teamwork!");
  showWinBanner();
}

function setStatus(text) {
  const status = document.getElementById("status");
  status.textContent = text;
}

function showWinBanner() {
  const banner = document.getElementById("winBanner");
  banner.hidden = false;
  setTimeout(() => { banner.hidden = true; }, 5500);
}

function renderWordBank() {
  const bank = document.getElementById("wordBank");
  bank.innerHTML = "";
  WORDS.forEach(w => {
    const li = document.createElement("li");
    li.dataset.word = w.name;
    li.role = "option";
    li.innerHTML = `<strong>${w.name}</strong> <span>${w.dir === "across" ? "↔ across" : "↕ down"}</span>`;
    li.addEventListener("click", () => setActiveWord(w.name));
    bank.appendChild(li);
  });
}

function bindButtons() {
  document.getElementById("checkBtn").addEventListener("click", () => {
    // Mark wrong letters with a quick shake effect (border red already)
    let wrongCount = 0;
    for (const [key, info] of letterCells) {
      const val = info.inputs[0].value.toUpperCase() || "";
      const el = findCellElByKey(key);
      el?.classList.remove("wrong");
      if (val && val !== info.expected) {
        el?.classList.add("wrong");
        wrongCount++;
      }
    }
    updateWordStatuses();
    setStatus(wrongCount === 0 ? "Looks good! Keep filling remaining squares." : `You have ${wrongCount} incorrect letter${wrongCount===1?"":"s"}.`);
    checkWin();
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    for (const [, info] of letterCells) info.inputs[0].value = "";
    document.querySelectorAll(".cell").forEach(el => el.classList.remove("wrong","active","correct"));
    document.querySelectorAll(".word-bank li").forEach(li => li.classList.remove("done","active"));
    setStatus("Puzzle reset. You’ve got this!");
    activeWord = null;
  });
}

// --- Initialize ---
placeWords();
buildGrid();
renderWordBank();
bindButtons();

// Default select the first word
setActiveWord(WORDS[0].name);
setStatus("Start by choosing a word from the Word Bank, then type the letters in the highlighted squares.");
