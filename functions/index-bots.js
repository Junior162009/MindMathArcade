const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

require('./index');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const rtdb = admin.database();

const ADMIN_EMAILS = new Set([
  'delahozbarcelojunior@gmail.com',
  'nicolenatera26@gmail.com',
  'mateobarbosamatos@gmail.com',
  'jandresvf23@gmail.com'
]);

const BOT_PREFIX = 'TM_BOT_';
const MAX_BOTS = 50;

async function isAdmin(request) {
  if (!request.auth) return false;
  if (request.auth.token?.admin === true) return true;

  const email = String(request.auth.token?.email || '').trim().toLowerCase();
  if (ADMIN_EMAILS.has(email)) return true;

  try {
    const snap = await rtdb.ref(`users/${request.auth.uid}`).once('value');
    const profile = snap.val() || {};
    return String(profile.role || '').trim().toLowerCase() === 'admin' || profile.isAdmin === true;
  } catch (error) {
    console.error('ADMIN ROLE CHECK ERROR:', error);
    return false;
  }
}

async function requireTournamentAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }
  if (!(await isAdmin(request))) {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden usar el tester de torneos.');
  }
}

function cleanCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(MAX_BOTS, Math.max(1, Math.floor(n)));
}

function botId(index) {
  return `${BOT_PREFIX}${String(index + 1).padStart(3, '0')}`;
}

function botProfile(id, index) {
  const names = ['Bot Relámpago','Bot Matemático','Bot Cerebro','Bot Pro','Bot Campeón','Bot Ninja','Bot Turbo','Bot Genio','Bot Estratega','Bot Élite'];
  return {
    uid: id,
    name: `${names[index % names.length]} ${index + 1}`,
    photo: '',
    isBot: true,
    bot: true
  };
}

function randomScore(index) {
  return 300 + (index * 137) % 700 + Math.floor(Math.random() * 500);
}

exports.createTournamentBots = onCall(async request => {
  await requireTournamentAdmin(request);
  const tournamentId = String(request.data?.tournamentId || '').trim();
  const count = cleanCount(request.data?.count);
  if (!tournamentId) throw new HttpsError('invalid-argument', 'Debes seleccionar un torneo.');

  const tournamentRef = db.collection('tournaments').doc(tournamentId);
  const tournamentSnap = await tournamentRef.get();
  if (!tournamentSnap.exists) throw new HttpsError('not-found', 'El torneo seleccionado no existe.');

  const batch = db.batch();
  const created = [];
  for (let i = 0; i < count; i++) {
    const id = botId(i);
    const participantRef = tournamentRef.collection('participants').doc(id);
    batch.set(participantRef, {
      ...botProfile(id, i),
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'tournament-tester'
    }, {merge: true});
    created.push(id);
  }
  await batch.commit();
  await tournamentRef.set({tester:{lastAction:'create-bots',lastActionAt:admin.firestore.FieldValue.serverTimestamp(),lastActionBy:request.auth.uid}},{merge:true});
  return {ok:true,created:created.length,bots:created};
});

exports.simulateTournamentBotScores = onCall(async request => {
  await requireTournamentAdmin(request);
  const tournamentId = String(request.data?.tournamentId || '').trim();
  const count = cleanCount(request.data?.count);
  if (!tournamentId) throw new HttpsError('invalid-argument', 'Debes seleccionar un torneo.');

  const tournamentRef = db.collection('tournaments').doc(tournamentId);
  const tournamentSnap = await tournamentRef.get();
  if (!tournamentSnap.exists) throw new HttpsError('not-found', 'El torneo seleccionado no existe.');

  const participantsSnap = await tournamentRef.collection('participants').where('isBot','==',true).limit(MAX_BOTS).get();
  if (participantsSnap.empty) throw new HttpsError('failed-precondition', 'Primero crea los bots.');

  const selected = participantsSnap.docs.slice(0, count);
  const batch = db.batch();
  selected.forEach((doc,index) => {
    const participant = doc.data() || {};
    batch.set(tournamentRef.collection('scores').doc(doc.id), {
      uid: doc.id,
      name: participant.name || `Bot ${index + 1}`,
      photo: '',
      score: randomScore(index),
      gameId: tournamentSnap.data()?.gameId || 'tournament-test',
      plays: 1,
      isBot: true,
      bot: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, {merge:true});
  });
  await batch.commit();
  await tournamentRef.set({tester:{lastAction:'simulate-scores',lastActionAt:admin.firestore.FieldValue.serverTimestamp(),lastActionBy:request.auth.uid}},{merge:true});
  return {ok:true,updated:selected.length};
});

exports.cleanupTournamentBots = onCall(async request => {
  await requireTournamentAdmin(request);
  const tournamentId = String(request.data?.tournamentId || '').trim();
  if (!tournamentId) throw new HttpsError('invalid-argument', 'Debes seleccionar un torneo.');

  const tournamentRef = db.collection('tournaments').doc(tournamentId);
  const [participantsSnap,scoresSnap] = await Promise.all([
    tournamentRef.collection('participants').where('isBot','==',true).get(),
    tournamentRef.collection('scores').where('isBot','==',true).get()
  ]);

  const refs = [...participantsSnap.docs.map(d=>d.ref),...scoresSnap.docs.map(d=>d.ref)];
  let deleted = 0;
  for (let i=0;i<refs.length;i+=450) {
    const batch = db.batch();
    refs.slice(i,i+450).forEach(ref=>batch.delete(ref));
    await batch.commit();
    deleted += Math.min(450, refs.length-i);
  }

  await tournamentRef.set({tester:{lastAction:'cleanup-bots',lastActionAt:admin.firestore.FieldValue.serverTimestamp(),lastActionBy:request.auth.uid}},{merge:true});
  return {ok:true,deleted,participants:participantsSnap.size,scores:scoresSnap.size};
});

exports.checkTournamentTesterAdmin = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated','Debes iniciar sesión.');
  return {
    ok:true,
    admin:await isAdmin(request),
    uid:request.auth.uid,
    email:request.auth.token?.email || null
  };
});
