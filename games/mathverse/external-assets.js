(()=>{"use strict";
const LOTTIE_MODULE="https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.80.0/+esm";
const LOTTIE_SRC="https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie";
let lottiePlayer=null,lottieReady=null;

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

window.MathverseExternalAssets={loadLottie,playSuccessAnimation,playLocalWorldEffect};
document.addEventListener("DOMContentLoaded",()=>{});})();