const {onValueCreated,onValueWritten}=require('firebase-functions/v2/database');
const {defineSecret}=require('firebase-functions/params');
const admin=require('firebase-admin');
const JSZip=require('jszip');

admin.initializeApp();
const db=admin.database();
const bucket=admin.storage().bucket();
const RESEND_API_KEY=defineSecret('RESEND_API_KEY');
const GITHUB_TOKEN=defineSecret('GITHUB_TOKEN');
const EMAIL_FROM=defineSecret('EMAIL_FROM');

const ADMINS=['delahozbarcelojunior@gmail.com','nicolenatera26@gmail.com','mateobarbosamatos@gmail.com','jandresvf23@gmail.com'];
const OWNER='Junior162009';
const REPO='MindMathArcade';
const BRANCH='main';

function slugify(value){return String(value||'juego').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'juego';}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function github(path,options={}){const r=await fetch(`https://api.github.com${path}`,{...options,headers:{accept:'application/vnd.github+json',authorization:`Bearer ${GITHUB_TOKEN.value()}`,...(options.headers||{})}});if(!r.ok)throw new Error(`GitHub ${r.status}: ${await r.text()}`);return r.json();}

exports.notifyGameSubmission=onValueCreated({ref:'/gameSubmissions/{submissionId}',secrets:[RESEND_API_KEY,EMAIL_FROM]},async event=>{
  const data=event.data.val();if(!data)return;const key=RESEND_API_KEY.value();if(!key)return;const from=EMAIL_FROM.value()||'TecnoMath <onboarding@resend.dev>';
  for(const to of ADMINS){
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:`🎮 Nuevo juego pendiente: ${data.name||'Sin nombre'}`,html:`<h2>🎮 Nuevo juego enviado a TecnoMath</h2><p><b>Juego:</b> ${data.name||''}</p><p><b>Autor:</b> ${data.authorName||''}</p><p><b>Correo:</b> ${data.authorEmail||''}</p><p><b>Categoría:</b> ${data.category||'otros'}</p><p>${data.description||''}</p><p>Entra al panel de administración para revisar y aprobar la solicitud.</p>`})});
    if(!response.ok)console.error('Resend:',await response.text());await sleep(1100);
  }
  await db.ref(`gameSubmissions/${event.params.submissionId}`).update({emailStatus:'sent',emailSentAt:admin.database.ServerValue.TIMESTAMP});
});

exports.publishApprovedGame=onValueWritten({ref:'/gameSubmissions/{submissionId}',secrets:[GITHUB_TOKEN]},async event=>{
  const before=event.data.before.val()||{};const after=event.data.after.val()||{};
  if(before.status==='approved'||after.status!=='approved'||after.publishedAt)return;
  if(!after.storagePath)throw new Error('La solicitud no tiene storagePath.');
  const [zipBuffer]=await bucket.file(after.storagePath).download();
  if(zipBuffer.length>20*1024*1024)throw new Error('El ZIP supera 20 MB.');
  const zip=await JSZip.loadAsync(zipBuffer);const files=[];let commonRoot=null;
  for(const [name,entry] of Object.entries(zip.files)){
    if(entry.dir||name.startsWith('__MACOSX/')||name.endsWith('/.DS_Store'))continue;
    const clean=name.replace(/^\/+/, '');const parts=clean.split('/');if(parts.some(p=>p==='..'||p===''))continue;
    const content=await entry.async('nodebuffer');if(content.length>5*1024*1024)throw new Error(`Archivo demasiado grande: ${clean}`);files.push({name:clean,content});
  }
  if(!files.some(f=>f.name.toLowerCase()==='index.html')){const index=files.find(f=>f.name.toLowerCase().endsWith('/index.html'));if(index)commonRoot=index.name.slice(0,index.name.toLowerCase().lastIndexOf('/index.html'))+'/';}
  if(commonRoot)files.forEach(f=>{f.name=f.name.startsWith(commonRoot)?f.name.slice(commonRoot.length):f.name});
  if(!files.some(f=>f.name.toLowerCase()==='index.html'))throw new Error('El ZIP debe contener index.html.');
  if(files.length>100)throw new Error('Máximo 100 archivos por juego.');

  const folder=`games/${slugify(after.name)}-${event.params.submissionId.slice(0,6)}`;
  const head=await github(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);const headSha=head.object.sha;const commit=await github(`/repos/${OWNER}/${REPO}/git/commits/${headSha}`);const entries=[];
  for(const file of files){const blob=await github(`/repos/${OWNER}/${REPO}/git/blobs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({encoding:'base64',content:file.content.toString('base64')})});entries.push({path:`${folder}/${file.name}`,mode:'100644',type:'blob',sha:blob.sha});}
  const tree=await github(`/repos/${OWNER}/${REPO}/git/trees`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_tree:commit.tree.sha,tree:entries})});
  const newCommit=await github(`/repos/${OWNER}/${REPO}/git/commits`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`Publish game: ${after.name}`,tree:tree.sha,parents:[headSha]})});
  await github(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({sha:newCommit.sha,force:false})});

  const publishedUrl=`https://${OWNER.toLowerCase()}.github.io/${REPO}/${folder}/`;
  await db.ref(`publishedGames/${event.params.submissionId}`).set({name:after.name||'Juego',desc:after.description||'',category:after.category||'otros',url:publishedUrl,imageUrl:'',icon:'🎮',deviceCompatibility:'both',evento:null,authorName:after.authorName||'Usuario',submissionId:event.params.submissionId,publishedAt:admin.database.ServerValue.TIMESTAMP});
  await db.ref(`gameSubmissions/${event.params.submissionId}`).update({status:'published',publishedAt:admin.database.ServerValue.TIMESTAMP,publishedPath:folder,publishedUrl,commitSha:newCommit.sha});
});
