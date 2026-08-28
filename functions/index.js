const {onValueCreated,onValueWritten}=require('firebase-functions/v2/database');
const {defineSecret}=require('firebase-functions/params');
const admin=require('firebase-admin');

admin.initializeApp();
const db=admin.database();
const RESEND_API_KEY=defineSecret('RESEND_API_KEY');
const GITHUB_TOKEN=defineSecret('GITHUB_TOKEN');
const EMAIL_FROM=defineSecret('EMAIL_FROM');

const ADMINS=['delahozbarcelojunior@gmail.com','nicolenatera26@gmail.com','mateobarbosamatos@gmail.com','jandresvf23@gmail.com'];
const OWNER='Junior162009';
const REPO='MindMathArcade';

async function github(path,options={}){
  const response=await fetch(`https://api.github.com${path}`,{
    ...options,
    headers:{
      accept:'application/vnd.github+json',
      authorization:`Bearer ${GITHUB_TOKEN.value()}`,
      'X-GitHub-Api-Version':'2022-11-28',
      ...(options.headers||{})
    }
  });
  if(!response.ok)throw new Error(`GitHub ${response.status}: ${await response.text()}`);
  if(response.status===204)return null;
  return response.json();
}

exports.notifyGameSubmission=onValueCreated({ref:'/gameSubmissions/{submissionId}',secrets:[RESEND_API_KEY,EMAIL_FROM]},async event=>{
  const data=event.data.val();
  if(!data)return;
  const key=RESEND_API_KEY.value();
  if(!key)return;
  const from=EMAIL_FROM.value()||'TecnoMath <onboarding@resend.dev>';
  for(const to of ADMINS){
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        from,
        to:[to],
        subject:`🎮 Nuevo juego pendiente: ${data.name||'Sin nombre'}`,
        html:`<h2>🎮 Nuevo juego enviado a TecnoMath</h2><p><b>Juego:</b> ${data.name||''}</p><p><b>Autor:</b> ${data.authorName||''}</p><p><b>Correo:</b> ${data.authorEmail||''}</p><p><b>Categoría:</b> ${data.category||'otros'}</p><p>${data.description||''}</p><p>Entra al panel de administración para revisar y aprobar la solicitud.</p>`
      })
    });
    if(!response.ok)console.error('Resend:',await response.text());
  }
  await db.ref(`gameSubmissions/${event.params.submissionId}`).update({emailStatus:'sent',emailSentAt:admin.database.ServerValue.TIMESTAMP});
});

// Publica tanto aprobaciones nuevas como aprobaciones que ya existían antes
// de que esta función estuviera desplegada. Esto permite recuperar envíos
// aprobados que quedaron fuera de publicGameQueue.
exports.publishApprovedGame=onValueWritten({ref:'/gameSubmissions/{submissionId}',secrets:[GITHUB_TOKEN]},async event=>{
  const after=event.data.after.val()||{};
  const submissionId=event.params.submissionId;

  if(after.status!=='approved'||after.publishedAt||after.publicationTriggeredAt)return;

  const queueRef=db.ref(`publicGameQueue/${submissionId}`);
  const existingQueue=await queueRef.once('value');
  if(!existingQueue.exists()){
    const queueData={...after,status:'approved',submissionId};
    await queueRef.set(queueData);
  }

  await github(`/repos/${OWNER}/${REPO}/dispatches`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      event_type:'game-approved',
      client_payload:{submissionId}
    })
  });

  await db.ref(`gameSubmissions/${submissionId}`).update({
    publicationTrigger:'github-actions',
    publicationTriggeredAt:admin.database.ServerValue.TIMESTAMP
  });
});
