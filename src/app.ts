import './style.css';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ROUND_COUNT = 20;

// --- Types ---
type GameState = 'idle' | 'playing' | 'done';
type SquareColor = 'light' | 'dark';

interface Level {
  label: string;
  description: string;
  squares: string[];
}

// --- Levels ---
const squaresFrom = (files: string, ranks: string): string[] => {
  const result: string[] = [];
  for (const f of files) {
    for (const r of ranks) {
      result.push(f + r);
    }
  }
  return result;
};

const LEVELS: Level[] = [
  { label: '1', description: 'a-c 1-3', squares: squaresFrom('abc', '123') },
  { label: '2', description: '+ d-e 1-3', squares: squaresFrom('de', '123') },
  { label: '3', description: '+ f-h 1-3', squares: squaresFrom('fgh', '123') },
];

let currentLevel = 0;

const getActiveSquares = (): string[] => {
  const pool: string[] = [];
  for (let i = 0; i <= currentLevel; i++) {
    pool.push(...LEVELS[i].squares);
  }
  return pool;
};

// --- Voice feedback ---
const synth = window.speechSynthesis;

const speakSquare = (square: string): string => {
  return square[0].toUpperCase() + ' ' + square[1];
};

const speak = (text: string, onEnd?: () => void): void => {
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  if (onEnd) utterance.addEventListener('end', onEnd);
  synth.speak(utterance);
};

// --- State ---
// 'idle' = waiting to start, 'playing' = in session, 'done' = showing results
let state: GameState = 'idle';
let currentSquare: string | null = null;
let correct = 0;
let total = 0;
let history: boolean[] = [];
let locked = false;

// --- DOM refs ---
const squareDisplay = document.getElementById('squareDisplay')!;
const correctCount = document.getElementById('correctCount')!;
const totalCount = document.getElementById('totalCount')!;
const accuracyValue = document.getElementById('accuracyValue')!;
const streakBar = document.getElementById('streakBar')!;
const startBtn = document.getElementById('startBtn')!;
const btnLight = document.getElementById('btnLight') as HTMLButtonElement;
const btnDark = document.getElementById('btnDark') as HTMLButtonElement;
const progressDisplay = document.getElementById('progressDisplay')!;

const getSquareColor = (square: string): SquareColor => {
  const file = FILES.indexOf(square[0]) + 1;
  const rank = parseInt(square[1]);
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
};

const randomSquare = (): string => {
  const pool = getActiveSquares();
  return pool[Math.floor(Math.random() * pool.length)];
};

// --- UI state transitions ---
const showIdle = (): void => {
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
};

const showDone = (): void => {
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
};

const showPlaying = (): void => {
  state = 'playing';
  btnLight.classList.remove('hidden');
  btnDark.classList.remove('hidden');
  startBtn.classList.add('hidden');
  setLevelButtonsEnabled(false);
};

const setLevelButtonsEnabled = (enabled: boolean): void => {
  for (const btn of levelBar.querySelectorAll('.level-btn') as NodeListOf<HTMLButtonElement>) {
    btn.disabled = !enabled;
  }
};

// --- Game logic ---
const startSession = (): void => {
  correct = 0;
  total = 0;
  history = [];
  correctCount.textContent = '0';
  totalCount.textContent = '0';
  accuracyValue.textContent = '-%';
  streakBar.innerHTML = '';
  showPlaying();
  speak('Level ' + LEVELS[currentLevel].label + '. ' + ROUND_COUNT + ' questions. Go!', () => nextRound());
};

const nextRound = (): void => {
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
};

const updateStats = (): void => {
  correctCount.textContent = String(correct);
  totalCount.textContent = String(total);
  if (total > 0) {
    accuracyValue.textContent = Math.round((correct / total) * 100) + '%';
  }
};

const updateStreakBar = (): void => {
  streakBar.innerHTML = '';
  for (const result of history) {
    const dot = document.createElement('div');
    dot.className = 'streak-dot ' + (result ? 'correct' : 'wrong');
    streakBar.appendChild(dot);
  }
};

const answer = (choice: SquareColor): void => {
  if (locked || state !== 'playing') return;
  locked = true;

  const correctColor = getSquareColor(currentSquare!);
  const isCorrect = choice === correctColor;

  if (isCorrect) {
    correct++;
    squareDisplay.classList.add('correct');
    speak(correctColor, () => nextRound());
  } else {
    squareDisplay.classList.add('wrong');
    speak('Wrong! ' + speakSquare(currentSquare!) + ' is ' + correctColor, () => nextRound());
  }

  total++;
  history.push(isCorrect);

  updateStats();
  updateStreakBar();

  btnLight.disabled = true;
  btnDark.disabled = true;
};

// --- Input ---
document.addEventListener('keydown', (e: KeyboardEvent) => {
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
btnLight.addEventListener('click', () => answer('light'));
btnDark.addEventListener('click', () => answer('dark'));

// --- Gamepad support ---
const gamepadDot = document.getElementById('gamepadDot')!;
const gamepadLabel = document.getElementById('gamepadLabel')!;
let gamepadIndex: number | null = null;
let prevButtons: Record<string, number | boolean> = {};

window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
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

const isPressed = (gamepad: Gamepad, index: number): boolean => {
  return gamepad.buttons[index] && gamepad.buttons[index].pressed;
};

const wasJustPressed = (gamepad: Gamepad, index: number): boolean => {
  const pressed = isPressed(gamepad, index);
  const was = !!prevButtons[index];
  return pressed && !was;
};

const pollGamepad = (): void => {
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
    const prevAxisX = (prevButtons.axisX as number) || 0;
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
};

requestAnimationFrame(pollGamepad);

// --- Level selector ---
const levelBar = document.getElementById('levelBar')!;

const renderLevels = (): void => {
  levelBar.innerHTML = '';
  LEVELS.forEach((level, i) => {
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (i === currentLevel ? ' active' : '');
    btn.textContent = level.label;
    btn.title = level.description;
    btn.addEventListener('click', () => selectLevel(i));
    levelBar.appendChild(btn);
  });
};

const selectLevel = (index: number): void => {
  if (state === 'playing') return;
  currentLevel = index;
  renderLevels();
};

renderLevels();
showIdle();
