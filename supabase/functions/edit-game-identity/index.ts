import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const REPO="Junior162009/MindMathArcade",BRANCH="main",GH_API="https://api.github.com",MAX=2*1024*1024;
const cors={"Access-Control-Allow-Origin":"https://tecnomath.online","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const ALLOWED=new Set([".png",".jpg",".jpeg",".webp",".svg"]);
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}})}
function cleanId(v:unknown){return String(v??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)}
function b64bytes(v:string){const bin=atob(v.replace(/\s/g,""));const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
function b64(v:Uint8Array){let s="";for(let i=0;i<v.length;i+=0x8000)s+=String.fromCharCode(...v.subarray(i,i+0x8000));return btoa(s)}
function ext(name:string,type:string){const e=name.slice(name.lastIndexOf(".")).toLowerCase();if(!ALLOWED.has(e))throw Error("Extensión de logo no permitida.");if(type==="image/png"&&e!==".png")throw Error("MIME/extensión incompatibles.");if(type==="image/jpeg"&&![".jpg",".jpeg"].includes(e))throw Error("MIME/extensión incompatibles.");if(type==="image/webp"&&e!==".webp")throw Error("MIME/extensión incompatibles.");if(type==="image/svg+xml"&&e!==".svg")throw Error("MIME/extensión incompatibles.");return e}
function validBytes(bytes:Uint8Array,e:string){const h=(...a:number[])=>a.every((x,i)=>bytes[i]===x);if(e===".png"&&!h(137,80,78,71,13,10,26,10))throw Error("El archivo no es un PNG válido.");if((e===".jpg"||e===".jpeg")&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255))throw Error("El archivo no es un JPEG válido.");if(e===".webp"&&!(String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP"))throw Error("El archivo no es un WEBP válido.");if(e===".svg"){const t=new TextDecoder("utf-8",{fatal:true}).decode(bytes);if(!/<svg[\s>]/i.test(t)||/<\s*script|on[a-z]+\s*=|javascript:|data:text\/html/i.test(t))throw Error("SVG rechazado: contenido activo o inseguro.");}}
async function gh(path:string,init:RequestInit={}){const token=Deno.env.get("GITHUB_PUBLISH_TOKEN")||Deno.env.get("GITHUB_ACTIONS_TOKEN");if(!token)throw Error("Falta GITHUB_PUBLISH_TOKEN en Supabase.");const r=await fetch(GH_API+path,{...init,headers:{"Accept":"application/vnd.github+json","Authorization":"Bearer "+token,"X-GitHub-Api-Version":"2026-03-10","User-Agent":"TecnoMath-Identity-CMS","Content-Type":"application/json",...(init.headers||{})}});const t=await r.text();let d:any;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok){throw Object.assign(new Error("GitHub "+r.status+": "+String(d?.message||d||r.statusText).slice(0,500)),{status:r.status})}return d}
async function state(){const ref=await gh("/repos/"+REPO+"/git/ref/heads/"+BRANCH);const c=await gh("/repos/"+REPO+"/git/commits/"+ref.object.sha);return{sha:ref.object.sha,treeSha:c.tree.sha}}
async function read(path:string,ref:string){const x=await gh("/repos/"+REPO+"/contents/"+path+"?ref="+encodeURIComponent(ref));const bin=atob(x.content.replace(/\n/g,""));const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return JSON.parse(new TextDecoder().decode(u))}
async function blob(bytes:Uint8Array){const x=await gh("/repos/"+REPO+"/git/blobs",{method:"POST",body:JSON.stringify({content:b64(bytes),encoding:"base64"})});return x.sha}
async function commit(parent:string,tree:string,message:string){return gh("/repos/"+REPO+"/git/commits",{method:"POST",body:JSON.stringify({parents:[parent],tree,message})})}
async function tree(base:string,entries:any[]){return gh("/repos/"+REPO+"/git/trees",{method:"POST",body:JSON.stringify({base_tree:base,tree:entries})})}
async function update(sha:string){return gh("/repos/"+REPO+"/git/refs/heads/"+BRANCH,{method:"PATCH",body:JSON.stringify({sha,force:false})})}
function validateCatalog(c:any[]){const ids=new Set();for(const g of c){const id=String(g.id||"");if(!/^[a-z0-9._-]+$/i.test(id))throw Error("Catálogo inválido: ID inseguro.");if(ids.has(id))throw Error("Catálogo inválido: ID duplicado "+id);ids.add(id);if(!String(g.name||"").trim())throw Error("Catálogo inválido: juego sin nombre.");}}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json({ok:false,error:"Método no permitido."},405);
 try{
  const auth=req.headers.get("Authorization");if(!auth)return json({ok:false,error:"Sesión no válida."},401);
  const url=Deno.env.get("SUPABASE_URL"),pk=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY"),sk=Deno.env.get("SUPABASE_SECRET_KEY")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!pk||!sk)throw Error("Configuración segura incompleta.");
  const userClient=createClient(url,pk,{global:{headers:{Authorization:auth}}}),admin=createClient(url,sk);
  const {data:u,error:ue}=await userClient.auth.getUser();if(ue||!u.user)return json({ok:false,error:"Sesión no válida."},401);
  const {data:isA,error:ae}=await userClient.rpc("tecnomath_is_class_a");if(ae||isA!==true)return json({ok:false,error:"Solo un administrador Clase A puede editar identidades."},403);
  const body=await req.json().catch(()=>({})),gameId=cleanId(body.game_id),name=String(body.name||"").trim(),logo=body.logo||null;
  if(!gameId||!name||name.length>120)return json({ok:false,error:"game_id o nombre inválido."},400);
  if(logo){if(!logo.base64||Number(logo.size)>MAX)throw Error("Logo ausente o mayor de 2 MB.");if(!["image/png","image/jpeg","image/webp","image/svg+xml"].includes(String(logo.type)))throw Error("MIME de logo no permitido.");}
  for(let attempt=1;attempt<=3;attempt++){
   try{
    const s=await state(),catalog=await read("data/games.json",s.sha),idx=catalog.findIndex((g:any)=>String(g.id)===gameId);if(idx<0)throw Error("El juego no existe en el catálogo maestro.");
    const old={...catalog[idx]},next=catalog.map((g:any)=>({...g}));
    let newPath=String(old.imageUrl||"");
    const entries:any[]=[];
    if(logo){
      const bytes=b64bytes(String(logo.base64));if(bytes.length!==Number(logo.size))throw Error("Tamaño del logo inconsistente.");const e=ext(String(logo.name||""),String(logo.type));validBytes(bytes,e);
      newPath="img/logos/"+gameId+e;const sh=await blob(bytes);entries.push({path:newPath,mode:"100644",type:"blob",sha:sh});
      const oldPath=String(old.imageUrl||"").split("?")[0];
      if(oldPath.startsWith("img/logos/")&&oldPath!==newPath&&catalog.filter((g:any)=>String(g.imageUrl||"").split("?")[0]===oldPath).length===1)entries.push({path:oldPath,mode:"100644",type:"blob",sha:null});
    }
    next[idx]={...old,id:old.id,name,imageUrl:newPath,identityVersion:Date.now()};
    validateCatalog(next);
    const bytes=new TextEncoder().encode(JSON.stringify(next,null,2)+"\n"),catSha=await blob(bytes);
    entries.push({path:"data/games.json",mode:"100644",type:"blob",sha:catSha},{path:"games/published-games.json",mode:"100644",type:"blob",sha:catSha});
    const tr=await tree(s.treeSha,entries),cm=await commit(s.sha,tr.sha,"chore: edit game identity "+gameId);try{await update(cm.sha)}catch(e){if([409,422].includes(Number((e as any).status))&&attempt<3)continue;throw e}
    await admin.from("tecnomath_catalog_logs").insert({user_id:u.user.id,action:"identity_update",game_id:gameId,game_name:name,changes:{name:{from:old.name,to:name},logo:{from:old.imageUrl||"",to:newPath},commitSha:cm.sha}});
    return json({ok:true,game_id:gameId,name,imagePath:newPath,commitSha:cm.sha},200);
   }catch(e){if([409,422].includes(Number((e as any).status))&&attempt<3)continue;throw e}
  }
  throw Error("No se pudo actualizar el catálogo.");
 }catch(e){console.error("edit-game-identity:",e);return json({ok:false,error:String((e as Error)?.message||e).slice(0,500)},500)}
});