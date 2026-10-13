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

  /*
   * Clasificación explícita de TODAS las preguntas que ya existen en index.html.
   * Curso colombiano: 0 = Transición; 1..5 primaria; 6..9 secundaria; 10..11 media.
   * No se inventan preguntas nuevas: se ubica cada pregunta por contenido y complejidad.
   */
  const classification = {
    historia: [
      { curso: 8, tema: "Revolución Francesa", dificultad: 2, explicacion: "La Revolución Francesa comenzó en 1789 y difundió los ideales de libertad, igualdad y fraternidad." },
      { curso: 5, tema: "Geografía: océanos", dificultad: 1, explicacion: "El océano Pacífico es el más grande del planeta." },
      { curso: 7, tema: "Constitución colombiana", dificultad: 2, explicacion: "La Constitución Política de 1991 es la norma suprema del Estado colombiano." },
      { curso: 5, tema: "Geografía: continentes", dificultad: 1, explicacion: "El desierto del Sahara se encuentra en el norte de África." },
      { curso: 5, tema: "Participación ciudadana", dificultad: 1, explicacion: "El voto permite a los ciudadanos elegir a sus representantes y gobernantes." },
      { curso: 9, tema: "Historia de Colombia: La Violencia", dificultad: 2, explicacion: "La Violencia fue un período de conflicto bipartidista que se intensificó después del asesinato de Jorge Eliécer Gaitán en 1948." },
      { curso: 7, tema: "Ramas del poder público", dificultad: 2, explicacion: "La rama legislativa debate, elabora, modifica y deroga las leyes." },
      { curso: 9, tema: "Historia mundial: Guerra Fría", dificultad: 3, explicacion: "La Guerra Fría fue una rivalidad política, económica, militar e ideológica entre Estados Unidos y la Unión Soviética." },
      { curso: 10, tema: "Economía: PIB", dificultad: 3, explicacion: "El producto interno bruto (PIB) mide el valor de los bienes y servicios finales producidos en un país durante un período." },
      { curso: 8, tema: "Historia colonial: comercio triangular", dificultad: 2, explicacion: "El comercio triangular conectó Europa, África y América; estuvo ligado al tráfico esclavista y al intercambio de manufacturas y materias primas." },
      { curso: 10, tema: "Historia de Colombia: Frente Nacional", dificultad: 3, explicacion: "Entre 1958 y 1974, liberales y conservadores acordaron alternarse la Presidencia y repartirse cargos públicos." },
      { curso: 8, tema: "Ciudadanía: soberanía popular", dificultad: 2, explicacion: "La soberanía popular sostiene que el poder político reside en el pueblo, que puede ejercerlo directamente o mediante representantes." },
      { curso: 9, tema: "Colonialismo: Conferencia de Berlín", dificultad: 3, explicacion: "La Conferencia de Berlín de 1884–1885 estableció reglas para la ocupación y aceleró el reparto colonial europeo de África." },
      { curso: 9, tema: "Constitución: acción de tutela", dificultad: 3, explicacion: "La tutela es un mecanismo judicial preferente y rápido para proteger derechos fundamentales cuando están amenazados o vulnerados." },
      { curso: 11, tema: "Geografía urbana: gentrificación", dificultad: 3, explicacion: "La gentrificación transforma un barrio mediante inversiones y llegada de residentes con mayor poder adquisitivo, lo que puede desplazar a habitantes originales." }
    ],
    lectura: [
      { curso: 6, tema: "Propósito de la lectura crítica", dificultad: 1, explicacion: "La lectura crítica requiere comprender, analizar y evaluar lo que comunica un texto, no solo memorizarlo." },
      { curso: 6, tema: "Evaluación de afirmaciones", dificultad: 1, explicacion: "Antes de aceptar una afirmación conviene revisar sus argumentos, evidencias y fuentes." },
      { curso: 6, tema: "Hecho y opinión", dificultad: 1, explicacion: "Una opinión expresa una valoración o idea personal; no equivale necesariamente a un hecho comprobable." },
      { curso: 6, tema: "Idea principal", dificultad: 1, explicacion: "La idea principal expresa el mensaje central que organiza o explica el contenido del texto." },
      { curso: 6, tema: "Inferencias", dificultad: 1, explicacion: "Inferir es construir una conclusión usando pistas del texto y conocimientos pertinentes." },
      { curso: 8, tema: "Confiabilidad de las fuentes", dificultad: 2, explicacion: "Conocer el origen de la información ayuda a evaluar la autoridad, el contexto y la confiabilidad de una fuente." },
      { curso: 8, tema: "Sesgo del autor", dificultad: 2, explicacion: "Mostrar solo beneficios y ocultar problemas puede revelar un sesgo o una presentación parcial." },
      { curso: 8, tema: "Estructura del argumento", dificultad: 2, explicacion: "Un argumento presenta una afirmación respaldada por razones o evidencias." },
      { curso: 8, tema: "Comparación de textos", dificultad: 2, explicacion: "Un lector crítico compara argumentos y evidencias de las fuentes antes de decidir qué postura está mejor sustentada." },
      { curso: 8, tema: "Intención comunicativa", dificultad: 2, explicacion: "La intención comunicativa es lo que el autor busca lograr, explicar, defender o provocar con su texto." },
      { curso: 10, tema: "Titulares y evidencia", dificultad: 3, explicacion: "Un titular llamativo no prueba por sí mismo una afirmación; debe contrastarse con el contenido y sus evidencias." },
      { curso: 10, tema: "Generalización apresurada", dificultad: 3, explicacion: "Sacar una conclusión sobre todos a partir de solo tres casos es una generalización con una muestra insuficiente." },
      { curso: 10, tema: "Evaluación de evidencias", dificultad: 3, explicacion: "El pensamiento crítico analiza evidencias, contrasta fuentes y construye conclusiones razonadas." },
      { curso: 11, tema: "Lenguaje absoluto y falacias", dificultad: 3, explicacion: "Palabras absolutas como «todos» o «nadie» necesitan respaldo; el lector debe comprobar si la evidencia justifica esa generalización." },
      { curso: 11, tema: "Conclusiones y verificación", dificultad: 3, explicacion: "Si una información no presenta fuentes ni evidencias, lo prudente es suspender el juicio y buscar formas de verificarla." }
    ]
  };
  Object.keys(classification).forEach(function (subject) {
    (BANCO[subject] || []).forEach(function (q, index) {
      const meta = classification[subject][index];
      if (!meta) return;
      q.id = q.id || "tbm-" + subject + "-" + String(index + 1).padStart(3, "0");
      q.curso = meta.curso;
      q.tema = meta.tema;
      q.dificultad = meta.dificultad;
      q.explicacion = q.explicacion || meta.explicacion;
    });
  });


  /*
   * Banco de refuerzo por curso. Conserva las preguntas originales y solo completa
   * los huecos. Cada pregunta añadida tiene ID estable, 4 opciones y explicación.
   */
  const gradeLabels = ["Transición","1.º","2.º","3.º","4.º","5.º","6.º","7.º","8.º","9.º","10.º","11.º"];
  const makeOptions = function(correct, distractors) {
    const values = [String(correct)].concat(distractors.map(String)).filter(function(v,i,a){return a.indexOf(v)===i;});
    let n = 1;
    while(values.length < 4) { const candidate = String(correct) + " " + n++; if(!values.includes(candidate)) values.push(candidate); }
    return values.slice(0,4);
  };
  const makeQuestion = function(subject, course, index, question, options, answer, topic, explanation, difficulty) {
    const opts = options.map(String);
    const correctText = String(answer);
    if (!opts.includes(correctText)) opts[0] = correctText;
    return {
      id: "tbm-" + subject + "-g" + course + "-" + String(index+1).padStart(3,"0"),
      curso: course, tema: topic, dificultad: difficulty || (course < 3 ? 1 : course < 7 ? 2 : 3),
      pregunta: question, opciones: opts, correcta: opts.indexOf(correctText),
      explicacion: explanation || ("La respuesta correcta es: " + correctText + ".")
    };
  };
  const mathTemplates = function(g,i) {
    const n = i + 1, label = gradeLabels[g];
    let q, correct, distractors, topic, exp;
    const numOpts = function(c,step){return [c, c+step, Math.max(0,c-step), c+step*2].map(String);};
    if (g === 0) {
      const a = (i%5)+1, b = (i%4)+1;
      const cases = [
        ["¿Cuántos objetos hay si contamos "+a+" estrellas?",String(a),[String(a+1),String(Math.max(0,a-1)),String(a+2)],"Conteo"],
        ["¿Qué número viene después de "+(a+2)+"?",String(a+3),[String(a+2),String(a+4),String(a+1)],"Secuencias"],
        ["¿Cuál grupo tiene más: "+a+" círculos o "+(a+1)+" círculos?",(a+1)+" círculos",[a+" círculos",(a+2)+" círculos","Tienen igual cantidad"],"Comparación"],
        ["Hay "+a+" bloques y agregamos "+b+". ¿Cuántos hay?",String(a+b),[String(a+b+1),String(Math.max(0,a+b-1)),String(a+b+2)],"Sumas"],
        ["Hay "+(a+b)+" globos y se revienta "+b+". ¿Cuántos quedan?",String(a),[String(a+b),String(b),String(a+1)],"Restas"],
        ["¿Cuántos lados tiene un triángulo?","3",["2","4","5"],"Figuras"],
        ["¿Qué figura tiene cuatro lados iguales?","Cuadrado",["Círculo","Triángulo","Óvalo"],"Figuras"],
        ["Completa el patrón: rojo, azul, rojo, azul, ...","Rojo",["Verde","Amarillo","Azul y verde"],"Patrones"],
        ["¿Cuál número es menor: "+a+" o "+(a+2)+"?",String(a),[String(a+2),String(a+3),"Son iguales"],"Comparación"],
        ["Si tienes "+a+" lápices y recibes uno más, ¿cuántos tienes?",String(a+1),[String(a),String(a+2),String(Math.max(0,a-1))],"Problemas cotidianos"]
      ];
      [q,correct,distractors,topic]=cases[i];
      return {q,correct,distractors,topic,exp:"Cuenta los objetos o sigue la regla indicada para encontrar la respuesta."};
    }
    if (g <= 2) {
      const a=10+g*7+i*3, b=2+(i%7);
      const cases=[
        ["¿Cuánto es "+a+" + "+b+"?",a+b,[a+b+1,a+b-1,a+b+10],"Suma"],
        ["¿Cuánto es "+(a+b)+" − "+b+"?",a,[a-1,a+b,b],"Resta"],
        ["¿Qué número sigue: "+(g+2)+", "+(g+4)+", "+(g+6)+", ...?",g+8,[g+7,g+9,g+10],"Secuencias"],
        ["¿Cuál es mayor, "+a+" o "+(a+b)+"?",a+b,[a,a+b+10,a-1],"Comparación"],
        ["Hay "+b+" bolsas con 2 canicas en cada una. ¿Cuántas canicas hay?",b*2,[b+2,b*2+2,b],"Multiplicación inicial"],
        ["¿Cuántos centímetros hay en un metro?",100,[10,1000,50],"Medidas"],
        ["¿Cuántas ruedas tienen "+b+" bicicletas?",b*2,[b,b*4,b+2],"Problemas cotidianos"],
        ["¿Cuál es la mitad de "+(b*2)+"?",b,[b+1,b*2,1],"Mitades"],
        ["¿Cuántos lados tiene un rectángulo?",4,[3,5,6],"Geometría"],
        ["Si son las 3 y pasa una hora, ¿qué hora será?",4,[2,3,5],"Tiempo"]
      ];
      [q,correct,distractors,topic]=cases[i];
      return {q,correct,distractors,topic,exp:"Resuelve paso a paso usando la operación o concepto indicado."};
    }
    const a= g<6 ? 12+i+g : g<8 ? 18+i+g : 24+i+g;
    const b=2+(i%6);
    const cases = g<=4 ? [
      ["¿Cuánto es "+a+" × "+b+"?",a*b,[a+b,a*b+b,a*(b+1)],"Multiplicación"],
      ["¿Cuánto es "+(a*b)+" ÷ "+b+"?",a,[a+b,a-1,b],"División"],
      ["¿Cuál es la fracción equivalente a "+(1+(i%3))+"/2?",(1+(i%3))*2+"/4",[(1+(i%3))+"/4",(1+(i%3))*2+"/3",(1+(i%3))+"/3"],"Fracciones"],
      ["Un rectángulo mide "+b+" cm de ancho y "+(b+2)+" cm de largo. ¿Cuál es su perímetro?",2*(b+b+2),[b*(b+2),2*b+b+2,b+b+2],"Perímetro"],
      ["¿Cuánto es "+(a*10)+" ÷ 10?",a,[a*10,a+10,a-1],"Valor posicional"],
      ["¿Cuánto es "+a+" + "+(b*10)+"?",a+b*10,[a+b,a+b*10+10,a-b],"Operaciones"],
      ["¿Cuánto es "+(b*4)+" − "+b+"?",b*3,[b*4,b*2,b+4],"Restas"],
      ["¿Cuál es el área de un rectángulo de "+b+" por "+(b+1)+" unidades?",b*(b+1),[2*b+2*(b+1),b+b+1,b*(b+1)+1],"Área"],
      ["¿Cuánto es la décima parte de "+(a*10)+"?",a,[a*10,a/10,a+10],"Decimales"],
      ["Si un libro tiene "+(a+b)+" páginas y lees "+a+", ¿cuántas faltan?",b,[a,a+b,b+1],"Problemas"]
    ] : g<=7 ? [
      ["¿Cuánto es −"+a+" + "+(a+b)+"?",b,[a+b,-b,a],"Números enteros"],
      ["¿Cuánto es "+a+"/"+b+" × "+b+"?",a,[a+b,a*b,b],"Fracciones"],
      ["¿Cuál es el "+b+" % de "+(a*10)+"?",(a*10*b)/100,[a*b,a*10*b,a+b],"Porcentajes"],
      ["Si 3 cuadernos cuestan "+(b*3)+", ¿cuánto cuestan 5 al mismo precio?",b*5,b*3+5,b+5,b*4,"Proporcionalidad"],
      ["Resuelve x + "+b+" = "+(a+b)+". ¿Cuánto vale x?",a,[a+b,b,a-1],"Ecuaciones"],
      ["¿Cuál es el promedio de "+a+", "+(a+2)+" y "+(a+4)+"?",a+2,[a,a+3,a+4],"Estadística"],
      ["¿Cuántos grados tiene un ángulo recto?",90,[45,180,360],"Geometría"],
      ["¿Cuál es la probabilidad de obtener cara al lanzar una moneda equilibrada?", "1/2",["1/4","1","1/3"],"Probabilidad"],
      ["Simplifica "+a+"x + "+b+"x.",(a+b)+"x",[a+"x",b+"x",(a*b)+"x"],"Expresiones algebraicas"],
      ["¿Cuál es la razón de 4 a 8 en su forma simplificada?","1:2",["2:1","4:8","1:4"],"Razones"]
    ] : [
      ["Si f(x) = 2x + "+b+", ¿cuánto vale f("+b+")?",2*b+b,[2*b,b+2,2*b+1],"Funciones"],
      ["Resuelve "+a+"x = "+(a*b)+". ¿Cuánto vale x?",b,[a,b+1,a*b],"Ecuaciones"],
      ["¿Cuál es la pendiente entre (0, 2) y (2, 6)?",2,[1,3,4],"Geometría analítica"],
      ["¿Cuál es la probabilidad de obtener un número par al lanzar un dado justo?", "1/2",["1/6","1/3","2/3"],"Probabilidad"],
      ["¿Cuál es la media de "+a+", "+(a+2)+" y "+(a+4)+"?",a+2,[a,a+3,a+4],"Estadística"],
      ["Si sen(30°) = 1/2, ¿cuánto vale sen(30°)?","1/2",["1","√3/2","0"],"Trigonometría"],
      ["¿Cuánto es el "+(b*5)+" % de 200?",b*10,[b*5,b*20,b+10],"Porcentajes"],
      ["Si x² = "+(b*b) +" y x es positivo, ¿cuánto vale x?",b,[-b,b*b,b+1],"Potencias y raíces"],
      ["Una población pasa de "+a+" a "+(a+b)+". ¿En cuánto aumentó?",b,[a,a+b,b+1],"Análisis de datos"],
      ["Si todos los datos son iguales, ¿cuál es la desviación estándar?",0,[1, a, b],"Estadística"]
    ];
    const row=cases[i];
    if(!row) return null;
    if(g<=4) return {q:row[0],correct:row[1],distractors:row[2],topic:row[3],exp:"Aplica la regla matemática correspondiente y comprueba el resultado."};
    q=row[0]; correct=row[1]; distractors=row.slice(2,5); topic=row[5]||"Razonamiento cuantitativo";
    return {q,correct,distractors,topic,exp:"Aplica la regla matemática correspondiente y comprueba el resultado."};
  };
  const readingPassages = [
    ["En el barrio, varias familias sembraron árboles junto a la cancha. Durante las semanas siguientes, el lugar tuvo más sombra y algunas aves comenzaron a visitarlo.","Cuidar los espacios verdes puede mejorar el entorno común."],
    ["Lucía revisó dos noticias sobre el mismo tema. Una incluía datos y fuentes; la otra solo tenía un titular alarmante y no mostraba pruebas.","Comparar fuentes y evidencias ayuda a evaluar la confiabilidad de una noticia."],
    ["La biblioteca amplió su horario después de que estudiantes y familias explicaran que necesitaban un lugar tranquilo para estudiar por la tarde.","La participación de la comunidad puede impulsar cambios útiles."],
    ["Un anuncio afirma que una bebida mejora la memoria, pero no cita estudios ni explica cómo se comprobó esa promesa.","Una afirmación publicitaria necesita pruebas antes de aceptarse como verdadera."],
    ["El equipo perdió el primer partido, revisó sus errores y practicó pases durante la semana. En el siguiente encuentro, se comunicó mejor.","Reflexionar sobre los errores permite mejorar el desempeño."],
    ["En una ciudad, el uso de bicicletas aumentó cuando se construyeron rutas seguras y se instalaron estacionamientos cerca de las escuelas.","La infraestructura puede influir en las decisiones de transporte."],
    ["Un texto defiende que todos los estudiantes aprenden igual, aunque solo presenta entrevistas a tres personas de una misma clase.","La conclusión general no está suficientemente respaldada por una muestra tan pequeña."],
    ["El museo presenta cartas, fotografías y objetos de distintas épocas para explicar cómo cambió la vida cotidiana de la región.","Las fuentes históricas permiten estudiar cambios a través del tiempo."],
    ["Una campaña invita a ahorrar agua y propone cerrar la llave al cepillarse, reparar fugas y reutilizar agua cuando sea seguro.","El mensaje busca promover hábitos concretos de ahorro."],
    ["Aunque el titular decía que el parque sería cerrado para siempre, el comunicado oficial solo anunciaba reparaciones durante dos semanas.","El lector debe contrastar un titular con la información completa."]
  ];
  const readingQuestionTypes = [
    ["¿Cuál es la idea principal del texto?",1,["El texto no presenta ninguna idea central.","El tema se relaciona con un asunto distinto al descrito.","El texto solo enumera nombres sin comunicar una idea."]],
    ["¿Qué conclusión se puede inferir de la información?",1,["No se puede concluir nada porque el texto tiene palabras.","La conclusión opuesta está demostrada por el texto.","El texto confirma una afirmación que no aparece en él."]],
    ["¿Cuál parece ser la intención principal del texto?",1,["Confundir deliberadamente al lector sin motivo.","Contar una historia sin relación con el tema.","Comunicar una idea o situación relacionada con el tema."]],
    ["¿Qué evidencia sería más útil para comprobar la afirmación central?",1,["Un comentario anónimo sin datos.","Una opinión que no explica sus razones.","Datos verificables y una fuente identificable."]],
    ["¿Cuál afirmación sería una opinión y no un hecho comprobable?",1,["Una valoración personal sobre la situación descrita.","La información explícita que ofrece el texto.","Un dato que puede verificarse con una fuente."]],
    ["¿Qué debería hacer un lector crítico antes de compartir una afirmación similar?",1,["Compartirla si el título llama la atención.","Aceptar la primera versión que encuentre.","Verificar la fuente y contrastar la evidencia disponible."]],
    ["¿Qué relación existe entre el problema y la solución que presenta el texto?",1,["No hay ninguna relación posible.","La solución contradice necesariamente todos los datos.","La solución responde al problema o necesidad descrita."]],
    ["¿Qué detalle del texto respalda mejor su mensaje?",1,["Un rumor que no aparece en el texto.","Una suposición sin evidencia.","El dato o ejemplo concreto que se menciona en el pasaje."]],
    ["Si faltaran las pruebas mencionadas, ¿qué conclusión sería más prudente?",1,["La afirmación queda demostrada de todos modos.","La afirmación es falsa en cualquier circunstancia.","Hace falta más información para decidir si es fiable."]],
    ["¿Qué título resume mejor el texto?",1,["Una frase que no se relaciona con el tema.","Una afirmación absoluta que el texto no demuestra.","Una frase breve que recoge la idea central del pasaje."]]
  ];
  const socialBanks = [
    [
      ["¿A quién acudimos en la escuela si necesitamos ayuda durante una actividad?","A un docente o adulto responsable",["A un desconocido en la calle","A nadie en ninguna situación","A una persona que no trabaja en la escuela"],"Convivencia"],
      ["¿Qué acción ayuda a mantener limpio el parque?","Depositar los residuos en una caneca",["Dejar basura en el suelo","Romper las plantas","Arrojar residuos al agua"],"Cuidado del entorno"],
      ["¿Qué debemos hacer para cruzar una calle de forma segura?","Mirar a ambos lados y usar el paso peatonal",["Correr sin mirar","Cruzar entre vehículos en movimiento","Mirar solo el teléfono"],"Seguridad vial"],
      ["¿Qué representa un mapa?","Un dibujo que representa un lugar o territorio",["Una lista de canciones","Un reloj para medir el tiempo","Una receta de cocina"],"Geografía"],
      ["¿Qué significa compartir un material con respeto?","Usarlo por turnos y cuidarlo",["Esconderlo para que nadie lo use","Dañarlo cuando termina el turno","Quitárselo a otra persona"],"Convivencia"],
      ["¿Qué elemento natural necesitamos para vivir?","Agua limpia",["Humo","Basura","Ruido"],"Recursos naturales"],
      ["¿Para qué sirve una norma en el salón?","Para organizar la convivencia y el trabajo",["Para impedir todo aprendizaje","Para que nadie pueda participar","Para causar conflictos"],"Normas"],
      ["¿Cuál es un ejemplo de comunidad?","Personas que comparten un lugar y colaboran",["Un objeto sin personas","Una sola piedra","Un número aislado"],"Comunidad"],
      ["¿Qué hacemos si alguien tiene una opinión diferente?","Escuchamos con respeto",["Nos burlamos de inmediato","Le impedimos hablar siempre","Difundimos rumores"],"Respeto"],
      ["¿Qué acción protege los árboles?","Evitar dañarlos y cuidar su entorno",["Cortar todos los brotes","Pintar sus hojas con químicos","Dejar fuego junto a sus raíces"],"Ambiente"]
    ],
    [
      ["¿Cuál es una responsabilidad de la ciudadanía en una democracia?","Respetar las normas y participar de manera informada",["Ignorar todos los derechos ajenos","Impedir que otros expresen ideas","Reemplazar las leyes por rumores"],"Ciudadanía"],
      ["¿Para qué sirve una Constitución?","Establece principios y organiza el Estado",["Es un mapa del clima diario","Es una lista de precios de tiendas","Es un calendario deportivo"],"Instituciones"],
      ["¿Qué fuente permite conocer un hecho histórico con mayor fundamento?","Un documento o testimonio contextualizado y contrastado",["Un rumor sin autor","Una afirmación sin fecha ni fuente","Una publicación que no presenta evidencias"],"Fuentes históricas"],
      ["¿Qué práctica favorece la participación democrática?","Escuchar propuestas y votar de forma informada",["Ocultar información a la comunidad","Amenazar a quien piensa distinto","Impedir toda deliberación"],"Democracia"],
      ["¿Qué puede provocar la contaminación de un río?","Afectar los ecosistemas y la salud",["Hacer potable toda el agua","Eliminar toda necesidad de tratamiento","Garantizar más biodiversidad siempre"],"Ambiente"],
      ["¿Qué información muestra principalmente la escala de un mapa?","La relación entre distancia en el mapa y distancia real",["La temperatura de cada persona","La edad de los habitantes","El precio de los alimentos"],"Geografía"],
      ["¿Qué es una migración?","El desplazamiento de personas de un lugar a otro para vivir temporal o permanentemente",["El cambio de color de una roca","El movimiento de la Tierra alrededor del Sol","La evaporación del agua"],"Población"],
      ["¿Qué ayuda a resolver un conflicto de forma pacífica?","El diálogo, la escucha y la búsqueda de acuerdos",["La amenaza","La difusión de rumores","La imposición sin escuchar"],"Resolución de conflictos"],
      ["¿Qué significa que un recurso sea renovable?","Puede regenerarse naturalmente en escalas de tiempo adecuadas si se gestiona bien",["Nunca puede agotarse bajo ninguna condición","No tiene utilidad para las personas","Siempre se produce de manera ilimitada"],"Recursos"],
      ["¿Por qué conviene contrastar noticias de varias fuentes?","Para detectar errores, omisiones y posibles sesgos",["Para elegir siempre la noticia más corta","Para evitar leer la información completa","Para confirmar cualquier rumor"],"Medios de comunicación"]
    ]
  ];
  const subjectCounts = {};
  function appendGenerated(subject, course, needed) {
    const target = BANCO[subject] || (BANCO[subject] = []);
    const existing = target.filter(function(q){return q.curso===course;}).length;
    const missing = Math.max(0, needed-existing);
    for(let i=0;i<missing;i++){
      const serial = i;
      let item;
      if(subject==="matematicas"){
        const row=mathTemplates(course,serial);
        if(!row) continue;
        item=makeQuestion(subject,course,serial,row.q,makeOptions(row.correct,row.distractors),row.correct,row.topic,row.exp,course<3?1:course<7?2:3);
      } else if(subject==="lectura"){
        const passage=readingPassages[(course*3+serial)%readingPassages.length];
        const type=readingQuestionTypes[serial];
        const correct=type[0].includes("idea principal")?passage[1]:
          type[0].includes("inferir")?passage[1]:
          type[0].includes("intención")?"Comunicar o explicar la situación central del pasaje":
          type[0].includes("evidencia")?"Datos verificables y una fuente identificable":
          type[0].includes("opinión")?"Una valoración personal sobre la situación descrita":
          type[0].includes("compartir")?"Verificar la fuente y contrastar la evidencia disponible":
          type[0].includes("problema")?"La solución responde al problema o necesidad descrita":
          type[0].includes("detalle")?"El dato o ejemplo concreto que se menciona en el pasaje":
          type[0].includes("faltaran")?"Hace falta más información para decidir si es fiable":
          "Una frase breve que recoge la idea central del pasaje";
        const options=[correct].concat(type[2].map(function(x){return x;}));
        item=makeQuestion(subject,course,serial,passage[0]+"\n\n"+type[0],options,correct,"Comprensión y lectura crítica", "La respuesta se justifica con la idea central y los datos del pasaje.",course<4?1:course<8?2:3);
      } else {
        const bank=socialBanks[course<4?0:1];
        const row=bank[(course*2+serial)%bank.length];
        item=makeQuestion(subject,course,serial,row[0],[row[1]].concat(row[2]),row[1],row[3],"La opción correcta corresponde al concepto social o ciudadano descrito.",course<4?1:course<8?2:3);
      }
      if(!item || !item.pregunta || !Array.isArray(item.opciones) || item.opciones.length!==4) continue;
      if(item.correcta<0 || item.correcta>3) continue;
      const duplicate=target.some(function(q){return q.curso===course && q.pregunta.trim().toLocaleLowerCase()===item.pregunta.trim().toLocaleLowerCase();});
      if(!duplicate) target.push(item);
    }
  }
  /* Matemáticas, lectura crítica e historia/cívica son las materias que ya ofrece el juego. */
  for(let grade=0;grade<=11;grade++){
    appendGenerated("matematicas",grade,10);
    appendGenerated("lectura",grade,10);
    appendGenerated("historia",grade,10);
  }
  function validateQuestionBank() {
    const errors=[], report={};
    ["matematicas","lectura","historia"].forEach(function(subject){
      report[subject]={};
      for(let grade=0;grade<=11;grade++){
        const qs=(BANCO[subject]||[]).filter(function(q){return q.curso===grade;});
        report[subject][grade]=qs.length;
        if(qs.length<10) errors.push(subject+" / "+gradeLabels[grade]+": "+qs.length+" preguntas (mínimo 10).");
        qs.forEach(function(q){
          if(!q.id || !q.pregunta || !q.pregunta.trim()) errors.push("Pregunta vacía o sin ID en "+subject+" / "+gradeLabels[grade]);
          if(!Array.isArray(q.opciones) || q.opciones.length<3) errors.push("Opciones inválidas: "+(q.id||q.pregunta));
          if(!Array.isArray(q.opciones) || q.correcta<0 || q.correcta>=q.opciones.length) errors.push("Respuesta correcta inválida: "+(q.id||q.pregunta));
        });
      }
    });
    const ids={};
    Object.keys(BANCO).forEach(function(subject){(BANCO[subject]||[]).forEach(function(q){
      if(q.id){if(ids[q.id]) errors.push("ID duplicado: "+q.id);ids[q.id]=true;}
    });});
    window.TecnoBrainMathQuestionAudit={valid:errors.length===0,errors:errors,counts:report};
    if(errors.length) console.error("[TecnoBrainMath] Validación del banco:",errors);
    else console.info("[TecnoBrainMath] Banco validado:",report);
    return window.TecnoBrainMathQuestionAudit;
  }
  validateQuestionBank();

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