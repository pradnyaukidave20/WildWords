/* ══════════════════════════════════════════════
   JUNGLE WORD PUZZLE — script.js
   Pure JavaScript · No frameworks · No backend
   ══════════════════════════════════════════════ */

/* ─── WORD DATA ──────────────────────────────────
   Fallback word bank (used if AI API is unavailable)
   Format: { word, english, marathi, level }
─────────────────────────────────────────────── */
const WORD_BANK = {
  easy: [
    { word: "apple",  english: "A sweet red or green fruit",        marathi: "सफरचंद" },
    { word: "tiger",  english: "A large striped wild cat",          marathi: "वाघ" },
    { word: "water",  english: "Clear liquid essential for life",   marathi: "पाणी" },
    { word: "green",  english: "The color of leaves and grass",     marathi: "हिरवा" },
    { word: "smile",  english: "A happy facial expression",         marathi: "हास्य" },
    { word: "cloud",  english: "White fluffy shapes in the sky",    marathi: "ढग" },
    { word: "bread",  english: "A baked food made from flour",      marathi: "भाकर" },
    { word: "stone",  english: "A small hard piece of rock",        marathi: "दगड" },
    { word: "light",  english: "Energy that makes things visible",  marathi: "प्रकाश" },
    { word: "river",  english: "A large natural stream of water",   marathi: "नदी" },
    { word: "night",  english: "The dark part of the day",          marathi: "रात्र" },
    { word: "horse",  english: "A large animal used for riding",    marathi: "घोडा" },
  ],
  medium: [
    { word: "jungle",  english: "A dense tropical forest",              marathi: "जंगल" },
    { word: "bright",  english: "Giving out strong and clear light",    marathi: "तेजस्वी" },
    { word: "flower",  english: "The colorful part of a plant",         marathi: "फूल" },
    { word: "butter",  english: "A yellow fat made from milk cream",    marathi: "लोणी" },
    { word: "castle",  english: "A large medieval stone fortress",      marathi: "किल्ला" },
    { word: "frozen",  english: "Turned into ice due to cold",          marathi: "गोठलेले" },
    { word: "silver",  english: "A shiny precious metal",               marathi: "चांदी" },
    { word: "planet",  english: "A large round object orbiting a star", marathi: "ग्रह" },
    { word: "market",  english: "A place where goods are bought/sold",  marathi: "बाजार" },
    { word: "bridge",  english: "A structure built over water to cross", marathi: "पूल" },
    { word: "temple",  english: "A place of religious worship",         marathi: "मंदिर" },
    { word: "garden",  english: "A cultivated area with plants",        marathi: "बाग" },
  ],
  hard: [
    { word: "adventure",  english: "An exciting and unusual experience",          marathi: "साहस" },
    { word: "beautiful",  english: "Pleasing to the senses or mind",              marathi: "सुंदर" },
    { word: "knowledge",  english: "Facts and skills acquired through learning",  marathi: "ज्ञान" },
    { word: "elephant",   english: "The largest land animal with a long trunk",   marathi: "हत्ती" },
    { word: "mountain",   english: "A large natural elevation of earth",          marathi: "पर्वत" },
    { word: "darkness",   english: "The complete absence of light",               marathi: "अंधार" },
    { word: "festival",   english: "A special day or period of celebration",      marathi: "सण" },
    { word: "champion",   english: "A person who wins a competition",             marathi: "विजेता" },
    { word: "calendar",   english: "A chart showing days, months and years",      marathi: "दिनदर्शिका" },
    { word: "lightning",  english: "A flash of electricity during a storm",       marathi: "वीज" },
    { word: "treasure",   english: "A collection of very valuable things",        marathi: "खजिना" },
    { word: "universe",   english: "All of space and everything in it",           marathi: "विश्व" },
  ]
};

/* ─── CONSTANTS ──────────────────────────────── */
const POINTS = {
  easy:   { correct: 10, hint: -5,  skip: 0,  wrong: -3  },
  medium: { correct: 15, hint: -7,  skip: 0,  wrong: -4  },
  hard:   { correct: 25, hint: -10, skip: 0,  wrong: -5  },
};
const LIVES_MAX     = 3;
const WORDS_PER_RUN = 8;      // how many words per level section
const NEXT_DELAY_MS = 300;    // small delay before auto-advancing (after skip reveal)

/* ─── GAME STATE ─────────────────────────────── */
let STATE = {
  screen:       'start',    // 'start' | 'loading' | 'game' | 'gameover'
  level:        'easy',     // 'easy' | 'medium' | 'hard'
  words:        [],         // current word list
  wordIndex:    0,
  currentWord:  null,       // { word, english, marathi, level }
  scrambled:    '',         // current scramble (set once, not regenerated)
  score:        0,
  lives:        LIVES_MAX,
  streak:       0,
  maxStreak:    0,
  totalCorrect: 0,
  totalWrong:   0,
  totalSkipped: 0,
  hintUsed:     false,      // per-word flag
  answered:     false,      // word is answered / skipped, awaiting "Next"
  paused:       false,
  highScore:    0,
};

/* ─── LIFECYCLE HELPERS ──────────────────────── */

/** Show a specific screen, hide others */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');
  STATE.screen = name;
}

/** Update the score display in the game bar */
function updateScoreDisplay() {
  const el = document.getElementById('score-display');
  if (el) el.textContent = STATE.score;
}

/** Update lives hearts display */
function updateLivesDisplay() {
  const el = document.getElementById('lives-display');
  if (el) el.textContent = '❤️'.repeat(STATE.lives) + '🖤'.repeat(LIVES_MAX - STATE.lives);
}

/** Update word progress bar and label */
function updateProgress() {
  const fill  = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');
  if (!fill || !label) return;
  const pct = ((STATE.wordIndex) / STATE.words.length) * 100;
  fill.style.width = pct + '%';
  label.textContent = (STATE.wordIndex + 1) + ' / ' + STATE.words.length;
}

/** Show/hide streak badge */
function updateStreakDisplay() {
  const badge = document.getElementById('streak-badge');
  const count = document.getElementById('streak-count');
  if (!badge) return;
  if (STATE.streak >= 2) {
    badge.style.display = 'inline-flex';
    count.textContent = STATE.streak;
  } else {
    badge.style.display = 'none';
  }
}

/* ─── CAT ANIMATIONS ─────────────────────────── */
function animateCat(type) {
  const cat = document.getElementById('game-cat');
  if (!cat) return;
  cat.classList.remove('celebrate', 'wrong', 'skip');
  // Force reflow so animation restarts
  void cat.offsetWidth;
  if (type === 'celebrate') {
    cat.textContent = '😸';
    cat.classList.add('celebrate');
  } else if (type === 'wrong') {
    cat.textContent = '😾';
    cat.classList.add('wrong');
  } else if (type === 'skip') {
    cat.textContent = '😿';
    cat.classList.add('skip');
  } else {
    cat.textContent = '🐱';
  }
  // Reset to idle emoji after animation
  if (type !== 'idle') {
    setTimeout(() => {
      if (cat) {
        cat.classList.remove('celebrate', 'wrong', 'skip');
        if (!STATE.answered) cat.textContent = '🐱';
      }
    }, 800);
  }
}

/* ─── SCORE POPUP ────────────────────────────── */
function showScorePopup(points, x, y) {
  const popup = document.createElement('div');
  popup.className = 'score-popup ' + (points > 0 ? 'positive' : 'negative');
  popup.textContent = points > 0 ? '+' + points : points;
  popup.style.left = (x || window.innerWidth / 2) + 'px';
  popup.style.top  = (y || window.innerHeight / 2 - 40) + 'px';
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1300);
}

/* ─── JUNGLE BACKGROUND FX ───────────────────── */
function spawnLeaves() {
  const container = document.getElementById('leaves-container');
  if (!container) return;
  const leafEmojis = ['🍃', '🌿', '🍀', '☘️'];
  const count = 8;
  for (let i = 0; i < count; i++) {
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.textContent = leafEmojis[Math.floor(Math.random() * leafEmojis.length)];
    const size = 12 + Math.random() * 14;
    leaf.style.left     = Math.random() * 100 + '%';
    leaf.style.top      = '-20px';
    leaf.style.fontSize = size + 'px';
    const dur = 6 + Math.random() * 8;
    leaf.style.animationDuration = dur + 's';
    leaf.style.animationDelay    = Math.random() * 4 + 's';
    container.appendChild(leaf);
    // Remove after animation ends
    setTimeout(() => leaf.remove(), (dur + 5) * 1000);
  }
}

function spawnFireflies() {
  const container = document.getElementById('fireflies-container');
  if (!container) return;
  for (let i = 0; i < 14; i++) {
    const ff = document.createElement('div');
    ff.className = 'firefly';
    ff.style.left    = Math.random() * 100 + '%';
    ff.style.top     = 20 + Math.random() * 60 + '%';
    const dur   = 3 + Math.random() * 5;
    const delay = Math.random() * 6;
    ff.style.animationDuration = dur + 's';
    ff.style.animationDelay    = delay + 's';
    container.appendChild(ff);
  }
}

/* ─── HIGH SCORE ─────────────────────────────── */
function loadHighScore() {
  STATE.highScore = parseInt(localStorage.getItem('jwp_highscore') || '0', 10);
}

function saveHighScore() {
  if (STATE.score > STATE.highScore) {
    STATE.highScore = STATE.score;
    localStorage.setItem('jwp_highscore', STATE.highScore);
    return true; // new record
  }
  return false;
}

function renderHighScore() {
  const display = document.getElementById('hs-display');
  const val     = document.getElementById('hs-value');
  if (!display) return;
  if (STATE.highScore > 0) {
    display.style.display = 'flex';
    val.textContent = STATE.highScore;
  } else {
    display.style.display = 'none';
  }
}

/* ─── LEVEL SELECTION ────────────────────────── */
function selectLevel(level) {
  STATE.level = level;
  document.querySelectorAll('.level-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });
}

/* ─── AI WORD GENERATION ─────────────────────── */
/**
 * Calls the Anthropic API to generate fresh words with Marathi meanings.
 * Falls back to local WORD_BANK if the API fails.
 */
async function generateWordsFromAI(level) {
  const desc = {
    easy:   '4-5 letter simple common words (fruits, animals, nature objects, colors)',
    medium: '6-7 letter common words (nature, adjectives, everyday objects)',
    hard:   '8-12 letter challenging vocabulary'
  }[level];

  const prompt = `Generate exactly 8 English words for a children's word puzzle game.
Level: ${level} — ${desc}

Return ONLY a valid JSON array with no markdown, no explanation, no extra text:
[{"word":"example","english":"A brief one-sentence meaning","marathi":"मराठी अर्थ"}]

Rules:
- All words lowercase
- English meaning: short (4–10 words)
- Marathi: standard modern Marathi translation
- No proper nouns
- Words must be appropriate for children`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 900,
        messages:   [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) throw new Error('API ' + res.status);

    const data = await res.json();
    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Strip markdown fences if present
    const clean   = text.replace(/```json|```/g, '').trim();
    const parsed  = JSON.parse(clean);

    if (Array.isArray(parsed) && parsed.length > 0) {
      // Attach level tag
      return parsed.map(w => ({ ...w, level }));
    }
  } catch (err) {
    console.warn('AI word generation failed, using fallback:', err);
  }

  // Fallback: shuffle local bank and return 8
  return shuffleArray([...WORD_BANK[level]]).slice(0, WORDS_PER_RUN);
}

/* ─── SCRAMBLE ───────────────────────────────── */
/**
 * Scramble a word. Guarantees result != original.
 */
function scrambleWord(word) {
  if (word.length <= 2) return word.toUpperCase();
  const arr = word.toUpperCase().split('');
  let result;
  let attempts = 0;
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    result = arr.join('');
    attempts++;
  } while (result === word.toUpperCase() && attempts < 20);
  return result;
}

/* ─── SHUFFLE ────────────────────────────────── */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ══════════════════════════════════════════════
   GAME FLOW
   ══════════════════════════════════════════════ */

/** Start a brand-new game (called from Start Screen) */
async function startGame() {
  // Reset all state
  Object.assign(STATE, {
    score:        0,
    lives:        LIVES_MAX,
    streak:       0,
    maxStreak:    0,
    totalCorrect: 0,
    totalWrong:   0,
    totalSkipped: 0,
    wordIndex:    0,
    words:        [],
    currentWord:  null,
    hintUsed:     false,
    answered:     false,
    paused:       false,
  });

  // Show loading screen
  showScreen('loading');

  // Generate words
  const words = await generateWordsFromAI(STATE.level);
  STATE.words = words.slice(0, WORDS_PER_RUN);

  // Launch game
  showScreen('game');
  updateLevelPill();
  loadWord(0);
}

/** Restart from pause menu (same level, same config) */
function restartGame() {
  hidePauseOverlay();
  startGame();
}

/** Go back to the start screen */
function goToStart() {
  hidePauseOverlay();
  showScreen('start');
  loadHighScore();
  renderHighScore();
}

/** Load a word by index into the game UI */
function loadWord(index) {
  STATE.wordIndex = index;
  STATE.currentWord = STATE.words[index];
  STATE.scrambled   = scrambleWord(STATE.currentWord.word);
  STATE.hintUsed    = false;
  STATE.answered    = false;

  // Reset UI
  resetInputUI();
  setScrambleDisplay(STATE.scrambled);
  hideElement('hint-text');
  hideElement('meaning-box');
  hideElement('next-btn');
  showElement('input-wrap');
  showElement('action-buttons');

  // Re-enable buttons
  setButtonsEnabled(true);

  // Cat idle
  animateCat('idle');

  // Update stats
  updateProgress();
  updateScoreDisplay();
  updateLivesDisplay();
  updateStreakDisplay();

  // Focus input
  const inp = document.getElementById('word-input');
  if (inp) { inp.value = ''; inp.focus(); }
}

/** Load the NEXT word, or advance level, or end game */
function loadNextWord() {
  const nextIndex = STATE.wordIndex + 1;

  if (nextIndex < STATE.words.length) {
    // More words in current level
    loadWord(nextIndex);
  } else {
    // This level done — try next level
    const levelOrder = ['easy', 'medium', 'hard'];
    const currentIdx = levelOrder.indexOf(STATE.level);
    const nextLevel  = levelOrder[currentIdx + 1];

    if (nextLevel) {
      // Advance to next level
      STATE.level = nextLevel;
      showScreen('loading');
      generateWordsFromAI(nextLevel).then(words => {
        STATE.words     = words.slice(0, WORDS_PER_RUN);
        STATE.wordIndex = 0;
        showScreen('game');
        updateLevelPill();
        loadWord(0);
      });
    } else {
      // All levels completed!
      endGame(true);
    }
  }
}

/* ══════════════════════════════════════════════
   ANSWER HANDLING
   ══════════════════════════════════════════════ */

/** Called when player submits an answer */
function submitAnswer() {
  if (STATE.answered || STATE.paused) return;

  const input = document.getElementById('word-input');
  if (!input) return;
  const value = input.value.trim().toLowerCase();
  if (!value) return;

  const correct = value === STATE.currentWord.word.toLowerCase();

  if (correct) {
    handleCorrectAnswer();
  } else {
    handleWrongAnswer();
  }
}

function handleCorrectAnswer() {
  STATE.answered    = true;
  STATE.totalCorrect++;
  STATE.streak++;
  STATE.maxStreak = Math.max(STATE.maxStreak, STATE.streak);

  // Points
  const pts = POINTS[STATE.level].correct;
  STATE.score += pts;
  saveHighScore();

  // Visual feedback
  flashCard('correct-flash');
  animateCat('celebrate');
  setInputState('correct');
  setScrambleDisplay(STATE.currentWord.word.toUpperCase(), true);

  // Show score popup
  const inp = document.getElementById('word-input');
  const rect = inp ? inp.getBoundingClientRect() : null;
  showScorePopup(pts, rect ? rect.left + rect.width / 2 : null, rect ? rect.top : null);

  // Show meaning
  showMeaning(STATE.currentWord, pts, false);

  // Update UI
  updateScoreDisplay();
  updateStreakDisplay();
  updateLivesDisplay();
  setButtonsEnabled(false);

  showElement('next-btn');
  hideElement('input-wrap');
  hideElement('action-buttons');
}

function handleWrongAnswer() {
  STATE.totalWrong++;
  STATE.streak = 0;
  STATE.lives  = Math.max(0, STATE.lives - 1);
  STATE.score  = Math.max(0, STATE.score + POINTS[STATE.level].wrong);

  // Visual feedback
  flashCard('wrong-flash');
  animateCat('wrong');
  setInputState('wrong');

  // Shake and clear
  const inp = document.getElementById('word-input');
  if (inp) {
    setTimeout(() => {
      inp.classList.remove('wrong');
      inp.value = '';
      inp.focus();
    }, 600);
  }

  // Score popup
  const rect = inp ? inp.getBoundingClientRect() : null;
  showScorePopup(POINTS[STATE.level].wrong, rect ? rect.left + rect.width / 2 : null, rect ? rect.top : null);

  updateScoreDisplay();
  updateLivesDisplay();
  updateStreakDisplay();

  // Out of lives?
  if (STATE.lives <= 0) {
    setTimeout(() => endGame(false), 700);
  }
}

/* ─── HINT ────────────────────────────────────── */
/** Show English meaning as a hint (deducts points) */
function useHint() {
  if (STATE.hintUsed || STATE.answered || STATE.paused) return;
  STATE.hintUsed = true;

  // Deduct points
  const deduct = POINTS[STATE.level].hint;
  STATE.score = Math.max(0, STATE.score + deduct); // deduct is negative
  updateScoreDisplay();

  // Show hint text
  const hintText    = document.getElementById('hint-text');
  const hintContent = document.getElementById('hint-content');
  if (hintContent) {
    hintContent.textContent = '💬 ' + STATE.currentWord.english;
  }
  showElement('hint-text');

  // Disable hint button
  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) hintBtn.disabled = true;

  // Score popup
  showScorePopup(deduct, window.innerWidth / 2, window.innerHeight / 2);
}

/* ─── SKIP ────────────────────────────────────── */
/** Skip the current word — reveal answer and move on */
function skipWord() {
  if (STATE.answered || STATE.paused) return;
  STATE.answered    = true;
  STATE.totalSkipped++;
  STATE.streak = 0;

  // Animate cat sadly
  animateCat('skip');

  // Show scramble as solved word (dimmed)
  const scrambleEl = document.getElementById('scramble-word');
  if (scrambleEl) {
    scrambleEl.textContent = STATE.currentWord.word.toUpperCase();
    scrambleEl.classList.add('solved');
    scrambleEl.style.opacity = '0.6';
  }

  // Show full meaning
  showMeaning(STATE.currentWord, 0, true);

  // UI changes
  setButtonsEnabled(false);
  showElement('next-btn');
  hideElement('input-wrap');
  hideElement('action-buttons');

  updateStreakDisplay();
  updateLivesDisplay();
}

/* ─── MEANING DISPLAY ─────────────────────────── */
/** Render the English + Marathi meaning box */
function showMeaning(word, pts, isSkip) {
  const box     = document.getElementById('meaning-box');
  const enEl    = document.getElementById('meaning-en');
  const mrEl    = document.getElementById('meaning-mr');
  const flash   = document.getElementById('points-flash');
  if (!box) return;

  enEl.textContent = word.english;
  mrEl.textContent = word.marathi;   // Devanagari Unicode renders via Noto Sans Devanagari

  // Points flash
  if (!isSkip && pts > 0) {
    flash.textContent = '+' + pts + ' points!';
    flash.style.display = 'block';
  } else if (isSkip) {
    flash.textContent = '⏭ Word skipped';
    flash.style.color = '#ff9a6c';
    flash.style.display = 'block';
  } else {
    flash.style.display = 'none';
  }

  showElement('meaning-box');
}

/* ══════════════════════════════════════════════
   PAUSE / RESUME
   ══════════════════════════════════════════════ */
function togglePause() {
  if (STATE.paused) resumeGame();
  else pauseGame();
}

function pauseGame() {
  STATE.paused = true;
  const overlay = document.getElementById('overlay-pause');
  const ps = document.getElementById('pause-score');
  if (ps) ps.textContent = STATE.score;
  if (overlay) overlay.style.display = 'flex';
}

function resumeGame() {
  STATE.paused = false;
  hidePauseOverlay();
}

function hidePauseOverlay() {
  const overlay = document.getElementById('overlay-pause');
  if (overlay) overlay.style.display = 'none';
}

/* ══════════════════════════════════════════════
   GAME OVER
   ══════════════════════════════════════════════ */
function endGame(completed) {
  const isNewRecord = saveHighScore();
  showScreen('gameover');

  const total = STATE.totalCorrect + STATE.totalWrong;
  const acc   = total > 0 ? Math.round((STATE.totalCorrect / total) * 100) : 0;

  // Set values
  setText('final-score', STATE.score);
  setText('stat-correct',  STATE.totalCorrect);
  setText('stat-wrong',    STATE.totalWrong);
  setText('stat-streak',   STATE.maxStreak);
  setText('stat-accuracy', acc + '%');

  const titleEl  = document.getElementById('gameover-title');
  const catEl    = document.getElementById('gameover-cat');
  const hsEl     = document.getElementById('final-hs');

  if (catEl) catEl.textContent = completed ? '🏆' : STATE.lives <= 0 ? '😿' : '🎯';
  if (titleEl) titleEl.textContent = completed ? 'Adventure Complete! 🎉' : STATE.lives <= 0 ? 'Out of Lives!' : 'Game Over!';

  if (hsEl) {
    if (isNewRecord && STATE.score > 0) {
      hsEl.textContent = '🏆 New High Score!';
      hsEl.style.color = '#ffd740';
    } else if (STATE.highScore > 0) {
      hsEl.textContent = 'Best Score: ' + STATE.highScore;
    } else {
      hsEl.textContent = '';
    }
  }
}

/* ══════════════════════════════════════════════
   INPUT HANDLING
   ══════════════════════════════════════════════ */

/**
 * Handles live typing.
 * We update ONLY the feedback icon — never re-render the whole input
 * so the cursor never jumps.
 */
function handleInput(inputEl) {
  // Clear wrong state when user starts retyping
  inputEl.classList.remove('wrong');

  // Clear feedback icon
  const fb = document.getElementById('input-feedback');
  if (fb) { fb.textContent = ''; fb.classList.remove('show'); }
}

/** Handle Enter key to submit */
function handleKey(event) {
  if (event.key === 'Enter') submitAnswer();
}

/* ══════════════════════════════════════════════
   UI HELPERS
   ══════════════════════════════════════════════ */

function resetInputUI() {
  const inp = document.getElementById('word-input');
  if (!inp) return;
  inp.value = '';
  inp.classList.remove('correct', 'wrong');
  inp.disabled = false;
  const fb = document.getElementById('input-feedback');
  if (fb) { fb.textContent = ''; fb.classList.remove('show'); }
  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) hintBtn.disabled = false;
}

function setInputState(state) {
  const inp = document.getElementById('word-input');
  const fb  = document.getElementById('input-feedback');
  if (!inp) return;
  inp.classList.remove('correct', 'wrong');
  if (state === 'correct') {
    inp.classList.add('correct');
    inp.disabled = true;
    if (fb) { fb.textContent = '✓'; fb.classList.add('show'); }
  } else if (state === 'wrong') {
    inp.classList.add('wrong');
    if (fb) { fb.textContent = '✗'; fb.classList.add('show'); }
  }
}

function setScrambleDisplay(text, solved = false) {
  const el = document.getElementById('scramble-word');
  if (!el) return;
  el.textContent = text;
  el.style.opacity = '1';
  el.classList.toggle('solved', solved);
}

function setButtonsEnabled(enabled) {
  const ids = ['submit-btn', 'hint-btn', 'skip-btn'];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enabled;
  });
}

function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}
function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function flashCard(cls) {
  const card = document.getElementById('game-card');
  if (!card) return;
  card.classList.add(cls);
  setTimeout(() => card.classList.remove(cls), 600);
}

function updateLevelPill() {
  const pill = document.getElementById('level-pill');
  if (!pill) return;
  const labels = { easy: '🌱 Easy', medium: '🌿 Medium', hard: '🔥 Hard' };
  pill.textContent = labels[STATE.level] || STATE.level;
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Load high score
  loadHighScore();
  renderHighScore();

  // Build jungle background effects
  spawnLeaves();
  spawnFireflies();

  // Respawn leaves periodically
  setInterval(spawnLeaves, 12000);

  // Show start screen
  showScreen('start');
});
