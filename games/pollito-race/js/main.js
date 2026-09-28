(() => {
"use strict";

const $ = (id) => document.getElementById(id);
const screens = [...document.querySelectorAll(".screen")];

const CONFIG = {
  facil:   { player: 18, penalty: 7, rivals: [7, 9] },
  normal:  { player: 17, penalty: 8, rivals: [10, 12] },
  dificil: { player: 16, penalty: 9, rivals: [12, 14] }
};

const CATEGORY = {
  matematicas: { label: "🔴 MATEMÁTICAS", color: "#ff435d" },
  espanol: { label: "🔵 ESPAÑOL", color: "#4b91ff" },
  sociales: { label: "🟡 SOCIALES", color: "#f4c842" },
  aleatorio: { label: "🎲 ALEATORIO", color: "#a46bff" }
};

const VALID_CATEGORIES = new Set(["matematicas", "espanol", "sociales"]);
const VALID_DIFFICULTIES = new Set(["facil", "normal", "dificil"]);

const state = {
  category: "matematicas",
  difficulty: "facil",
  questions: [],
  used: new Set(),
  current: null,
  locked: true,
  round: 0,
  player: 0,
  rivals: [0, 0],
  correct: 0,
  wrong: 0,
  streak: 0,
  lives: 3,
  score: 0,
  finished: false,
  countdownTimer: null,
  nextQuestionTimer: null
};

function show(id) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.id === id));
  $("hud").classList.toggle("hidden", id !== "race");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function shuffle(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function setSelection() {
  $("selection").textContent =
    CATEGORY[state.category].label + " · " +
    state.difficulty.toUpperCase() + " · 3 carriles · 4 opciones";
}

function validateQuestions(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("questions.json no contiene un banco de preguntas válido.");
  }

  const errors = [];
  data.forEach((q, index) => {
    const n = index + 1;
    if (!q || typeof q !== "object") {
      errors.push("Pregunta #" + n + ": no es un objeto.");
      return;
    }
    if (!VALID_CATEGORIES.has(q.category)) errors.push("Pregunta #" + n + ": categoría inválida.");
    if (!VALID_DIFFICULTIES.has(q.difficulty)) errors.push("Pregunta #" + n + ": dificultad inválida.");
    if (typeof q.question !== "string" || !q.question.trim()) errors.push("Pregunta #" + n + ": texto vacío.");
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push("Pregunta #" + n + ": debe tener exactamente 4 opciones.");
    } else {
      const normalized = q.options.map((option) => String(option).trim().toLocaleLowerCase("es"));
      if (normalized.some((option) => !option)) errors.push("Pregunta #" + n + ": hay opciones vacías.");
      if (new Set(normalized).size !== 4) errors.push("Pregunta #" + n + ": las opciones deben ser diferentes.");
    }
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) {
      errors.push("Pregunta #" + n + ": correct debe estar entre 0 y 3.");
    }
  });

  if (errors.length) {
    throw new Error("Banco de preguntas inválido:\n" + errors.join("\n"));
  }
}

async function loadQuestions() {
  if (state.questions.length) return;
  try {
    const response = await fetch("./data/questions.json", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    validateQuestions(data);
    state.questions = data;
  } catch (error) {
    console.error("POLLITO RACE: no se pudo cargar questions.json", error);
    throw new Error(
      "No se pudo cargar questions.json. Abre el juego desde TecnoMath/GitHub Pages o un servidor local para permitir la carga del JSON."
    );
  }
}

function availableQuestions() {
  let pool = state.questions.filter((q) =>
    state.category === "aleatorio" || q.category === state.category
  );
  const byDifficulty = pool.filter((q) => q.difficulty === state.difficulty);
  if (byDifficulty.length >= 4) pool = byDifficulty;
  return pool;
}

function resetGame() {
  clearTimers();
  state.used.clear();
  state.current = null;
  state.locked = true;
  state.round = 0;
  state.player = 0;
  state.rivals = [0, 0];
  state.correct = 0;
  state.wrong = 0;
  state.streak = 0;
  state.lives = 3;
  state.score = 0;
  state.finished = false;
  $("answers").replaceChildren();
  $("feedback").textContent = "";
  $("raceMessage").textContent = "Preparando carrera…";
  render();
}

function render() {
  $("hudProgress").textContent = Math.round(state.player) + "%";
  $("hudLives").textContent = state.lives > 0 ? "❤️".repeat(state.lives) : "0";
  $("hudScore").textContent = state.score;
  $("correctCount").textContent = state.correct;
  $("wrongCount").textContent = state.wrong;
  $("streak").textContent = state.streak ? "x" + Math.min(4, state.streak) : "0";
  $("score").textContent = state.score;
  $("progressText").textContent = Math.round(state.player) + "%";
  $("progressBar").style.width = Math.min(100, state.player) + "%";
  $("player").style.left = (8 + state.player * 0.78) + "%";
  $("rival1").style.left = (8 + state.rivals[0] * 0.78) + "%";
  $("rival2").style.left = (8 + state.rivals[1] * 0.78) + "%";
}

function chooseQuestion() {
  const pool = availableQuestions();
  if (!pool.length) throw new Error("No hay preguntas para esta configuración.");

  let candidates = pool.filter((q) => !state.used.has(q.question));
  if (!candidates.length) {
    state.used.clear();
    candidates = pool;
  }

  const question = candidates[Math.floor(Math.random() * candidates.length)];
  state.current = question;
  state.used.add(question.question);

  $("questionNumber").textContent = "Pregunta " + (state.round + 1);
  $("question").textContent = question.question;
  $("categoryBadge").textContent = CATEGORY[question.category].label;
  $("categoryBadge").style.background = CATEGORY[question.category].color;
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("answers").replaceChildren();

  shuffle(question.options.map((text, index) => ({ text, index }))).forEach((option) => {
    const button = document.createElement("button");
    button.className = "answer";
    button.type = "button";
    button.textContent = option.text;
    button.dataset.answerIndex = String(option.index);
    button.addEventListener("click", () => answer(option.index, button), { once: true });
    $("answers").appendChild(button);
  });
}

function answer(index, clicked) {
  if (state.locked || state.finished || !state.current) return;
  state.locked = true;

  document.querySelectorAll(".answer").forEach((button) => {
    button.disabled = true;
  });

  const question = state.current;
  const correct = index === question.correct;

  if (correct) {
    state.correct++;
    state.streak++;
    const multiplier = Math.min(4, state.streak);
    const points = 100 + (multiplier > 1 ? 50 * multiplier : 0);
    state.score += points;
    state.player = Math.min(100, state.player + CONFIG[state.difficulty].player + Math.min(3, state.streak - 1));
    clicked.classList.add("correct");
    $("feedback").className = "feedback good";
    $("feedback").textContent = "¡CORRECTO! 🐔💨 +" + points + " puntos · racha x" + multiplier;
    $("raceMessage").textContent = "⚡ ¡Tu pollito acelera!";
    animateRunner("player", "bump");
  } else {
    state.wrong++;
    state.streak = 0;
    state.lives = Math.max(0, state.lives - 1);
    state.player = Math.max(0, state.player - CONFIG[state.difficulty].penalty);
    clicked.classList.add("wrong");
    document.querySelectorAll(".answer").forEach((button) => {
      if (Number(button.dataset.answerIndex) === question.correct) button.classList.add("correct");
    });
    $("feedback").className = "feedback bad";
    $("feedback").textContent = "¡INCORRECTO! 😵 Correcta: " + question.options[question.correct];
    $("raceMessage").textContent = state.lives
      ? "💥 Pierdes distancia, pero sigues en carrera."
      : "💥 Sin vidas. Todavía puedes terminar la carrera.";
    animateRunner("player", "shake");
  }

  advanceRivals();
  render();

  if (checkFinish()) return;

  state.nextQuestionTimer = window.setTimeout(() => {
    if (state.finished) return;
    state.round++;
    state.locked = false;
    chooseQuestion();
  }, 700);
}

function animateRunner(id, className) {
  const runner = $(id);
  runner.classList.remove(className);
  void runner.offsetWidth;
  runner.classList.add(className);
  window.setTimeout(() => runner.classList.remove(className), 400);
}

function advanceRivals() {
  const cfg = CONFIG[state.difficulty];
  const lead = state.player - Math.max(...state.rivals);
  state.rivals = state.rivals.map((position, index) =>
    Math.min(100, position + cfg.rivals[index] + (lead > 25 ? 1 : 0))
  );
}

function checkFinish() {
  const positions = [state.player, ...state.rivals];
  if (positions.every((position) => position < 100)) return false;

  const ordered = positions
    .map((position, index) => ({ position, index }))
    .sort((a, b) => b.position - a.position || a.index - b.index);
  const position = ordered.findIndex((item) => item.index === 0) + 1;
  finish(position);
  return true;
}

function finish(position) {
  state.finished = true;
  state.locked = true;
  clearTimers();

  const bonus = position === 1 ? 300 : position === 2 ? 150 : 50;
  state.score += bonus;

  $("resultEmoji").textContent = position === 1 ? "🏆" : position === 2 ? "🥈" : "🥉";
  $("resultTitle").textContent = position === 1 ? "¡GANASTE!" : position === 2 ? "¡SEGUNDO LUGAR!" : "¡TERCER LUGAR!";
  $("resultText").textContent = position === 1
    ? "¡Excelente! Tu pollito cruzó la meta primero."
    : "¡Buen trabajo! Practica y vuelve a correr para mejorar tu posición.";
  $("resultPosition").textContent = position + ".º";
  $("resultCorrect").textContent = state.correct;
  $("resultWrong").textContent = state.wrong;
  $("resultScore").textContent = state.score;

  saveRecord(position);
  show("result");
}

function saveRecord(position) {
  try {
    const records = JSON.parse(localStorage.getItem("pollitoRaceRecords") || "[]");
    records.push({
      score: state.score,
      position,
      correct: state.correct,
      wrong: state.wrong,
      category: state.category,
      difficulty: state.difficulty,
      date: new Date().toLocaleDateString("es-CO")
    });
    records.sort((a, b) => b.score - a.score);
    localStorage.setItem("pollitoRaceRecords", JSON.stringify(records.slice(0, 10)));
  } catch (error) {
    console.warn("Récord no guardado:", error);
  }
}

function renderRecords() {
  let records = [];
  try {
    records = JSON.parse(localStorage.getItem("pollitoRaceRecords") || "[]");
  } catch (_) {
    records = [];
  }

  $("recordsList").replaceChildren();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "records-empty";
    empty.textContent = "Todavía no hay récords.";
    $("recordsList").appendChild(empty);
    return;
  }

  records.forEach((record, index) => {
    const item = document.createElement("div");
    item.className = "record";

    const info = document.createElement("span");
    info.textContent = "#" + (index + 1) + " · " + (CATEGORY[record.category]?.label || record.category);

    const details = document.createElement("small");
    details.textContent = (record.difficulty || "").toUpperCase() + " · " + record.correct + " correctas · " + record.date;
    info.appendChild(details);

    const score = document.createElement("b");
    score.textContent = record.score + " pts";

    item.append(info, score);
    $("recordsList").appendChild(item);
  });
}

function startRace() {
  loadQuestions()
    .then(() => {
      resetGame();
      $("raceCategory").textContent = CATEGORY[state.category].label;
      $("raceMessage").textContent = "🏁 ¡Prepárate! La carrera empieza ahora.";
      show("race");
      startCountdown();
    })
    .catch((error) => {
      console.error(error);
      alert(error.message);
    });
}

function startCountdown() {
  clearTimers();
  const overlay = document.createElement("div");
  overlay.className = "countdown";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "assertive");
  overlay.innerHTML = "<strong>3</strong><span>¡PREPÁRATE!</span>";
  document.body.appendChild(overlay);

  let number = 3;
  const tick = () => {
    if (state.finished) {
      overlay.remove();
      return;
    }

    if (number > 0) {
      overlay.querySelector("strong").textContent = String(number);
      overlay.querySelector("span").textContent = number === 3 ? "¡PREPÁRATE!" : "¡LISTO!";
      number--;
      state.countdownTimer = window.setTimeout(tick, 700);
      return;
    }

    overlay.querySelector("strong").textContent = "🏁";
    overlay.querySelector("span").textContent = "¡CORRE!";
    state.countdownTimer = window.setTimeout(() => {
      overlay.remove();
      state.locked = false;
      chooseQuestion();
      render();
    }, 500);
  };

  tick();
}

function clearTimers() {
  if (state.countdownTimer) {
    clearTimeout(state.countdownTimer);
    state.countdownTimer = null;
  }
  if (state.nextQuestionTimer) {
    clearTimeout(state.nextQuestionTimer);
    state.nextQuestionTimer = null;
  }
  document.querySelectorAll(".countdown").forEach((node) => node.remove());
}

function openModal(id) {
  $(id).classList.add("open");
  if (id === "records") renderRecords();
}

document.querySelectorAll("[data-cat]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-cat]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.category = button.dataset.cat;
    setSelection();
  });
});

document.querySelectorAll("[data-diff]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-diff]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.difficulty = button.dataset.diff;
    setSelection();
  });
});

$("play").addEventListener("click", () => show("setup"));
$("categories").addEventListener("click", () => show("setup"));
$("back").addEventListener("click", () => show("home"));
$("start").addEventListener("click", startRace);
$("again").addEventListener("click", () => {
  resetGame();
  show("setup");
});
$("menu").addEventListener("click", () => {
  clearTimers();
  show("home");
});

document.querySelectorAll("[data-modal]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.modal));
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => $(button.dataset.close).classList.remove("open"));
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.remove("open");
  });
});

$("clearRecords").addEventListener("click", () => {
  localStorage.removeItem("pollitoRaceRecords");
  renderRecords();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal.open").forEach((modal) => modal.classList.remove("open"));
  }
});

setSelection();
render();
})();