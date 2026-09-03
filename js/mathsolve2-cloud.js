(function(){
'use strict';
const KEY='mathsolve_history';
let uid=null,last='';let timer=null;
function db(){return window.TecnomathFirebase&&window.TecnomathFirebase.database;}
function local(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
function writeLocal(v){try{localStorage.setItem(KEY,JSON.stringify(v));if(typeof window.renderHistory==='function')window.renderHistory()}catch(e){}}
async function cloudLoad(){if(!uid||!db())return;try{const snap=await db().ref('mathsolve2History/'+uid).orderByChild('createdAt').limitToLast(50).once('value');const arr=[];snap.forEach(x=>arr.unshift(Object.assign({id:x.key},x.val())));if(arr.length){writeLocal(arr)}else if(local().length){await cloudPush(local());}last=JSON.stringify(local());}catch(e){console.warn('MathSolve cloud load:',e)}}
async function cloudPush(items){if(!uid||!db()||!Array.isArray(items))return;const ref=db().ref('mathsolve2History/'+uid);for(const item of items.slice(0,50)){const id=item.id||ref.push().key;const data=Object.assign({},item,{id:undefined,userId:uid,createdAt:item.createdAt||window.TecnomathFirebase.serverTimestamp});delete data.id;await ref.child(id).set(data)}}
async function sync(){if(!uid)return;const now=local();const serialized=JSON.stringify(now);if(serialized===last)return;last=serialized;try{await cloudPush(now)}catch(e){console.warn('MathSolve cloud save:',e)}}
function start(user){uid=user&&user.uid||null;last='';if(timer)clearInterval(timer);if(uid){cloudLoad();timer=setInterval(sync,1200)}}
if(window.TecnomathFirebase&&window.TecnomathFirebase.auth){window.TecnomathFirebase.auth.onAuthStateChanged(start)}else{setTimeout(()=>{if(window.TecnomathFirebase&&window.TecnomathFirebase.auth)window.TecnomathFirebase.auth.onAuthStateChanged(start)},500)}
})();