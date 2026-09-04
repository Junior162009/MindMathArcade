const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const TEACHER_EMAIL = 'delahozbarcelojunior@gmail.com';
const FROM_EMAIL = 'TecnoMath <notificaciones@tecnomath.online>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const esc = (v: unknown) => String(v ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendWithRetry(payload: Record<string, unknown>) {
  let lastError = 'Error desconocido de Resend';

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.text();
      if (response.ok) return { ok: true, result };

      lastError = `Resend ${response.status}: ${result}`;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === 4) break;
    } catch (error) {
      lastError = String(error?.message || error);
      if (attempt === 4) break;
    }

    await sleep(attempt * 1500);
  }

  throw new Error(lastError);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405, headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error('Falta configurar RESEND_API_KEY en Supabase.');

    const data = await req.json();
    const rawStudent = String(data.student ?? '').trim();
    if (rawStudent.length < 2) throw new Error('Nombre de estudiante inválido.');

    const student = esc(rawStudent).slice(0, 80);
    const score = Number(data.score ?? 0);
    const correct = Number(data.correct ?? 0);
    const answered = Number(data.answered ?? 0);
    const total = Number(data.total ?? 15);
    const seconds = Number(data.seconds ?? 0);
    const questionReached = Number(data.questionReached ?? data.question_reached ?? 0);
    const reason = esc(data.reason || 'Evaluación completada');
    const answers = Array.isArray(data.answers) ? data.answers.slice(0, 15) : [];
    const events = Array.isArray(data.events) ? data.events.slice(0, 50) : [];

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const time = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const percent = total ? Math.round((correct / total) * 100) : 0;

    const answersHtml = answers.map((v: unknown, idx: number) => {
      const value = v === null ? 'Sin responder' : `Opción ${String.fromCharCode(65 + Number(v))}`;
      return `<li><b>Pregunta ${idx + 1}:</b> ${esc(value)}</li>`;
    }).join('');

    const eventsHtml = events.length
      ? `<h3>Eventos registrados</h3><ul>${events.map((e: unknown) => `<li>${esc(e)}</li>`).join('')}</ul>`
      : '<p>No se registraron eventos de seguridad.</p>';

    const html = `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;line-height:1.5;color:#172033">
      <div style="max-width:680px;margin:auto;padding:24px">
        <h1 style="margin-bottom:4px">📝 Nuevo resultado del Quiz</h1>
        <p style="color:#667085">Reseña Crítica · TecnoMath</p>
        <hr>
        <p><b>Estudiante:</b> ${student}</p>
        <p><b>Puntaje:</b> ${score}/${total} (${percent}%)</p>
        <p><b>Correctas:</b> ${correct} · <b>Respondidas:</b> ${answered}/${total}</p>
        <p><b>Tiempo:</b> ${time}</p>
        <p><b>Pregunta alcanzada:</b> ${questionReached}/${total}</p>
        <p><b>Estado:</b> ${reason}</p>
        <h3>Respuestas</h3><ol>${answersHtml}</ol>
        ${eventsHtml}
        <hr><p style="font-size:12px;color:#667085">Resultado enviado automáticamente por TecnoMath.</p>
      </div>
    </body></html>`;

    const subject = `📝 Quiz Reseña Crítica — ${rawStudent} — ${score}/${total}`;
    const email = await sendWithRetry({ from: FROM_EMAIL, to: [TEACHER_EMAIL], subject, html });

    return new Response(JSON.stringify({ ok: true, emailSent: true, resend: email.result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ ok: false, emailSent: false, error: String(error?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
