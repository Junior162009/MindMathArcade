(()=>{"use strict";
const OPENVERSE="https://api.openverse.org/v1/images/";
const KENNEY_SAMPLE="https://raw.githubusercontent.com/Tiddybub/2d-assets/main/sci-fi/sci-fi-rts/Sample.png";
const KENNEY_SOURCE="https://kenney.nl/assets/sci-fi-rts";
const KENNEY_LICENSE="CC0";
const LOTTIE_MODULE="https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.80.0/+esm";
const LOTTIE_SRC="https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie";
let lottiePlayer=null,lottieReady=null,externalImage=null,kenneyImage=null;

function status(t){const e=document.getElementById("externalStatus");if(e)e.textContent=t}
function creditText(x){
 const parts=[];
 if(x)parts.push("Openverse · "+(x.license||"licencia abierta")+(x.creator?" · "+x.creator:""));
 parts.push("Kenney Sci-Fi RTS · CC0");
 return "Recursos: "+parts.join(" · ");
}

function loadKenney(){
 const img=document.getElementById("kenneyCityArt"),credit=document.getElementById("externalCredit");
 if(!img)return Promise.resolve();
 return new Promise(resolve=>{
   img.onload=()=>{img.hidden=false;kenneyImage=img; if(credit){credit.textContent=creditText(externalImage);credit.hidden=false}resolve(true)};
   img.onerror=()=>{console.warn("Mathverse Kenney asset no disponible");resolve(false)};
   img.src=KENNEY_SAMPLE;
 });
}

async function loadOpenverse(){
 const img=document.getElementById("externalCityArt"),credit=document.getElementById("externalCredit");
 if(!img)return;
 try{
   const r=await fetch(OPENVERSE+"?q="+encodeURIComponent("futuristic city night")+"&license_type=cc0,pdm&source=wikimedia,stocksnap&per_page=12",{headers:{Accept:"application/json"}});
   if(!r.ok)throw Error("HTTP "+r.status);
   const d=await r.json();
   const x=(d.results||[]).find(v=>v.thumbnail||v.url);
   if(!x)throw Error("no result");
   img.src=x.thumbnail||x.url;
   img.alt="Arte ambiental de Ciudad de las Variables";
   img.hidden=false;
   externalImage=x;
   if(credit){credit.textContent=creditText(x);credit.hidden=false}
   status("● Kenney + Openverse activos");
 }catch(e){
   console.warn("Mathverse Openverse:",e);
   status("● Kenney activo · Openverse no disponible");
   if(credit){credit.textContent=creditText(null);credit.hidden=false}
 }
}

async function loadLottie(){
 if(lottieReady)return lottieReady;
 lottieReady=import(LOTTIE_MODULE).then(({DotLottie})=>{
   const c=document.getElementById("mathverseLottie");
   if(!c)throw Error("canvas missing");
   lottiePlayer=new DotLottie({autoplay:false,loop:false,canvas:c,src:LOTTIE_SRC});
   return lottiePlayer;
 }).catch(e=>{console.warn("Mathverse Lottie:",e);return null});
 return lottieReady;
}

async function playSuccessAnimation(){
 const w=document.getElementById("lottieFx");if(!w)return;
 const p=await loadLottie();if(!p)return;
 w.classList.remove("show");void w.offsetWidth;w.classList.add("show");
 try{p.stop();p.play()}catch(e){console.warn("Lottie play:",e)}
 setTimeout(()=>w.classList.remove("show"),3200);
}

function playLocalWorldEffect(){
 const w=document.querySelector(".canvas-wrap");if(!w)return;
 w.classList.remove("world-pulse");void w.offsetWidth;w.classList.add("world-pulse");
 setTimeout(()=>w.classList.remove("world-pulse"),900);
}

window.MathverseExternalAssets={
 loadOpenverse,loadKenney,loadLottie,playSuccessAnimation,playLocalWorldEffect,
 getImage:()=>externalImage,
 getKenneyImage:()=>kenneyImage,
 sources:{kenney:KENNEY_SOURCE,kenneyLicense:KENNEY_LICENSE}
};

document.addEventListener("DOMContentLoaded",()=>{
 status("● Cargando recursos gratuitos…");
 loadKenney();
 loadOpenverse();
});
})();