/* TecnoMath Auth - Supabase Auth migration layer */
(function () {
  'use strict';
  const SUPABASE_URL='https://xdszveoxdrdnwwzzvkav.supabase.co';
  const SUPABASE_KEY='sb_publishable_xwUE0a1N0g0rb7aOLyXPAsA_kOAX9bOA';
  const PROD_AUTH_URL='https://tecnomath.online/pages/auth.html';
  const PROD_RECOVERY_URL='https://tecnomath.online/pages/auth.html?mode=recovery';
  const ADMIN_EMAILS=['delahozbarcelojunior@gmail.com','nicolenatera26@gmail.com','mateobarbosamatos@gmail.com','jandresvf23@gmail.com'];
  const ADMIN_NAMES={'delahozbarcelojunior@gmail.com':'Junior','nicolenatera26@gmail.com':'Nicole','mateobarbosamatos@gmail.com':'Mateo','jandresvf23@gmail.com':'Jaider'};
  const SESSION_KEY='tecnomath_session';
  function loadSupabase(){return new Promise((resolve,reject)=>{if(window.supabase?.createClient)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.min.js';s.async=false;s.dataset.tecnomathSupabase='true';s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar Supabase.'));document.head.appendChild(s)})}
  let clientPromise=null;
  function getClient(){
    if(!clientPromise)clientPromise=loadSupabase().then(()=>window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}}));
    return clientPromise
  }
  const emailOf=u=>String(u?.email||'').trim().toLowerCase();
  const isAdminEmail=e=>ADMIN_EMAILS.includes(String(e||'').trim().toLowerCase());
  function adminUsername(u){const e=emailOf(u);return ADMIN_NAMES[e]||e.split('@')[0].replace(/[^a-z0-9._-]/g,'')||'Admin'}
  async function getProfile(user){if(!user)return null;const db=await getClient();const {data,error}=await db.from('tecnomath_profiles').select('*').eq('id',user.id).maybeSingle();if(error)throw error;return data}
  async function ensureProfile(user,username,extra={}){if(!user)return null;const db=await getClient();const existing=await getProfile(user);if(existing){setSession(existing.username);return existing}const email=emailOf(user);const admin=isAdminEmail(email);const fallback=admin?adminUsername(user):(username||user.user_metadata?.username||email.split('@')[0]);const payload={id:user.id,username:String(fallback).trim(),display_name:extra.display_name||fallback,phone:extra.phone||user.phone||null};const {data,error}=await db.from('tecnomath_profiles').insert(payload).select().single();if(error)throw error;setSession(data.username);return data}
  async function currentUser(){const db=await getClient();const {data,error}=await db.auth.getUser();return error?null:data.user||null}
  async function signIn(email,password){const db=await getClient();const {data,error}=await db.auth.signInWithPassword({email:String(email).trim(),password});if(error)throw error;const profile=await ensureProfile(data.user);setSession(profile.username);window.TecnomathCurrentAdmin=profile.role==='admin'?profile:null;return{user:data.user,profile}}
  async function signUp(email,password,username,phone){const db=await getClient();const {data,error}=await db.auth.signUp({email:String(email).trim(),password,options:{emailRedirectTo:PROD_AUTH_URL,data:{username:String(username).trim(),phone:phone||null}}});if(error)throw error;if(data.user&&data.session)await ensureProfile(data.user,username,{phone});return data}
  async function signOut(){const db=await getClient();await db.auth.signOut();clearSession();window.TecnomathCurrentAdmin=null}
  async function sendRecovery(email){const db=await getClient();const {error}=await db.auth.resetPasswordForEmail(String(email).trim(),{redirectTo:PROD_RECOVERY_URL});if(error)throw error}
  async function updatePassword(password){const db=await getClient();const {error}=await db.auth.updateUser({password});if(error)throw error}
  async function updateEmail(email){const db=await getClient();const {error}=await db.auth.updateUser({email:String(email).trim()});if(error)throw error}
  function setSession(username){if(username)localStorage.setItem(SESSION_KEY,JSON.stringify({username:String(username).trim()}))}function clearSession(){localStorage.removeItem(SESSION_KEY)}function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){clearSession();return null}}
  async function isAdmin(){const u=await currentUser();if(!u)return false;const p=await getProfile(u).catch(()=>null);return isAdminEmail(u.email)||p?.role==='admin'}
  async function authState(callback){const db=await getClient();const {data}=db.auth.onAuthStateChange((event,session)=>{const u=session?.user||null;if(!u){clearSession();callback(null,null);return}setTimeout(async()=>{try{const p=await ensureProfile(u);window.TecnomathCurrentAdmin=p?.role==='admin'?p:null;callback(u,p)}catch(e){console.error('TecnoMath Supabase profile sync:',e);callback(u,null)}},0)});return data.subscription}
  window.TecnomathAuth={SUPABASE_URL,PROD_AUTH_URL,PROD_RECOVERY_URL,ADMIN_EMAILS,ADMIN_NAMES,getClient,currentUser,getProfile,ensureProfile,signIn,signUp,signOut,sendRecovery,updatePassword,updateEmail,isAdmin,authState,setSession,clearSession,getSession,isAdminEmail,adminUsername};
  window.Tecnomath=Object.assign({},window.Tecnomath||{},{setSession,logout:signOut,getCurrentUser:getSession,getAdminEmails:()=>[...ADMIN_EMAILS],isAdmin:()=>!!window.TecnomathCurrentAdmin,setAdmin:()=>!!window.TecnomathCurrentAdmin,unsetAdmin:clearSession});
  function syncPortalFromSupabase(){
    if(!(location.pathname==='/'||location.pathname.endsWith('/index.html')))return;
    authState((user,profile)=>{
      const display=document.getElementById('userDisplay');
      const authLink=document.getElementById('authLink');
      const logoutBtn=document.getElementById('logoutBtn');
      if(!user){if(display)display.textContent='Invitado';if(logoutBtn)logoutBtn.style.display='none';if(authLink){authLink.href='pages/auth.html';authLink.textContent='🔑 ACCEDER';}return;}
      const username=String(profile?.username||user.user_metadata?.username||user.email?.split('@')[0]||'Usuario').trim();
      setSession(username);
      if(display)display.textContent=username+' · 💰 '+(window.Tecnomath.getCoins?.()??0);
      if(authLink){authLink.href='pages/profile.html';authLink.textContent='👤 PERFIL';}
      if(logoutBtn)logoutBtn.style.display='inline-block';
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncPortalFromSupabase,{once:true});else syncPortalFromSupabase();
})();
