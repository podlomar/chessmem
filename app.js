const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ROUND_COUNT = 20;

// --- Levels ---
function squaresFrom(files, ranks) {
  const result = [];
  for (const f of files) {
    for (const r of ranks) {
      result.push(f + r);
    }
  }
  return result;
}

const LEVELS = [
  { label: '1', description: 'a-c 1-3', squares: squaresFrom('abc', '123') },
  { label: '2', description: '+ d-e 1-3', squares: squaresFrom('de', '123') },
  { label: '3', description: '+ f-h 1-3', squares: squaresFrom('fgh', '123') },
];

let currentLevel = 0;

function getActiveSquares() {
  const pool = [];
  for (let i = 0; i <= currentLevel; i++) {
    pool.push(...LEVELS[i].squares);
  }
  return pool;
}

// --- Voice feedback ---
const synth = window.speechSynthesis;

function speakSquare(square) {
  return square[0].toUpperCase() + ' ' + square[1];
}

function speak(text, onEnd) {
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  if (onEnd) utterance.addEventListener('end', onEnd);
  synth.speak(utterance);
}

// --- State ---
// 'idle' = waiting to start, 'playing' = in session, 'done' = showing results
let state = 'idle';
let currentSquare = null;
let correct = 0;
let total = 0;
let history = [];
let locked = false;

// --- DOM refs ---
const squareDisplay = document.getElementById('squareDisplay');
const correctCount = document.getElementById('correctCount');
const totalCount = document.getElementById('totalCount');
const accuracyValue = document.getElementById('accuracyValue');
const streakBar = document.getElementById('streakBar');
const startBtn = document.getElementById('startBtn');
const btnLight = document.getElementById('btnLight');
const btnDark = document.getElementById('btnDark');
const progressDisplay = document.getElementById('progressDisplay');

function getSquareColor(square) {
  const file = FILES.indexOf(square[0]) + 1;
  const rank = parseInt(square[1]);
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

function randomSquare() {
  const pool = getActiveSquares();
  return pool[Math.floor(Math.random() * pool.length)];
}

// --- UI state transitions ---
function showIdle() {
  state = 'idle';
  locked = true;
  squareDisplay.textContent = '--';
  squareDisplay.classList.remove('correct', 'wrong');
  btnLight.classList.add('hidden');
  btnDark.classList.add('hidden');
  startBtn.classList.remove('hidden');
  startBtn.textContent = 'Start';
  progressDisplay.textContent = '';
  setLevelButtonsEnabled(true);
}

function showDone() {
  state = 'done';
  locked = true;
  const pct = Math.round((correct / total) * 100);
  squareDisplay.textContent = pct + '%';
  squareDisplay.classList.remove('correct', 'wrong');
  btnLight.classList.add('hidden');
  btnDark.classList.add('hidden');
  startBtn.classList.remove('hidden');
  startBtn.textContent = 'Again';
  progressDisplay.textContent = '';
  setLevelButtonsEnabled(true);
  const pctSpoken = Math.round((correct / total) * 100);
  speak('Round complete. ' + correct + ' out of ' + total + '. ' + pctSpoken + ' percent.');
}

function showPlaying() {
  state = 'playing';
  btnLight.classList.remove('hidden');
  btnDark.classList.remove('hidden');
  startBtn.classList.add('hidden');
  setLevelButtonsEnabled(false);
}

function setLevelButtonsEnabled(enabled) {
  for (const btn of levelBar.querySelectorAll('.level-btn')) {
    btn.disabled = !enabled;
  }
}

// --- Game logic ---
function startSession() {
  correct = 0;
  total = 0;
  history = [];
  correctCount.textContent = '0';
  totalCount.textContent = '0';
  accuracyValue.textContent = '-%';
  streakBar.innerHTML = '';
  showPlaying();
  speak('Level ' + LEVELS[currentLevel].label + '. ' + ROUND_COUNT + ' questions. Go!', () => nextRound());
}

function nextRound() {
  if (total >= ROUND_COUNT) {
    showDone();
    return;
  }

  locked = false;
  currentSquare = randomSquare();
  squareDisplay.textContent = currentSquare;
  squareDisplay.classList.remove('correct', 'wrong');
  btnLight.disabled = false;
  btnDark.disabled = false;
  progressDisplay.textContent = (total + 1) + ' / ' + ROUND_COUNT;
  speak(speakSquare(currentSquare));
}

function updateStats() {
  correctCount.textContent = correct;
  totalCount.textContent = total;
  if (total > 0) {
    accuracyValue.textContent = Math.round((correct / total) * 100) + '%';
  }
}

function updateStreakBar() {
  streakBar.innerHTML = '';
  for (const result of history) {
    const dot = document.createElement('div');
    dot.className = 'streak-dot ' + (result ? 'correct' : 'wrong');
    streakBar.appendChild(dot);
  }
}

function answer(choice) {
  if (locked || state !== 'playing') return;
  locked = true;

  const correctColor = getSquareColor(currentSquare);
  const isCorrect = choice === correctColor;

  if (isCorrect) {
    correct++;
    squareDisplay.classList.add('correct');
    speak(correctColor, () => nextRound());
  } else {
    squareDisplay.classList.add('wrong');
    speak('Wrong! ' + speakSquare(currentSquare) + ' is ' + correctColor, () => nextRound());
  }

  total++;
  history.push(isCorrect);

  updateStats();
  updateStreakBar();

  btnLight.disabled = true;
  btnDark.disabled = true;
}

// --- Input ---
document.addEventListener('keydown', (e) => {
  if (state === 'playing') {
    if (locked) return;
    if (e.key === 'ArrowLeft') answer('light');
    else if (e.key === 'ArrowRight') answer('dark');
  } else if (state === 'idle' || state === 'done') {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startSession();
    }
  }
});

startBtn.addEventListener('click', () => startSession());

// --- Gamepad support ---
const gamepadDot = document.getElementById('gamepadDot');
const gamepadLabel = document.getElementById('gamepadLabel');
let gamepadIndex = null;
let prevButtons = {};

window.addEventListener('gamepadconnected', (e) => {
  gamepadIndex = e.gamepad.index;
  gamepadDot.classList.add('connected');
  gamepadLabel.textContent = e.gamepad.id;
});

window.addEventListener('gamepaddisconnected', () => {
  gamepadIndex = null;
  prevButtons = {};
  gamepadDot.classList.remove('connected');
  gamepadLabel.textContent = 'No gamepad detected';
});

function isPressed(gamepad, index) {
  return gamepad.buttons[index] && gamepad.buttons[index].pressed;
}

function wasJustPressed(gamepad, index) {
  const pressed = isPressed(gamepad, index);
  const was = !!prevButtons[index];
  return pressed && !was;
}

function pollGamepad() {
  requestAnimationFrame(pollGamepad);

  if (gamepadIndex === null) return;

  const gamepads = navigator.getGamepads();
  const gp = gamepads[gamepadIndex];
  if (!gp) return;

  // 8BitDo Zero 2 (Switch mode) standard mapping:
  //   buttons[0] = B,  buttons[1] = A
  //   buttons[2] = Y,  buttons[3] = X
  //   buttons[4] = L,  buttons[5] = R
  //   buttons[12] = D-Up,   buttons[13] = D-Down
  //   buttons[14] = D-Left, buttons[15] = D-Right

  if (state === 'playing' && !locked) {
    const lightButtons = [14, 4, 2]; // D-Left, L, Y
    const darkButtons = [15, 5, 1]; // D-Right, R, A

    let lightPressed = lightButtons.some(b => wasJustPressed(gp, b));
    let darkPressed = darkButtons.some(b => wasJustPressed(gp, b));

    // Axes-based D-pad fallback (some drivers/OS combos)
    const axisX = gp.axes[0] || 0;
    const prevAxisX = prevButtons.axisX || 0;
    if (axisX < -0.5 && prevAxisX >= -0.5) lightPressed = true;
    if (axisX > 0.5 && prevAxisX <= 0.5) darkPressed = true;

    if (lightPressed) answer('light');
    else if (darkPressed) answer('dark');
  } else if (state === 'idle' || state === 'done') {
    // Any face button or Start to begin
    const startButtons = [0, 1, 3, 9]; // B, A, X, Start
    if (startButtons.some(b => wasJustPressed(gp, b))) {
      startSession();
    }
  }

  // Store state for edge detection
  for (let i = 0; i < gp.buttons.length; i++) {
    prevButtons[i] = gp.buttons[i].pressed;
  }
  prevButtons.axisX = gp.axes[0] || 0;
}

requestAnimationFrame(pollGamepad);

// --- Level selector ---
const levelBar = document.getElementById('levelBar');

function renderLevels() {
  levelBar.innerHTML = '';
  LEVELS.forEach((level, i) => {
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (i === currentLevel ? ' active' : '');
    btn.textContent = level.label;
    btn.title = level.description;
    btn.addEventListener('click', () => selectLevel(i));
    levelBar.appendChild(btn);
  });
}

function selectLevel(index) {
  if (state === 'playing') return;
  currentLevel = index;
  renderLevels();
}

renderLevels();
showIdle();
