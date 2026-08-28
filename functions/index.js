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

const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[char]));

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

async function sendEmail(to,subject,htmlBody){
  const key=RESEND_API_KEY.value();
  if(!key||!to)return false;
  const from=EMAIL_FROM.value()||'TecnoMath <notificaciones@tecnomath.online>';
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({from,to:[to],subject,html:htmlBody})
  });
  if(!response.ok){
    console.error('Resend:',await response.text());
    return false;
  }
  return true;
}

async function sendAuthorStatusEmail(submissionId,before,after){
  const email=String(after.authorEmail||'').trim();
  if(!email)return;

  const previousStatus=String(before?.status||'').toLowerCase();
  const status=String(after.status||'').toLowerCase();
  const notificationKey={
    pending:'received',
    reviewing:'reviewing',
    approved:'approved',
    rejected:'rejected',
    published:'published'
  }[status];
  if(!notificationKey)return;

  // Solo enviar cuando el estado realmente cambia, evitando repetir correos.
  if(previousStatus===status && status!=='pending')return;

  const sent={...(after.emailNotifications||{})};
  if(sent[notificationKey])return;

  const author=esc(after.authorName||'Usuario');
  const game=esc(after.name||'tu juego');
  let subject='';
  let body='';

  if(status==='pending'){
    subject='🎮 Hemos recibido tu juego';
    body=`<h2>🎮 ¡Juego recibido!</h2><p>Hola ${author}, hemos recibido <b>${game}</b> correctamente.</p><p>Tu juego quedó pendiente de revisión. Te avisaremos por correo cada vez que cambie su estado.</p>`;
  }else if(status==='reviewing'){
    subject='🔍 Tu juego está siendo revisado';
    body=`<h2>🔍 Estamos revisando tu juego</h2><p>Hola ${author}, un administrador ya está revisando <b>${game}</b>.</p><p>Te avisaremos cuando haya una nueva actualización.</p>`;
  }else if(status==='approved'){
    subject='✅ ¡Tu juego fue aprobado!';
    body=`<h2>✅ ¡Buenas noticias!</h2><p>Hola ${author}, tu juego <b>${game}</b> fue aprobado por un administrador.</p><p>Ahora pasará automáticamente al proceso de publicación. Te enviaremos otro correo cuando esté disponible para jugar.</p>`;
  }else if(status==='published'){
    const url=esc(after.publishedUrl||`https://tecnomath.online`);
    subject='🎉 ¡Tu juego ya está publicado!';
    body=`<h2>🎉 ¡Tu juego ya está publicado!</h2><p>Hola ${author}, <b>${game}</b> ya está disponible en TecnoMath.</p><p><a href="${url}">🎮 Abrir mi juego</a></p>`;
  }else if(status==='rejected'){
    const reason=esc(after.rejectionReason||after.reviewReason||'No cumple los requisitos de publicación actualmente.');
    subject='❌ Actualización sobre tu juego';
    body=`<h2>❌ Tu juego no fue aprobado</h2><p>Hola ${author}, después de revisar <b>${game}</b>, no fue aprobado por el momento.</p><p><b>Motivo:</b> ${reason}</p><p>Puedes realizar las correcciones necesarias y volver a enviarlo.</p>`;
  }

  if(!subject||!body)return;

  try{
    const sentSuccessfully=await sendEmail(email,subject,body);
    if(sentSuccessfully){
      await db.ref(`gameSubmissions/${submissionId}/emailNotifications/${notificationKey}`).set(true);
      await db.ref(`gameSubmissions/${submissionId}/emailNotifications/${notificationKey}At`).set(admin.database.ServerValue.TIMESTAMP);
      console.log(`EMAIL AUTHOR SENT ${notificationKey}: ${email}`);
    }
  }catch(error){
    console.error(`ERROR AUTHOR EMAIL ${submissionId}:`,error);
  }
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
        html:`<h2>🎮 Nuevo juego enviado a TecnoMath</h2><p><b>Juego:</b> ${esc(data.name||'')}</p><p><b>Autor:</b> ${esc(data.authorName||'')}</p><p><b>Correo:</b> ${esc(data.authorEmail||'')}</p><p><b>Categoría:</b> ${esc(data.category||'otros')}</p><p>${esc(data.description||'')}</p><p>Entra al panel de administración para revisar y aprobar la solicitud.</p>`
      })
    });
    if(!response.ok)console.error('Resend:',await response.text());
  }
  await sendAuthorStatusEmail(event.params.submissionId,{},data);
  await db.ref(`gameSubmissions/${event.params.submissionId}`).update({emailStatus:'admins-sent',emailSentAt:admin.database.ServerValue.TIMESTAMP});
});

// Envía un correo inmediato al autor cada vez que el estado cambia por una
// acción administrativa o por la publicación automática.
exports.notifyGameStatusChange=onValueWritten({ref:'/gameSubmissions/{submissionId}',secrets:[RESEND_API_KEY,EMAIL_FROM]},async event=>{
  const before=event.data.before.val()||{};
  const after=event.data.after.val()||{};
  if(!event.data.after.exists())return;
  await sendAuthorStatusEmail(event.params.submissionId,before,after);
});

// Publica tanto aprobaciones nuevas como aprobaciones que ya existían antes
// de que esta función estuviera desplegada.
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
