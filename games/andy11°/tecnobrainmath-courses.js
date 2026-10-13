/* TecnoBrainMath: clasificación por cursos. Se integra con el juego existente sin reemplazar su banco. */
(function () {
  "use strict";

  const originalRenderStartScreen = renderStartScreen;
  const originalLoadQuestions = cargarPreguntasMateria;
  const originalStartGame = iniciarJuego;
  const originalAnswer = manejarRespuestaJuego;
  const originalAdvance = avanzarPregunta;
  const originalFinish = finalizarJuego;
  const originalRenderGame = renderGameScreen;

  const courses = [
    { id: 0, name: "Transición", group: 1, icon: "🧸", desc: "Contar, reconocer números y comparar cantidades.", level: "Muy inicial" },
    { id: 1, name: "1.º de primaria", group: 1, icon: "🌱", desc: "Sumas, restas y secuencias sencillas.", level: "Inicial" },
    { id: 2, name: "2.º de primaria", group: 1, icon: "🧩", desc: "Operaciones básicas y primeras multiplicaciones.", level: "Básica" },
    { id: 3, name: "3.º de primaria", group: 2, icon: "🚀", desc: "Multiplicación, división y razonamiento.", level: "Básica-intermedia" },
    { id: 4, name: "4.º de primaria", group: 2, icon: "📐", desc: "Fracciones, medidas y geometría elemental.", level: "Intermedia" },
    { id: 5, name: "5.º de primaria", group: 2, icon: "🌟", desc: "Decimales, porcentajes, áreas y problemas.", level: "Intermedia" },
    { id: 6, name: "6.º", group: 3, icon: "🧠", desc: "Enteros, proporciones, álgebra inicial y geometría.", level: "Intermedia" },
    { id: 7, name: "7.º", group: 3, icon: "🔭", desc: "Racionales, porcentajes, ecuaciones y estadística.", level: "Intermedia-avanzada" },
    { id: 8, name: "8.º", group: 3, icon: "⚡", desc: "Álgebra, ecuaciones, potencias y funciones.", level: "Avanzada" },
    { id: 9, name: "9.º", group: 3, icon: "🧮", desc: "Sistemas, factorización, funciones y probabilidad.", level: "Avanzada" },
    { id: 10, name: "10.º", group: 4, icon: "📈", desc: "Trigonometría, funciones y geometría analítica.", level: "Avanzada" },
    { id: 11, name: "11.º", group: 4, icon: "🎓", desc: "Cálculo inicial, estadística y preparación Saber 11.", level: "Avanzada" }
  ];
  const groups = {
    1: { title: "🟢 NIVEL 1 — PRIMARIA INICIAL", color: "#00ff9d" },
    2: { title: "🔵 NIVEL 2 — PRIMARIA INTERMEDIA", color: "#00b7ff" },
    3: { title: "🟣 NIVEL 3 — BÁSICA SECUNDARIA", color: "#bb86fc" },
    4: { title: "🔴 NIVEL 4 — EDUCACIÓN MEDIA", color: "#ff6b7a" }
  };

  /* Metadatos sobre las seis preguntas matemáticas reales que ya estaban en el juego. */
  const metadata = [
    { id: "tbm-math-001", course: 2, topic: "Multiplicación", difficulty: 1, explanation: "15 × 4 significa sumar 15 cuatro veces: 15 + 15 + 15 + 15 = 60." },
    { id: "tbm-math-002", course: 6, topic: "Números y raíces", difficulty: 2, explanation: "La raíz cuadrada de 144 es 12 porque 12 × 12 = 144." },
    { id: "tbm-math-003", course: 7, topic: "Geometría: número pi", difficulty: 2, explanation: "π es la razón entre la longitud de una circunferencia y su diámetro. Una aproximación habitual es 3,14." },
    { id: "tbm-math-004", course: 6, topic: "Ecuaciones sencillas", difficulty: 1, explanation: "Resta 8 a ambos lados: x = 20 − 8 = 12." },
    { id: "tbm-math-005", course: 5, topic: "Área de triángulos", difficulty: 2, explanation: "El área es (base × altura) ÷ 2: (6 × 4) ÷ 2 = 12 unidades cuadradas." },
    { id: "tbm-math-006", course: 5, topic: "Porcentajes", difficulty: 1, explanation: "20 % equivale a 20/100. Entonces 200 × 0,20 = 40." }
  ];
  (BANCO.matematicas || []).forEach(function (q, index) {
    const m = metadata[index];
    if (!m) return;
    q.id = q.id || m.id;
    q.curso = Number.isInteger(q.curso) ? q.curso : m.course;
    q.tema = q.tema || m.topic;
    q.dificultad = Number.isInteger(q.dificultad) ? q.dificultad : m.difficulty;
    q.explicacion = q.explicacion || m.explanation;
  });

  /* Clasificación inicial por dificultad del banco existente: fácil (6.º-7.º), medio (8.º-9.º), difícil (10.º-11.º). */
  ["historia", "lectura"].forEach(function (subject) {
    (BANCO[subject] || []).forEach(function (q, index) {
      if (Number.isInteger(q.curso)) return;
      const band = Math.floor(index / 5);
      q.curso = band === 0 ? (index % 2 === 0 ? 6 : 7) : band === 1 ? (index % 2 === 0 ? 8 : 9) : (index % 2 === 0 ? 10 : 11);
      q.tema = q.tema || subject;
      q.dificultad = q.dificultad || band + 1;
      q.id = q.id || "tbm-" + subject + "-" + String(index + 1).padStart(3, "0");
    });
  });

  gameState.cursoSeleccionado = gameState.cursoSeleccionado ?? (function(){ try { const n = Number(localStorage.getItem("tecnobrainmath-course-selected-v1")); return localStorage.getItem("tecnobrainmath-course-selected-v1") !== null && Number.isInteger(n) && n >= 0 && n <= 11 ? n : null; } catch (_) { return null; } })();
  gameState.respondidas = gameState.respondidas || 0;
  gameState.respuestasCorrectas = gameState.respuestasCorrectas || 0;
  gameState.preguntasFalladas = gameState.preguntasFalladas || [];
  gameState.temasCorrectos = gameState.temasCorrectos || {};
  gameState.temasRefuerzo = gameState.temasRefuerzo || {};
  gameState.modoPracticaErrores = false;
  gameState.dificultadActual = 1;

  function countForCourse(id, subject) {
    const key = subject || gameState.materia;
    return (BANCO[key] || []).filter(function (q) { return q.curso === id; }).length;
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function renderCourseScreen() {
    if (typeof refreshInterval !== "undefined" && refreshInterval) clearInterval(refreshInterval);
    detenerTimer();
    const subjectNames = { matematicas: "Matemáticas", lectura: "Lectura crítica", historia: "Historia y cívica" };
    const cards = courses.map(function (course) {
      const count = countForCourse(course.id, gameState.materia);
      return '<button type="button" class="grade-card ' + (gameState.cursoSeleccionado === course.id ? "selected" : "") + '" data-grade="' + course.id + '" aria-pressed="' + (gameState.cursoSeleccionado === course.id) + '">' +
        '<span class="grade-icon">' + course.icon + '</span><strong>' + course.name + '</strong></button>';
    }).join("");
    const selectedCount = gameState.cursoSeleccionado === null ? 0 : countForCourse(gameState.cursoSeleccionado, gameState.materia);
    appRoot.innerHTML = '<div class="grade-screen compact-grade"><div class="header-glow"></div><div class="game-logo">TECNOBRAINMATH</div>' +
      '<h2 class="grade-heading">¿Qué curso?</h2><p class="grade-subject">' + subjectNames[gameState.materia] + '</p>' +
      '<div class="grade-grid compact-grade-grid">' + cards + '</div>' +
      '<div id="gradeMessage" role="status" aria-live="polite" class="grade-message">' + (gameState.cursoSeleccionado !== null && !selectedCount ? "Aún no hay preguntas para este curso." : "") + '</div>' +
      '<div class="grade-actions"><button class="btn-secondary" id="backSubjectsBtn">←</button>' +
      '<button class="btn-primary" id="beginGradeBtn" ' + (!selectedCount ? "disabled" : "") + '>▶ JUGAR</button></div></div>';
    document.querySelectorAll("[data-grade]").forEach(function (button) {
      button.addEventListener("click", function () {
        const id = Number(button.dataset.grade);
        gameState.cursoSeleccionado = id;
        try { localStorage.setItem("tecnobrainmath-course-selected-v1", String(id)); } catch (_) {}
        document.querySelectorAll("[data-grade]").forEach(function (b) {
          const selected = Number(b.dataset.grade) === id;
          b.classList.toggle("selected", selected);
          b.setAttribute("aria-pressed", String(selected));
        });
        const available = countForCourse(id, gameState.materia);
        document.getElementById("beginGradeBtn").disabled = available === 0;
        document.getElementById("gradeMessage").textContent = available ? "" : "Aún no hay preguntas para este curso.";
      });
    });
    document.getElementById("backSubjectsBtn").addEventListener("click", renderStartScreen);
    document.getElementById("beginGradeBtn").addEventListener("click", function () {
      if (gameState.cursoSeleccionado === null || !countForCourse(gameState.cursoSeleccionado, gameState.materia)) return;
      iniciarJuego();
    });
  }

  renderStartScreen = function () {
    if (typeof refreshInterval !== "undefined" && refreshInterval) clearInterval(refreshInterval);
    appRoot.innerHTML = '<div class="start-screen"><div class="header-glow"></div><div class="game-logo">TECNOBRAINMATH</div>' +
      '<div class="game-logo-sub">✦ TRIVIA CHALLENGE ✦</div><div class="sub">▸ ELIGE UN RETO PARA COMENZAR ◂</div>' +
      '<div class="resources-panel"><div class="resource coins">🪙 <span class="resource-value">' + gameState.monedas + '</span></div>' +
      '<div class="resource score">🏆 <span class="resource-value">' + gameState.puntuacion + '</span></div><div class="resource lives">❤️ <span class="resource-value">' + gameState.vidas + '</span></div></div>' +
      '<div class="resources-panel" style="border-color:rgba(255,221,0,.1);gap:2rem;"><div class="resource">💡 <span class="resource-value">' + gameState.pistas + '</span></div><div class="resource">⏩ <span class="resource-value">' + gameState.saltos + '</span></div></div>' +
      '<div class="materias-reto"><div class="card-materia ' + (gameState.materia === "historia" ? "seleccionada" : "") + '" data-mat="historia"><div class="materia-icono">📜</div><div class="materia-nombre">HISTORIA Y CÍVICA</div></div>' +
      '<div class="card-materia ' + (gameState.materia === "matematicas" ? "seleccionada" : "") + '" data-mat="matematicas"><div class="materia-icono">🧮</div><div class="materia-nombre">MATEMÁTICAS POR CURSO</div></div>' +
      '<div class="card-materia ' + (gameState.materia === "lectura" ? "seleccionada" : "") + '" data-mat="lectura"><div class="materia-icono">📖</div><div class="materia-nombre">LECTURA CRÍTICA</div></div></div>' +
      '<button class="btn-primary" id="startGameBtn">▶ ELEGIR CURSO</button>' +
      '<div class="button-group"><button class="btn-secondary gold" id="openShopBtn">🛒 TIENDA MISTERIOSA</button><button class="minijuegos-btn" id="openMinijuegosBtn">🎮 MINIJUEGOS</button></div></div>';
    document.querySelectorAll(".card-materia").forEach(function (card) {
      card.addEventListener("click", function () { gameState.materia = card.dataset.mat; renderStartScreen(); });
    });
    document.getElementById("startGameBtn").addEventListener("click", function () {
      renderCourseScreen();
    });
    document.getElementById("openShopBtn").addEventListener("click", irATienda);
    document.getElementById("openMinijuegosBtn").addEventListener("click", irAMinijuegos);
  };

  cargarPreguntasMateria = function () {
    if (gameState.materia !== "matematicas") {
      const filtered = (BANCO[gameState.materia] || []).filter(function (q) {
        return Number.isInteger(q.curso) && q.curso === gameState.cursoSeleccionado;
      });
      gameState.preguntasPool = mezclarArray(filtered.slice()).slice(0, 10);
      gameState.indiceActual = 0;
      return;
    }
    gameState.preguntasPool = (BANCO.matematicas || []).filter(function (q) {
      return Number.isInteger(q.curso) && q.curso === gameState.cursoSeleccionado;
    }).slice().sort(function (a, b) {
      return (a.dificultad || 1) - (b.dificultad || 1);
    });
    /* Aleatoriza solo dentro de la misma dificultad para comenzar de fácil a difícil. */
    let start = 0;
    while (start < gameState.preguntasPool.length) {
      let end = start + 1;
      while (end < gameState.preguntasPool.length && gameState.preguntasPool[end].dificultad === gameState.preguntasPool[start].dificultad) end++;
      mezclarArray(gameState.preguntasPool.slice(start, end)).forEach(function (q, offset) {
        gameState.preguntasPool[start + offset] = q;
      });
      start = end;
    }
    gameState.indiceActual = 0;
    gameState.respondidas = 0;
    gameState.respuestasCorrectas = 0;
    gameState.preguntasFalladas = [];
    gameState.temasCorrectos = {};
    gameState.temasRefuerzo = {};
    gameState.dificultadActual = 1;
    gameState.inicioPartida = new Date().toISOString();
  };

  iniciarJuego = function () {
    if (gameState.materia !== "matematicas") {
      detenerTimer();
      cargarPreguntasMateria();
      const firstQuestion = obtenerPregunta();
      if (!firstQuestion) { renderCourseScreen(); return; }
      gameState.preguntaActualObj = firstQuestion;
      gameState.respondida = false;
      gameState.juegoActivo = true;
      gameState.pistaUsadaEnEstaPregunta = false;
      renderGameScreen();
      iniciarTimerJuego();
      return;
    }
    detenerTimer();
    gameState.modoPracticaErrores = false;
    cargarPreguntasMateria();
    const first = obtenerPregunta();
    if (!first) { renderCourseScreen(); const msg = document.getElementById("gradeMessage"); if (msg) msg.textContent = "No hay preguntas clasificadas para ese curso. Elige otro curso."; return; }
    gameState.preguntaActualObj = first;
    gameState.respondida = false;
    gameState.juegoActivo = true;
    gameState.pistaUsadaEnEstaPregunta = false;
    renderGameScreen();
    iniciarTimerJuego();
  };

  renderGameScreen = function () {
    originalRenderGame();
    const p = gameState.preguntaActualObj;
    if (!p) return;
    const header = document.querySelector(".game-header");
    if (header) {
      const course = courses.find(function (c) { return c.id === gameState.cursoSeleccionado; });
      const label = document.createElement("div");
      label.className = "stat-retro";
      label.textContent = "🎒 " + (course ? course.name : "Curso") + " · " + (p.tema || gameState.materia);
      header.appendChild(label);
    }
    const box = document.querySelector(".pregunta-box");
    if (box) {
      const progress = document.createElement("div");
      progress.className = "progress-line";
      progress.innerHTML = '<span style="width:' + Math.round((gameState.indiceActual / Math.max(1, gameState.preguntasPool.length)) * 100) + '%"></span>';
      box.appendChild(progress);
      const level = document.createElement("p");
      level.style.cssText = "text-align:left;color:#aab7cb;font-size:.8rem;margin-top:.7rem";
      level.textContent = "Dificultad: " + (["", "Fácil", "Media", "Difícil"][p.dificultad || 1]) + " · Pregunta " + (gameState.indiceActual + 1) + " de " + gameState.preguntasPool.length;
      box.appendChild(level);
    }
    const feedback = document.createElement("div");
    feedback.id = "answerFeedback";
    feedback.className = "answer-feedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    const options = document.getElementById("opcionesRetroContainer");
    if (options) options.insertAdjacentElement("afterend", feedback);
  };

  manejarRespuestaJuego = function (selection) {
    if (!gameState.juegoActivo || gameState.respondida) return;
    const q = gameState.preguntaActualObj;
    const correct = selection === q.correcta;
    const previousCount = gameState.respondidas || 0;
    const scoreBefore = gameState.puntuacion;
    const coinsBefore = gameState.monedas;
    originalAnswer(selection);
    if (gameState.materia !== "matematicas") return;
    /* La práctica de errores enseña, pero no genera puntos ni monedas duplicadas. */
    if (gameState.modoPracticaErrores) {
      gameState.puntuacion = scoreBefore;
      gameState.monedas = coinsBefore;
      actualizarStatsJuego();
    }
    gameState.respondidas = previousCount + 1;
    if (correct) {
      gameState.respuestasCorrectas = (gameState.respuestasCorrectas || 0) + 1;
      if (q.tema) gameState.temasCorrectos[q.tema] = (gameState.temasCorrectos[q.tema] || 0) + 1;
      gameState.dificultadActual = Math.min(3, (gameState.dificultadActual || 1) + 1);
    } else {
      if (q.tema) gameState.temasRefuerzo[q.tema] = (gameState.temasRefuerzo[q.tema] || 0) + 1;
      if (!gameState.preguntasFalladas.some(function (item) { return item.id === q.id; })) gameState.preguntasFalladas.push(q);
      gameState.dificultadActual = Math.max(1, (gameState.dificultadActual || 1) - 1);
    }
    const feedback = document.getElementById("answerFeedback");
    if (feedback) {
      feedback.classList.add("visible");
      feedback.innerHTML = "<strong>" + (correct ? "✅ ¡Muy bien!" : "💪 ¡Vamos a aprender!") + "</strong><br>" +
        (correct ? "" : "Respuesta correcta: " + escapeHtml(q.opciones[q.correcta]) + "<br>") + escapeHtml(q.explicacion || "Revisa la operación paso a paso.");
    }
    if (!gameState.modoPracticaErrores) saveCourseProgress();
  };

  avanzarPregunta = function () {
    if (gameState.materia !== "matematicas") {
      if (!gameState.juegoActivo) return;
      gameState.respondida = false;
      gameState.pistaUsadaEnEstaPregunta = false;
      gameState.indiceActual++;
      const nextQuestion = obtenerPregunta();
      if (!nextQuestion) { finalizarJuego(true); return; }
      gameState.preguntaActualObj = nextQuestion;
      renderGameScreen();
      iniciarTimerJuego();
      return;
    }
    if (!gameState.juegoActivo) return;
    gameState.respondida = false;
    gameState.pistaUsadaEnEstaPregunta = false;
    gameState.indiceActual++;
    const next = obtenerPregunta();
    if (!next) { finalizarJuego(true); return; }
    gameState.preguntaActualObj = next;
    renderGameScreen();
    iniciarTimerJuego();
  };

  function saveCourseProgress() {
    if (gameState.cursoSeleccionado === null || gameState.modoPracticaErrores) return;
    try {
      const key = "tecnobrainmath-course-progress-v1";
      const all = JSON.parse(localStorage.getItem(key) || "{}");
      const id = String(gameState.cursoSeleccionado);
      const old = all[id] || { partidas: 0, mejorPuntuacion: 0, respondidas: 0, correctas: 0, temas: {} };
      old.mejorPuntuacion = Math.max(old.mejorPuntuacion || 0, gameState.puntuacion || 0);
      old.respondidas = (old.respondidas || 0) + (gameState.respondidas || 0);
      old.correctas = (old.correctas || 0) + (gameState.respuestasCorrectas || 0);
      old.ultimaPartida = new Date().toISOString();
      old.temas = Object.assign({}, old.temas || {}, gameState.temasCorrectos || {});
      all[id] = old;
      localStorage.setItem(key, JSON.stringify(all));
    } catch (error) { console.warn("No se pudo guardar el progreso de TecnoBrainMath:", error); }
  }

  finalizarJuego = function (completed) {
    if (gameState.materia !== "matematicas") { detenerTimer(); gameState.juegoActivo = false; originalFinish(completed); return; }
    detenerTimer();
    gameState.juegoActivo = false;
    if (!gameState.modoPracticaErrores) {
      try {
        const key = "tecnobrainmath-course-progress-v1";
        const all = JSON.parse(localStorage.getItem(key) || "{}");
        const id = String(gameState.cursoSeleccionado);
        const entry = all[id] || { partidas: 0, mejorPuntuacion: 0, respondidas: 0, correctas: 0, temas: {} };
        entry.partidas = (entry.partidas || 0) + 1;
        entry.mejorPuntuacion = Math.max(entry.mejorPuntuacion || 0, gameState.puntuacion || 0);
        entry.ultimaPartida = new Date().toISOString();
        all[id] = entry;
        localStorage.setItem(key, JSON.stringify(all));
      } catch (error) { console.warn("No se pudo guardar el resumen de la partida:", error); }
    }
    const total = gameState.respondidas || 0;
    const correct = gameState.respuestasCorrectas || 0;
    const percent = total ? Math.round(correct / total * 100) : 0;
    const mastered = Object.keys(gameState.temasCorrectos || {});
    const reinforce = Object.keys(gameState.temasRefuerzo || {});
    const course = courses.find(function (c) { return c.id === gameState.cursoSeleccionado; });
    const nextTip = percent >= 80 ? "¡Excelente! Sigue practicando para consolidar lo aprendido." : "Repite la práctica y enfócate en los temas que necesitan refuerzo.";
    const practiceButton = gameState.preguntasFalladas.length ? '<button class="btn-secondary gold" id="practiceErrorsBtn">🧩 PRACTICAR ERRORES (' + gameState.preguntasFalladas.length + ')</button><br><br>' : "";
    appRoot.innerHTML = '<div class="game-screen"><div class="game-over-retro"><div class="game-logo" style="font-size:1.3rem;">TECNOBRAINMATH</div>' +
      '<h2 style="color:#00f5ff;font-size:1.2rem;margin:.7rem 0;">' + (completed ? "🏆 ¡RETO COMPLETADO!" : "💪 ¡PARTIDA TERMINADA!") + '</h2>' +
      '<p style="color:#c8d0e0;">Curso: <strong>' + (course ? course.name : "—") + (gameState.modoPracticaErrores ? " · práctica de errores" : "") + '</strong></p>' +
      '<div class="result-metrics"><div class="result-metric">Respondidas<strong>' + total + '</strong></div><div class="result-metric">Correctas<strong>' + correct + '</strong></div><div class="result-metric">Aciertos<strong>' + percent + '%</strong></div><div class="result-metric">Puntuación<strong>' + gameState.puntuacion + '</strong></div></div>' +
      '<div class="result-topics"><strong>✅ Temas practicados con acierto:</strong><br>' + (mastered.length ? mastered.map(escapeHtml).join(", ") : "Aún no hay temas dominados en esta partida.") +
      '<br><br><strong>🎯 Temas para reforzar:</strong><br>' + (reinforce.length ? reinforce.map(escapeHtml).join(", ") : "¡Sin temas pendientes registrados!") +
      '<br><br><strong>💡 Recomendación:</strong><br>' + nextTip + '</div>' + practiceButton +
      '<button class="btn-secondary" id="changeGradeBtn">🎒 ELEGIR OTRO CURSO</button><br><br>' +
      '<button class="reiniciar-retro" id="volverInicioBtn">🔄 VOLVER AL INICIO</button><br><br>' +
      '<button class="btn-secondary gold" id="shopFromGameOver">🛒 TIENDA</button><br><button class="minijuegos-btn" id="minijuegosFromGameOver">🎮 MINIJUEGOS</button></div></div>';
    document.getElementById("volverInicioBtn").addEventListener("click", function () { renderStartScreen(); });
    document.getElementById("changeGradeBtn").addEventListener("click", function () { renderCourseScreen(); });
    document.getElementById("shopFromGameOver").addEventListener("click", irATienda);
    document.getElementById("minijuegosFromGameOver").addEventListener("click", irAMinijuegos);
    const practice = document.getElementById("practiceErrorsBtn");
    if (practice) practice.addEventListener("click", function () {
      const missed = gameState.preguntasFalladas.slice();
      if (!missed.length) return;
      gameState.modoPracticaErrores = true;
      gameState.preguntasPool = mezclarArray(missed);
      gameState.indiceActual = 0;
      gameState.respondidas = 0;
      gameState.respuestasCorrectas = 0;
      gameState.temasCorrectos = {};
      gameState.temasRefuerzo = {};
      gameState.preguntasFalladas = [];
      gameState.vidas = 3;
      gameState.juegoActivo = true;
      gameState.respondida = false;
      gameState.preguntaActualObj = obtenerPregunta();
      renderGameScreen();
      iniciarTimerJuego();
    });
  };

  /* Añade estilos sin tocar las reglas originales del juego. */
  const style = document.createElement("style");
  style.textContent = ".grade-screen{max-width:1050px;width:100%;background:linear-gradient(145deg,rgba(13,11,26,.97),rgba(20,15,40,.97));border:1px solid rgba(0,245,255,.18);border-radius:28px;padding:clamp(1rem,3vw,2.5rem)}" +
    ".grade-heading{color:#fff;font-size:clamp(1.35rem,3vw,2rem);margin:.5rem 0}.grade-intro{color:#aab7cb;line-height:1.6;margin-bottom:1.4rem}" +
    ".compact-grade{text-align:center;max-width:760px}.grade-subject{color:#00f5ff;font-size:.9rem;margin:.25rem 0 1rem}.compact-grade-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}.compact-grade .grade-card{min-height:0;padding:.8rem .4rem;text-align:center;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.25rem}.compact-grade .grade-icon{font-size:1.35rem;margin:0}.compact-grade .grade-card strong{font-size:.88rem;margin:0}.grade-message{min-height:1.2rem;color:#ffdd00;font-size:.78rem;margin:.6rem 0}.grade-actions{display:flex;justify-content:center;gap:.6rem}.compact-grade .btn-primary,.compact-grade .btn-secondary{padding:.7rem 1.3rem}.compact-grade .grade-card small,.compact-grade .availability{display:none}@media(max-width:420px){.compact-grade-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.compact-grade .grade-card{padding:.75rem .3rem}}" +
    ".grade-group{margin:1.2rem 0;text-align:left}.grade-group h3{margin-bottom:.8rem;font-size:1rem}.grade-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.8rem}" +
    ".grade-card{text-align:left;border:2px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.045);padding:1rem;color:#fff;cursor:pointer;min-height:150px;transition:transform .2s,border-color .2s}" +
    ".grade-card:hover,.grade-card.selected{border-color:#00f5ff;transform:translateY(-2px);background:rgba(0,245,255,.09)}.grade-card .grade-icon{font-size:1.8rem;display:block;margin-bottom:.4rem}" +
    ".grade-card strong{display:block;font-size:1rem;margin-bottom:.35rem}.grade-card small{display:block;color:#b8c3d6;line-height:1.4;margin-top:.2rem}.grade-card .availability{display:inline-block;margin-top:.6rem;color:#ffdd00;font-size:.75rem;font-weight:700}" +
    ".grade-card:focus-visible{outline:3px solid #fff;outline-offset:3px}.btn-primary:disabled{opacity:.4;cursor:not-allowed}.answer-feedback{display:none;text-align:left;border-radius:14px;padding:1rem;margin:.8rem 0 1rem;color:#e9f2ff;background:rgba(0,245,255,.07);border:1px solid rgba(0,245,255,.2);line-height:1.5}.answer-feedback.visible{display:block}" +
    ".progress-line{height:7px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin:.6rem 0}.progress-line span{display:block;height:100%;background:linear-gradient(90deg,#00f5ff,#7b2ffc);transition:width .25s}" +
    ".result-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.7rem;margin:1rem 0}.result-metric{padding:.8rem;border-radius:12px;background:rgba(255,255,255,.05);color:#bdc9dc}.result-metric strong{display:block;color:#00f5ff;font-size:1.35rem;margin-top:.25rem}.result-topics{text-align:left;line-height:1.7;margin:1rem 0;color:#d8e0ef}" +
    "@media(prefers-reduced-motion:reduce){.grade-card{transition:none}}";
  document.head.appendChild(style);
  renderStartScreen();
})();