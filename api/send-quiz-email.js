export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const key = process.env.RESEND_API_KEY;
  const to = process.env.TEACHER_EMAIL || 'delahozbarcelojunior@gmail.com';
  const from = process.env.EMAIL_FROM || 'TecnoMath <notificaciones@tecnomath.online>';

  if (!key) return res.status(500).json({ ok: false, error: 'RESEND_API_KEY no configurada.' });

  const body = req.body || {};
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const student = String(body.student || '').trim().slice(0, 80);
  const score = Number.isFinite(Number(body.score)) ? Number(body.score) : 0;
  const correct = Number.isFinite(Number(body.correct)) ? Number(body.correct) : score;
  const answered = Number.isFinite(Number(body.answered)) ? Number(body.answered) : 0;
  const total = Number.isFinite(Number(body.total)) ? Number(body.total) : 15;
  const seconds = Number.isFinite(Number(body.seconds)) ? Number(body.seconds) : 0;
  const questionReached = Number.isFinite(Number(body.questionReached)) ? Number(body.questionReached) : 0;
  const reason = String(body.reason || 'Evaluación completada').slice(0, 160);
  const events = Array.isArray(body.events) ? body.events.slice(0, 30).map(x => String(x).slice(0, 250)) : [];
  const answers = Array.isArray(body.answers) ? body.answers.slice(0, 15) : [];

  if (student.length < 2) return res.status(400).json({ ok: false, error: 'Nombre inválido.' });

  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  const eventHtml = events.length ? `<h3>Eventos de seguridad</h3><ul>${events.map(esc).map(x => `<li>${x}</li>`).join('')}</ul>` : '<p>No se registraron eventos de seguridad.</p>';
  const answerHtml = answers.length ? `<h3>Respuestas registradas</h3><p>${answers.map((x, n) => `P${n + 1}: ${x === null ? 'Sin responder' : String.fromCharCode(65 + Number(x))}`).map(esc).join(' · ')}</p>` : '';
  const html = `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;color:#172033"><h2>📋 Nuevo resultado — Quiz Reseña Crítica</h2><p><b>Estudiante:</b> ${esc(student)}</p><p><b>Puntuación:</b> ${score}/${total}</p><p><b>Correctas:</b> ${correct} &nbsp; <b>Respondidas:</b> ${answered}/${total}</p><p><b>Tiempo:</b> ${mins}:${secs}</p><p><b>Pregunta alcanzada:</b> ${questionReached}/${total}</p><p><b>Motivo:</b> ${esc(reason)}</p>${answerHtml}${eventHtml}<hr><p style="color:#667085">Enviado automáticamente por TecnoMath.</p></body></html>`;
  const subject = `TecnoMath · ${student} · ${score}/${total} · Quiz Reseña Crítica`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(502).json({ ok: false, error: 'Resend no pudo enviar el correo.' });
    }
    return res.status(200).json({ ok: true, emailSent: true, id: data.id || null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Error interno al enviar el correo.' });
  }
}
