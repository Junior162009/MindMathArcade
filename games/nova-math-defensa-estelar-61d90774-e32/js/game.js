'use strict';

/* =========================================================================
   NOVA MATH — Defensa Estelar
   MindMathArcade / TecnoMath
   -------------------------------------------------------------------------
   Secciones:
     1. Configuración
     2. Utilidades
     3. Almacenamiento local
     4. Motor de sonido (WebAudio, sin archivos obligatorios)
     5. Referencias DOM
     6. Canvas / estrellas
     7. Estado global
     8. Generación matemática
     9. Entidades y efectos
    10. Lógica del juego
    11. Render
    12. Interfaz y pantallas
    13. Entrada (teclado, táctil, puntero)
    14. Inicialización
   ========================================================================= */


/* =========================================================================
   1. CONFIGURACIÓN
   ========================================================================= */

const CONFIG = {
  totalLevels:      10,
  wavesPerLevel:    [4, 5, 5, 6, 6, 7, 7, 8, 9, 10],
  startLives:       3,
  maxLives:         5,
  enemyRadius:      34,
  enemyBaseSpeed:   26,      // px/s  (nivel 1)
  enemySpeedStep:   8,       // px/s por nivel
  enemySpeedJitter: 0.18,    // ± variación aleatoria
  bulletSpeed:      620,     // px/s
  bulletCooldown:   0.17,    // s entre disparos
  playerWidth:      46,
  playerHeight:     34,
  playerSpeed:      520,     // px/s con teclado
  waveDelay:        0.55,    // s entre rondas
  comboMaxMult:     5,
  comboStep:        3,       // aciertos para subir multiplicador
  powerUpChance:    0.16,
  slowMoDuration:   5,       // s
  slowMoFactor:     0.45,
  tripleDuration:   12,      // s
  shakeDecay:       6,
};

// Tipos de power-up con emoji y color
const POWER_UPS = {
  shield: { emoji: '🛡', color: '#22d3ee', label: 'ESCUDO' },
  triple: { emoji: '🔥', color: '#f97316', label: 'TRIPLE' },
  life:   { emoji: '💚', color: '#34d399', label: 'VIDA +1' },
  slow:   { emoji: '⏱', color: '#a78bfa', label: 'LENTO' },
};

// Paleta de colores (hue) para los asteroides
const ENEMY_HUES = [190, 320, 45, 140, 15, 270];


/* =========================================================================
   2. UTILIDADES
   ========================================================================= */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

const clamp   = (v, a, b) => Math.min(b, Math.max(a, v));
const rand    = (a, b) => Math.random() * (b - a) + a;
const randInt = (a, b) => Math.floor(rand(a, b + 1));

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y,     x + w, y + h, r);
  c.arcTo(x + w, y + h, x,     y + h, r);
  c.arcTo(x,     y + h, x,     y,     r);
  c.arcTo(x,     y,     x + w, y,     r);
  c.closePath();
}


/* =========================================================================
   3. ALMACENAMIENTO LOCAL
   ========================================================================= */

const Store = (() => {
  const KEY = 'novamath.v1';
  const DEFAULTS = {
    best:      0,     // mejor puntuación
    bestLevel: 1,     // mejor nivel alcanzado
    sound:     true,  // sonido activado
    effects:   true,  // efectos visuales
    plays:     0,     // partidas jugadas
  };

  let available = true;
  let memory = null;

  try {
    localStorage.setItem('__nm_test__', '1');
    localStorage.removeItem('__nm_test__');
  } catch (e) { available = false; }

  function load() {
    if (!available) return Object.assign({}, DEFAULTS, memory || {});
    try {
      const raw = localStorage.getItem(KEY);
      return Object.assign({}, DEFAULTS, raw ? JSON.parse(raw) : {});
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }

  function save(data) {
    if (!available) { memory = data; return; }
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { available = false; memory = data; }
  }

  return { load, save };
})();

let progress = Store.load();
const saveProgress = () => Store.save(progress);


/* =========================================================================
   4. MOTOR DE SONIDO
   -------------------------------------------------------------------------
   El juego funciona SIN archivos de audio (síntesis WebAudio).
   Para usar archivos reales más adelante:
     1) Copia los .mp3 en  assets/sounds/
     2) Cambia  USE_AUDIO_FILES = true  abajo.
   Si el archivo no existe, se usa automáticamente la síntesis (sin errores).
   ========================================================================= */

const USE_AUDIO_FILES = false;

const Sound = (() => {
  const FILES = {
    correct: 'assets/sounds/correct.mp3',
    wrong:   'assets/sounds/wrong.mp3',
    click:   'assets/sounds/click.mp3',
    win:     'assets/sounds/win.mp3',
    lose:    'assets/sounds/lose.mp3',
    level:   'assets/sounds/level.mp3',
    shoot:   'assets/sounds/shoot.mp3',
    power:   'assets/sounds/power.mp3',
  };

  const pool = {};
  let audioCtx = null;
  let enabled = true;

  function ctx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { audioCtx = new AC(); } catch (e) { return null; }
    }
    if (audioCtx.state === 'suspended') {
      const p = audioCtx.resume();
      if (p && p.catch) p.catch(() => {});
    }
    return audioCtx;
  }

  /* --- Generador de tonos --- */
  function tone({ freq, dur = 0.15, type = 'sine', vol = 0.12, delay = 0, slideTo = null }) {
    const ac = ctx();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /* --- Sonidos sintetizados por nombre --- */
  const SYNTH = {
    click:   () => tone({ freq: 520, dur: .07, type: 'square', vol: .08, slideTo: 780 }),
    shoot:   () => tone({ freq: 880, dur: .06, type: 'square', vol: .05, slideTo: 320 }),
    correct: () => {
      tone({ freq: 660,  dur: .09, type: 'triangle', vol: .12, delay: 0 });
      tone({ freq: 880,  dur: .09, type: 'triangle', vol: .11, delay: .07 });
      tone({ freq: 1180, dur: .16, type: 'triangle', vol: .12, delay: .15 });
    },
    wrong: () => {
      tone({ freq: 240, dur: .18, type: 'sawtooth', vol: .14, slideTo: 80 });
      tone({ freq: 180, dur: .25, type: 'square',   vol: .09, delay: .06, slideTo: 60 });
    },
    level: () => {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ freq: f, dur: .14, type: 'triangle', vol: .12, delay: i * .1 }));
    },
    power: () => {
      tone({ freq: 700, dur: .12, type: 'sine', vol: .14, delay: 0 });
      tone({ freq: 1200, dur: .18, type: 'sine', vol: .12, delay: .08 });
    },
    win: () => {
      [523, 659, 784, 1047, 1319].forEach((f, i) =>
        tone({ freq: f, dur: .18, type: 'triangle', vol: .13, delay: i * .12 }));
    },
    lose: () => {
      [392, 330, 262, 196].forEach((f, i) =>
        tone({ freq: f, dur: .22, type: 'sawtooth', vol: .11, delay: i * .16 }));
    },
  };

  /* --- Reproducción con archivo opcional --- */
  function playFile(name) {
    const src = FILES[name];
    if (!src) return false;
    let entry = pool[name];
    if (!entry) {
      const el = new Audio();
      el.src = src;
      el.preload = 'auto';
      let ok = true;
      el.addEventListener('error', () => { ok = false; });
      entry = pool[name] = { el, ok: true, ready: false };
      el.addEventListener('canplaythrough', () => { entry.ready = true; }, { once: true });
      // Forzamos una carga
      try { el.load(); } catch (e) { ok = false; entry.ok = false; }
    }
    if (!entry.ok || !entry.ready) return false;
    try {
      const clone = entry.el.cloneNode();
      clone.volume = 0.6;
      const p = clone.play();
      if (p && p.catch) p.catch(() => {});
      return true;
    } catch (e) { return false; }
  }

  return {
    setEnabled(v) { enabled = !!v; if (v) ctx(); },
    isEnabled() { return enabled; },
    /** Reproduce un sonido. Nunca lanza errores si falta el archivo. */
    play(name) {
      if (!enabled) return;
      try {
        if (USE_AUDIO_FILES && playFile(name)) return;
        const fn = SYNTH[name];
        if (fn) fn();
      } catch (e) { /* silencio: nunca rompemos el juego por audio */ }
    },
  };
})();

/** Función global de conveniencia (requisito del brief). */
function playSound(name) { Sound.play(name); }


/* =========================================================================
   5. REFERENCIAS DOM
   ========================================================================= */

const canvas   = $('#game');
const ctx      = canvas.getContext('2d');
const stage    = $('#stage');

const hudLevel = $('#hud-level');
const hudScore = $('#hud-score');
const hudLives = $('#hud-lives');
const hudBest  = $('#hud-best');

const progressFill = $('#progress-fill');
const progressText = $('#progress-text');
const progressBar  = $('#progress-track');

const problemBanner = $('#problem-banner');
const problemText   = $('#problem-text');
const comboBadge    = $('#combo-badge');

const feedbackFlash = $('#feedback-flash');
const shieldInd     = $('#shield-indicator');

const screens = {
  start:   $('#screen-start'),
  how:     $('#screen-how'),
  pause:   $('#screen-pause'),
  levelup: $('#screen-levelup'),
  end:     $('#screen-end'),
};


/* =========================================================================
   6. CANVAS / ESTRELLAS
   ========================================================================= */

let W = 0;   // ancho lógico (CSS px)
let H = 0;   // alto lógico
const stars = [];

function resize() {
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width  = Math.max(1, Math.floor(r.width  * dpr));
  canvas.height = Math.max(1, Math.floor(r.height * dpr));
  canvas.style.width  = r.width  + 'px';
  canvas.style.height = r.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  W = r.width;
  H = r.height;

  // Reposicionar entidades que dependen del tamaño
  state.player.x = clamp(state.player.x, 40, W - 40);
  state.player.y = H - 58;

  // Estrellas: cantidad proporcional al área
  const target = Math.round((W * H) / 7000);
  stars.length = 0;
  for (let i = 0; i < target; i++) {
    stars.push({
      x: rand(0, W),
      y: rand(0, H),
      z: rand(0.2, 1),
      s: rand(0.5, 1.8),
    });
  }
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));


/* =========================================================================
   7. ESTADO GLOBAL
   ========================================================================= */

const state = {
  mode: 'menu',        // 'menu' | 'playing' | 'paused' | 'levelup' | 'gameover' | 'victory'
  level: 1,
  score: 0,
  lives: CONFIG.startLives,
  combo: 0,
  bestCombo: 0,
  correctThisLevel: 0,
  problemsSolved: 0,

  player: {
    x: 0, y: 0,
    vx: 0,
    cooldown: 0,
    shield: false,
    tripleTime: 0,
    hitFlash: 0,
  },

  enemies: [],
  bullets: [],
  particles: [],
  floats: [],
  powerUps: [],

  problem: null,
  waveTimer: 0,
  waveActive: false,
  slowMoTimer: 0,
  levelUpTimer: 0,

  shake: 0,

  // Entrada
  keys: Object.create(null),
  pointer: { active: false, x: 0, id: null },

  // Estadísticas de la partida
  lastPoints: 0,
};


/* =========================================================================
   8. GENERACIÓN MATEMÁTICA
   ========================================================================= */

/**
 * Devuelve un problema {a, b, op, answer, text} adaptado al nivel.
 */
function generateProblem(level) {
  const ops = [];
  if (level <= 2)      ops.push('+');
  if (level >= 2)      ops.push('-');
  if (level >= 4)      ops.push('×');
  if (level >= 6)      ops.push('+', '×');
  if (level >= 8)      ops.push('×', '-');

  const op = ops[randInt(0, ops.length - 1)];
  let a, b, answer;

  if (op === '+') {
    const max = 6 + level * 3;
    a = randInt(2, max);
    b = randInt(2, max);
    answer = a + b;
  } else if (op === '-') {
    const max = 6 + level * 3;
    a = randInt(5, max + 6);
    b = randInt(2, a - 1);
    answer = a - b;
  } else { // ×
    const maxA = clamp(3 + Math.floor(level / 2), 3, 12);
    const maxB = clamp(3 + Math.floor(level / 3), 3, 10);
    a = randInt(2, maxA);
    b = randInt(2, maxB);
    answer = a * b;
  }

  const sym = op === '×' ? '×' : op;
  return { a, b, op: sym, answer, text: `${a} ${sym} ${b} = ?` };
}

/**
 * Genera respuestas incorrectas creíbles cercanas a la correcta.
 */
function generateWrongAnswers(answer, count) {
  const set = new Set();
  const maxOffset = clamp(4 + Math.floor(Math.abs(answer) / 6), 3, 14);
  let guard = 0;
  while (set.size < count && guard++ < 300) {
    const off = randInt(1, maxOffset);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const v = answer + sign * off;
    if (v < 0 || v === answer || set.has(v)) continue;
    set.add(v);
  }
  // Fallback por si acaso
  let extra = answer + 1;
  while (set.size < count) {
    if (extra !== answer && extra >= 0 && !set.has(extra)) set.add(extra);
    extra++;
  }
  return Array.from(set);
}


/* =========================================================================
   9. ENTIDADES Y EFECTOS
   ========================================================================= */

function spawnExplosion(x, y, hue, amount = 18, power = 1) {
  if (!progress.effects) return;
  for (let i = 0; i < amount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = rand(40, 260) * power;
    state.particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: rand(0.35, 0.9),
      maxLife: 0.9,
      size: rand(1.5, 4),
      hue,
    });
  }
}

function spawnFloat(x, y, text, color) {
  state.floats.push({
    x, y, text, color,
    life: 1.1, maxLife: 1.1,
    vy: -70,
  });
}

function screenShake(amount) {
  if (!progress.effects) return;
  state.shake = Math.min(22, state.shake + amount);
}

function flashFeedback(kind) {
  feedbackFlash.classList.remove('green', 'red');
  void feedbackFlash.offsetWidth;   // reinicia transición
  feedbackFlash.classList.add(kind);
  setTimeout(() => feedbackFlash.classList.remove(kind), 220);
}

/* --- Enemigo --- */
function makeEnemy(x, y, value, isCorrect, hue) {
  return {
    x, y,
    r: CONFIG.enemyRadius,
    value,
    correct: isCorrect,
    hue,
    vy: 0,           // se asigna al lanzar la oleada
    alive: true,
    dying: 0,        // 0..1 animación de muerte
    hitFlash: 0,
    wobble: rand(0, Math.PI * 2),
  };
}

/* --- Power-up --- */
function spawnPowerUp(x, y) {
  const keys = Object.keys(POWER_UPS);
  // La vida extra es más rara
  const weighted = [];
  keys.forEach(k => {
    const weight = k === 'life' ? 1 : 3;
    for (let i = 0; i < weight; i++) weighted.push(k);
  });
  const type = weighted[randInt(0, weighted.length - 1)];
  state.powerUps.push({
    x, y,
    type,
    vy: 60,
    r: 22,
    life: 8,
    bob: rand(0, Math.PI * 2),
  });
}


/* =========================================================================
   10. LÓGICA DEL JUEGO
   ========================================================================= */

/** Inicia una nueva partida. */
function startGame() {
  state.mode = 'playing';
  state.level = 1;
  state.score = 0;
  state.lives = CONFIG.startLives;
  state.combo = 0;
  state.bestCombo = 0;
  state.correctThisLevel = 0;
  state.problemsSolved = 0;
  state.enemies = [];
  state.bullets = [];
  state.particles = [];
  state.floats = [];
  state.powerUps = [];
  state.waveTimer = 0.35;
  state.waveActive = false;
  state.slowMoTimer = 0;
  state.levelUpTimer = 0;
  state.shake = 0;

  state.player.x = W / 2;
  state.player.y = H - 58;
  state.player.vx = 0;
  state.player.cooldown = 0;
  state.player.shield = false;
  state.player.tripleTime = 0;
  state.player.hitFlash = 0;

  progress.plays = (progress.plays || 0) + 1;
  saveProgress();

  showScreen(null);
  problemBanner.classList.remove('hidden');
  shieldInd.classList.add('hidden');
  updateHUD();
  updateProgress();

  playSound('click');
}

/** Avanza un nivel. */
function advanceLevel() {
  playSound('level');
  screenShake(8);

  const bonus = 150 + state.level * 50;
  state.score += bonus;
  state.lastPoints = bonus;

  if (state.level >= CONFIG.totalLevels) {
    finishGame('victory');
    return;
  }

  state.level++;
  state.correctThisLevel = 0;
  state.waveTimer = 0;
  state.levelUpTimer = 1.9;
  state.mode = 'levelup';

  $('#levelup-title').textContent = `NIVEL ${state.level}`;
  $('#levelup-sub').textContent = state.level === CONFIG.totalLevels
    ? '¡SECTOR FINAL!' : '¡Sector despejado!';
  $('#levelup-bonus').textContent = bonus;
  showScreen('levelup');

  updateHUD();
  updateProgress();
}

/** Finaliza la partida (victoria o derrota). */
function finishGame(result) {
  state.mode = result === 'victory' ? 'victory' : 'gameover';

  const isRecord = state.score > progress.best;
  if (isRecord) progress.best = state.score;
  if (state.level > progress.bestLevel) progress.bestLevel = state.level;
  saveProgress();

  if (result === 'victory') {
    playSound('win');
    $('#end-title').textContent = '¡VICTORIA!';
    $('#end-sub').textContent = 'Has defendido el sector por completo.';
  } else {
    playSound('lose');
    $('#end-title').textContent = 'GAME OVER';
    $('#end-sub').textContent = 'La lluvia de asteroides te superó.';
  }

  $('#end-score').textContent = state.score;
  $('#end-best').textContent  = progress.best;
  $('#end-level').textContent = state.level;
  $('#end-record').classList.toggle('hidden', !isRecord);

  problemBanner.classList.add('hidden');
  showScreen('end');
  updateHUD();
}

/** Daña al jugador. */
function damagePlayer() {
  if (state.player.hitFlash > 0.4) return;   // invulnerabilidad breve

  if (state.player.shield) {
    state.player.shield = false;
    shieldInd.classList.add('hidden');
    state.player.hitFlash = 0.8;
    screenShake(10);
    spawnExplosion(state.player.x, state.player.y, 190, 22, 1.1);
    playSound('power');
    spawnFloat(state.player.x, state.player.y - 30, 'ESCUDO', '#22d3ee');
    return;
  }

  state.lives--;
  state.combo = 0;
  state.player.hitFlash = 1.0;
  screenShake(16);
  flashFeedback('red');
  playSound('wrong');
  spawnExplosion(state.player.x, state.player.y, 350, 26, 1.2);
  updateHUD();

  if (state.lives <= 0) finishGame('defeat');
}

/** Aplica un power-up. */
function applyPowerUp(type) {
  playSound('power');
  const p = state.player;
  switch (type) {
    case 'shield':
      p.shield = true;
      shieldInd.classList.remove('hidden');
      spawnFloat(p.x, p.y - 34, '¡ESCUDO!', '#22d3ee');
      break;
    case 'triple':
      p.tripleTime = CONFIG.tripleDuration;
      spawnFloat(p.x, p.y - 34, '¡TRIPLE!', '#f97316');
      break;
    case 'life':
      state.lives = Math.min(CONFIG.maxLives, state.lives + 1);
      spawnFloat(p.x, p.y - 34, '+1 VIDA', '#34d399');
      updateHUD();
      break;
    case 'slow':
      state.slowMoTimer = CONFIG.slowMoDuration;
      spawnFloat(p.x, p.y - 34, '¡LENTO!', '#a78bfa');
      break;
  }
}

/** Genera la siguiente oleada. */
function spawnWave() {
  const level = state.level;
  const count = clamp(3 + Math.floor(level / 2), 3, 6);

  const problem = generateProblem(level);
  const wrongs = generateWrongAnswers(problem.answer, count - 1);

  const values = shuffle([problem.answer, ...wrongs]);
  const hues   = shuffle(ENEMY_HUES.slice());
  const spacing = W / (count + 1);

  const speedBase = CONFIG.enemyBaseSpeed + (level - 1) * CONFIG.enemySpeedStep;

  state.enemies = values.map((v, i) => {
    const e = makeEnemy(
      spacing * (i + 1),
      -CONFIG.enemyRadius - rand(0, 50),
      v,
      v === problem.answer,
      hues[i % hues.length]
    );
    e.vy = speedBase * rand(1 - CONFIG.enemySpeedJitter, 1 + CONFIG.enemySpeedJitter);
    return e;
  });

  state.problem = problem;
  state.waveActive = true;
  problemText.textContent = problem.text;

  // pequeña animación de entrada
  problemBanner.classList.remove('hidden');
}

/** El jugador acertó al número correcto. */
function onCorrectHit(enemy) {
  state.problemsSolved++;
  state.correctThisLevel++;
  state.combo++;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;

  const mult = comboMultiplier();
  const points = Math.round(100 * mult * (1 + state.level * 0.08));
  state.score += points;

  // Efectos
  spawnExplosion(enemy.x, enemy.y, enemy.hue, 26, 1.2);
  spawnExplosion(enemy.x, enemy.y, 140, 14, 0.8);
  screenShake(7);
  flashFeedback('green');
  playSound('correct');
  spawnFloat(W / 2, H * 0.35, `+${points}`, '#34d399');

  // Power-up ocasional
  if (Math.random() < CONFIG.powerUpChance) {
    spawnPowerUp(enemy.x, enemy.y);
  }

  // Marcar toda la oleada como resuelta (los demás se desvanecen)
  state.enemies.forEach(e => {
    if (e.alive && e !== enemy) {
      e.alive = false;
      e.dying = 0.001;
    }
  });
  enemy.alive = false;
  enemy.dying = 0.001;

  state.waveActive = false;
  state.waveTimer = CONFIG.waveDelay;
  updateHUD();
  updateProgress();

  // ¿Nivel completado?
  const need = CONFIG.wavesPerLevel[state.level - 1];
  if (state.correctThisLevel >= need) {
    advanceLevel();
  }
}

/** El jugador disparó al número equivocado. */
function onWrongHit(enemy) {
  enemy.alive = false;
  enemy.dying = 0.001;
  spawnExplosion(enemy.x, enemy.y, 0, 20, 1);
  spawnFloat(enemy.x, enemy.y, '✗', '#ef4444');
  damagePlayer();
}

/** Un enemigo llegó al fondo. */
function onEnemyEscaped(enemy) {
  enemy.alive = false;
  // Si era el correcto, además hay que reiniciar la oleada.
  const wasCorrect = enemy.correct;
  spawnExplosion(enemy.x, H + 10, 0, 16, 0.9);
  damagePlayer();

  if (state.lives <= 0) return;

  // Cualquier escape reinicia la ronda (más claro para el jugador).
  state.enemies.forEach(e => {
    if (e.alive) { e.alive = false; e.dying = 0.001; }
  });
  state.waveActive = false;
  state.waveTimer = 0.6;

  if (wasCorrect) {
    spawnFloat(W / 2, H - 80, '¡RESPUESTA PERDIDA!', '#ef4444');
  }
}

/** Multiplicador de combo actual. */
function comboMultiplier() {
  return clamp(1 + Math.floor(state.combo / CONFIG.comboStep), 1, CONFIG.comboMaxMult);
}

/** Dispara un proyectil (o varios si el triple está activo). */
function fireBullet() {
  const p = state.player;
  if (p.cooldown > 0) return;
  p.cooldown = CONFIG.bulletCooldown;

  const shots = p.tripleTime > 0 ? [-0.28, 0, 0.28] : [0];
  shots.forEach(ang => {
    state.bullets.push({
      x: p.x,
      y: p.y - 20,
      vx: Math.sin(ang) * CONFIG.bulletSpeed * 0.5,
      vy: -CONFIG.bulletSpeed * Math.cos(ang),
      r: 4,
      life: 2,
      trail: [],
    });
  });
  playSound('shoot');
}

/** Actualiza la lógica del juego. dt en segundos. */
function update(dt) {
  // ---- Estrellas (siempre animadas) ----
  const starSpeedFactor = state.mode === 'playing' ? 1 : 0.25;
  for (const s of stars) {
    s.y += s.z * 42 * dt * starSpeedFactor;
    if (s.y > H + 2) {
      s.y = -2;
      s.x = rand(0, W);
    }
  }

  // ---- Efecto de pausa (sin actualización) ----
  if (state.mode === 'paused') return;

  // ---- Shake y flashes (se desvanecen siempre) ----
  state.shake = Math.max(0, state.shake - dt * CONFIG.shakeDecay * 8);
  state.player.hitFlash = Math.max(0, state.player.hitFlash - dt);

  // ---- Transición de nivel ----
  if (state.mode === 'levelup') {
    state.levelUpTimer -= dt;
    // Partículas siguen animándose
    updateParticles(dt);
    updateFloats(dt);
    if (state.levelUpTimer <= 0) {
      state.mode = 'playing';
      showScreen(null);
      state.waveTimer = 0.5;
    }
    return;
  }

  if (state.mode !== 'playing') {
    updateParticles(dt);
    updateFloats(dt);
    return;
  }

  const p = state.player;

  // ---- Slow motion ----
  if (state.slowMoTimer > 0) state.slowMoTimer -= dt;
  const timeFactor = state.slowMoTimer > 0 ? CONFIG.slowMoFactor : 1;

  // ---- Timers del jugador ----
  if (p.cooldown > 0) p.cooldown -= dt;
  if (p.tripleTime > 0) p.tripleTime = Math.max(0, p.tripleTime - dt);

  // ---- Movimiento del jugador ----
  const k = state.keys;
  let dir = 0;
  if (k['ArrowLeft'] || k['a'] || k['A']) dir -= 1;
  if (k['ArrowRight'] || k['d'] || k['D']) dir += 1;

  if (dir !== 0) {
    p.x += dir * CONFIG.playerSpeed * dt;
  } else if (state.pointer.active) {
    // Seguir el puntero suavemente
    const target = clamp(state.pointer.x, 30, W - 30);
    p.x += (target - p.x) * Math.min(1, dt * 16);
  }
  p.x = clamp(p.x, 30, W - 30);
  p.y = H - 58;

  // Disparo continuo
  if (k[' '] || k['Spacebar'] || k['ArrowUp'] || k['w'] || k['W'] || state.pointer.active) {
    fireBullet();
  }

  // ---- Balas ----
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 5) b.trail.shift();

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.y < -20 || b.life <= 0 || b.x < -20 || b.x > W + 20) {
      state.bullets.splice(i, 1);
    }
  }

  // ---- Enemigos ----
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];

    if (e.dying > 0) {
      e.dying += dt * 3;
      if (e.dying >= 1) state.enemies.splice(i, 1);
      continue;
    }

    e.wobble += dt * 2;
    e.y += e.vy * dt * timeFactor;
    e.x += Math.sin(e.wobble) * 12 * dt;

    if (e.hitFlash > 0) e.hitFlash -= dt;

    // Colisión con balas
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const rr = (e.r + b.r) * (e.r + b.r) * 0.85;   // hitbox ligeramente indulgente
      if (dx * dx + dy * dy <= rr) {
        state.bullets.splice(j, 1);
        if (e.correct) onCorrectHit(e);
        else onWrongHit(e);
        break;
      }
    }

    // ¿Escapó por abajo?
    if (e.alive && e.y - e.r > H) {
      onEnemyEscaped(e);
    }
  }

  // ---- Power-ups ----
  for (let i = state.powerUps.length - 1; i >= 0; i--) {
    const u = state.powerUps[i];
    u.bob += dt * 3;
    u.y += u.vy * dt;
    u.life -= dt;

    // Recogida por el jugador
    const dx = u.x - p.x;
    const dy = u.y - p.y;
    if (dx * dx + dy * dy < (u.r + 26) * (u.r + 26)) {
      applyPowerUp(u.type);
      spawnExplosion(u.x, u.y, 50, 14, 0.7);
      state.powerUps.splice(i, 1);
      continue;
    }
    if (u.y > H + 30 || u.life <= 0) state.powerUps.splice(i, 1);
  }

  // ---- Partículas y textos ----
  updateParticles(dt);
  updateFloats(dt);

  // ---- Temporizador de oleada ----
  if (!state.waveActive) {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0 && state.mode === 'playing') {
      spawnWave();
    }
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const q = state.particles[i];
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.94;
    q.vy *= 0.94;
    q.life -= dt;
    if (q.life <= 0) state.particles.splice(i, 1);
  }
}

function updateFloats(dt) {
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i];
    f.y += f.vy * dt;
    f.vy *= 0.94;
    f.life -= dt;
    if (f.life <= 0) state.floats.splice(i, 1);
  }
}


/* =========================================================================
   11. RENDER
   ========================================================================= */

function render() {
  // ---- Fondo ----
  const bgGrad = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, Math.max(W, H));
  bgGrad.addColorStop(0, '#0a1530');
  bgGrad.addColorStop(0.6, '#060b18');
  bgGrad.addColorStop(1, '#02040a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ---- Screen shake ----
  let sx = 0, sy = 0;
  if (state.shake > 0 && progress.effects) {
    sx = rand(-state.shake, state.shake);
    sy = rand(-state.shake, state.shake);
  }
  ctx.save();
  ctx.translate(sx, sy);

  // ---- Estrellas ----
  drawStars();

  // ---- Partículas (detrás) ----
  drawParticles();

  // ---- Power-ups ----
  drawPowerUps();

  // ---- Enemigos ----
  drawEnemies();

  // ---- Balas ----
  drawBullets();

  // ---- Jugador ----
  if (state.mode !== 'menu' && state.mode !== 'gameover' && state.mode !== 'victory') {
    drawPlayer();
  }

  // ---- Textos flotantes ----
  drawFloats();

  ctx.restore();

  // ---- Viñeta ----
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35,
                                      W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawStars() {
  ctx.save();
  for (const s of stars) {
    const alpha = 0.25 + s.z * 0.7;
    ctx.fillStyle = `rgba(${180 + s.z * 60}, ${210 + s.z * 40}, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.s * s.z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const q of state.particles) {
    const t = q.life / q.maxLife;
    const alpha = clamp(t, 0, 1);
    const hue = q.hue || 200;
    ctx.fillStyle = `hsla(${hue}, 95%, ${55 + (1 - t) * 25}%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.size * (0.4 + t * 0.9), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBullets() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of state.bullets) {
    // Estela
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      const a = (i / b.trail.length) * 0.5;
      ctx.fillStyle = `rgba(34, 211, 238, ${a})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, b.r * (i / b.trail.length + 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    // Núcleo
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 3);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#7dd3fc');
    grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies() {
  ctx.save();
  for (const e of state.enemies) {
    if (!e.alive && e.dying === 0) continue;

    const dying = e.dying;
    const scale = e.alive ? 1 : 1 + dying * 0.8;
    const alpha = e.alive ? 1 : 1 - dying;

    const hue = e.hue;
    const colorBright = `hsl(${hue}, 95%, 65%)`;
    const colorDeep   = `hsl(${hue}, 90%, 45%)`;

    // Rotación lenta
    const rot = performance.now() * 0.0006 + e.wobble;

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.scale(scale, scale);

    // Resplandor exterior
    const glow = ctx.createRadialGradient(0, 0, e.r * 0.4, 0, 0, e.r * 1.9);
    glow.addColorStop(0, `hsla(${hue}, 95%, 60%, .5)`);
    glow.addColorStop(1, `hsla(${hue}, 95%, 60%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Hexágono
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 - Math.PI / 2;
      const px = Math.cos(a) * e.r;
      const py = Math.sin(a) * e.r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const fill = ctx.createLinearGradient(0, -e.r, 0, e.r);
    fill.addColorStop(0, colorBright);
    fill.addColorStop(1, colorDeep);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = `hsla(${hue}, 95%, 80%, .95)`;
    ctx.stroke();

    // Anillo interior
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.72, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.stroke();

    // Número
    ctx.rotate(-rot); // texto horizontal
    ctx.fillStyle = '#08111f';
    ctx.font = `900 ${Math.round(e.r * 0.85)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(e.value), 0, 1);

    // Brillo por encima del número
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = `900 ${Math.round(e.r * 0.85)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.fillText(String(e.value), 0, 0);

    ctx.restore();
  }
  ctx.restore();
}

function drawPlayer() {
  const p = state.player;
  const flashing = p.hitFlash > 0 && Math.floor(p.hitFlash * 20) % 2 === 0;

  ctx.save();
  ctx.translate(p.x, p.y);

  // Escudo activo
  if (p.shield) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = 42 + Math.sin(performance.now() * 0.008) * 4;
    const grd = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
    grd.addColorStop(0, 'rgba(34, 211, 238, 0)');
    grd.addColorStop(0.7, 'rgba(34, 211, 238, .35)');
    grd.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Llama del motor
  const flameLen = 12 + Math.sin(performance.now() * 0.05) * 5;
  const flameGrad = ctx.createLinearGradient(0, 10, 0, 10 + flameLen);
  flameGrad.addColorStop(0, 'rgba(125, 211, 252, .95)');
  flameGrad.addColorStop(0.5, 'rgba(59, 130, 246, .7)');
  flameGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.lineTo(8, 10);
  ctx.lineTo(0, 10 + flameLen);
  ctx.closePath();
  ctx.fill();

  // Cuerpo de la nave
  ctx.beginPath();
  ctx.moveTo(0, -CONFIG.playerHeight * 0.7);
  ctx.lineTo(CONFIG.playerWidth * 0.5, CONFIG.playerHeight * 0.45);
  ctx.lineTo(0, CONFIG.playerHeight * 0.2);
  ctx.lineTo(-CONFIG.playerWidth * 0.5, CONFIG.playerHeight * 0.45);
  ctx.closePath();

  const bodyGrad = ctx.createLinearGradient(0, -20, 0, 20);
  bodyGrad.addColorStop(0, flashing ? '#ffffff' : '#e0f6ff');
  bodyGrad.addColorStop(0.5, flashing ? '#ff8888' : '#22d3ee');
  bodyGrad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.stroke();

  // Cabina
  ctx.fillStyle = '#04121f';
  ctx.beginPath();
  ctx.ellipse(0, -4, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Triple disparo: tres puntitos indicadores
  if (p.tripleTime > 0) {
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(-14, -6, 3, 0, Math.PI * 2);
    ctx.arc(0,   -10, 3, 0, Math.PI * 2);
    ctx.arc(14,  -6, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPowerUps() {
  ctx.save();
  for (const u of state.powerUps) {
    const bob = Math.sin(u.bob) * 4;
    const info = POWER_UPS[u.type];
    const fading = u.life < 1.5 ? (Math.sin(u.life * 18) * 0.5 + 0.5) : 1;

    ctx.save();
    ctx.globalAlpha = fading;
    ctx.translate(u.x, u.y + bob);

    // Halo
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, u.r * 1.8);
    glow.addColorStop(0, info.color + 'cc');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, u.r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Disco
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(6, 11, 24, .85)';
    ctx.beginPath();
    ctx.arc(0, 0, u.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = info.color;
    ctx.stroke();

    // Emoji
    ctx.font = `${Math.round(u.r * 1.2)}px system-ui, apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.emoji, 0, 1);

    ctx.restore();
  }
  ctx.restore();
}

function drawFloats() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of state.floats) {
    const t = f.life / f.maxLife;
    const alpha = clamp(t * 1.2, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${Math.round(24 + (1 - t) * 6)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillText(f.text, f.x + 2, f.y + 2);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}


/* =========================================================================
   12. INTERFAZ Y PANTALLAS
   ========================================================================= */

function showScreen(name) {
  Object.keys(screens).forEach(k => {
    screens[k].classList.toggle('active', k === name);
  });
}

function hideAllScreens() { showScreen(null); }

function updateHUD() {
  hudLevel.textContent = state.level;
  hudScore.textContent = state.score;
  hudBest.textContent  = Math.max(progress.best, state.score);
  hudLives.textContent = '♥'.repeat(Math.max(0, state.lives));
  hudLives.classList.toggle('low', state.lives === 1);
}

function updateProgress() {
  const need = CONFIG.wavesPerLevel[state.level - 1] || 1;
  const cur = Math.min(state.correctThisLevel, need);
  const pct = need > 0 ? (cur / need) * 100 : 0;
  progressFill.style.width = pct + '%';
  progressText.textContent = `${cur} / ${need}`;
  progressBar.setAttribute('aria-valuenow', String(Math.round(pct)));
}

function updateComboBadge() {
  if (state.combo >= CONFIG.comboStep) {
    comboBadge.classList.remove('hidden');
    comboBadge.textContent = `COMBO ×${comboMultiplier()}`;
    comboBadge.classList.remove('pop');
    void comboBadge.offsetWidth;
    comboBadge.classList.add('pop');
  } else {
    comboBadge.classList.add('hidden');
  }
}

/* --- Actualizaciones reactivas simples vía polling ligero --- */
setInterval(() => {
  if (state.mode === 'playing' || state.mode === 'paused' || state.mode === 'levelup') {
    updateComboBadge();
  }
}, 90);


/* =========================================================================
   13. ENTRADA (teclado, táctil, puntero)
   ========================================================================= */

/* ---------- Teclado ---------- */
document.addEventListener('keydown', (ev) => {
  const k = ev.key;
  state.keys[k] = true;

  // Pausa / reanudar
  if (k === 'p' || k === 'P' || k === 'Escape') {
    if (state.mode === 'playing') pauseGame();
    else if (state.mode === 'paused') resumeGame();
  }

  // Evitar scroll con espacio y flechas
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) {
    ev.preventDefault();
  }
});

document.addEventListener('keyup', (ev) => {
  state.keys[ev.key] = false;
});

/* ---------- Puntero / táctil en el stage ---------- */
function stageX(clientX) {
  const r = stage.getBoundingClientRect();
  return clientX - r.left;
}

function onPointerDown(clientX, clientY, id) {
  if (state.mode !== 'playing') return;
  state.pointer.active = true;
  state.pointer.id = id;
  state.pointer.x = clamp(stageX(clientX), 30, W - 30);
}

function onPointerMove(clientX, id) {
  if (!state.pointer.active) return;
  if (state.pointer.id !== null && id !== undefined && id !== state.pointer.id) return;
  state.pointer.x = clamp(stageX(clientX), 30, W - 30);
}

function onPointerUp(id) {
  if (state.pointer.id !== null && id !== undefined && id !== state.pointer.id) return;
  state.pointer.active = false;
  state.pointer.id = null;
}

// Mouse
stage.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  onPointerDown(e.clientX, e.clientY, 'mouse');
});
window.addEventListener('mousemove', (e) => {
  if (state.pointer.id === 'mouse') onPointerMove(e.clientX, 'mouse');
});
window.addEventListener('mouseup', (e) => {
  if (state.pointer.id === 'mouse') onPointerUp('mouse');
});

// Touch
stage.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  if (!t) return;
  e.preventDefault();
  onPointerDown(t.clientX, t.clientY, t.identifier);
}, { passive: false });

stage.addEventListener('touchmove', (e) => {
  const t = e.changedTouches[0];
  if (!t) return;
  e.preventDefault();
  onPointerMove(t.clientX, t.identifier);
}, { passive: false });

function handleTouchEnd(e) {
  const t = e.changedTouches[0];
  if (!t) return;
  e.preventDefault();
  onPointerUp(t.identifier);
}
stage.addEventListener('touchend', handleTouchEnd, { passive: false });
stage.addEventListener('touchcancel', handleTouchEnd, { passive: false });


/* =========================================================================
   BOTONES / PANTALLAS
   ========================================================================= */

/* Inicio */
$('#btn-play').addEventListener('click', () => { playSound('click'); startGame(); });
$('#btn-how').addEventListener('click',  () => { playSound('click'); showScreen('how'); });

/* Instrucciones */
$('#btn-how-play').addEventListener('click', () => { playSound('click'); startGame(); });
$('#btn-how-back').addEventListener('click', () => { playSound('click'); showScreen('start'); });

/* Pausa */
$('#btn-resume').addEventListener('click', resumeGame);
$('#btn-restart').addEventListener('click', () => { playSound('click'); startGame(); });
$('#btn-quit').addEventListener('click', () => {
  playSound('click');
  state.mode = 'menu';
  problemBanner.classList.add('hidden');
  shieldInd.classList.add('hidden');
  showScreen('start');
  updateStartInfo();
});

/* Final */
$('#btn-again').addEventListener('click', () => { playSound('click'); startGame(); });
$('#btn-menu').addEventListener('click', () => {
  playSound('click');
  state.mode = 'menu';
  showScreen('start');
  updateStartInfo();
});

/* HUD */
$('#btn-pause').addEventListener('click', () => {
  if (state.mode === 'playing') pauseGame();
  else if (state.mode === 'paused') resumeGame();
});

$('#btn-sound').addEventListener('click', toggleSound);

/* Chips de la pantalla de inicio */
$('#chip-sound').addEventListener('click', toggleSound);
$('#chip-effects').addEventListener('click', () => {
  progress.effects = !progress.effects;
  saveProgress();
  syncChips();
  playSound('click');
});

function toggleSound() {
  progress.sound = !progress.sound;
  Sound.setEnabled(progress.sound);
  saveProgress();
  syncChips();
  playSound('click');
}

function syncChips() {
  const s = $('#chip-sound');
  const e = $('#chip-effects');
  s.classList.toggle('on', progress.sound);
  e.classList.toggle('on', progress.effects);
  $('#btn-sound').textContent = progress.sound ? '🔊' : '🔇';
  $('#btn-sound').classList.toggle('muted', !progress.sound);
}

/* Pausa / reanudación */
function pauseGame() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  state.keys = Object.create(null);
  state.pointer.active = false;
  state.pointer.id = null;
  showScreen('pause');
  playSound('click');
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = 'playing';
  showScreen(null);
  playSound('click');
}

function updateStartInfo() {
  $('#start-best').textContent = progress.best;
  $('#start-level').textContent = progress.bestLevel;
}

/* Pausa automática al perder el foco */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'playing') pauseGame();
});
window.addEventListener('blur', () => {
  if (state.mode === 'playing') pauseGame();
});


/* =========================================================================
   14. INICIALIZACIÓN
   ========================================================================= */

let lastTs = 0;

function loop(ts) {
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;   // evita saltos tras pestañas inactivas

  update(dt);
  render();

  requestAnimationFrame(loop);
}

function init() {
  // Configuración del sonido según preferencias
  Sound.setEnabled(progress.sound);
  syncChips();
  updateStartInfo();
  updateHUD();
  updateProgress();

  // Posición inicial del jugador (por si se redimensiona antes de jugar)
  state.player.x = 100;
  state.player.y = 100;

  resize();

  // Estado inicial: menú
  state.mode = 'menu';
  problemBanner.classList.add('hidden');
  shieldInd.classList.add('hidden');
  showScreen('start');

  requestAnimationFrame(loop);
}

// Arranque
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Exponer utilidades para depuración / futuras integraciones
window.NovaMath = {
  playSound,
  start: startGame,
  state,
  CONFIG,
};