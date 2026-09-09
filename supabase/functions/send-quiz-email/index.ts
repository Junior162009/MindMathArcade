const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const TEACHER_EMAIL = 'delahozbarcelojunior@gmail.com';
const FROM_EMAIL = 'TecnoMath <notificaciones@tecnomath.online>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const esc = (v: unknown) => String(v ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendWithRetry(payload: Record<string, unknown>) {
  let lastError = 'Error desconocido de Resend';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.text();
      if (response.ok) return { ok: true, result };
      lastError = `Resend ${response.status}: ${result}`;
      if (!([429, 500, 502, 503, 504].includes(response.status)) || attempt === 4) break;
    } catch (error) {
      lastError = String((error as any)?.message || error);
      if (attempt === 4) break;
    }
    await sleep(attempt * 1500);
  }
  throw new Error(lastError);
}

function formatDate() {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'medium'
  }).format(new Date());
}

function performanceLabel(percent: number) {
  if (percent >= 90) return 'Excelente';
  if (percent >= 80) return 'Muy buen resultado';
  if (percent >= 60) return 'Resultado aceptable';
  return 'Necesita refuerzo';
}

function answerDetails(value: unknown, idx: number) {
  if (value === null || value === undefined || value === '') {
    return `<tr><td>${idx + 1}</td><td>—</td><td>Sin responder</td><td>⚪</td></tr>`;
  }
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    const selected = item.selected ?? item.answer ?? item.option ?? item.value;
    const correctAnswer = item.correctAnswer ?? item.correct_option ?? item.correctOption;
    const isCorrect = item.correct === true || item.isCorrect === true;
    const selectedText = selected === null || selected === undefined ? '—' : String(selected);
    const correctText = correctAnswer === null || correctAnswer === undefined ? '—' : String(correctAnswer);
    return `<tr><td>${idx + 1}</td><td>${esc(selectedText)}</td><td>${esc(correctText)}</td><td>${isCorrect ? '✅ Correcta' : '❌ Incorrecta'}</td></tr>`;
  }
  const n = Number(value);
  const option = Number.isFinite(n) ? `Opción ${String.fromCharCode(65 + n)}` : String(value);
  return `<tr><td>${idx + 1}</td><td>${esc(option)}</td><td>—</td><td>Registrada</td></tr>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405, headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error('Falta configurar RESEND_API_KEY en Supabase.');

    const data = await req.json();
    const rawStudent = String(data.student ?? '').trim();
    if (rawStudent.length < 2) throw new Error('Nombre de estudiante inválido.');

    const quizType = String(data.quizType ?? 'resena').toLowerCase();
    const quizTitle = String(data.quizTitle ?? (quizType === 'biologia' ? 'Biología · Sistema endocrino' : 'Reseña Crítica'));
    const student = esc(rawStudent).slice(0, 80);
    const score = Number(data.score ?? 0);
    const correct = Number(data.correct ?? 0);
    const answered = Number(data.answered ?? 0);
    const total = Number(data.total ?? 15);
    const seconds = Math.max(0, Number(data.seconds ?? 0));
    const questionReached = Number(data.questionReached ?? data.question_reached ?? 0);
    const reason = esc(data.reason || 'Evaluación completada');
    const answers = Array.isArray(data.answers) ? data.answers.slice(0, 30) : [];
    const events = Array.isArray(data.events) ? data.events.slice(0, 50) : [];

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const time = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const grade = total > 0 ? (correct / total * 5).toFixed(1) : '0.0';
    const unanswered = Math.max(0, total - answered);
    const label = performanceLabel(percent);
    const date = formatDate();

    const answersHtml = answers.length
      ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#eef2f7"><th style="padding:9px;text-align:left">#</th><th style="padding:9px;text-align:left">Respuesta</th><th style="padding:9px;text-align:left">Correcta</th><th style="padding:9px;text-align:left">Resultado</th></tr></thead><tbody>${answers.map(answerDetails).join('')}</tbody></table></div>`
      : '<p style="color:#667085">No se recibieron respuestas detalladas.</p>';

    const eventsHtml = events.length
      ? `<h3 style="margin-bottom:8px">🔐 Eventos registrados (${events.length})</h3><ul>${events.map((e: unknown) => `<li>${esc(e)}</li>`).join('')}</ul>`
      : '<p style="color:#667085">🔐 No se registraron eventos de seguridad.</p>';

    const statusBox = reason.toLowerCase().includes('aband') || reason.toLowerCase().includes('sal') || reason.toLowerCase().includes('segur')
      ? '⚠️ Intento interrumpido / supervisión'
      : '✅ Evaluación registrada';

    const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;line-height:1.5;color:#172033"><div style="max-width:720px;margin:auto;padding:22px"><div style="background:#07111f;color:white;border-radius:18px;padding:22px"><div style="font-size:12px;letter-spacing:1px;color:#45d6a5;font-weight:bold">∑ TECNOMATH · EVALUACIÓN</div><h1 style="margin:8px 0 2px;font-size:25px">Nuevo resultado del quiz</h1><div style="color:#b8c7d9">${esc(quizTitle)}</div></div><div style="background:white;border-radius:18px;padding:22px;margin-top:14px"><h2 style="margin-top:0">👤 ${student}</h2><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px"><div style="padding:14px;background:#f7f9fc;border-radius:12px"><small>Puntaje</small><div style="font-size:25px;font-weight:bold">${score}/${total}</div><div>${percent}% · Nota ${grade}/5.0</div></div><div style="padding:14px;background:#f7f9fc;border-radius:12px"><small>Rendimiento</small><div style="font-size:18px;font-weight:bold">${label}</div><div>${correct} correctas · ${unanswered} sin responder</div></div><div style="padding:14px;background:#f7f9fc;border-radius:12px"><small>Tiempo</small><div style="font-size:21px;font-weight:bold">${time}</div><div>${answered}/${total} respondidas</div></div><div style="padding:14px;background:#f7f9fc;border-radius:12px"><small>Supervisión</small><div style="font-weight:bold">${statusBox}</div><div>Pregunta alcanzada: ${questionReached}/${total}</div></div></div><div style="margin-top:18px;padding:13px;border-left:4px solid #45d6a5;background:#f1fbf7"><b>Estado:</b> ${reason}</div><p style="font-size:12px;color:#667085;margin-bottom:0">📅 ${date}</p></div><div style="background:white;border-radius:18px;padding:22px;margin-top:14px"><h2 style="margin-top:0">📊 Detalle de respuestas</h2>${answersHtml}</div><div style="background:white;border-radius:18px;padding:22px;margin-top:14px">${eventsHtml}</div><div style="text-align:center;color:#667085;font-size:12px;padding:18px">Correo generado automáticamente por TecnoMath · Quiz ${esc(quizType)}</div></div></body></html>`;

    const subject = `${percent >= 60 ? '🟢' : '🔴'} ${quizTitle} — ${rawStudent} — ${score}/${total} (${percent}%)`;
    const email = await sendWithRetry({ from: FROM_EMAIL, to: [TEACHER_EMAIL], subject, html });

    return new Response(JSON.stringify({ ok: true, emailSent: true, resend: email.result, quizType }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ ok: false, emailSent: false, error: String((error as any)?.message || error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});