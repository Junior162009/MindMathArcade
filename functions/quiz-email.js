const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {sendEmail, RESEND_API_KEY, EMAIL_FROM} = require('./email.js');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const TEACHER_EMAIL = 'delahozbarcelojunior@gmail.com';

const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

exports.submitQuizResult = onCall({secrets:[RESEND_API_KEY, EMAIL_FROM]}, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated','No se pudo crear la sesión segura del examen.');

  const d = request.data || {};
  const student = String(d.student || '').trim().slice(0,80);
  const reason = String(d.reason || 'Evaluación completada').trim().slice(0,160);
  const score = Math.max(0, Math.min(15, Number(d.score) || 0));
  const answered = Math.max(0, Math.min(15, Number(d.answered) || 0));
  const correct = Math.max(0, Math.min(15, Number(d.correct) || score));
  const seconds = Math.max(0, Math.min(86400, Number(d.seconds) || 0));
  const questionReached = Math.max(1, Math.min(15, Number(d.questionReached) || 1));
  const events = Array.isArray(d.events) ? d.events.slice(0,30).map(x=>String(x).slice(0,160)) : [];
  const answers = Array.isArray(d.answers) ? d.answers.slice(0,15).map(x=>x === null ? null : Number(x)) : [];

  if (student.length < 2) throw new HttpsError('invalid-argument','Nombre del estudiante inválido.');

  const result = {
    quiz:'resena-critica', student, score, correct, answered,
    total:15, seconds, questionReached, reason, events, answers,
    uid:request.auth.uid, createdAt:admin.firestore.FieldValue.serverTimestamp()
  };

  const doc = await db.collection('quizResults').add(result);
  const mins = Math.floor(seconds/60);
  const secs = seconds % 60;
  const eventHtml = events.length ? `<ul>${events.map(esc).map(x=>`<li>${x}</li>`).join('')}</ul>` : '<p>Ninguno registrado.</p>';
  const answersHtml = answers.map((x,n)=>`<li><b>${n+1}.</b> ${x === null ? 'Sin responder' : String.fromCharCode(65 + Math.max(0,Math.min(3,x)))}</li>`).join('');
  const subject = `📝 Quiz Reseña Crítica · ${student} · ${score}/15`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>📝 Nuevo resultado de TecnoMath</h2><p><b>Estudiante:</b> ${esc(student)}</p><p><b>Resultado:</b> ${score}/15 &nbsp; <b>Correctas:</b> ${correct} &nbsp; <b>Respondidas:</b> ${answered}</p><p><b>Tiempo:</b> ${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}<br><b>Pregunta alcanzada:</b> ${questionReached}<br><b>Estado:</b> ${esc(reason)}</p><h3>🔐 Eventos registrados</h3>${eventHtml}<h3>📋 Respuestas</h3><ol>${answersHtml}</ol><p style="color:#777">ID del resultado: ${esc(doc.id)}</p></div>`;

  try {
    const email = await sendEmail(TEACHER_EMAIL, subject, html);
    if (!email) throw new Error('El sistema de correo no pudo enviar el mensaje.');
    await doc.update({emailSent:true,emailId:email?.id || null});
    return {ok:true,emailSent:true,resultId:doc.id};
  } catch (error) {
    console.error('QUIZ EMAIL ERROR:', error);
    await doc.update({emailSent:false,emailError:String(error.message || error)});
    throw new HttpsError('internal','El resultado se guardó, pero no se pudo enviar el correo.');
  }
});
