(()=>{"use strict";
const OPENVERSE="https://api.openverse.org/v1/images/";
const LOTTIE_MODULE="https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.80.0/+esm";
const LOTTIE_SRC="https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie";
let lottiePlayer=null,lottieReady=null,externalImage=null;
function status(t){const e=document.getElementById("externalStatus");if(e)e.textContent=t}
async function loadOpenverse(){const img=document.getElementById("externalCityArt"),credit=document.getElementById("externalCredit");if(!img)return;try{
 const r=await fetch(OPENVERSE+"?q="+encodeURIComponent("futuristic city night")+"&license_type=cc0,pdm&source=wikimedia,stocksnap&per_page=12",{headers:{Accept:"application/json"}});
 if(!r.ok)throw Error("HTTP "+r.status);const d=await r.json();const x=(d.results||[]).find(v=>v.thumbnail||v.url);if(!x)throw Error("no result");
 img.src=x.thumbnail||x.url;img.alt="Arte ambiental de Ciudad de las Variables";img.hidden=false;externalImage=x;
 credit.textContent="Recurso externo: Openverse · "+(x.license||"licencia abierta")+(x.creator?" · "+x.creator:"");credit.hidden=false;status("● Recursos externos activos");
 }catch(e){console.warn("Mathverse Openverse:",e);status("● Modo offline · assets internos")}}
async function loadLottie(){if(lottieReady)return lottieReady;lottieReady=import(LOTTIE_MODULE).then(({DotLottie})=>{const c=document.getElementById("mathverseLottie");if(!c)throw Error("canvas missing");lottiePlayer=new DotLottie({autoplay:false,loop:false,canvas:c,src:LOTTIE_SRC});return lottiePlayer}).catch(e=>{console.warn("Mathverse Lottie:",e);return null});return lottieReady}
async function playSuccessAnimation(){const w=document.getElementById("lottieFx");if(!w)return;const p=await loadLottie();if(!p)return;w.classList.remove("show");void w.offsetWidth;w.classList.add("show");try{p.stop();p.play()}catch(e){console.warn("Lottie play:",e)}setTimeout(()=>w.classList.remove("show"),3200)}
function playLocalWorldEffect(){const w=document.querySelector(".canvas-wrap");if(!w)return;w.classList.remove("world-pulse");void w.offsetWidth;w.classList.add("world-pulse");setTimeout(()=>w.classList.remove("world-pulse"),900)}
window.MathverseExternalAssets={loadOpenverse,loadLottie,playSuccessAnimation,playLocalWorldEffect,getImage:()=>externalImage};
document.addEventListener("DOMContentLoaded",()=>{loadOpenverse();status("● Cargando recursos gratuitos…")});
})();